
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const DEV_CHANNEL = "https://t.me/FY_TF";
const BOT_NAME = "سـيـلا";
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// قاعدة بيانات وهمية (يجب استبدالها بـ MongoDB للإنتاج)
let db = {
  globalRanks: { [DEVELOPER_ID]: 'DEV' },
  groups: {}, // { chatId: { settings: {}, localRanks: {} } }
  pendingActions: {} // لحفظ الحالات المؤقتة (مثل اختيار العقوبة)
};

// --- المساعدات (Helpers) ---
const getUserRank = (userId, chatId) => {
  if (Number(userId) === DEVELOPER_ID) return { label: '👑 المطور الأساسي', level: 10 };
  if (db.globalRanks[userId]) return { label: `🌐 ${db.globalRanks[userId]} (عام)`, level: 5 };
  if (chatId && db.groups[chatId]?.localRanks?.[userId]) {
    return { label: `🛡️ ${db.groups[chatId].localRanks[userId]} (محلي)`, level: 3 };
  }
  return { label: '👤 عضو', level: 0 };
};

const can = (userId, chatId, minLevel) => getUserRank(userId, chatId).level >= minLevel;

// --- لوحات المفاتيح ---
const getPrivateMenu = () => Markup.inlineKeyboard([
  [Markup.button.callback('‹ شرح وطريقة العمل ›', 'show_guide')],
  [Markup.button.callback('‹ أوامر الحماية ›', 'menu_cmds')],
  [Markup.button.url('‹ قناة المطور ›', DEV_CHANNEL), Markup.button.callback('‹ المطور ›', 'dev_info')],
  [Markup.button.url('‹ أضف البوت لمجموعتك ›', `https://t.me/${bot.botInfo?.username || 'SilaBot'}?startgroup=true`)]
]);

const getGroupMenu = () => Markup.inlineKeyboard([
  [Markup.button.callback('🛡️ الحماية', 'cmds_shield'), Markup.button.callback('👮 الرتب', 'cmds_ranks')],
  [Markup.button.callback('⚙️ الإعدادات', 'group_settings'), Markup.button.callback('🎮 التسلية', 'cmds_extra')]
]);

// --- التعامل مع البداية (Private vs Group) ---
bot.start(async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.replyWithAnimation(START_IMAGE, {
      caption: `≡ اهلا بك في بوت ${BOT_NAME} 🛡️\n\nبوت متطور لحماية مجموعتك من (الروابط، السبام، الإساءة) بدعم الذكاء الاصطناعي.\n\nاستخدم الأزرار بالأسفل لاستكشاف المميزات 👇`,
      ...getPrivateMenu()
    });
  }
  // في المجموعات، لا يرد على /start لجعل المحادثة نظيفة
});

// استجابة لأمر "الاوامر" في المجموعات
bot.hears(['الاوامر', 'أوامر', 'تفعيل'], (ctx) => {
  if (ctx.chat.type === 'private') return;
  if (!can(ctx.from.id, ctx.chat.id, 2)) return ctx.reply("⚠️ هذا الأمر للمشرفين فقط.");
  ctx.reply(`≡ قائمة التحكم في مجموعة: ${ctx.chat.title}\n⚡ اختر القسم المطلوب:`, getGroupMenu());
});

// --- أوامر القفل (العقوبات المتدرجة) ---
const lockItems = ['الصور', 'الروابط', 'الفيديو', 'الملصقات', 'التوجيه'];
lockItems.forEach(item => {
  bot.hears(`قفل ${item}`, (ctx) => {
    if (!can(ctx.from.id, ctx.chat.id, 3)) return;
    ctx.reply(`🛡️ تم رصد طلب قفل (${item}).\nاختر نوع العقوبة التي تريد تطبيقها على المخالفين:`, 
      Markup.inlineKeyboard([
        [Markup.button.callback('🗑️ حذف فقط', `punish_${item}_del`)],
        [Markup.button.callback('🚫 حذف + تقييد', `punish_${item}_mute`)],
        [Markup.button.callback('🚷 حذف + حظر', `punish_${item}_ban`)]
      ])
    );
  });
});

// --- نظام الرتب (عام / محلي) ---
bot.hears(/^رفع (.*)$/, (ctx) => {
  if (!ctx.message.reply_to_message) return ctx.reply("⚠️ قم بالرد على المستخدم لرفعه.");
  if (!can(ctx.from.id, ctx.chat.id, 5)) return ctx.reply("⚠️ صلاحياتك لا تسمح برفع الرتب.");
  
  const role = ctx.match[1];
  const targetId = ctx.message.reply_to_message.from.id;
  const targetName = ctx.message.reply_to_message.from.first_name;

  ctx.reply(`🛠️ تريد رفع ${targetName} لرتبة (${role}).\nحدد نطاق الصلاحية:`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🌐 رفع عام (بكل المجموعات)', `rank_global_${targetId}_${role}`)],
      [Markup.button.callback('📍 رفع محلي (هنا فقط)', `rank_local_${targetId}_${role}`)]
    ])
  );
});

bot.hears('تنزيل الكل', (ctx) => {
  if (!ctx.message.reply_to_message) return;
  if (!can(ctx.from.id, ctx.chat.id, 5)) return;
  const targetId = ctx.message.reply_to_message.from.id;
  delete db.globalRanks[targetId];
  if (db.groups[ctx.chat.id]) delete db.groups[ctx.chat.id].localRanks[targetId];
  ctx.reply("❌ تم تنزيل المستخدم من كافة الرتب (العامة والمحلية).");
});

// --- الأكشنز (Callback Queries) ---
bot.action('dev_info', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(`👑 مـعـلـومـات الـمـطـور:\n\n• الاسـم: أحـمـد\n• الأي دي: ${DEVELOPER_ID}\n• الـقـنـاة: @FY_TF\n\nيمكنك مراسلته لأي استفسار أو طلب بوت مخصص.`, 
    Markup.inlineKeyboard([[Markup.button.callback('العودة', 'menu_main_pv')]]));
});

bot.action(/punish_(.*)_(.*)/, (ctx) => {
  const item = ctx.match[1];
  const type = ctx.match[2];
  if (!db.groups[ctx.chat.id]) db.groups[ctx.chat.id] = { settings: {}, localRanks: {} };
  db.groups[ctx.chat.id].settings[item] = type;
  ctx.editMessageText(`✅ تم قفل (${item}) بنجاح.\nنوع العقوبة: ${type === 'del' ? 'حذف فقط' : type === 'mute' ? 'حذف وتقييد' : 'حذف وحظر'}`);
});

bot.action(/rank_(global|local)_(.*)_(.*)/, (ctx) => {
  const scope = ctx.match[1];
  const targetId = ctx.match[2];
  const role = ctx.match[3];
  
  if (scope === 'global') db.globalRanks[targetId] = role;
  else {
    if (!db.groups[ctx.chat.id]) db.groups[ctx.chat.id] = { settings: {}, localRanks: {} };
    db.groups[ctx.chat.id].localRanks[targetId] = role;
  }
  ctx.editMessageText(`✅ تم الرفع بنجاح!\nالمستخدم أصبح (${role}) ${scope === 'global' ? 'عام' : 'في هذه المجموعة'}.`);
});

// --- الألعاب بالذكاء الاصطناعي ---
bot.hears(['صراحه', 'لو خيروك', 'لغز'], async (ctx) => {
  const type = ctx.message.text;
  await ctx.sendChatAction('typing');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `اسألني ${type} جديد وغير مكرر بلهجة مصرية مضحكة جداً للمجموعات.`,
      config: { maxOutputTokens: 100 }
    });
    ctx.reply(`🎮 *تحدي ${type}:*\n\n${response.text}`, { parse_mode: 'Markdown' });
  } catch (e) {
    ctx.reply("الذكاء الاصطناعي مشغول، جرب تاني كمان شوية!");
  }
});

// --- معالج الرسائل للحماية ---
bot.on('message', async (ctx, next) => {
  if (ctx.chat.type === 'private') return next();
  
  const text = ctx.message.text || '';
  const settings = db.groups[ctx.chat.id]?.settings || {};
  
  // مثال: حماية الروابط
  if (settings['الروابط'] && (text.includes('http') || text.includes('t.me')) && !can(ctx.from.id, ctx.chat.id, 2)) {
    const type = settings['الروابط'];
    try {
      await ctx.deleteMessage();
      if (type === 'mute') await ctx.restrictChatMember(ctx.from.id, { permissions: { can_send_messages: false } });
      if (type === 'ban') await ctx.banChatMember(ctx.from.id);
    } catch(e) {}
    return;
  }
  
  // الرد الذكي إذا ذكر اسم البوت
  if (text.includes('بوت') || text.includes(BOT_NAME)) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: { 
        systemInstruction: `أنت ${BOT_NAME}، بوت حماية وتسلية. مطورك هو أحمد. رد بذكاء وخفة دم مصرية.`,
        maxOutputTokens: 150 
      }
    });
    ctx.reply(response.text, { reply_to_message_id: ctx.message.message_id });
  }
  
  return next();
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } else {
    res.status(200).send('Guardia Pro AI is Active');
  }
};

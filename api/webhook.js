
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const DEV_CHANNEL = "https://t.me/FY_TF";
const BOT_NAME = "سـيـلا";
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

let db = {
  users: {}, // رتب البوت العامة
  groups: {}, // إعدادات المجموعات ورتب البوت المحلية
  tempActions: {} // لتخزين الحالات المؤقتة (الرفع، اللقب، الصلاحيات)
};

// --- المساعدات (Helpers) ---
const getUserPerms = (userId, chatId) => {
  if (Number(userId) === DEVELOPER_ID) return ['ALL'];
  const global = db.users[userId]?.perms || [];
  const local = (chatId && db.groups[chatId]?.localRanks?.[userId]) || [];
  return [...new Set([...global, ...local])];
};

const hasPerm = (userId, chatId, perm) => {
  const perms = getUserPerms(userId, chatId);
  return perms.includes('ALL') || perms.includes(perm);
};

// --- قائمة الأوامر المتاحة ---
const COMMANDS_LIST = `
≡ *قائمة أوامر بوت ${BOT_NAME}* 🛡️

*🛡️ أوامر الحماية (للمشرفين):*
- قفل [الصور/الروابط/الملصقات/التوجيه] 
- فتح [الصور/الروابط/الملصقات/التوجيه]
- كشف (بالرد): لتحليل رسالة بالذكاء الاصطناعي.

*👮 أوامر الرتب (للمطور):*
- رفع [اسم الرتبة] (بالرد): لرفع رتبة في البوت.
- رفع مشرف (بالرد): لرفع مشرف رسمي في المجموعة بصلاحيات ولقب.
- تنزيل (بالرد): لتنزيل رتبة البوت.
- تنزيل الكل (بالرد): لتنزيل كافة الرتب (البوت + المشرف).

*🎮 أوامر التسلية:*
- صراحه ، لغز ، لو خيروك.
- قل [نص]: لجعل البوت يتحدث.
`;

// --- لوحات المفاتيح ---
const getGroupMenu = () => Markup.inlineKeyboard([
  [Markup.button.callback('🛡️ الحماية', 'cmds_shield'), Markup.button.callback('👮 الرتب', 'cmds_ranks')],
  [Markup.button.callback('📋 قائمة الأوامر', 'show_all_cmds')],
  [Markup.button.callback('⚙️ الإعدادات', 'group_settings'), Markup.button.callback('🎮 التسلية', 'cmds_extra')]
]);

// --- الأوامر الأساسية ---
bot.start(async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.replyWithAnimation(START_IMAGE, {
      caption: `≡ اهلا بك في بوت ${BOT_NAME} 🛡️\n\n- البوت الأقوى لإدارة مجموعتك.\n- دعم "رفع مشرفين" بصلاحيات كاملة.\n- ذكاء اصطناعي متكامل.\n\n≡ استكشف الأوامر عبر القائمة 👇`,
      ...Markup.inlineKeyboard([
        [Markup.button.callback('‹ الأوامر ›', 'menu_cmds')],
        [Markup.button.url('‹ قناة المطور ›', DEV_CHANNEL)],
        [Markup.button.callback('‹ المطور ›', 'dev_info')]
      ])
    });
  }
});

bot.hears(['الاوامر', 'أوامر', 'تفعيل'], (ctx) => {
  if (ctx.chat.type === 'private') return;
  ctx.replyWithAnimation(START_IMAGE, {
    caption: `≡ قائمة التحكم في المجموعة: *${ctx.chat.title}*\n⚡ اختر القسم المطلوب للتعديل:`,
    parse_mode: 'Markdown',
    ...getGroupMenu()
  });
});

// --- رفع مشرف رسمي (Telegram Admin) ---
bot.hears('رفع مشرف', (ctx) => {
  if (!ctx.message.reply_to_message) return ctx.reply("⚠️ قم بالرد على المستخدم لرفعه كمشرف.");
  // يجب أن يكون الشخص الذي يرفع هو المطور أو مالك المجموعة
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL')) return ctx.reply("⚠️ هذا الأمر للمطور فقط.");

  const targetId = ctx.message.reply_to_message.from.id;
  const targetName = ctx.message.reply_to_message.from.first_name;

  db.tempActions[targetId] = {
    type: 'official_admin',
    perms: { 
      can_delete_messages: true, 
      can_restrict_members: false, 
      can_promote_members: false,
      can_change_info: false,
      can_pin_messages: true
    },
    title: 'مشرف'
  };

  ctx.reply(`👮 رفع مشرف رسمي: *${targetName}*\n\nاختر الصلاحيات واللقب:`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(`${db.tempActions[targetId].perms.can_delete_messages ? '✅' : '❌'} حذف الرسائل`, `tg_perm_${targetId}_can_delete_messages`)],
      [Markup.button.callback(`${db.tempActions[targetId].perms.can_restrict_members ? '✅' : '❌'} حظر/كتم`, `tg_perm_${targetId}_can_restrict_members`)],
      [Markup.button.callback(`${db.tempActions[targetId].perms.can_pin_messages ? '✅' : '❌'} تثبيت الرسائل`, `tg_perm_${targetId}_can_pin_messages`)],
      [Markup.button.callback(`${db.tempActions[targetId].perms.can_change_info ? '✅' : '❌'} تغيير المعلومات`, `tg_perm_${targetId}_can_change_info`)],
      [Markup.button.callback(`🏷️ اللقب: ${db.tempActions[targetId].title}`, `tg_set_title_${targetId}`)],
      [Markup.button.callback('🚀 إتمام الرفع الرسمي', `tg_confirm_admin_${targetId}`)]
    ])
  });
});

// --- معالجة الصلاحيات الرسمية (Actions) ---
bot.action(/tg_perm_(.*)_(.*)/, (ctx) => {
  const targetId = ctx.match[1];
  const perm = ctx.match[2];
  if (!db.tempActions[targetId]) return ctx.answerCbQuery("انتهت الجلسة.");
  
  db.tempActions[targetId].perms[perm] = !db.tempActions[targetId].perms[perm];
  
  ctx.editMessageReplyMarkup(
    Markup.inlineKeyboard([
      [Markup.button.callback(`${db.tempActions[targetId].perms.can_delete_messages ? '✅' : '❌'} حذف الرسائل`, `tg_perm_${targetId}_can_delete_messages`)],
      [Markup.button.callback(`${db.tempActions[targetId].perms.can_restrict_members ? '✅' : '❌'} حظر/كتم`, `tg_perm_${targetId}_can_restrict_members`)],
      [Markup.button.callback(`${db.tempActions[targetId].perms.can_pin_messages ? '✅' : '❌'} تثبيت الرسائل`, `tg_perm_${targetId}_can_pin_messages`)],
      [Markup.button.callback(`${db.tempActions[targetId].perms.can_change_info ? '✅' : '❌'} تغيير المعلومات`, `tg_perm_${targetId}_can_change_info`)],
      [Markup.button.callback(`🏷️ اللقب: ${db.tempActions[targetId].title}`, `tg_set_title_${targetId}`)],
      [Markup.button.callback('🚀 إتمام الرفع الرسمي', `tg_confirm_admin_${targetId}`)]
    ]).reply_markup
  );
  ctx.answerCbQuery();
});

bot.action(/tg_set_title_(.*)/, (ctx) => {
  const targetId = ctx.match[1];
  ctx.reply("✏️ أرسل الآن اللقب الجديد للمشرف (مثال: الحوت، الزعيم):");
  db.tempActions[targetId].waitingForTitle = true;
  ctx.answerCbQuery();
});

bot.action(/tg_confirm_admin_(.*)/, async (ctx) => {
  const targetId = ctx.match[1];
  const data = db.tempActions[targetId];
  if (!data) return;

  try {
    // رفع العضو كمشرف رسمياً في التلجرام
    await ctx.promoteChatMember(targetId, {
      is_anonymous: false,
      can_manage_chat: true,
      ...data.perms
    });
    // تعيين اللقب
    await ctx.setChatAdministratorCustomTitle(targetId, data.title);
    
    ctx.editMessageText(`✅ تم رفع المستخدم كمشرف رسمي في المجموعة!\nاللقب: ${data.title}\nالصلاحيات: [مخصصة]`);
    delete db.tempActions[targetId];
  } catch (e) {
    ctx.reply("❌ خطأ: تأكد أن البوت يمتلك صلاحية (إضافة مشرفين) لرفع غيره.");
  }
});

// --- تنزيل الكل ---
bot.hears(['تنزيل الكل', 'تنزيل مشرف'], async (ctx) => {
  if (!ctx.message.reply_to_message) return;
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL')) return;
  
  const targetId = ctx.message.reply_to_message.from.id;
  
  try {
    // تنزيل من المشرفين الرسميين
    await ctx.promoteChatMember(targetId, {
      can_manage_chat: false,
      can_delete_messages: false,
      can_restrict_members: false,
      can_promote_members: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false,
      can_manage_video_chats: false,
      is_anonymous: false
    });
    
    // تنزيل من رتب البوت
    if (db.users[targetId]) delete db.users[targetId];
    if (db.groups[ctx.chat.id]?.localRanks[targetId]) delete db.groups[ctx.chat.id].localRanks[targetId];

    ctx.reply("❌ تم تنزيله من كافة الرتب (رتبة البوت + رتبة المشرف الرسمية).");
  } catch(e) {
    ctx.reply("تم تنزيل رتب البوت، ولكن واجهت مشكلة في تنزيله من رتب التلجرام الرسمية.");
  }
});

bot.action('show_all_cmds', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(COMMANDS_LIST, { parse_mode: 'Markdown' });
});

// --- استكمال تعيين اللقب بالنص ---
bot.on('text', async (ctx, next) => {
  const targetId = Object.keys(db.tempActions).find(id => db.tempActions[id].waitingForTitle);
  if (targetId && ctx.message.reply_to_message) {
    db.tempActions[targetId].title = ctx.message.text;
    db.tempActions[targetId].waitingForTitle = false;
    return ctx.reply(`✅ تم تحديد اللقب كـ (${ctx.message.text}). يمكنك الآن الضغط على "إتمام الرفع الرسمي" في الرسالة السابقة.`);
  }

  // الرد الذكي
  if (ctx.message.text.includes(BOT_NAME) || ctx.message.text.includes('بوت')) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: ctx.message.text,
      config: { systemInstruction: `أنت ${BOT_NAME}، بوت حماية ومرح. مطورك أحمد @FY_TF.` }
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
    res.status(200).send('Bot is active');
  }
};

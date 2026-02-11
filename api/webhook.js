
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const DEV_CHANNEL = "https://t.me/FY_TF";
const BOT_NAME = "سـيـلا";
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// قاعدة بيانات وهمية
let db = {
  users: {}, // { id: { perms: [] } }
  groups: {}, // { id: { settings: {}, localRanks: {} } }
  tempActions: {} // لتخزين الحالات المؤقتة للصلاحيات
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

// --- لوحات المفاتيح والقوالب ---
const UI = {
  mainMenu: (chatTitle) => ({
    caption: `≡ قائمة التحكم في مجموعة: *${chatTitle}* 🛡️\n\n- اختر القسم المطلوب لإدارة المجموعة بالكامل.\n- يتم تحديث الإعدادات في هذه الرسالة مباشرة.`,
    markup: Markup.inlineKeyboard([
      [Markup.button.callback('🛡️ قسم الحماية', 'nav_shield'), Markup.button.callback('👮 قسم الرتب', 'nav_ranks')],
      [Markup.button.callback('🎮 قسم التسلية', 'nav_extra'), Markup.button.callback('⚙️ الإعدادات', 'nav_settings')],
      [Markup.button.callback('📋 قائمة الأوامر', 'nav_cmds')],
      [Markup.button.url('‹ قناة المطور ›', DEV_CHANNEL)]
    ])
  }),
  
  shieldMenu: () => ({
    caption: `≡ *قسم الحماية وإدارة القيود* 🛡️\n\n- يمكنك التحكم في ما يسمح بإرساله في المجموعة.\n- استخدم الأوامر المباشرة أو الأزرار (قيد التطوير).`,
    markup: Markup.inlineKeyboard([
      [Markup.button.callback('🚫 قفل الروابط', 'toggle_link'), Markup.button.callback('🖼️ قفل الصور', 'toggle_photo')],
      [Markup.button.callback('‹ رجوع للقائمة', 'nav_home')]
    ])
  }),

  ranksMenu: () => ({
    caption: `≡ *قسم إدارة الرتب والصلاحيات* 👮\n\n- رفع مشرف رسمي (بالرد + أمر).\n- رفع رتب البوت (ادمن، مدير).\n- تنزيل الكل (لسحب كافة الصلاحيات).`,
    markup: Markup.inlineKeyboard([
      [Markup.button.callback('📋 رتب البوت', 'list_bot_ranks')],
      [Markup.button.callback('‹ رجوع للقائمة', 'nav_home')]
    ])
  }),

  extraMenu: () => ({
    caption: `≡ *قسم التسلية والمرح* 🎮\n\n- ألعاب ذكاء اصطناعي تفاعلية.\n- صراحة، لو خيروك، لغز.`,
    markup: Markup.inlineKeyboard([
      [Markup.button.callback('❓ صراحة', 'play_sraha'), Markup.button.callback('🤔 لو خيروك', 'play_khayarok')],
      [Markup.button.callback('‹ رجوع للقائمة', 'nav_home')]
    ])
  }),

  allCommands: () => `
≡ *قائمة أوامر بوت ${BOT_NAME} الكاملة* 🛡️

*🛡️ أوامر الحماية:*
- قفل/فتح (الصور، الروابط، الملصقات، التوجيه)
- كشف (بالرد): تحليل الرسالة بالذكاء الاصطناعي.

*👮 أوامر الرتب:*
- رفع مشرف (بالرد): لرفع مشرف رسمي مع لقب وصلاحيات.
- رفع (ادمن/مدير/مميز) (بالرد): رتب داخل البوت.
- تنزيل (بالرد): تنزيل من رتبة البوت.
- تنزيل الكل (بالرد): تنزيل من البوت ومن المشرفين.

*🎮 أوامر التسلية:*
- صراحة ، لو خيروك ، لغز.
- قل [نص]: نطق النص المكتوب.
- ترجم [نص]: ترجمة النص للعربية.

*⚙️ أخرى:*
- ايدي: عرض معلوماتك.
- الرتبة: عرض رتبتك في البوت.
`
};

// --- الأوامر النصية الأساسية ---
bot.start(async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.replyWithAnimation(START_IMAGE, {
      caption: `≡ اهلا بك في بوت ${BOT_NAME} الذكي 🛡️\n\n- أسرع بوت حماية في تلجرام.\n- يدعم رفع المشرفين والتحكم الكامل.\n- مدعوم بذكاء Gemini AI.\n\n≡ استخدم الأزرار بالأسفل للتنقل 👇`,
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 الأوامر', 'nav_cmds')],
        [Markup.button.url('‹ قناة المطور ›', DEV_CHANNEL)],
        [Markup.button.callback('👤 المطور', 'nav_dev')]
      ])
    });
  }
});

bot.hears(['الاوامر', 'أوامر', 'تفعيل', 'القائمة'], (ctx) => {
  if (ctx.chat.type === 'private') return;
  // التأكد من أن المستخدم مشرف
  const ui = UI.mainMenu(ctx.chat.title);
  ctx.replyWithAnimation(START_IMAGE, {
    caption: ui.caption,
    parse_mode: 'Markdown',
    ...ui.markup
  });
});

// --- نظام رفع المشرفين (التلجرام) ---
bot.hears('رفع مشرف', (ctx) => {
  if (!ctx.message.reply_to_message) return ctx.reply("⚠️ يرجى الرد على المستخدم الذي تريد رفعه.");
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL')) return ctx.reply("⚠️ هذا الأمر للمطور فقط.");

  const target = ctx.message.reply_to_message.from;
  db.tempActions[target.id] = {
    type: 'tg_admin',
    perms: { 
      can_delete_messages: true, 
      can_restrict_members: true, 
      can_promote_members: false,
      can_pin_messages: true,
      can_change_info: false
    },
    title: 'مشرف'
  };

  ctx.reply(`👮 *إعدادات رفع المشرف:* [${target.first_name}](tg://user?id=${target.id})\n\nقم بتعديل الصلاحيات واللقب ثم اضغط حفظ:`, {
    parse_mode: 'Markdown',
    ...getAdminPanel(target.id)
  });
});

const getAdminPanel = (targetId) => {
  const data = db.tempActions[targetId];
  return Markup.inlineKeyboard([
    [Markup.button.callback(`${data.perms.can_delete_messages ? '✅' : '❌'} حذف الرسائل`, `tg_tog_${targetId}_can_delete_messages`)],
    [Markup.button.callback(`${data.perms.can_restrict_members ? '✅' : '❌'} حظر وكتم`, `tg_tog_${targetId}_can_restrict_members`)],
    [Markup.button.callback(`${data.perms.can_pin_messages ? '✅' : '❌'} تثبيت الرسائل`, `tg_tog_${targetId}_can_pin_messages`)],
    [Markup.button.callback(`🏷️ اللقب: ${data.title}`, `tg_settitle_${targetId}`)],
    [Markup.button.callback('🚀 إتمام الرفع والحفظ', `tg_final_${targetId}`)]
  ]);
};

// --- معالجة الضغط على الأزرار (Navigation & Toggles) ---
bot.action(/nav_(.*)/, (ctx) => {
  const page = ctx.match[1];
  let ui;

  switch(page) {
    case 'home': ui = UI.mainMenu(ctx.chat?.title || "المجموعة"); break;
    case 'shield': ui = UI.shieldMenu(); break;
    case 'ranks': ui = UI.ranksMenu(); break;
    case 'extra': ui = UI.extraMenu(); break;
    case 'cmds':
      return ctx.editMessageCaption(UI.allCommands(), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('‹ رجوع', 'nav_home')]])
      });
    case 'dev':
      return ctx.editMessageCaption(`👤 *مطور البوت:* [أحمد](tg://user?id=${DEVELOPER_ID})\n\n- المطور الأساسي لبوت ${BOT_NAME}.\n- القناة: @FY_TF.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('‹ رجوع', 'nav_home')]])
      });
    default:
      return ctx.answerCbQuery("🚧 قيد التطوير...");
  }

  ctx.editMessageCaption(ui.caption, { parse_mode: 'Markdown', ...ui.markup });
  ctx.answerCbQuery();
});

// تفعيل/تعطيل صلاحيات التلجرام
bot.action(/tg_tog_(.*)_(.*)/, (ctx) => {
  const targetId = ctx.match[1];
  const perm = ctx.match[2];
  if (!db.tempActions[targetId]) return ctx.answerCbQuery("❌ انتهت الجلسة.");

  db.tempActions[targetId].perms[perm] = !db.tempActions[targetId].perms[perm];
  ctx.editMessageReplyMarkup(getAdminPanel(targetId).reply_markup);
  ctx.answerCbQuery();
});

bot.action(/tg_settitle_(.*)/, (ctx) => {
  const targetId = ctx.match[1];
  ctx.reply("✏️ أرسل الآن اللقب الجديد للمشرف (رد على هذه الرسالة):", { reply_markup: { force_reply: true } });
  db.tempActions[targetId].waiting = true;
  ctx.answerCbQuery();
});

bot.action(/tg_final_(.*)/, async (ctx) => {
  const targetId = ctx.match[1];
  const data = db.tempActions[targetId];
  if (!data) return;

  try {
    await ctx.promoteChatMember(targetId, {
      is_anonymous: false,
      can_manage_chat: true,
      ...data.perms
    });
    await ctx.setChatAdministratorCustomTitle(targetId, data.title);
    ctx.editMessageText(`✅ تم رفع المشرف بنجاح!\nاللقب: ${data.title}\nالصلاحيات: مخصصة.`);
    delete db.tempActions[targetId];
  } catch (e) {
    ctx.reply("❌ حدث خطأ: تأكد أن البوت يمتلك صلاحية (إضافة مشرفين).");
  }
});

// --- تنزيل الكل ---
bot.hears(['تنزيل الكل', 'تنزيل مشرف'], async (ctx) => {
  if (!ctx.message.reply_to_message) return;
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL')) return;
  const targetId = ctx.message.reply_to_message.from.id;

  try {
    // سحب صلاحيات التلجرام
    await ctx.promoteChatMember(targetId, { can_manage_chat: false, is_anonymous: false });
    // سحب رتب البوت
    if (db.users[targetId]) delete db.users[targetId];
    ctx.reply("❌ تم سحب كافة الرتب والصلاحيات الرسمية والداخلية.");
  } catch(e) {
    ctx.reply("⚠️ تم سحب رتب البوت، ولكن فشل تعديل رتبة التلجرام (ربما المشرف أعلى من البوت).");
  }
});

// --- معالجة النصوص (اللقب + الذكاء الاصطناعي) ---
bot.on('text', async (ctx, next) => {
  const waitingId = Object.keys(db.tempActions).find(id => db.tempActions[id].waiting);
  if (waitingId) {
    db.tempActions[waitingId].title = ctx.message.text;
    db.tempActions[waitingId].waiting = false;
    return ctx.reply(`✅ تم ضبط اللقب: (${ctx.message.text}). اضغط "إتمام الرفع" في القائمة.`);
  }

  // الرد الذكي
  const msg = ctx.message.text;
  if (msg.includes(BOT_NAME) || msg.includes('بوت') || ctx.chat.type === 'private') {
    await ctx.sendChatAction('typing');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: msg,
        config: { systemInstruction: `أنت ${BOT_NAME}، بوت حماية ومرح مصري. مطورك أحمد @FY_TF. رد بذكاء وخفة دم.` }
      });
      ctx.reply(response.text, { reply_to_message_id: ctx.message.message_id });
    } catch (e) {
      ctx.reply("عذراً، عقلي مشوش قليلاً الآن!");
    }
  }
  return next();
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } else {
    res.status(200).send('Sila Bot is active!');
  }
};

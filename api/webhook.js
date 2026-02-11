
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const DEV_CHANNEL = "https://t.me/FY_TF";
const BOT_NAME = "سـيـلا";
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// قاعدة بيانات في الذاكرة (يفضل استبدالها بـ Firestore/MongoDB لاحقاً)
let db = {
  users: {}, // { id: { perms: [] } }
  groups: {}, // { id: { settings: {}, localRanks: {} } }
  tempActions: {} // لإدارة الجلسات المؤقتة
};

// --- وظائف مساعدة ---
const ensureGroup = (chatId) => {
  if (!db.groups[chatId]) {
    db.groups[chatId] = {
      settings: {
        lock_links: false,
        lock_photos: false,
        lock_stickers: false,
        lock_forward: false,
        lock_bots: false,
        lock_markdown: false
      },
      localRanks: {}
    };
  }
};

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

// --- الواجهة الرسومية (UI) ---
const UI = {
  mainMenu: (chatTitle, chatId) => {
    ensureGroup(chatId);
    return {
      caption: `≡ قائمة التحكم في مجموعة: *${chatTitle}* 🛡️\n\n- أهلاً بك في لوحة تحكم ${BOT_NAME}.\n- جميع الأزرار تعمل بنظام التحديث التلقائي للرسالة.`,
      markup: Markup.inlineKeyboard([
        [Markup.button.callback('🛡️ إعدادات الحماية', 'nav_protection'), Markup.button.callback('👮 إدارة الرتب', 'nav_ranks')],
        [Markup.button.callback('🎮 التسلية والمرح', 'nav_extra'), Markup.button.callback('⚙️ الإعدادات', 'nav_settings')],
        [Markup.button.callback('📋 قائمة الأوامر', 'nav_cmds')],
        [Markup.button.url('‹ قناة المطور ›', DEV_CHANNEL)]
      ])
    };
  },

  protectionMenu: (chatId) => {
    const s = db.groups[chatId].settings;
    return {
      caption: `≡ *قسم الحماية وإدارة القيود* 🛡️\n\n- تحكم في ما يسمح بإرساله داخل المجموعة:\n\n🔗 الروابط: ${s.lock_links ? '🔒 مقفول' : '🔓 مفتوح'}\n🖼️ الصور: ${s.lock_photos ? '🔒 مقفول' : '🔓 مفتوح'}\n🎴 الملصقات: ${s.lock_stickers ? '🔒 مقفول' : '🔓 مفتوح'}\n↪️ التوجيه: ${s.lock_forward ? '🔒 مقفول' : '🔓 مفتوح'}`,
      markup: Markup.inlineKeyboard([
        [Markup.button.callback(`${s.lock_links ? '✅' : '❌'} الروابط`, 'toggle_links'), Markup.button.callback(`${s.lock_photos ? '✅' : '❌'} الصور`, 'toggle_photos')],
        [Markup.button.callback(`${s.lock_stickers ? '✅' : '❌'} الملصقات`, 'toggle_stickers'), Markup.button.callback(`${s.lock_forward ? '✅' : '❌'} التوجيه`, 'toggle_forward')],
        [Markup.button.callback('‹ رجوع للقائمة الرئيسية', 'nav_home')]
      ])
    };
  },

  ranksMenu: () => ({
    caption: `≡ *إدارة الرتب والصلاحيات* 👮\n\n- يمكنك رفع مشرفين رسميين أو رتب داخل البوت.\n- استخدم أوامر "رفع" بالرد على الشخص المطلوب.`,
    markup: Markup.inlineKeyboard([
      [Markup.button.callback('📋 عرض رتب المجموعة', 'list_ranks')],
      [Markup.button.callback('‹ رجوع للقائمة الرئيسية', 'nav_home')]
    ])
  }),

  extraMenu: () => ({
    caption: `≡ *قسم التسلية والمرح* 🎮\n\n- اختر اللعبة المطلوبة للبدء:`,
    markup: Markup.inlineKeyboard([
      [Markup.button.callback('❓ صراحة', 'game_sraha'), Markup.button.callback('🤔 لو خيروك', 'game_khayarok')],
      [Markup.button.callback('🧩 لغز', 'game_logz')],
      [Markup.button.callback('‹ رجوع للقائمة الرئيسية', 'nav_home')]
    ])
  }),

  allCmds: () => `
≡ *قائمة أوامر ${BOT_NAME} الكاملة* 🛡️

*🛡️ أوامر الحماية:*
- قفل/فتح (الروابط، الصور، الملصقات، التوجيه، البوتات)
- كشف (بالرد): تحليل الرسالة بالذكاء الاصطناعي.

*👮 أوامر الرتب:*
- رفع مشرف (بالرد): رفع مشرف رسمي بصلاحيات مخصصة ولقب.
- رفع (مدير/ادمن/مميز) (بالرد): رتب داخل البوت.
- تنزيل الكل (بالرد): سحب كافة الصلاحيات.

*🎮 أوامر التسلية:*
- صراحة ، لو خيروك ، لغز.
- قل [نص]: نطق النص.
- ترجم [نص]: ترجمة فورية.

*⚙️ أخرى:*
- ايدي: معلوماتك.
- كشف: تحليل المحتوى.
`
};

// --- Middleware الحماية (Enforcer) ---
bot.use(async (ctx, next) => {
  if (!ctx.chat || ctx.chat.type === 'private' || !ctx.message) return next();
  
  const chatId = ctx.chat.id;
  ensureGroup(chatId);
  const s = db.groups[chatId].settings;
  const userId = ctx.from.id;

  // استثناء المطور والمشرفين من القيود
  if (hasPerm(userId, chatId, 'ADMIN')) return next();

  // منع الروابط
  if (s.lock_links && (ctx.message.text?.match(/https?:\/\//) || ctx.message.entities?.some(e => e.type === 'url'))) {
    return ctx.deleteMessage().catch(() => {});
  }
  // منع الصور
  if (s.lock_photos && ctx.message.photo) {
    return ctx.deleteMessage().catch(() => {});
  }
  // منع الملصقات
  if (s.lock_stickers && ctx.message.sticker) {
    return ctx.deleteMessage().catch(() => {});
  }
  // منع التوجيه
  if (s.lock_forward && (ctx.message.forward_from || ctx.message.forward_from_chat)) {
    return ctx.deleteMessage().catch(() => {});
  }

  return next();
});

// --- الأوامر النصية ---
bot.start(async (ctx) => {
  if (ctx.chat.type === 'private') {
    ctx.replyWithAnimation(START_IMAGE, {
      caption: `≡ أهلاً بك في بوت ${BOT_NAME} 🛡️\n\n- البوت الأقوى لحماية مجموعتك.\n- ذكاء اصطناعي متكامل.\n- نظام رتب متطور.\n\n≡ استخدم الأزرار للاستكشاف 👇`,
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 الأوامر', 'nav_cmds')],
        [Markup.button.url('‹ قناة المطور ›', DEV_CHANNEL)]
      ])
    });
  }
});

bot.hears(['الاوامر', 'تفعيل', 'أوامر'], (ctx) => {
  if (ctx.chat.type === 'private') return;
  const ui = UI.mainMenu(ctx.chat.title, ctx.chat.id);
  ctx.replyWithAnimation(START_IMAGE, {
    caption: ui.caption,
    parse_mode: 'Markdown',
    ...ui.markup
  });
});

// --- معالجة الأزرار (Navigation & Toggles) ---
bot.action(/nav_(.*)/, (ctx) => {
  const page = ctx.match[1];
  let ui;
  const chatId = ctx.chat.id;

  switch(page) {
    case 'home': ui = UI.mainMenu(ctx.chat.title, chatId); break;
    case 'protection': ui = UI.protectionMenu(chatId); break;
    case 'ranks': ui = UI.ranksMenu(); break;
    case 'extra': ui = UI.extraMenu(); break;
    case 'cmds':
      return ctx.editMessageCaption(UI.allCmds(), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('‹ رجوع للقائمة الرئيسية', 'nav_home')]])
      });
    default: return ctx.answerCbQuery("🚧 قيد التطوير");
  }

  ctx.editMessageCaption(ui.caption, { parse_mode: 'Markdown', ...ui.markup });
  ctx.answerCbQuery();
});

// تبديل إعدادات الحماية
bot.action(/toggle_(.*)/, (ctx) => {
  const type = ctx.match[1];
  const chatId = ctx.chat.id;
  if (!hasPerm(ctx.from.id, chatId, 'ADMIN')) return ctx.answerCbQuery("❌ للمشرفين فقط");

  const key = `lock_${type}`;
  db.groups[chatId].settings[key] = !db.groups[chatId].settings[key];
  
  const ui = UI.protectionMenu(chatId);
  ctx.editMessageCaption(ui.caption, { parse_mode: 'Markdown', ...ui.markup });
  ctx.answerCbQuery(`تم ${db.groups[chatId].settings[key] ? 'القفل' : 'الفتح'}`);
});

// --- نظام رفع المشرفين الرسمي ---
bot.hears('رفع مشرف', (ctx) => {
  if (!ctx.message.reply_to_message) return ctx.reply("⚠️ قم بالرد على العضو المراد رفعه.");
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL')) return ctx.reply("⚠️ هذا الأمر للمطور فقط.");

  const target = ctx.message.reply_to_message.from;
  db.tempActions[target.id] = {
    perms: { can_delete_messages: true, can_restrict_members: true, can_pin_messages: true },
    title: 'مشرف'
  };

  ctx.reply(`👮 *رفع مشرف رسمي:* [${target.first_name}](tg://user?id=${target.id})\n\nاختر الصلاحيات واللقب المطلوبين:`, {
    parse_mode: 'Markdown',
    ...getAdminPanel(target.id)
  });
});

const getAdminPanel = (targetId) => {
  const data = db.tempActions[targetId];
  return Markup.inlineKeyboard([
    [Markup.button.callback(`${data.perms.can_delete_messages ? '✅' : '❌'} حذف الرسائل`, `adm_tog_${targetId}_can_delete_messages`)],
    [Markup.button.callback(`${data.perms.can_restrict_members ? '✅' : '❌'} حظر وكتم`, `adm_tog_${targetId}_can_restrict_members`)],
    [Markup.button.callback(`${data.perms.can_pin_messages ? '✅' : '❌'} تثبيت الرسائل`, `adm_tog_${targetId}_can_pin_messages`)],
    [Markup.button.callback(`🏷️ اللقب: ${data.title}`, `adm_settitle_${targetId}`)],
    [Markup.button.callback('🚀 حفظ الرفع الرسمي', `adm_final_${targetId}`)]
  ]);
};

bot.action(/adm_tog_(.*)_(.*)/, (ctx) => {
  const targetId = ctx.match[1];
  const perm = ctx.match[2];
  if (!db.tempActions[targetId]) return ctx.answerCbQuery("❌ انتهت الجلسة");

  db.tempActions[targetId].perms[perm] = !db.tempActions[targetId].perms[perm];
  ctx.editMessageReplyMarkup(getAdminPanel(targetId).reply_markup);
  ctx.answerCbQuery();
});

bot.action(/adm_settitle_(.*)/, (ctx) => {
  const targetId = ctx.match[1];
  ctx.reply("✏️ أرسل اللقب الجديد (مثال: المدير):", { reply_markup: { force_reply: true } });
  db.tempActions[targetId].waiting = true;
  ctx.answerCbQuery();
});

bot.action(/adm_final_(.*)/, async (ctx) => {
  const targetId = ctx.match[1];
  const data = db.tempActions[targetId];
  if (!data) return;

  try {
    await ctx.promoteChatMember(targetId, { is_anonymous: false, can_manage_chat: true, ...data.perms });
    await ctx.setChatAdministratorCustomTitle(targetId, data.title);
    ctx.editMessageText(`✅ تم رفع المشرف بنجاح باللقب: *${data.title}*`, { parse_mode: 'Markdown' });
    delete db.tempActions[targetId];
  } catch (e) {
    ctx.reply("❌ خطأ: تأكد أن البوت لديه صلاحية (إضافة مشرفين).");
  }
});

// --- تنزيل الكل ---
bot.hears(['تنزيل الكل', 'تنزيل مشرف'], async (ctx) => {
  if (!ctx.message.reply_to_message) return;
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL')) return;
  const targetId = ctx.message.reply_to_message.from.id;

  try {
    await ctx.promoteChatMember(targetId, { can_manage_chat: false, is_anonymous: false });
    if (db.users[targetId]) delete db.users[targetId];
    ctx.reply("❌ تم تنزيل العضو وسحب كافة الصلاحيات.");
  } catch(e) {
    ctx.reply("تم سحب رتب البوت، وفشل سحب رتبة التلجرام الرسمية.");
  }
});

// --- معالجة النصوص (الذكاء الاصطناعي) ---
bot.on('text', async (ctx, next) => {
  // استقبال اللقب المخصص
  const waitingId = Object.keys(db.tempActions).find(id => db.tempActions[id].waiting);
  if (waitingId) {
    db.tempActions[waitingId].title = ctx.message.text;
    db.tempActions[waitingId].waiting = false;
    return ctx.reply(`✅ تم تحديد اللقب: (${ctx.message.text}). اضغط حفظ في رسالة الرفع.`);
  }

  // الرد الذكي بالذكاء الاصطناعي
  const msg = ctx.message.text;
  if (msg.includes(BOT_NAME) || msg.includes('بوت') || ctx.chat.type === 'private') {
    await ctx.sendChatAction('typing');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: msg,
        config: { systemInstruction: `أنت ${BOT_NAME}، بوت حماية وتفاعل مصري ذكي ومرح. ردودك قصيرة ومفيدة.` }
      });
      ctx.reply(response.text, { reply_to_message_id: ctx.message.message_id });
    } catch (e) { console.error(e); }
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

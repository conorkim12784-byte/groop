
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const DEV_CHANNEL = "https://t.me/FY_TF";
const BOT_NAME = "سـيـلا";
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// قاعدة بيانات وهمية (تستخدم الذاكرة)
let db = {
  users: {}, // الرتب العامة للمطور
  groups: {}, // إعدادات كل مجموعة ورتبها المحلية
  tempActions: {} // لتخزين الصلاحيات المختارة قبل الحفظ
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

// --- القوالب الرسومية (UI Templates) ---
const UI = {
  mainMenu: (chatTitle) => ({
    caption: `≡ قائمة التحكم في مجموعة: *${chatTitle}* 🛡️\n\n- يمكنك إدارة الحماية، الرتب، والتسلية من هنا.\n- جميع الإعدادات تتم بتحديث هذه الرسالة.`,
    markup: Markup.inlineKeyboard([
      [Markup.button.callback('🛡️ إعدادات الحماية', 'nav_shield'), Markup.button.callback('👮 إدارة الرتب', 'nav_ranks')],
      [Markup.button.callback('📋 الأوامر كاملة', 'nav_cmds'), Markup.button.callback('🎮 التسلية', 'nav_extra')],
      [Markup.button.callback('⚙️ الإعدادات العامة', 'nav_settings')]
    ])
  }),
  commands: () => `
≡ *أوامر بوت ${BOT_NAME}* 🛡️

*🛡️ الحماية (بالرد أو أمر):*
- قفل/فتح [الصور/الروابط/الملصقات]
- كشف (بالرد): تحليل الرسالة بالذكاء الاصطناعي.

*👮 الرتب والصلاحيات:*
- رفع [الرتبة] (بالرد): لرفع عضو في رتب البوت.
- رفع مشرف (بالرد): لرفع مشرف تلجرام رسمي.
- تنزيل الكل (بالرد): لسحب كافة الصلاحيات.

*🎮 التسلية:*
- صراحه ، لغز ، لو خيروك.
- قل [نص]: نطق النص.
`,
};

// --- الأوامر الأساسية ---
bot.start(async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.replyWithAnimation(START_IMAGE, {
      caption: `≡ اهلا بك في بوت ${BOT_NAME} 🛡️\n\n- نظام حماية ذكي يدعم Gemini AI.\n- تحكم كامل في المشرفين والصلاحيات.\n\n≡ استخدم الأزرار للتنقل 👇`,
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 قائمة الأوامر', 'nav_cmds')],
        [Markup.button.url('‹ قناة المطور ›', DEV_CHANNEL)],
        [Markup.button.callback('👤 المطور', 'nav_dev')]
      ])
    });
  }
});

bot.hears(['الاوامر', 'أوامر', 'تفعيل'], (ctx) => {
  if (ctx.chat.type === 'private') return;
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ADMIN')) return;
  const ui = UI.mainMenu(ctx.chat.title);
  ctx.replyWithAnimation(START_IMAGE, {
    caption: ui.caption,
    parse_mode: 'Markdown',
    ...ui.markup
  });
});

// --- رفع مشرف رسمي (التحكم في الأزرار والتحديث) ---
bot.hears('رفع مشرف', (ctx) => {
  if (!ctx.message.reply_to_message) return ctx.reply("⚠️ قم بالرد على العضو لرفعه مشرفاً.");
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL')) return ctx.reply("⚠️ للمطور فقط.");

  const targetId = ctx.message.reply_to_message.from.id;
  const targetName = ctx.message.reply_to_message.from.first_name;

  db.tempActions[targetId] = {
    type: 'tg_admin',
    perms: { 
      can_delete_messages: true, 
      can_restrict_members: false, 
      can_promote_members: false,
      can_pin_messages: true
    },
    title: 'مشرف'
  };

  ctx.reply(`👮 *رفع مشرف رسمي:* ${targetName}\n\nاختر الصلاحيات واللقب المطلوبين ثم اضغط حفظ:`, {
    parse_mode: 'Markdown',
    ...getAdminToggles(targetId)
  });
});

const getAdminToggles = (targetId) => {
  const data = db.tempActions[targetId];
  return Markup.inlineKeyboard([
    [Markup.button.callback(`${data.perms.can_delete_messages ? '✅' : '❌'} حذف الرسائل`, `tg_toggle_${targetId}_can_delete_messages`)],
    [Markup.button.callback(`${data.perms.can_restrict_members ? '✅' : '❌'} حظر/كتم`, `tg_toggle_${targetId}_can_restrict_members`)],
    [Markup.button.callback(`${data.perms.can_pin_messages ? '✅' : '❌'} تثبيت الرسائل`, `tg_toggle_${targetId}_can_pin_messages`)],
    [Markup.button.callback(`🏷️ اللقب: ${data.title}`, `tg_title_${targetId}`)],
    [Markup.button.callback('🚀 حفظ الرفع الرسمي', `tg_save_${targetId}`)]
  ]);
};

// --- الأكشنز (تحديث الرسائل) ---
bot.action(/nav_(.*)/, (ctx) => {
  const page = ctx.match[1];
  let text = "";
  let markup = [];

  switch(page) {
    case 'cmds':
      text = UI.commands();
      markup = Markup.inlineKeyboard([[Markup.button.callback('‹ رجوع', 'nav_home')]]);
      break;
    case 'home':
      const ui = UI.mainMenu(ctx.chat?.title || "المجموعة");
      return ctx.editMessageCaption(ui.caption, { parse_mode: 'Markdown', ...ui.markup });
    case 'dev':
      text = `👑 *مطور البوت:* [أحمد](tg://user?id=${DEVELOPER_ID})\n\n- القناة الرسمية: @FY_TF\n- البوت يعمل بأحدث تقنيات الذكاء الاصطناعي.`;
      markup = Markup.inlineKeyboard([[Markup.button.callback('‹ رجوع', 'nav_home')]]);
      break;
    default:
      text = "🚧 هذا القسم قيد التطوير حالياً.";
      markup = Markup.inlineKeyboard([[Markup.button.callback('‹ رجوع', 'nav_home')]]);
  }

  ctx.editMessageCaption(text, { parse_mode: 'Markdown', ...markup });
  ctx.answerCbQuery();
});

bot.action(/tg_toggle_(.*)_(.*)/, (ctx) => {
  const targetId = ctx.match[1];
  const perm = ctx.match[2];
  if (!db.tempActions[targetId]) return ctx.answerCbQuery("انتهت الجلسة.");

  db.tempActions[targetId].perms[perm] = !db.tempActions[targetId].perms[perm];
  ctx.editMessageReplyMarkup(getAdminToggles(targetId).reply_markup);
  ctx.answerCbQuery();
});

bot.action(/tg_title_(.*)/, (ctx) => {
  const targetId = ctx.match[1];
  ctx.reply("✏️ أرسل اللقب الجديد (مثال: الزعيم):", { reply_markup: { force_reply: true } });
  db.tempActions[targetId].waitingTitle = true;
  ctx.answerCbQuery();
});

bot.action(/tg_save_(.*)/, async (ctx) => {
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
    ctx.reply("❌ فشل الرفع: تأكد أن البوت مشرف ولديه صلاحية (إضافة مشرفين).");
  }
});

// --- معالجة النصوص (اللقب + الذكاء الاصطناعي) ---
bot.on('text', async (ctx, next) => {
  // كشف انتظار اللقب
  const waitingId = Object.keys(db.tempActions).find(id => db.tempActions[id].waitingTitle);
  if (waitingId && ctx.message.reply_to_message) {
    db.tempActions[waitingId].title = ctx.message.text;
    db.tempActions[waitingId].waitingTitle = false;
    return ctx.reply(`✅ تم تحديث اللقب لـ (${ctx.message.text}). اضغط حفظ في الرسالة السابقة.`);
  }

  // الرد الذكي إذا ذكر اسم البوت
  if (ctx.message.text.includes(BOT_NAME) || (ctx.chat.type === 'private')) {
    await ctx.sendChatAction('typing');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: ctx.message.text,
      config: { systemInstruction: `أنت ${BOT_NAME}، بوت حماية وتسلية مصري، مطورك هو أحمد @FY_TF. رد بخفة دم.` }
    });
    ctx.reply(response.text, { reply_to_message_id: ctx.message.message_id });
  }
  return next();
});

// --- تنزيل الكل ---
bot.hears(['تنزيل الكل', 'تنزيل مشرف'], async (ctx) => {
  if (!ctx.message.reply_to_message) return;
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL')) return;
  const targetId = ctx.message.reply_to_message.from.id;

  try {
    await ctx.promoteChatMember(targetId, { can_manage_chat: false, is_anonymous: false });
    if (db.users[targetId]) delete db.users[targetId];
    ctx.reply("❌ تم سحب كافة الرتب والصلاحيات.");
  } catch(e) {
    ctx.reply("تم سحب رتب البوت، وحدث خطأ في سحب رتب التلجرام الرسمية.");
  }
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } else {
    res.status(200).send('Sila AI Active');
  }
};

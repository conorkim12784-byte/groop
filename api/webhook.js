const { Telegraf, Markup, session } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const DEVELOPER_ID = 1923931101;
const DEV_CHANNEL = "https://t.me/FY_TF";
const BOT_NAME = "سـيـلا";
const START_GIF = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// ────────────────────────────────────────────────
//               Session & Database (in-memory)
// ────────────────────────────────────────────────
bot.use(session({
  defaultSession: () => ({
    adminSetup: null,
  })
}));

const db = {
  users: {},      // { userId: { perms: string[] } }
  groups: {},     // { chatId: { settings: {}, localRanks: { userId: string[] } } }
};

// ────────────────────────────────────────────────
//               Permissions Helpers
// ────────────────────────────────────────────────
function getUserPerms(userId, chatId) {
  if (Number(userId) === DEVELOPER_ID) return ['ALL'];
  const global = db.users[userId]?.perms || [];
  const local = chatId ? (db.groups[chatId]?.localRanks?.[userId] || []) : [];
  return [...new Set([...global, ...local])];
}

function hasPerm(userId, chatId, perm) {
  const perms = getUserPerms(userId, chatId);
  return perms.includes('ALL') || perms.includes(perm);
}

// ────────────────────────────────────────────────
//               UI Templates
// ────────────────────────────────────────────────
const emoji = {
  home: '🏠', shield: '🛡️', ranks: '👮‍♂️', fun: '🎮', settings: '⚙️',
  back: '🔙', lock: '🔒', unlock: '🔓', yes: '✅', no: '❌'
};

const UI = {
  mainMenu: (title = "المجموعة") => ({
    text: `✦ *لوحة تحكم \( {BOT_NAME}* ✦\n\nمجموعة: * \){title}*\nاختر القسم ↓`,
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback(`${emoji.shield} الحماية`, 'nav:shield'),
       Markup.button.callback(`${emoji.ranks} الرتب`, 'nav:ranks')],
      [Markup.button.callback(`${emoji.fun} التسلية`, 'nav:fun'),
       Markup.button.callback(`${emoji.settings} الإعدادات`, 'nav:settings')],
      [Markup.button.callback(`${emoji.home} الرئيسية`, 'nav:home')],
      [Markup.button.url('ᯤ قناة المطور', DEV_CHANNEL)],
    ], { columns: 2 })
  }),

  shieldMenu: () => ({
    text: `${emoji.shield} *قسم الحماية*\nتحكم في الممنوع والمسموح`,
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback('🔗 الروابط', 'toggle:links')],
      [Markup.button.callback('🖼️ الصور', 'toggle:photos')],
      [Markup.button.callback('🎭 الملصقات', 'toggle:stickers')],
      [Markup.button.callback(`${emoji.back} رجوع`, 'nav:home')],
    ])
  }),

  ranksMenu: () => ({
    text: `${emoji.ranks} *إدارة الرتب*\nرفع / تنزيل / تعديل`,
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback('📋 رتب البوت الحالية', 'ranks:list')],
      [Markup.button.callback('✚ رفع مشرف تليجرام', 'admin:start')],
      [Markup.button.callback(`${emoji.back} رجوع`, 'nav:home')],
    ])
  }),

  funMenu: () => ({
    text: `${emoji.fun} *قسم التسلية*\nألعاب وأوامر ممتعة`,
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback('❓ صراحة', 'game:sra7a'),
       Markup.button.callback('🤔 لو خيروك', 'game:khayarok')],
      [Markup.button.callback('🧩 لغز', 'game:quiz'),
       Markup.button.callback(`${emoji.back} رجوع`, 'nav:home')],
    ])
  }),

  commandsList: () => `✦ *أوامر ${BOT_NAME}* ✦

🛡️ الحماية
• قفل / فتح (روابط، صور، فيديو، ملصقات، gif، توجيه، صوتيات)
• كشف (بالرد)

👮 الرتب
• رفع / تنزيل (ادمن | مدير | مميز)
• الرتبة
• تنزيل الكل

🎮 التسلية
• صراحة   • لو خيروك   • لغز
• قل [نص]   • ترجم [نص]

⚙️ عام
• ايدي   • منشن الكل (قيد التطوير)`
};

// ────────────────────────────────────────────────
//               Navigation
// ────────────────────────────────────────────────
bot.action(/nav:(.+)/, async (ctx) => {
  const section = ctx.match[1];
  let ui;

  switch (section) {
    case 'home':    ui = UI.mainMenu(ctx.chat.title); break;
    case 'shield':  ui = UI.shieldMenu(); break;
    case 'ranks':   ui = UI.ranksMenu(); break;
    case 'fun':     ui = UI.funMenu(); break;
    case 'settings':
    case 'cmds':
      return ctx.editMessageText(UI.commandsList(), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 رجوع', 'nav:home')]])
      });
    default: return ctx.answerCbQuery("صفحة غير موجودة");
  }

  await ctx.editMessageText(ui.text, { parse_mode: 'Markdown', ...ui.keyboard });
  ctx.answerCbQuery();
});

// ────────────────────────────────────────────────
//               Lock / Unlock system
// ────────────────────────────────────────────────
const lockable = {
  روابط:    { dbKey: 'lock_links',     types: ['url', 'text_link'] },
  صور:      { dbKey: 'lock_photos',    types: ['photo'] },
  فيديو:    { dbKey: 'lock_videos',    types: ['video'] },
  ملصقات:   { dbKey: 'lock_stickers',  types: ['sticker'] },
  gif:      { dbKey: 'lock_gifs',      types: ['animation'] },
  توجيه:    { dbKey: 'lock_forward',   check: m => !!m.forward_from || !!m.forward_from_chat },
  صوتيات:   { dbKey: 'lock_voice',     types: ['voice'] },
};

bot.hears([/قفل (.*)/i, /فتح (.*)/i, /^قفل\( /, /^فتح \)/], async (ctx) => {
  if (ctx.chat.type === 'private') return;
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL') && !hasPerm(ctx.from.id, ctx.chat.id, 'admin')) {
    return ctx.reply("الأمر للإدارة فقط");
  }

  const text = ctx.message.text.trim();
  const isLock = text.startsWith('قفل');
  let item = text.replace(/^(قفل|فتح)\s*/i, '').trim();

  if (!item) {
    let status = 'حالة القفل:\n\n';
    for (const [n, d] of Object.entries(lockable)) {
      const v = db.groups[ctx.chat.id]?.settings?.[d.dbKey] ?? false;
      status += `${v ? '🔒' : '🔓'} ${n}\n`;
    }
    status += '\nمثال:  قفل روابط   أو   فتح صور';
    return ctx.reply(status);
  }

  const found = Object.entries(lockable).find(([n]) => n.includes(item) || item.includes(n));
  if (!found) return ctx.reply("مش معروف → جرب: روابط، صور، فيديو، ملصقات، gif، توجيه، صوتيات");

  const [, { dbKey }] = found;

  if (!db.groups[ctx.chat.id]) db.groups[ctx.chat.id] = { settings: {}, localRanks: {} };
  db.groups[ctx.chat.id].settings[dbKey] = isLock;

  ctx.reply(`${isLock ? '🔒' : '🔓'} تم \( {isLock ? 'قفل' : 'فتح'} * \){found[0]}*`);
});

// حذف الرسائل المقفولة
bot.on(['message', 'channel_post'], async (ctx, next) => {
  if (ctx.chat.type === 'private') return next();

  const s = db.groups[ctx.chat.id]?.settings || {};

  if (s.lock_links    && ctx.message.entities?.some(e => e.type === 'url' || e.type === 'text_link')) return ctx.deleteMessage().catch(()=>{});
  if (s.lock_photos   && ctx.message.photo)    return ctx.deleteMessage().catch(()=>{});
  if (s.lock_videos   && ctx.message.video)    return ctx.deleteMessage().catch(()=>{});
  if (s.lock_stickers && ctx.message.sticker)  return ctx.deleteMessage().catch(()=>{});
  if (s.lock_gifs     && ctx.message.animation)return ctx.deleteMessage().catch(()=>{});
  if (s.lock_voice    && ctx.message.voice)    return ctx.deleteMessage().catch(()=>{});
  if (s.lock_forward  && (ctx.message.forward_from || ctx.message.forward_from_chat)) {
    return ctx.deleteMessage().catch(()=>{});
  }

  return next();
});

// ────────────────────────────────────────────────
//               رفع مشرف تليجرام (multi-step)
// ────────────────────────────────────────────────
const ADMIN_PERMS = [
  { key: 'can_delete_messages',     label: 'حذف الرسائل'    },
  { key: 'can_restrict_members',    label: 'حظر / كتم'      },
  { key: 'can_pin_messages',        label: 'تثبيت رسائل'    },
  { key: 'can_promote_members',     label: 'رفع/تنزيل مشرفين' },
];

bot.hears('رفع مشرف', async (ctx) => {
  if (!ctx.message.reply_to_message) return ctx.reply("رد على شخص");
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL')) return ctx.reply("للمطور فقط");

  const target = ctx.message.reply_to_message.from;
  ctx.session.adminSetup = {
    targetId: target.id,
    targetName: target.first_name,
    perms: { can_delete_messages: true, can_restrict_members: true, can_pin_messages: true, can_promote_members: false },
    title: "مشرف",
  };

  await showAdminSetup(ctx);
});

async function showAdminSetup(ctx) {
  const setup = ctx.session.adminSetup;
  if (!setup) return;

  const btns = ADMIN_PERMS.map(p => [Markup.button.callback(
    `${setup.perms[p.key] ? emoji.yes : emoji.no} ${p.label}`,
    `admin:toggle:${p.key}`
  )]);

  btns.push([Markup.button.callback(`🏷️ اللقب: ${setup.title}`, 'admin:settitle')]);
  btns.push([
    Markup.button.callback('🚀 حفظ ورفع', 'admin:commit'),
    Markup.button.callback('❌ إلغاء', 'admin:cancel')
  ]);

  const txt = `رفع مشرف جديد\n\n• ${setup.targetName}\n• اللقب: ${setup.title}\n\nعدّل ثم احفظ`;

  try { await ctx.editMessageText(txt, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(btns) }); }
  catch { await ctx.reply(txt, Markup.inlineKeyboard(btns)); }
}

bot.action(/admin:toggle:(.+)/, async (ctx) => {
  const key = ctx.match[1];
  if (!ctx.session.adminSetup) return;
  ctx.session.adminSetup.perms[key] = !ctx.session.adminSetup.perms[key];
  await showAdminSetup(ctx);
  ctx.answerCbQuery();
});

bot.action('admin:settitle', async (ctx) => {
  if (!ctx.session.adminSetup) return;
  await ctx.reply("أرسل اللقب الجديد:", { reply_markup: { force_reply: true } });
  ctx.session.adminSetup.waitingTitle = true;
  ctx.answerCbQuery();
});

bot.action('admin:commit', async (ctx) => {
  const s = ctx.session.adminSetup;
  if (!s) return ctx.answerCbQuery("انتهت الجلسة");

  try {
    await ctx.promoteChatMember(s.targetId, { can_manage_chat: true, ...s.perms });
    await ctx.setChatAdministratorCustomTitle(s.targetId, s.title);
    await ctx.editMessageText(`تم رفع ${s.targetName} → ${s.title}`);
  } catch (err) {
    await ctx.reply(`فشل: ${err.message}\nتأكد من صلاحيات البوت`);
  } finally {
    ctx.session.adminSetup = null;
  }
});

bot.action('admin:cancel', async (ctx) => {
  ctx.session.adminSetup = null;
  await ctx.editMessageText("تم الإلغاء");
});

// ────────────────────────────────────────────────
//               رتب البوت (ادمن / مدير / مميز)
// ────────────────────────────────────────────────
const rankMap = { 'ادمن': 'admin', 'مدير': 'manager', 'مميز': 'vip', 'vip': 'vip' };

bot.hears(/^(رفع|تنزيل)\s+(ادمن|مدير|مميز|vip)/i, async (ctx) => {
  if (ctx.chat.type === 'private') return;
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL') && !hasPerm(ctx.from.id, ctx.chat.id, 'manager')) {
    return ctx.reply("للإدارة العليا فقط");
  }
  if (!ctx.message.reply_to_message) return ctx.reply("رد على الشخص");

  const targetId = ctx.message.reply_to_message.from.id;
  const action = ctx.match[1].toLowerCase() === 'رفع' ? 'add' : 'remove';
  const rankKey = rankMap[ctx.match[2].toLowerCase()];

  if (!db.groups[ctx.chat.id]) db.groups[ctx.chat.id] = { localRanks: {} };
  const ranks = db.groups[ctx.chat.id].localRanks;
  if (!ranks[targetId]) ranks[targetId] = [];

  if (action === 'add') {
    if (!ranks[targetId].includes(rankKey)) {
      ranks[targetId].push(rankKey);
      ctx.reply(`تم رفع → ${rankKey}`);
    } else {
      ctx.reply("عنده الرتبة بالفعل");
    }
  } else {
    const idx = ranks[targetId].indexOf(rankKey);
    if (idx > -1) {
      ranks[targetId].splice(idx, 1);
      ctx.reply(`تم تنزيل ← ${rankKey}`);
    } else {
      ctx.reply("ما عندوش الرتبة دي");
    }
  }
});

bot.hears(['تنزيل الكل', 'مسح رتب'], async (ctx) => {
  if (ctx.chat.type === 'private') return;
  if (!hasPerm(ctx.from.id, ctx.chat.id, 'ALL') && !hasPerm(ctx.from.id, ctx.chat.id, 'manager')) return;
  if (!ctx.message.reply_to_message) return ctx.reply("رد على شخص");

  const tid = ctx.message.reply_to_message.from.id;
  if (db.groups[ctx.chat.id]?.localRanks?.[tid]) {
    delete db.groups[ctx.chat.id].localRanks[tid];
    ctx.reply("تم مسح كل رتب البوت لهذا الشخص");
  }
});

bot.hears(['الرتبة', 'رتبتي'], async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply("في المجموعات فقط");
  const perms = getUserPerms(ctx.from.id, ctx.chat.id);
  let txt = perms.length ? perms.join(" • ") : "عادي";
  if (perms.includes('ALL')) txt = "المطور 🔥";
  ctx.reply(`رتبتك: ${txt}`);
});

// ────────────────────────────────────────────────
//               ايدي
// ────────────────────────────────────────────────
bot.hears(['ايدي', 'id', 'معلوماتي'], async (ctx) => {
  const u = ctx.from;
  let txt = `✦ معلوماتك ✦\n\n` +
            `الاسم: *${u.first_name}* ${u.last_name||''}\n` +
            `يوزر: @${u.username||'مفيش'}\n` +
            `آي دي: \`${u.id}\`\n`;

  if (ctx.chat.type !== 'private') {
    const p = getUserPerms(u.id, ctx.chat.id);
    txt += `\nرتب البوت: ${p.length ? p.join(' • ') : 'مفيش'}`;
  }

  if (u.id === DEVELOPER_ID) txt += "\nأنت المطور يا كبير 🔥";
  ctx.reply(txt, { parse_mode: 'Markdown' });
});

// ────────────────────────────────────────────────
//               ألعاب بسيطة
// ────────────────────────────────────────────────
const sra7a = ["آخر كذبة قلتها امتى؟", "أكتر حاجة بتعيط علشانها؟", "شخص بتحبه ومش عايز تقوله؟"];
const khayrok = ["فيلا فخمة مع ناس تكرههم ولا شقة صغيرة مع ناس بتحبهم؟", "تخسر بصرك ولا سمعك؟"];
const quiz = [
  {q: "أكبر كوكب؟", a: "المشتري"},
  {q: "عاصمة البرازيل؟", a: "برازيليا"},
  {q: "كم سن في فم الإنسان البالغ؟", a: "32"}
];

bot.hears(['صراحة', 'سؤال صراحة'], ctx => ctx.reply(`❔ ${sra7a[Math.floor(Math.random()*sra7a.length)]}`));
bot.hears(['لو خيروك', 'خيروك'], ctx => ctx.reply(`🤔 ${khayrok[Math.floor(Math.random()*khayrok.length)]}`));
bot.hears(['لغز', 'فزورة'], ctx => {
  const q = quiz[Math.floor(Math.random()*quiz.length)];
  ctx.reply(`🧠 ${q.q}\n\nاكتب الإجابة مباشرة`);
  // ملحوظة: لا يوجد تصحيح تلقائي حاليًا
});

// ────────────────────────────────────────────────
//               ترجم + قل
// ────────────────────────────────────────────────
bot.hears(/^ترجم\s+(.+)/i, async (ctx) => {
  const t = ctx.match[1].trim();
  if (!t) return ctx.reply("اكتب النص بعد ترجم");

  try {
    const m = genAI.getGenerativeModel({model: "gemini-1.5-flash"});
    const r = await m.generateContent(`ترجم إلى العربية بشكل طبيعي:\n${t}`);
    ctx.reply(r.response.text());
  } catch {
    ctx.reply("مشكلة في الترجمة .. جرب تاني");
  }
});

bot.hears(/^قل\s+(.+)/i, async (ctx) => {
  const t = ctx.match[1].trim();
  if (!t) return;
  ctx.reply(`"${t}"\n\nقالها ${ctx.from.first_name} 😏`);
});

// ────────────────────────────────────────────────
//               رد ذكي عام (Gemini)
// ────────────────────────────────────────────────
bot.on('text', async (ctx, next) => {
  const setup = ctx.session.adminSetup;

  if (setup?.waitingTitle) {
    setup.title = ctx.message.text.trim();
    setup.waitingTitle = false;
    await ctx.reply(`اللقب الجديد: ${setup.title}`);
    return showAdminSetup(ctx);
  }

  const txt = ctx.message.text;
  const shouldAI =
    txt.toLowerCase().includes('سيلا') ||
    txt.includes(BOT_NAME) ||
    ctx.chat.type === 'private';

  if (!shouldAI) return next();

  await ctx.sendChatAction('typing');

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(
      `أنت ${BOT_NAME} – بوت مصري خفيف وحامي جروبات.\nالمطور @FY_TF\nرد طبيعي مصري مرح.\n\nالرسالة: ${txt}`
    );
    ctx.reply(res.response.text(), { reply_to_message_id: ctx.message.message_id });
  } catch {
    ctx.reply("عقلي اتقل شوية ... قول تاني؟ 😅");
  }
});

// ────────────────────────────────────────────────
//               Start + Menu triggers
// ────────────────────────────────────────────────
bot.start(async (ctx) => {
  if (ctx.chat.type !== 'private') return;
  ctx.replyWithAnimation(START_GIF, {
    caption: `✦ مرحباً في *${BOT_NAME}* ✦\nأسرع بوت حماية + تسلية\nاضغط الأزرار ↓`,
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📜 الأوامر', 'nav:cmds')],
      [Markup.button.url('ᯤ قناة المطور', DEV_CHANNEL)]
    ])
  });
});

bot.hears(['الاوامر', 'أوامر', 'القائمة'], async (ctx) => {
  if (ctx.chat.type === 'private') return;
  const ui = UI.mainMenu(ctx.chat.title);
  ctx.replyWithAnimation(START_GIF, {
    caption: ui.text,
    parse_mode: 'Markdown',
    ...ui.keyboard
  });
});

// ────────────────────────────────────────────────
//               Serverless export (Vercel / ...)
// ────────────────────────────────────────────────
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body, res);
  } else {
    res.status(200).send('سـيـلا شغال 🔥');
  }
};

import { Telegraf, Markup } from 'telegraf';
import { GoogleGenAI } from "@google/genai";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BOT_NAME = "سـيـلا";
const SUDO_ID = 1923931101; 
const CHANNEL_URL = "https://t.me/FY_TF";
const START_IMAGE = 'https://t.me/XX4XV/10';

// قاعدة بيانات في الذاكرة (Memory DB)
const db = {
  groups: {}, 
  users: {},  
  sudo: [SUDO_ID],
  devs: [],   
  privateUsers: new Set()
};

// --- المساعدات ---
const getGroup = (id) => {
  if (!db.groups[id]) {
    db.groups[id] = {
      active: false,
      locks: {
        photo: 'o', sticker: 'o', contact: 'o', doc: 'o', fwd: 'l',
        voice: 'l', link: 'l', audio: 'o', video: 'o', tag: 'l', mark: 'o', bots: 'l'
      },
      ranks: { creators: [], managers: [], admins: [], features: [] },
      filters: [],
      currentGame: null
    };
  }
  return db.groups[id];
};

const getUser = (id) => {
  if (!db.users[id]) db.users[id] = { points: 0, msgs: 0 };
  return db.users[id];
};

const getRank = async (ctx, userId) => {
  if (userId === SUDO_ID) return { title: "مطور اساسي 👨🏻‍✈️", level: 100 };
  if (db.devs.includes(userId)) return { title: "مطور البوت 🗳", level: 95 };
  
  const g = getGroup(ctx.chat.id);
  const member = await ctx.getChatMember(userId).catch(() => ({ status: 'member' }));

  if (member.status === 'creator' || g.ranks.creators.includes(userId)) return { title: "المنشئ 👷🏽", level: 90 };
  if (g.ranks.managers.includes(userId)) return { title: "مدير المجموعة 💼", level: 85 };
  if (member.status === 'administrator' || g.ranks.admins.includes(userId)) return { title: "ادمن في البوت 👨🏼‍🎓", level: 80 };
  if (g.ranks.features.includes(userId)) return { title: "عضو مميز 🎖", level: 50 };
  
  return { title: "عضو 🙍🏼‍♂️", level: 1 };
};

// --- لوحات الأزرار التفاعلية ---
const mainKeyboard = () => Markup.inlineKeyboard([
  [Markup.button.callback('م1 - الرفع والتنزيل 👮', 'menu_1'), Markup.button.callback('م2 - الإعدادات 📟', 'menu_2')],
  [Markup.button.callback('م3 - الحماية والأقفال 🛡️', 'menu_3'), Markup.button.callback('م4 - الألعاب 🎭', 'menu_4')],
  [Markup.button.callback('م المطور 🕹️', 'menu_sudo')],
  [Markup.button.url('قناة السورس 📢', CHANNEL_URL)]
]);

const backButton = Markup.inlineKeyboard([
  [Markup.button.callback('‹ رجوع للقائمة الرئيسية', 'main_menu')]
]);

// --- Middleware الحماية والأقفال ---
bot.on('message', async (ctx, next) => {
  if (!ctx.chat || !ctx.from) return next();
  if (ctx.chat.type === 'private') {
    db.privateUsers.add(ctx.from.id);
    return next();
  }

  const g = getGroup(ctx.chat.id);
  const user = getUser(ctx.from.id);
  user.msgs++;

  if (!g.active && !ctx.message.text?.includes('تفعيل')) return;

  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level >= 80) return next(); 

  // فحص الكلمات الممنوعة
  if (ctx.message.text && g.filters.some(f => ctx.message.text.includes(f))) {
    return ctx.deleteMessage().catch(() => {});
  }

  // فحص الأقفال
  let violate = false;
  const m = ctx.message;
  if (g.locks.link === 'l' && (m.text?.match(/https?:\/\//) || m.entities?.some(e => e.type === 'url'))) violate = true;
  if (g.locks.photo === 'l' && m.photo) violate = true;
  if (g.locks.video === 'l' && m.video) violate = true;
  if (g.locks.voice === 'l' && m.voice) violate = true;
  if (g.locks.sticker === 'l' && m.sticker) violate = true;
  if (g.locks.doc === 'l' && m.document) violate = true;
  if (g.locks.fwd === 'l' && (m.forward_from || m.forward_from_chat)) violate = true;
  
  if (violate) return ctx.deleteMessage().catch(() => {});

  // فحص إجابات الألعاب
  if (g.currentGame && m.text === g.currentGame.answer) {
    user.points++;
    ctx.reply(`🎉¦ مبروك ${ctx.from.first_name}\n🎊¦ فزت بنقطة في لعبة ${g.currentGame.name}\n💰¦ نقاطك: { ${user.points} }`);
    g.currentGame = null;
  }

  return next();
});

// --- معالجة الضغط على الأزرار (Actions) ---
bot.action('main_menu', async (ctx) => {
  await ctx.editMessageText(`‌‌‏❋¦ مـسـآرت آلآوآمـر آلعآمـهہ‌‏ لـ ${BOT_NAME} ⇊`, mainKeyboard());
});

bot.action('menu_1', async (ctx) => {
  const text = `•⊱ أوامر الرفع والتنزيل ⊰•\n\n- رفع/تنزيل منشى\n- رفع/تنزيل مدير\n- رفع/تنزيل ادمن\n- رفع/تنزيل مميز\n\n- حظر / طرد / كتم / تقييد (بالرد)\n- كشف (بالرد لعرض معلومات المستخدم)`;
  await ctx.editMessageText(text, backButton);
});

bot.action('menu_2', async (ctx) => {
  const text = `👨🏽‍✈️¦ أوامر إعدادات المجموعة م2 ::\n\n- ضع اسم [الاسم]\n- الرابط\n- الادمنيه / المنشئين / المدراء\n- ايدي / موقعي / نقاطي\n- مسح [العدد]`;
  await ctx.editMessageText(text, backButton);
});

bot.action('menu_3', async (ctx) => {
  const text = `🛡️¦ أوامر الحماية والأقفال م3 ::\n\n- قفل/فتح الصور\n- قفل/فتح الروابط\n- قفل/فتح الفيديو\n- قفل/فتح البصمات\n- قفل/فتح التوجيه\n- قفل/فتح الملفات\n- قفل/فتح البوتات\n- قفل/فتح الكل`;
  await ctx.editMessageText(text, backButton);
});

bot.action('menu_4', async (ctx) => {
  const text = `🎭¦ قائمة الألعاب والترفيه م4 ::\n\n- ترتيب (لعبة الكلمات)\n- معاني (لعبة الإيموجي)\n- الاسرع (لعبة السرعة)`;
  await ctx.editMessageText(text, backButton);
});

bot.action('menu_sudo', async (ctx) => {
  if (ctx.from.id !== SUDO_ID) return ctx.answerCbQuery("⚠️ هذا القسم للمطور فقط!", { show_alert: true });
  const text = `🕹️¦ أوامر مطور السورس ::\n\n- اذاعه (للكروبات)\n- اذاعه خاص\n- جلب ملف [الاسم]\n- غادر [الايدي]`;
  await ctx.editMessageText(text, backButton);
});

// --- الأوامر النصية الأساسية ---
bot.start((ctx) => {
  if (ctx.chat.type !== 'private') return;
  const text = `💯¦ مـرحبآ آنآ اسمي ${BOT_NAME} 🎖\n💰¦ آختصـآصـي: حـمـايهہ‌‏ آلمـجمـوعآت \n📌¦ من السبام، التوجيه، التكرار والمخلفات.\n🎮¦ مطور البوت: @FY_TF 👨🏽‍🔧`;
  ctx.replyWithPhoto(START_IMAGE, { caption: text, ...devButtons });
});

bot.hears(['تفعيل', 'تفعيل البوت'], async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 90) return ctx.reply("⚠️ هذا الأمر يخص المنشئ أو المطور فقط.");
  const g = getGroup(ctx.chat.id);
  g.active = true;
  ctx.reply("📮¦ تـم تـفـعـيـل الـمـجـمـوعـه ✓️\nاستخدم زر 'الاوامر' لعرض لوحة التحكم.", mainKeyboard());
});

bot.hears('الاوامر', async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 50) return;
  ctx.reply(`‌‌‏❋¦ مـسـآرت آلآوآمـر آلعآمـهہ‌‏ لـ ${BOT_NAME} ⇊`, mainKeyboard());
});

// --- تنفيذ أوامر الرفع والتنزيل (برمجة حقيقية) ---
const handleRank = async (ctx, rankKey, action) => {
  const g = getGroup(ctx.chat.id);
  const myRank = await getRank(ctx, ctx.from.id);
  
  // صلاحيات الرفع
  if (myRank.level < 85) return ctx.reply("⚠️ لا تملك صلاحية لرفع الرتب.");
  if (!ctx.message.reply_to_message) return ctx.reply("⚠️ يجب الرد على المستخدم.");
  
  const targetId = ctx.message.reply_to_message.from.id;
  const targetName = ctx.message.reply_to_message.from.first_name;

  if (action === 'up') {
    if (!g.ranks[rankKey].includes(targetId)) g.ranks[rankKey].push(targetId);
    ctx.reply(`👤¦ العضو » ${targetName}\n🛠¦ تم رفعه بنجاح ✓`);
  } else {
    g.ranks[rankKey] = g.ranks[rankKey].filter(id => id !== targetId);
    ctx.reply(`👤¦ العضو » ${targetName}\n🛠¦ تم تنزيله بنجاح ✓`);
  }
};

bot.hears('رفع منشى', (ctx) => handleRank(ctx, 'creators', 'up'));
bot.hears('تنزيل منشى', (ctx) => handleRank(ctx, 'creators', 'down'));
bot.hears('رفع مدير', (ctx) => handleRank(ctx, 'managers', 'up'));
bot.hears('تنزيل مدير', (ctx) => handleRank(ctx, 'managers', 'down'));
bot.hears('رفع ادمن', (ctx) => handleRank(ctx, 'admins', 'up'));
bot.hears('تنزيل ادمن', (ctx) => handleRank(ctx, 'admins', 'down'));
bot.hears('رفع مميز', (ctx) => handleRank(ctx, 'features', 'up'));
bot.hears('تنزيل مميز', (ctx) => handleRank(ctx, 'features', 'down'));

// --- تنفيذ أوامر القفل والفتح ---
bot.hears(/^(قفل|فتح) (الصور|الروابط|الفيديو|البصمات|التوجيه|البوتات|الملفات|الكل)/, async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 80) return;
  
  const action = ctx.match[1] === 'قفل' ? 'l' : 'o';
  const type = ctx.match[2];
  const g = getGroup(ctx.chat.id);
  
  const map = {
    'الصور': 'photo', 'الروابط': 'link', 'الفيديو': 'video', 
    'البصمات': 'voice', 'التوجيه': 'fwd', 'البوتات': 'bots', 'الملفات': 'doc'
  };

  if (type === 'الكل') {
    Object.keys(g.locks).forEach(k => g.locks[k] = action);
    ctx.reply(`🙋🏼‍♂️¦ تم ${ctx.match[1]} الكل بنجاح ✓`);
  } else {
    g.locks[map[type]] = action;
    ctx.reply(`🙋🏼‍♂️¦ تم ${ctx.match[1]} ${type} بنجاح ✓`);
  }
});

// --- البحث الذكي والزخرفة (AI) ---
bot.hears(/^زخرف (.*)/, async (ctx) => {
  const name = ctx.match[1];
  const response = await aiClient.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `قم بزخرفة الاسم التالي بـ 5 أنماط احترافية للتلجرام: ${name}`
  });
  ctx.reply(response.text || name);
});

bot.hears(/^(اية|حديث|تفسير) (.*)/, async (ctx) => {
  const type = ctx.match[1];
  const query = ctx.match[2];
  const response = await aiClient.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `أنت باحث إسلامي، ابحث عن ${type}: "${query}" واذكر المصدر بدقة.`
  });
  ctx.reply(response.text || "لم أجد نتائج دقيقة.");
});

// --- الويب هوك ---
export default async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send(`Guardia AI Online | Sudo: ${SUDO_ID}`);
  }
};

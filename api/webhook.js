
import { Telegraf, Markup } from 'telegraf';
import { GoogleGenAI } from "@google/genai";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BOT_NAME = "سـيـلا";
const SUDO_ID = 1923931101; 
const CHANNEL_URL = "https://t.me/FY_TF";
const START_IMAGE = 'https://t.me/XX4XV/10';

// محاكاة قاعدة بيانات متقدمة في الذاكرة
const db = {
  groups: {}, // { chatId: { active, locks, ranks: { creators, managers, admins, features }, filters: [] } }
  users: {},  // { userId: { points, msgs } }
  sudo: [SUDO_ID],
  devs: [],   // المطورين المرفوعين
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

const devButtons = Markup.inlineKeyboard([
  [Markup.button.url('قناة السورس', CHANNEL_URL)],
  [Markup.button.url('المطور', 'https://t.me/FY_TF')]
]);

// --- معالجة الرسائل والقواعد ---
bot.on('message', async (ctx, next) => {
  if (!ctx.chat || !ctx.from) return next();
  
  // حفظ مستخدمي الخاص للاذاعة
  if (ctx.chat.type === 'private') db.privateUsers.add(ctx.from.id);

  if (ctx.chat.type !== 'supergroup' && ctx.chat.type !== 'group') return next();

  const g = getGroup(ctx.chat.id);
  const user = getUser(ctx.from.id);
  user.msgs++;

  if (!g.active && !ctx.message.text?.includes('تفعيل')) return next();

  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level >= 80) return next(); // تخطي الادمنية

  // فحص الكلمات الممنوعة (Filters)
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
  if (g.locks.bots === 'l' && m.new_chat_members?.some(u => u.is_bot)) {
    m.new_chat_members.forEach(u => u.is_bot && u.id !== ctx.botInfo.id && ctx.banChatMember(u.id).catch(() => {}));
    violate = true;
  }

  if (violate) return ctx.deleteMessage().catch(() => {});

  // فحص إجابات الألعاب
  if (g.currentGame && m.text === g.currentGame.answer) {
    user.points++;
    ctx.reply(`🎉¦ مبروك <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a>\n🎊¦ لقد فزت بنقطة في لعبة ${g.currentGame.name}\n💰¦ نقاطك الحالية: { ${user.points} }`, { parse_mode: 'HTML' });
    g.currentGame = null;
  }

  return next();
});

// --- الأوامر النصية ---
bot.start((ctx) => {
  if (ctx.chat.type !== 'private') return;
  const text = `💯¦ مـرحبآ آنآ اسمي ${BOT_NAME} 🎖\n💰¦ آختصـآصـي: حـمـايهہ‌‏ آلمـجمـوعآت \n📌¦ من السبام، التوجيه، التكرار والمخلفات.\n🎮¦ مطور البوت: @FY_TF 👨🏽‍🔧`;
  ctx.replyWithPhoto(START_IMAGE, { caption: text, ...devButtons });
});

bot.hears(['تفعيل', 'تفعيل البوت'], async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 90) return ctx.reply("⚠️ هذا الأمر يخص المنشئ أو المطور فقط.");
  const g = getGroup(ctx.chat.id);
  if (g.active) return ctx.reply("🎗¦ المجموعه بالتأكيد ✓️ تم تفعيلها");
  g.active = true;
  ctx.reply("📮¦ تـم تـفـعـيـل الـمـجـمـوعـه ✓️\n👨🏽‍🔧¦ وتم رفع جمـيع آلآدمـنيهہ‌‌‏ بآلبوت.", devButtons);
});

bot.hears('الاوامر', (ctx) => {
  ctx.reply(`‌‌‏❋¦ مـسـآرت آلآوآمـر آلعآمـهہ‌‏ ⇊\n\n👨‍⚖️¦ م1 » آوآمـر آلآدآرهہ‌‏\n📟¦ م2 » آوآمـر آعدآدآت آلمـجمـوعهہ‌‏\n🛡¦ م3 » آوآمـر آلحمـآيهہ‌‏\n🕹¦ م المطور » آوآمـر آلمـطـور\n🗯┇ @FY_TF`, devButtons);
});

bot.hears('م1', (ctx) => ctx.reply("•⊱ آوآمر الرفع والتنزيل ⊰•\n\n- رفع/تنزيل منشى\n- رفع/تنزيل مدير\n- رفع/تنزيل ادمن\n- رفع/تنزيل مميز\n\n- حظر / طرد / كتم / تقييد (بالرد)"));
bot.hears('م2', (ctx) => ctx.reply("👨🏽‍✈️¦ اوامر الوضع للمجموعه ::\n\n- ضع اسم [الاسم]\n- الرابط\n- الادمنيه / المنشئين / المدراء\n- ايدي / موقعي / نقاطي\n- مسح [العدد]"));
bot.hears('م3', (ctx) => ctx.reply("⚡️ اوامر حماية المجموعه ⚡️\n\n- قفل/فتح: (الصور، الروابط، الفيديو، البصمات، التوجيه، الملفات، البوتات، الكل)"));

// --- نظام الألعاب ---
const gameData = {
  tarteeb: [ {q: 'س ا د', a: 'اسد'}, {q: 'ه ا ر س ي', a: 'سياره'}, {q: 'و ن ي ا ف', a: 'ايفون'} ],
  meanings: [ {q: '🚀', a: 'صاروخ'}, {q: '⚽', a: 'كورة'}, {q: '🍎', a: 'تفاحة'} ]
};

bot.hears('ترتيب', (ctx) => {
  const item = gameData.tarteeb[Math.floor(Math.random() * gameData.tarteeb.length)];
  getGroup(ctx.chat.id).currentGame = { name: 'الترتيب', answer: item.a };
  ctx.reply(`اسرع واحد يرتب » { ${item.q} } «`);
});

bot.hears('معاني', (ctx) => {
  const item = gameData.meanings[Math.floor(Math.random() * gameData.meanings.length)];
  getGroup(ctx.chat.id).currentGame = { name: 'المعاني', answer: item.a };
  ctx.reply(`اسرع واحد يدز معنى السمايل » { ${item.q} } «`);
});

// --- أوامر الرفع والتنزيل (بالرد) ---
const handleRank = async (ctx, rankKey, action) => {
  const g = getGroup(ctx.chat.id);
  const myRank = await getRank(ctx, ctx.from.id);
  if (myRank.level < 90 && rankKey !== 'admins') return ctx.reply("⚠️ لا تملك صلاحية كافية.");
  
  if (!ctx.message.reply_to_message) return ctx.reply("⚠️ يجب الرد على المستخدم.");
  const targetId = ctx.message.reply_to_message.from.id;
  
  if (action === 'up') {
    if (!g.ranks[rankKey].includes(targetId)) g.ranks[rankKey].push(targetId);
    ctx.reply(`👤¦ العضو » ${ctx.message.reply_to_message.from.first_name}\n🛠¦ تم رفعه بنجاح ✓`);
  } else {
    g.ranks[rankKey] = g.ranks[rankKey].filter(id => id !== targetId);
    ctx.reply(`👤¦ العضو » ${ctx.message.reply_to_message.from.first_name}\n🛠¦ تم تنزيله بنجاح ✓`);
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

// --- أوامر المنع ---
bot.hears(/^منع (.*)/, async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 80) return;
  const word = ctx.match[1].trim();
  const g = getGroup(ctx.chat.id);
  if (!g.filters.includes(word)) g.filters.push(word);
  ctx.reply(`تـم 🚷 منـ؏ الـ(${word}) 💯`);
});

bot.hears(/^الغاء منع (.*)/, async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 80) return;
  const word = ctx.match[1].trim();
  const g = getGroup(ctx.chat.id);
  g.filters = g.filters.filter(w => w !== word);
  ctx.reply(`تـم 🚷 إلغـاء منـ؏ الـ(${word}) 💯`);
});

// --- الأوامر الإدارية ---
bot.hears('حظر', async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 80 || !ctx.message.reply_to_message) return;
  await ctx.banChatMember(ctx.message.reply_to_message.from.id);
  ctx.reply("🚷 تم الحظر بنجاح ✓");
});

bot.hears('طرد', async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 80 || !ctx.message.reply_to_message) return;
  await ctx.kickChatMember(ctx.message.reply_to_message.from.id);
  await ctx.unbanChatMember(ctx.message.reply_to_message.from.id);
  ctx.reply("👞 تم الطرد بنجاح ✓");
});

bot.hears('مسح', async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 80) return;
  const count = parseInt(ctx.message.text.split(' ')[1]) || 10;
  for (let i = 0; i < count; i++) {
    ctx.deleteMessage(ctx.message.message_id - i).catch(() => {});
  }
});

// --- أوامر السودو (المطور) ---
bot.hears('اذاعه', async (ctx) => {
  if (ctx.from.id !== SUDO_ID) return;
  ctx.reply("ارسل الآن نص الإذاعة للمجموعات...");
  db.sudoMode = 'broadcast_groups';
});

bot.hears('اذاعه خاص', async (ctx) => {
  if (ctx.from.id !== SUDO_ID) return;
  ctx.reply("ارسل الآن نص الإذاعة للخاص...");
  db.sudoMode = 'broadcast_private';
});

// مراقب الإذاعة والزخرفة
bot.on('text', async (ctx, next) => {
  if (db.sudoMode && ctx.from.id === SUDO_ID) {
    const text = ctx.message.text;
    if (db.sudoMode === 'broadcast_groups') {
      Object.keys(db.groups).forEach(id => bot.telegram.sendMessage(id, text).catch(() => {}));
      ctx.reply("✅ تمت الإذاعة للمجموعات.");
    } else if (db.sudoMode === 'broadcast_private') {
      db.privateUsers.forEach(id => bot.telegram.sendMessage(id, text).catch(() => {}));
      ctx.reply("✅ تمت الإذاعة للخاص.");
    }
    delete db.sudoMode;
    return;
  }

  // زخرفة ذكية باستخدام AI
  if (ctx.message.text?.startsWith('زخرف ')) {
    const name = ctx.message.text.replace('زخرف ', '');
    const res = await aiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `قم بزخرفة هذا الاسم بـ 5 أشكال احترافية عربية: ${name}`
    });
    return ctx.reply(res.text || name);
  }

  return next();
});

// --- الردود العشوائية ---
bot.hears(['هلو', 'سلام'], (ctx) => ctx.reply("هلووات 😊🌹"));
bot.hears('انجب', (ctx) => ctx.reply("حاضر تاج راسي انجبيت 😇"));
bot.hears('السفاح المصري', (ctx) => ctx.reply("نعم حبي 😎.. امرني؟"));

// --- الويب هوك ---
export default async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      res.status(500).send('Webhook Error');
    }
  } else {
    res.status(200).send(`Guardia AI Pro Active | Sudo: ${SUDO_ID}`);
  }
};

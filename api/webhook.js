
import { Telegraf, Markup } from 'telegraf';
import { GoogleGenAI } from "@google/genai";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BOT_NAME = "سـيـلا";
const DEVELOPER_ID = 1733610663; // الايدي من ملف PHP
const CHANNEL_URL = "https://t.me/xxllxxi";

// محاكاة قاعدة البيانات (Ported from PHP logic)
const db = {
  groups: {},
  sudo: [DEVELOPER_ID],
  devs: [],
  global_bans: []
};

const getSettings = (chatId) => {
  if (!db.groups[chatId]) {
    db.groups[chatId] = {
      id: chatId,
      title: 'Group',
      lockLinks: true, lockAbuse: true, lockForward: false,
      lockPhotos: false, lockVideos: false, lockStickers: false,
      lockVoice: false, lockAudio: false, lockAnimation: false,
      lockDocuments: false, lockInline: false, lockBots: true,
      lockContacts: false, lockNotices: false, lockChat: false,
      aiEnabled: true, aiMode: 'smart',
      warnLimit: 3, muteDuration: 10, punishment: 'warn',
      welcomeEnabled: true, antiLiquidation: true,
      admins: [], managers: [], features: [],
      silencers: [], baners: [], enrollers: [],
      spamLimit: 5, idPhoto: true
    };
  }
  return db.groups[chatId];
};

// --- Middleware الحماية (Ported logic) ---
bot.use(async (ctx, next) => {
  if (!ctx.chat || ctx.chat.type === 'private' || !ctx.message) return next();

  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const s = getSettings(chatId);

  // تخطي المطور والملاك والمشرفين
  const member = await ctx.getChatMember(userId).catch(() => ({ status: 'member' }));
  const isAdmin = ['administrator', 'creator'].includes(member.status) || 
                  db.sudo.includes(userId) || s.admins.includes(userId) || s.managers.includes(userId);

  if (isAdmin) return next();

  // فحص الكتم
  if (s.silencers.includes(userId)) {
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  // فحص الحماية (Locks)
  let violation = false;
  if (s.lockLinks && (ctx.message.text?.match(/https?:\/\//) || ctx.message.entities?.some(e => e.type === 'url'))) violation = true;
  if (s.lockForward && (ctx.message.forward_from || ctx.message.forward_from_chat)) violation = true;
  if (s.lockPhotos && ctx.message.photo) violation = true;
  if (s.lockStickers && ctx.message.sticker) violation = true;
  if (s.lockVideos && ctx.message.video) violation = true;
  if (s.lockChat && ctx.message.text) violation = true;

  if (violation) {
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  return next();
});

// --- الأوامر الرئيسية (م1-م5) ---
bot.hears(['الاوامر', 'م'], async (ctx) => {
  const text = `
اهلا بك : ${ctx.from.first_name}
 
*في قائمة الاوامر الاساسية ✅*
•--------------» [قناة السورس](${CHANNEL_URL}) «--------------•
م1 •⊱ *لعرض اوامر البحث (AI)*
م2 •⊱ *لعرض اوامر القفل والفتح*
م3 •⊱ *لعرض اوامر الرفع والتنزيل*
م4 •⊱ *لعرض اوامر الحماية*
م5 •⊱ *لشرح الأوامر والتعليمات*

*● ملاحظة: البوت يحمي مجموعتك بالذكاء الاصطناعي.*
`;
  ctx.reply(text, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

bot.hears('م1', (ctx) => {
  ctx.reply(`
*في قائمة اوامر البحث (مدعوم بـ AI) 🔍*
━━━━━━━━━━━━
• اية [النص] : للبحث عن آية وتفسيرها.
• سورة [الاسم] : لجلب معلومات عن السورة.
• تفسير [النص] : تفسير آية معينة (ميسر/جلالين).
• حديث [النص] : البحث عن الأحاديث الشريفة.
━━━━━━━━━━━━
*ملاحظة: يمكنك سؤال البوت مباشرة عن أي شيء ديني.*
`, { parse_mode: 'Markdown' });
});

bot.hears('م2', (ctx) => {
  ctx.reply(`
*قائمة القفل والفتح 🔒*
━━━━━━━━━━━━
• قفل / فتح : (الروابط، الصور، الفيديو، الملصقات، التوجيه، الدردشة، الاشعارات، الانلاين، البوتات).
• الاعدادات : لعرض حالة القفل الحالية.
━━━━━━━━━━━━
`, { parse_mode: 'Markdown' });
});

bot.hears('م3', (ctx) => {
  ctx.reply(`
*قائمة الرفع والتنزيل 👮*
━━━━━━━━━━━━
• رفع / تنزيل مدير (بالرد).
• رفع / تنزيل ادمن (بالرد).
• رفع / تنزيل مميز (بالرد).
• المدراء / الادمنيه / المميزين : لعرض القوائم.
━━━━━━━━━━━━
`, { parse_mode: 'Markdown' });
});

bot.hears('م4', (ctx) => {
  ctx.reply(`
*قائمة الحماية والتقييد 🛡️*
━━━━━━━━━━━━
• كتم / الغاء كتم (بالرد).
• حظر / الغاء حظر (بالرد).
• تقييد / الغاء التقييد (بالرد).
• طرد (بالرد).
• المكتومين / المحظورين / المقيدين : لعرض القوائم.
━━━━━━━━━━━━
`, { parse_mode: 'Markdown' });
});

// --- نظام البحث الذكي (Gemini Implementation) ---
bot.hears(/^(اية|تفسير|حديث|سورة) (.*)/, async (ctx) => {
  const type = ctx.match[1];
  const query = ctx.match[2];
  await ctx.sendChatAction('typing');

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `أنت مساعد ديني متخصص. قم بالبحث عن ${type} التالي: "${query}". 
      إذا كانت آية، اذكرها مع التفسير الميسر. إذا كان حديثاً، اذكر صحته. رد بتنسيق جميل ومنظم.`,
    });
    ctx.reply(response.text || "لم أجد نتائج دقيقة.");
  } catch (e) {
    ctx.reply("عذراً، فشل الاتصال بمحرك البحث.");
  }
});

// --- أمر ايدي (Ported from PHP) ---
bot.hears('ايدي', async (ctx) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const s = getSettings(chatId);
  
  let rank = "عضو";
  if (db.sudo.includes(userId)) rank = "المطور الأساسي 👑";
  else if (s.admins.includes(userId)) rank = "ادمن في البوت 👮";
  else if (s.managers.includes(userId)) rank = "مدير في البوت 💼";
  else if (s.features.includes(userId)) rank = "عضو مميز ✨";

  const member = await ctx.getChatMember(userId).catch(() => ({ status: 'member' }));
  if (member.status === 'creator') rank = "المالك (المنشىء) 💎";

  const text = `
✅¦ اسمك •⊱ ${ctx.from.first_name}
✅¦ ايديك •⊱ \`${userId}\`
✅¦ رتبتك •⊱ *${rank}*
`;

  if (s.idPhoto) {
    const photos = await ctx.telegram.getUserProfilePhotos(userId).catch(() => ({ total_count: 0 }));
    if (photos.total_count > 0) {
      return ctx.replyWithPhoto(photos.photos[0][0].file_id, { caption: text, parse_mode: 'Markdown' });
    }
  }
  ctx.reply(text, { parse_mode: 'Markdown' });
});

// --- أوامر القفل والفتح (Ported Logic) ---
bot.hears(/^(قفل|فتح) (.*)/, async (ctx) => {
  const action = ctx.match[1];
  const feature = ctx.match[2];
  const chatId = ctx.chat.id;
  const s = getSettings(chatId);

  const isAdmin = (await ctx.getChatMember(ctx.from.id)).status !== 'member' || db.sudo.includes(ctx.from.id);
  if (!isAdmin) return;

  const map = {
    'الروابط': 'lockLinks', 'الصور': 'lockPhotos', 'الفيديو': 'lockVideos',
    'الملصقات': 'lockStickers', 'التوجيه': 'lockForward', 'الدردشة': 'lockChat',
    'البوتات': 'lockBots'
  };

  const key = map[feature];
  if (key) {
    s[key] = (action === 'قفل');
    ctx.reply(`*تم ${action} ${feature} بنجاح ✅*`, { parse_mode: 'Markdown' });
  }
});

// --- معالجة الرسائل العامة والرد الذكي ---
bot.on('text', async (ctx, next) => {
  const chatId = ctx.chat.id;
  const s = getSettings(chatId);
  const msg = ctx.message.text;

  if (s.aiEnabled && (msg.includes(BOT_NAME) || ctx.chat.type === 'private')) {
    await ctx.sendChatAction('typing');
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: msg,
        config: { systemInstruction: `أنت ${BOT_NAME}، بوت حماية وتفاعل. رد باللهجة المصرية إذا سألك العضو عن حالك. تخصصك الحماية والدين.` }
      });
      ctx.reply(response.text || "أنا هنا لحماية مجموعتك!", { reply_to_message_id: ctx.message.message_id });
    } catch (e) {}
  }
  return next();
});

export default async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } else {
    res.status(200).send('Sila Professional Guard Online (Ported from PHP Source)');
  }
};

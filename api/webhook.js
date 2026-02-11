
import { Telegraf, Markup } from 'telegraf';
import { GoogleGenAI } from "@google/genai";

// التأكد من وجود التوكنات
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("خطأ: TELEGRAM_BOT_TOKEN غير موجود في إعدادات Vercel!");
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BOT_NAME = "سـيـلا";
const DEVELOPER_ID = 1733610663; 
const CHANNEL_URL = "https://t.me/xxllxxi";
const START_IMAGE = 'https://t.me/XX4XV/10'; // الصورة من سورس PHP

// قاعدة بيانات وهمية (يتم تصفيرها عند إعادة تشغيل السيرفر - للإنتاج يفضل Firebase)
const db = {
  groups: {},
  sudo: [DEVELOPER_ID],
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
      lockChat: false, lockBots: true,
      aiEnabled: true, aiMode: 'smart',
      warnLimit: 3, punishment: 'warn',
      admins: [], managers: [], features: [],
      silencers: [], baners: [], idPhoto: true
    };
  }
  return db.groups[chatId];
};

// --- Middleware الحماية ---
bot.use(async (ctx, next) => {
  if (!ctx.chat || !ctx.from || !ctx.message) return next();
  if (ctx.chat.type === 'private') return next();

  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const s = getSettings(chatId);

  // رتبة المستخدم
  const member = await ctx.getChatMember(userId).catch(() => ({ status: 'member' }));
  const isOwner = member.status === 'creator' || db.sudo.includes(userId);
  const isAdmin = ['administrator', 'creator'].includes(member.status) || 
                  db.sudo.includes(userId) || s.managers.includes(userId) || s.admins.includes(userId);

  // الكشف عن محاولات التصفية (Anti-Liquidation)
  if (ctx.update.chat_member) {
    const cm = ctx.update.chat_member;
    if (cm.old_chat_member.status === 'administrator' && cm.new_chat_member.status !== 'administrator') {
      if (cm.from.id !== DEVELOPER_ID) {
        await ctx.banChatMember(cm.from.id).catch(() => {});
        return ctx.reply(`🚨 محاولة تصفية من [${cm.from.first_name}](tg://user?id=${cm.from.id}) - تم الحظر.`, { parse_mode: 'Markdown' });
      }
    }
  }

  if (isAdmin) return next();

  // فحص المكتومين
  if (s.silencers.includes(userId)) {
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  // الحماية التلقائية
  let violation = false;
  const text = ctx.message.text || '';
  if (s.lockLinks && (text.match(/https?:\/\//) || text.includes('t.me/'))) violation = true;
  if (s.lockForward && (ctx.message.forward_from || ctx.message.forward_from_chat)) violation = true;
  if (s.lockPhotos && ctx.message.photo) violation = true;
  if (s.lockChat && ctx.chat.type !== 'private') {
    // منطق قفل الدردشة يمكن تفعيله هنا
  }

  if (violation) {
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  return next();
});

// --- الأوامر (م1-م5) ---
bot.start((ctx) => {
  if (ctx.chat.type !== 'private') return;
  ctx.replyWithPhoto(START_IMAGE, {
    caption: `*↯︙أهلآ بك في بوت ${BOT_NAME}
↯︙اختصاص البوت حماية المجموعات
↯︙ارسل كلمة { تفعيل } ليتم تفعيل المجموعه
↯︙مطور البوت ← @Ainnn*`,
    parse_mode: 'MarkDown',
    ...Markup.inlineKeyboard([
      [Markup.button.url('• أضف البوت لمجموعتك •', `https://t.me/${ctx.botInfo.username}?startgroup=new`)],
      [Markup.button.url('قناة المطور', 'https://t.me/xxllxxi')]
    ])
  });
});

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
`;
  ctx.reply(text, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

bot.hears('م1', (ctx) => ctx.reply(`*اوامر البحث (AI):*\n- اية [النص]\n- حديث [النص]\n- سورة [الاسم]\n- تفسير [النص]\n- بحث [سؤال ديني]`, { parse_mode: 'Markdown' }));
bot.hears('م2', (ctx) => ctx.reply(`*اوامر القفل/الفتح:*\n- قفل/فتح الروابط\n- قفل/فتح الصور\n- قفل/فتح التوجيه\n- قفل/فتح الدردشة\n- قفل/فتح البوتات`, { parse_mode: 'Markdown' }));
bot.hears('م3', (ctx) => ctx.reply(`*اوامر الرتب:*\n- رفع/تنزيل مدير\n- رفع/تنزيل ادمن\n- رفع/تنزيل مميز\n- المدراء / الادمنيه`, { parse_mode: 'Markdown' }));
bot.hears('م4', (ctx) => ctx.reply(`*اوامر الحماية:*\n- كتم / حظر / تقييد / طرد\n- المكتومين / المحظورين / المقيدين`, { parse_mode: 'Markdown' }));

// --- نظام البحث (Gemini) ---
bot.hears(/^(اية|تفسير|حديث|سورة|بحث) (.*)/, async (ctx) => {
  const query = ctx.match[2];
  await ctx.sendChatAction('typing');
  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `أنت مساعد ديني. ابحث عن: "${query}". اذكر المصادر.`,
    });
    ctx.reply(response.text || "لم أجد نتائج.");
  } catch (e) { ctx.reply("خطأ في البحث."); }
});

// --- أمر ايدي ---
bot.hears('ايدي', async (ctx) => {
  const userId = ctx.from.id;
  const s = getSettings(ctx.chat.id);
  const member = await ctx.getChatMember(userId).catch(() => ({ status: 'member' }));
  
  let rank = "عضو";
  if (db.sudo.includes(userId)) rank = "مطور السورس 👑";
  else if (member.status === 'creator') rank = "المالك 💎";
  else if (isAdmin(member.status)) rank = "مشرف 👮";
  
  const caption = `✅¦ اسمك •⊱ ${ctx.from.first_name}\n✅¦ ايديك •⊱ \`${userId}\`\n✅¦ رتبتك •⊱ *${rank}*`;
  
  if (s.idPhoto) {
    const photos = await ctx.telegram.getUserProfilePhotos(userId).catch(() => ({ total_count: 0 }));
    if (photos.total_count > 0) return ctx.replyWithPhoto(photos.photos[0][0].file_id, { caption, parse_mode: 'Markdown' });
  }
  ctx.reply(caption, { parse_mode: 'Markdown' });
});

function isAdmin(status) { return ['administrator', 'creator'].includes(status); }

// معالج Vercel
export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
    }
    res.status(200).send('Guardia AI Running');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};

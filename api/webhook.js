
import { Telegraf, Markup } from 'telegraf';
import { GoogleGenAI } from "@google/genai";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BOT_NAME = "سـيـلا";
const DEVELOPER_ID = 1733610663; 
const CHANNEL_URL = "https://t.me/xxllxxi";
const START_IMAGE = 'https://t.me/XX4XV/10';

// محاكاة قاعدة بيانات متطورة (يتم حفظها في الذاكرة - يفضل استخدام Database للإنتاج)
const db = {
  groups: {},
  sudo: [DEVELOPER_ID],
  global_bans: []
};

// --- مساعدات الإدارة ---
const getSettings = (chatId) => {
  if (!db.groups[chatId]) {
    db.groups[chatId] = {
      id: chatId,
      activated: false,
      locks: {
        links: true, photo: false, video: false, stickers: false,
        forward: true, chat: false, notices: true, bots: true,
        voice: false, audio: false, animation: false, inline: false,
        users: false, edit: false, mark: false, channels: true
      },
      warnLimit: 3,
      punishment: 'warn',
      admins: [], // مصفوفة ايديهات الادمنية المرفوعين بالبوت
      managers: [], // مصفوفة ايديهات المدراء
      features: [], // مصفوفة ايديهات المميزين
      silencers: [], // المكتومين
      baners: [], // المحظورين
      enrollers: [], // المقيدين
      spamCount: 5
    };
  }
  return db.groups[chatId];
};

const getRank = async (ctx, userId) => {
  if (db.sudo.includes(userId)) return { title: "مطور السورس 👑", level: 100 };
  
  const chatId = ctx.chat.id;
  const s = getSettings(chatId);
  const member = await ctx.getChatMember(userId).catch(() => ({ status: 'member' }));
  
  if (member.status === 'creator') return { title: "المنشئ الأساسي 💎", level: 90 };
  if (s.managers.includes(userId)) return { title: "مدير المجموعة 💼", level: 80 };
  if (member.status === 'administrator') return { title: "مشرف المجموعة 👮", level: 70 };
  if (s.admins.includes(userId)) return { title: "ادمن البوت 👮", level: 60 };
  if (s.features.includes(userId)) rank = { title: "عضو مميز ✨", level: 50 };
  
  return { title: "عضو 👤", level: 1 };
};

// --- واجهة القوائم (Buttons) ---
const mainKeyboard = () => Markup.inlineKeyboard([
  [Markup.button.callback('م1 (البحث AI) 🔍', 'menu_1'), Markup.button.callback('م2 (القفل والفتح) 🔒', 'menu_2')],
  [Markup.button.callback('م3 (الرتب) 👮', 'menu_3'), Markup.button.callback('م4 (الحماية) 🛡️', 'menu_4')],
  [Markup.button.callback('م5 (التعليمات) 📖', 'menu_5')],
  [Markup.button.url('قناة المطور', CHANNEL_URL)]
]);

// --- Middleware الحماية ---
bot.use(async (ctx, next) => {
  if (!ctx.chat || !ctx.from || !ctx.message) return next();
  if (ctx.chat.type === 'private') return next();

  const s = getSettings(ctx.chat.id);
  if (!s.activated && !ctx.message.text?.includes('تفعيل')) return next();

  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level >= 70) return next(); // تخطي المشرفين

  // فحص الكتم
  if (s.silencers.includes(ctx.from.id)) {
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  // فحص الأقفال
  let violate = false;
  const msg = ctx.message;
  if (s.locks.links && (msg.text?.match(/https?:\/\//) || msg.entities?.some(e => e.type === 'url'))) violate = true;
  if (s.locks.photo && msg.photo) violate = true;
  if (s.locks.video && msg.video) violate = true;
  if (s.locks.stickers && msg.sticker) violate = true;
  if (s.locks.forward && (msg.forward_from || msg.forward_from_chat)) violate = true;
  if (s.locks.bots && msg.new_chat_members?.some(m => m.is_bot)) {
    for (const m of msg.new_chat_members) if (m.is_bot) await ctx.banChatMember(m.id).catch(() => {});
    violate = true;
  }

  if (violate) {
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  return next();
});

// --- الأوامر النصية ---
bot.start((ctx) => {
  if (ctx.chat.type !== 'private') return;
  ctx.replyWithPhoto(START_IMAGE, {
    caption: `أهلاً بك في نظام ${BOT_NAME} المتطور 🛡️\n\nنظام حماية شامل مع دعم الذكاء الاصطناعي.\n\nاستخدم الأزرار للتنقل 👇`,
    ...Markup.inlineKeyboard([
      [Markup.button.url('أضف البوت لمجموعتك ➕', `https://t.me/${ctx.botInfo.username}?startgroup=new`)],
      [Markup.button.callback('شرح الأوامر 📋', 'menu_5')]
    ])
  });
});

bot.hears(['تفعيل', 'تفعيل البوت'], async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 90) return ctx.reply("⚠️ هذا الأمر يخص المنشئ أو المطور فقط.");
  
  const s = getSettings(ctx.chat.id);
  if (s.activated) return ctx.reply("✅ المجموعة مفعلة مسبقاً.");
  
  s.activated = true;
  ctx.reply(`✅ تم تفعيل المجموعة بنجاح.\nبواسطة: ${ctx.from.first_name}\n\nارسل 'الاوامر' لعرض لوحة التحكم.`, mainKeyboard());
});

bot.hears(['الاوامر', 'م', 'اعدادات'], async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 60) return;
  ctx.reply(`قائمة التحكم في ${BOT_NAME} 🛡️\nالمجموعة: ${ctx.chat.title}`, mainKeyboard());
});

bot.hears('ايدي', async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  const s = getSettings(ctx.chat.id);
  const text = `
✅¦ اسمك •⊱ ${ctx.from.first_name}
✅¦ ايديك •⊱ \`${ctx.from.id}\`
✅¦ رتبتك •⊱ *${rank.title}*
`;
  if (s.idPhoto) {
    const photos = await ctx.telegram.getUserProfilePhotos(ctx.from.id).catch(() => ({ total_count: 0 }));
    if (photos.total_count > 0) return ctx.replyWithPhoto(photos.photos[0][0].file_id, { caption: text, parse_mode: 'Markdown' });
  }
  ctx.reply(text, { parse_mode: 'Markdown' });
});

// --- معالجة الأزرار (Actions) ---
bot.action(/menu_(\d+)/, async (ctx) => {
  const page = ctx.match[1];
  let text = "";
  let buttons = [];

  switch(page) {
    case '1':
      text = "🔍 *قائمة البحث والذكاء الاصطناعي*:\n- اية [النص]\n- حديث [النص]\n- سورة [الاسم]\n- تفسير [النص]\n- بحث [أي سؤال]";
      break;
    case '2':
      text = "🔒 *إعدادات القفل والفتح*:\nاستخدم الأوامر النصية مثل (قفل الروابط) للتحكم.";
      break;
    case '3':
      text = "👮 *إعدادات الرتب*:\n- رفع/تنزيل مدير\n- رفع/تنزيل ادمن\n- رفع/تنزيل مميز\n*(يتم الرد على الشخص)*";
      break;
    case '4':
      text = "🛡️ *إعدادات الحماية*:\n- كتم / حظر / طرد\n- المكتومين / المحظورين";
      break;
    case '5':
      text = "📖 *تعليمات الاستخدام*:\nالبوت يعمل تلقائياً بمجرد التفعيل. يتم حذف الروابط والسبام والرسائل المسيئة عبر AI.";
      break;
  }
  
  await ctx.editMessageText(text, { 
    parse_mode: 'Markdown', 
    ...Markup.inlineKeyboard([[Markup.button.callback('‹ رجوع', 'back_main')]]) 
  });
});

bot.action('back_main', (ctx) => {
  ctx.editMessageText(`قائمة التحكم في ${BOT_NAME} 🛡️`, mainKeyboard());
});

// --- أوامر البحث الذكي م1 ---
bot.hears(/^(اية|حديث|تفسير|سورة|بحث) (.*)/, async (ctx) => {
  const type = ctx.match[1];
  const query = ctx.match[2];
  await ctx.sendChatAction('typing');
  
  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `أنت مساعد ديني خبير. طلب المستخدم هو ${type} عن: "${query}". قم بالرد بدقة مع ذكر المصدر وتنسيق النص.`,
    });
    ctx.reply(response.text || "لم أجد نتائج دقيقة.");
  } catch (e) {
    ctx.reply("❌ حدث خطأ في محرك البحث الذكي.");
  }
});

// --- الأوامر الإدارية (كتم، حظر، إلخ) ---
bot.hears(['كتم', 'حظر', 'طرد', 'تقييد'], async (ctx) => {
  const rank = await getRank(ctx, ctx.from.id);
  if (rank.level < 70) return;
  if (!ctx.message.reply_to_message) return ctx.reply("⚠️ يجب الرد على رسالة المستخدم.");

  const targetId = ctx.message.reply_to_message.from.id;
  const action = ctx.message.text;
  const s = getSettings(ctx.chat.id);

  try {
    if (action === 'كتم') {
      s.silencers.push(targetId);
      ctx.reply("🔇 تم كتم المستخدم بنجاح.");
    } else if (action === 'حظر') {
      await ctx.banChatMember(targetId);
      ctx.reply("🚷 تم حظر المستخدم بنجاح.");
    } else if (action === 'طرد') {
      await ctx.kickChatMember(targetId);
      await ctx.unbanChatMember(targetId);
      ctx.reply("👞 تم طرد المستخدم.");
    }
  } catch (e) {
    ctx.reply("❌ فشل تنفيذ الأمر. تأكد من صلاحيات البوت.");
  }
});

// --- معالجة الـ Webhook لـ Vercel ---
export default async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error(err);
      res.status(500).send('Webhook Error');
    }
  } else {
    res.status(200).send('Guardia AI Professional Active');
  }
};

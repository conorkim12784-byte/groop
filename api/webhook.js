
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const BOT_NAME = "Guardia Pro";
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// مخزن البيانات (يفضل مستقبلاً استخدام قاعدة بيانات)
let db = {
  permissions: { [DEVELOPER_ID]: { role: 'DEV' } },
  settings: { antiLink: true, antiBadWords: true, antiNsfw: true },
  customResponses: {},
  stats: { users: new Set(), groups: new Set() }
};

// --- المساعدات (Helpers) ---
const checkRank = (userId) => {
  if (Number(userId) === DEVELOPER_ID) return { label: '👑 المطور الأسسي', level: 5 };
  const user = db.permissions[userId];
  if (!user) return { label: '👤 عضو', level: 0 };
  const ranks = {
    'G_ADMIN': { label: '🌐 مدير عام', level: 4 },
    'M_MANAGER': { label: '🛡️ مدير مجموعة', level: 3 },
    'M_ADMIN': { label: '👮 أدمن', level: 2 },
    'M_VIP': { label: '✨ مميز', level: 1 }
  };
  return ranks[user.role] || { label: '👤 عضو', level: 0 };
};

const isAdmin = (userId) => checkRank(userId).level >= 2;

// --- القوائم (Menus) ---
const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('‹ الأوامر ›', 'menu_cmds')],
  [Markup.button.url('‹ قناة البوت ›', 'https://t.me/YourChannel')],
  [Markup.button.url('‹ أضف البوت الى مجموعتك ›', `https://t.me/${process.env.BOT_USERNAME || 'bot'}?startgroup=true`)],
  [Markup.button.callback('‹ المطور ›', 'menu_dev'), Markup.button.callback('‹ لغات البوت ›', 'menu_lang')]
]);

const cmdsKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('أوامر الحماية', 'cmds_shield'), Markup.button.callback('أوامر الرتب', 'cmds_ranks')],
  [Markup.button.callback('أوامر الردود', 'cmds_resp'), Markup.button.callback('أوامر المنع', 'cmds_prevent')],
  [Markup.button.callback('الأوامر الإضافية', 'cmds_extra')],
  [Markup.button.callback('العودة', 'menu_main')]
]);

// --- الأوامر الأساسية ---
bot.start((ctx) => {
  db.stats.users.add(ctx.from.id);
  return ctx.replyWithAnimation(START_IMAGE, {
    caption: `≡ اهلا بك عزيزي انا بوت ${BOT_NAME}\n≡ يمكنني حماية مجموعتك وتسلية الأعضاء\n≡ ادعم الردود الذكية والمنع التلقائي\n\nصلِ على النبي وتبسم ❤️✨`,
    ...mainKeyboard
  });
});

bot.action('menu_main', (ctx) => ctx.editMessageCaption(`≡ اهلا بك عزيزي انا بوت ${BOT_NAME} ...`, mainKeyboard));
bot.action('menu_cmds', (ctx) => ctx.editMessageCaption(`≡ قائمة الأوامر المتاحة في البوت ⚡:\n\nاختر القسم الذي تريد استكشافه من الأسفل:`, cmdsKeyboard));

// استجابات أقسام الأوامر (مطابقة للصور)
bot.action('cmds_shield', (ctx) => {
  const text = `⚡ *اوامر الحماية :*\n\n» كتم - الغاء كتم - مسح المكتومين\n» تقييد - الغاء تقييد - مسح المقيدين\n» حظر - الغاء حظر - مسح المحظورين\n» مسح + الرد - مسح + عدد الرسائل\n\n» المشرفين - جلب قائمة المشرفين\n» البوتات - جلب قائمة البوتات\n» طرد البوتات - حذف البوتات`;
  ctx.editMessageCaption(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('العودة', 'menu_cmds')]]) });
});

bot.action('cmds_prevent', (ctx) => {
  const text = `⚡ *اوامر المنع :*\n\n» منع الروابط - فتح الروابط\n» منع الاساءة - فتح الاساءة\n» منع الاباحي - فتح الاباحي\n» منع التوجيه - فتح التوجيه\n\n- الاوامر متاحه في المجموعات والقنوات\n- يتم التعامل مع المخالفين تلقائياً`;
  ctx.editMessageCaption(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('العودة', 'menu_cmds')]]) });
});

bot.action('cmds_extra', (ctx) => {
  const text = `⚡ *الاوامر الإضافية :*\n\n• صراحه » اسئلة صراحه\n• تويت » اسئلة ترفيهيه\n• اعلام » معرفة الاعلام\n• لغز » الغاز مشهوره\n• مشاهير » معرفة المشاهير\n• لو خيروك » اختار حاجه من اتنين\n• تحدي » تحديات مسليه`;
  ctx.editMessageCaption(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('العودة', 'menu_cmds')]]) });
});

// --- نظام الرتب (بالرد) ---
bot.on('message', async (ctx, next) => {
  if (ctx.message.reply_to_message && ctx.from.id === DEVELOPER_ID) {
    const target = ctx.message.reply_to_message.from;
    const text = ctx.message.text || '';
    
    if (text.startsWith('ترقيه')) {
      const role = text.split(' ')[1]; // مثال: ترقيه مدير
      let roleKey = '';
      if (role === 'مدير_عام') roleKey = 'G_ADMIN';
      if (role === 'مدير') roleKey = 'M_MANAGER';
      if (role === 'ادمن') roleKey = 'M_ADMIN';
      
      if (roleKey) {
        db.permissions[target.id] = { role: roleKey };
        return ctx.reply(`✅ تم ترقية ${target.first_name} الى رتبة ${role}`);
      }
    }
  }
  return next();
});

// --- الترفيه الذكي والردود ---
bot.on('message', async (ctx) => {
  if (!ctx.message.text) return;
  const text = ctx.message.text;

  // أوامر ترفيه سريعة
  if (text === 'صراحه') {
    const q = ["هل كذبت اليوم؟", "ما هو سرك الأكبر؟", "من هو الشخص المفضل لديك؟"];
    return ctx.reply(`✨ سؤال صراحة:\n\n${q[Math.floor(Math.random()*q.length)]}`);
  }

  // الرد الذكي
  if (text.includes('بوت') || (ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id)) {
    try {
      await ctx.sendChatAction('typing');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: `أنت بوت "Guardia AI". مطورك هو MoSalem. رتبة المستخدم هي ${checkRank(ctx.from.id).label}. رد بلهجة مصرية خفيفة وذكية كما في بوتات التلجرام المشهورة.`,
          maxOutputTokens: 150
        }
      });
      return ctx.reply(response.text, { reply_to_message_id: ctx.message.message_id });
    } catch (e) {
      return ctx.reply("أمرك يا باشا، أنا معاك!");
    }
  }
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } else {
    res.status(200).send('Guardia AI is Online 🛡️');
  }
};

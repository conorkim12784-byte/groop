
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

// إعداد البوت والذكاء الاصطناعي
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

/**
 * مخزن الرتب (في بيئة Vercel يتم تصفير المتغيرات عند خمول السيرفر)
 * ملاحظة: يفضل مستقبلاً ربط البوت بـ MongoDB أو Redis لحفظ الرتب بشكل دائم.
 */
let permissionsStore = {
  [DEVELOPER_ID]: { role: 'DEV', type: 'GENERAL' }
};

// --- وظائف المساعدة ---
const getUserRank = (userId) => {
  if (userId === DEVELOPER_ID) return { label: '👑 المبرمج', type: 'DEV' };
  const user = permissionsStore[userId];
  if (!user) return { label: '👤 عضو عادي', type: 'NONE' };
  
  const labels = {
    'G_ADMIN': '🌐 مدير عام',
    'M_MANAGER': '🛡️ مدير مجموعة',
    'M_ADMIN': '👮 أدمن مجموعة',
    'M_VIP': '✨ مميز'
  };
  return { label: labels[user.role] || '👤 عضو', type: user.type, role: user.role };
};

// التحقق هل المستخدم لديه إذن من المبرمج؟
const isAuthorized = (userId) => {
  if (userId === DEVELOPER_ID) return true;
  const user = permissionsStore[userId];
  return user && (user.role === 'G_ADMIN' || user.role === 'M_MANAGER');
};

// --- الأوامر والردود ---

// 1. نظام تعيين الرتب (للمبرمج فقط بالرد)
bot.on('message', async (ctx, next) => {
  if (ctx.from.id === DEVELOPER_ID && ctx.message.reply_to_message) {
    const target = ctx.message.reply_to_message.from;
    const text = ctx.message.text || '';

    if (['رتبة', 'صلاحيات', 'تعيين'].includes(text)) {
      const current = getUserRank(target.id);
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🌐 رفع مدير عام (عامة)', `set_${target.id}_G_ADMIN_GENERAL`)],
        [Markup.button.callback('🛡️ مدير مجموعة (مجموعة)', `set_${target.id}_M_MANAGER_GROUP`)],
        [Markup.button.callback('👮 أدمن مجموعة (مجموعة)', `set_${target.id}_M_ADMIN_GROUP`)],
        [Markup.button.callback('✨ عضو مميز (مجموعة)', `set_${target.id}_M_VIP_GROUP`)],
        [Markup.button.callback('❌ تجريد من الرتبة', `set_${target.id}_NONE_NONE`)]
      ]);

      return ctx.reply(`⚙️ *إدارة الصلاحيات لمستخدم*\n\nالاسم: ${target.first_name}\nالمعرف: \`${target.id}\`\nالرتبة الحالية: *${current.label}*\n\nاختر الرتبة الجديدة من الأزرار:`, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  }
  return next();
});

// معالج أزرار الرتب
bot.action(/set_(\d+)_(.+)_(.+)/, async (ctx) => {
  if (ctx.from.id !== DEVELOPER_ID) return ctx.answerCbQuery('⚠️ هذا الإجراء للمبرمج فقط!');
  
  const userId = ctx.match[1];
  const role = ctx.match[2];
  const type = ctx.match[3];

  if (role === 'NONE') {
    delete permissionsStore[userId];
  } else {
    permissionsStore[userId] = { role, type };
  }

  await ctx.answerCbQuery('✅ تم التحديث');
  const rankInfo = getUserRank(userId);
  return ctx.editMessageText(`✅ تم تحديث رتبة المستخدم بنجاح.\nالرتبة الجديدة: *${rankInfo.label}*`, { parse_mode: 'Markdown' });
});

// 2. فلتر الحماية الذكي (مصري شعبي + روابط)
bot.on(['message', 'edited_message'], async (ctx, next) => {
  if (!ctx.message || !ctx.message.text || isAuthorized(ctx.from.id)) return next();

  const text = ctx.message.text;
  
  // حماية الروابط
  if (text.includes('t.me') || text.includes('http') || text.includes('www.')) {
    await ctx.deleteMessage().catch(() => {});
    return ctx.reply(`⚠️ عذراً ${ctx.from.first_name}، إرسال الروابط ممنوع لمن ليس لديهم رتبة.`);
  }

  // ذكاء اصطناعي كاشف للشتائم المصرية
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert in Egyptian street slang and insults. 
      Analyze this text: "${text}"
      Does it contain:
      1. Direct insults to parents or family (Egyptian style)?
      2. Sexual vulgarity or innuendos?
      3. Street bullying terms?
      Answer ONLY 'YES' if it is toxic/bad and 'NO' if it is safe.`,
      config: { temperature: 0 }
    });

    if (result.text.includes('YES')) {
      await ctx.deleteMessage().catch(() => {});
      return ctx.reply(`🚫 يا ${ctx.from.first_name}، لسانك حصانك! احترم الموجودين في المجموعة.`);
    }
  } catch (e) { console.error("Filter Error:", e); }

  return next();
});

// 3. الرد الذكي الاحترافي
bot.on('message', async (ctx) => {
  if (!ctx.message.text) return;
  const text = ctx.message.text;

  // يرد إذا نودي بـ "بوت" أو إذا رد أحد على رسالته
  if (text.includes('بوت') || (ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id)) {
    await ctx.sendChatAction('typing');
    try {
      const chat = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: `أنت Guardia AI Pro، بوت حماية ذكي جداً ومحترف. 
          - المبرمج هو "MoSalem" (معرفه: 1923931101).
          - رتبة الشخص الذي يكلمك الآن هي: ${getUserRank(ctx.from.id).label}.
          - رد بأسلوب لبق، محترم، وقوي. استخدم اللهجة المصرية المهذبة أحياناً.
          - لا تقبل الإهانة، وإذا سألك أحد عن رتبته أخبره بها بناءً على ما أرسلته لك.`,
        }
      });
      await ctx.reply(chat.text, { reply_to_message_id: ctx.message.message_id });
    } catch (e) {
      console.error("AI Response Error:", e);
    }
  }
});

// أوامر عامة
bot.start((ctx) => {
  const rank = getUserRank(ctx.from.id);
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('➕ أضف البوت لمجموعتك', `https://t.me/${ctx.botInfo.username}?startgroup=true`)],
    [Markup.button.url('👨‍💻 المبرمج', `tg://user?id=${DEVELOPER_ID}`)]
  ]);

  ctx.replyWithAnimation(START_IMAGE, {
    caption: `*مرحباً بك في Guardia AI Pro* 🛡️\n\nأنا نظام الحماية الأقوى المدعوم بالذكاء الاصطناعي.\n\nرتبتك الحالية: *${rank.label}*\n\n⚠️ ملاحظة: جميع الأوامر والتحكم محصورة للمبرمج والرتب المعينة من قبله فقط.`,
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// معالج Webhook لـ Vercel
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } else {
      res.status(200).send('Bot is running...');
    }
  } catch (error) {
    console.error("Global Error:", error);
    res.status(500).send('Error');
  }
};

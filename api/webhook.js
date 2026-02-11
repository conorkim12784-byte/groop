
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// مخزن مؤقت للرتب (يفضل استخدام قاعدة بيانات للدوام)
let permissions = {
  [DEVELOPER_ID]: { role: 'DEV', permissions: ['all'] }
};

let groupSettings = {
  antiLink: true,
  antiBadWords: true,
  lockMedia: false
};

// --- وظائف التحقق من الصلاحيات ---
const getRoleLabel = (userId) => {
  if (userId === DEVELOPER_ID) return '👑 المبرمج';
  const user = permissions[userId];
  if (!user) return '👤 عضو';
  const roles = {
    'G_ADMIN': '🌐 مدير عام',
    'M_MANAGER': '🛡️ مدير مجموعة',
    'M_ADMIN': '👮 أدمن مجموعة',
    'M_VIP': '✨ مميز'
  };
  return roles[user.role] || '👤 عضو';
};

const hasPermission = (userId, action) => {
  if (userId === DEVELOPER_ID) return true;
  const user = permissions[userId];
  if (!user) return false;
  if (user.role === 'G_ADMIN') return true;
  return false; // لا أحد يتحكم في البوت إلا بإذن المبرمج أو المدير العام
};

// --- أوامر المبرمج للتحكم في الرتب ---
bot.on('message', async (ctx, next) => {
  if (ctx.from.id === DEVELOPER_ID && ctx.message.reply_to_message) {
    const targetUser = ctx.message.reply_to_message.from;
    const text = ctx.message.text;

    if (text === 'رتبة' || text === 'صلاحيات') {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🌐 رفع مدير عام', `setrole_${targetUser.id}_G_ADMIN`)],
        [Markup.button.callback('🛡️ رفع مدير مجموعة', `setrole_${targetUser.id}_M_MANAGER`)],
        [Markup.button.callback('👮 رفع أدمن مجموعة', `setrole_${targetUser.id}_M_ADMIN`)],
        [Markup.button.callback('✨ رفع مميز', `setrole_${targetUser.id}_M_VIP`)],
        [Markup.button.callback('❌ تجريد من الرتبة', `setrole_${targetUser.id}_NONE`)]
      ]);
      return ctx.reply(`⚙️ *إدارة صلاحيات المستخدم:*\nالاسم: ${targetUser.first_name}\nالرتبة الحالية: ${getRoleLabel(targetUser.id)}`, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  }
  return next();
});

bot.action(/setrole_(\d+)_(.+)/, async (ctx) => {
  if (ctx.from.id !== DEVELOPER_ID) return ctx.answerCbQuery('❌ للمبرمج فقط!');
  const userId = parseInt(ctx.match[1]);
  const role = ctx.match[2];

  if (role === 'NONE') {
    delete permissions[userId];
  } else {
    permissions[userId] = { role, grantedBy: ctx.from.id };
  }

  ctx.answerCbQuery('✅ تم تحديث الرتبة');
  ctx.editMessageText(`✅ تم تعيين رتبة *${getRoleLabel(userId)}* للمستخدم بنجاح.`, { parse_mode: 'Markdown' });
});

// --- حماية المحتوى (الذكاء الاصطناعي المصري) ---
bot.on(['message', 'edited_message'], async (ctx, next) => {
  if (!ctx.message || !ctx.message.text || hasPermission(ctx.from.id)) return next();

  const text = ctx.message.text;
  
  // 1. حماية الروابط
  if (groupSettings.antiLink && (text.includes('t.me') || text.includes('http'))) {
    await ctx.deleteMessage().catch(() => {});
    return ctx.reply(`⚠️ عذراً ${ctx.from.first_name}، الروابط مسموحة للرتب العليا فقط.`);
  }

  // 2. فلتر الكلمات المسيئة (باللهجة المصرية)
  if (groupSettings.antiBadWords) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `حلل الرسالة التالية باللهجة المصرية. هل تحتوي على سباب، شتائم سوقية، إيحاءات جنسية، أو تنمر؟ 
        أجب بكلمة 'YES' إذا كانت مسيئة و 'NO' إذا كانت سليمة.
        الرسالة: "${text}"`,
        config: { temperature: 0.1 }
      });
      
      if (response.text.includes('YES')) {
        await ctx.deleteMessage().catch(() => {});
        return ctx.reply(`🚫 يا ${ctx.from.first_name}، عيب كدة! خلي أسلوبك محترم في المجموعة.`);
      }
    } catch (e) { console.error("Filter Error:", e); }
  }

  return next();
});

// --- الرد الذكي المطور ---
bot.on('message', async (ctx) => {
  if (!ctx.message.text) return;
  const text = ctx.message.text;

  // استجابة ذكية إذا نودي بـ "بوت" أو إذا رد أحد على رسالته
  if (text.includes('بوت') || (ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id)) {
    await ctx.sendChatAction('typing');
    try {
      const chat = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: `أنت Guardia AI Pro. مساعد ذكي، محترف، ولبق جداً. 
          - المبرمج الخاص بك هو "MoSalem" (ID: 1923931101).
          - رد باللغة العربية الفصحى أو المصرية المهذبة حسب سياق المستخدم.
          - إذا سألك أحد عن رتبته، أخبره: "${getRoleLabel(ctx.from.id)}".
          - كن صارماً مع المتجاوزين وودوداً مع الأعضاء المحترمين.`,
        }
      });
      await ctx.reply(chat.text, { reply_to_message_id: ctx.message.message_id });
    } catch (e) {
      ctx.reply("أنا موجود وأسمعك، لكن لدي ضغط حالياً. كيف أخدمك؟");
    }
  }
});

// --- أوامر عامة ---
bot.start((ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('➕ أضفني لمجموعتك', `https://t.me/${ctx.botInfo.username}?startgroup=true`)],
    [Markup.button.url('👨‍💻 المبرمج', `tg://user?id=${DEVELOPER_ID}`)]
  ]);
  ctx.replyWithAnimation(START_IMAGE, {
    caption: `*مرحباً بك في Guardia AI Pro* 🛡️\n\nأنا بوت حماية يعمل بالذكاء الاصطناعي. \nرتبتك الحالية: *${getRoleLabel(ctx.from.id)}*\n\nفقط المبرمج يمكنه إعطاء الصلاحيات للتحكم بي.`,
    parse_mode: 'Markdown',
    ...keyboard
  });
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } else {
    res.status(200).send('Guardia AI is Online.');
  }
};

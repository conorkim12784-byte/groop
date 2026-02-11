
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// مخزن مؤقت (سيتأثر بإعادة تشغيل Vercel، لذا المبرمج دائماً ثابت)
let permissionsStore = {
  [DEVELOPER_ID]: { role: 'DEV', type: 'GENERAL' }
};

const getUserRank = (userId) => {
  if (Number(userId) === DEVELOPER_ID) return { label: '👑 المبرمج', type: 'DEV' };
  const user = permissionsStore[userId];
  if (!user) return { label: '👤 عضو', type: 'NONE' };
  
  const labels = {
    'G_ADMIN': '🌐 مدير عام',
    'M_MANAGER': '🛡️ مدير مجموعة',
    'M_ADMIN': '👮 أدمن مجموعة',
    'M_VIP': '✨ مميز'
  };
  return { label: labels[user.role] || '👤 عضو', type: user.type, role: user.role };
};

const isAuthorized = (userId) => {
  if (Number(userId) === DEVELOPER_ID) return true;
  const user = permissionsStore[userId];
  return user && (user.role === 'G_ADMIN' || user.role === 'M_MANAGER');
};

// --- الأوامر ---

bot.start((ctx) => {
  const rank = getUserRank(ctx.from.id);
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('➕ أضف البوت لمجموعتك', `https://t.me/${ctx.botInfo.username}?startgroup=true`)],
    [Markup.button.url('👨‍💻 المبرمج', `tg://user?id=${DEVELOPER_ID}`)]
  ]);

  return ctx.replyWithAnimation(START_IMAGE, {
    caption: `*مرحباً بك في Guardia AI Pro* 🛡️\n\nأنا نظام الحماية الذكي لمجموعتك.\n\nرتبتك الحالية: *${rank.label}*\n\n⚠️ التحكم الكامل محصور للمبرمج والرتب المعتمدة.`,
    parse_mode: 'Markdown',
    ...keyboard
  }).catch(e => console.error("Start Error:", e));
});

// نظام تعيين الرتب بالرد (للمبرمج فقط)
bot.on('message', async (ctx, next) => {
  if (ctx.from.id === DEVELOPER_ID && ctx.message.reply_to_message) {
    const target = ctx.message.reply_to_message.from;
    const text = ctx.message.text || '';

    if (['رتبة', 'صلاحيات', 'تعيين'].includes(text)) {
      const current = getUserRank(target.id);
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🌐 مدير عام', `s_${target.id}_GA`)],
        [Markup.button.callback('🛡️ مدير مجموعة', `s_${target.id}_MM`)],
        [Markup.button.callback('👮 أدمن مجموعة', `s_${target.id}_MA`)],
        [Markup.button.callback('❌ تجريد', `s_${target.id}_NO`)]
      ]);

      return ctx.reply(`⚙️ *إدارة الصلاحيات:*\nالاسم: ${target.first_name}\nالرتبة: ${current.label}`, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  }
  return next();
});

// معالج الأزرار المحدث (مختصر لتجنب أخطاء Callback)
bot.action(/s_(\d+)_(.+)/, async (ctx) => {
  if (ctx.from.id !== DEVELOPER_ID) return ctx.answerCbQuery('⚠️ للمبرمج فقط');
  
  const userId = ctx.match[1];
  const roleKey = ctx.match[2];
  
  const roles = {
    'GA': { role: 'G_ADMIN', type: 'GENERAL' },
    'MM': { role: 'M_MANAGER', type: 'GROUP' },
    'MA': { role: 'M_ADMIN', type: 'GROUP' },
    'NO': null
  };

  if (roles[roleKey] === null) {
    delete permissionsStore[userId];
  } else {
    permissionsStore[userId] = roles[roleKey];
  }

  await ctx.answerCbQuery('✅ تم التحديث');
  const rankInfo = getUserRank(userId);
  return ctx.editMessageText(`✅ تم تحديث الرتبة إلى: *${rankInfo.label}*`, { parse_mode: 'Markdown' });
});

// فلتر الحماية والذكاء الاصطناعي
bot.on('message', async (ctx) => {
  if (!ctx.message.text) return;
  const text = ctx.message.text;
  const userId = ctx.from.id;

  // 1. حماية الروابط (تجاهل المبرمج والمشرفين)
  if (!isAuthorized(userId) && (text.includes('t.me') || text.includes('http'))) {
    await ctx.deleteMessage().catch(() => {});
    return ctx.reply(`⚠️ ${ctx.from.first_name}، الروابط ممنوعة حالياً.`);
  }

  // 2. الرد الذكي (عند المناداة أو الرد)
  if (text.includes('بوت') || (ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id)) {
    try {
      await ctx.sendChatAction('typing');
      
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: `أنت Guardia AI. مساعد ذكي. المبرمج هو MoSalem (1923931101). رتبة المستخدم: ${getUserRank(userId).label}. رد بلهجة مصرية مهذبة وقصيرة.`,
          maxOutputTokens: 200
        }
      });

      const replyText = result.text;
      if (replyText) {
        return await ctx.reply(replyText, { reply_to_message_id: ctx.message.message_id });
      } else {
        return await ctx.reply("أنا موجود، كيف أساعدك؟");
      }
    } catch (e) {
      console.error("AI Error:", e);
      return await ctx.reply("معك Guardia AI، كيف يمكنني خدمتك؟ (حدث ضغط بسيط في المحرك)");
    }
  }
});

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } else {
      res.status(200).send('Guardia AI is Online 🛡️');
    }
  } catch (err) {
    console.error("Webhook Handler Error:", err);
    res.status(200).send('OK'); // نرسل 200 دائماً لتجنب إعادة إرسال تلجرام للطلبات الفاشلة باستمرار
  }
};

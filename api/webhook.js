
const { Telegraf } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
// إعداد الذكاء الاصطناعي وفقاً للقواعد الجديدة
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// أمر البدء للتأكد من أن البوت متصل
bot.start((ctx) => ctx.reply('أهلاً بك! أنا Guardia AI. أنا أعمل الآن ومستعد لحماية المجموعة. 🛡️\n\nتأكد من إيقاف "Privacy Mode" من @BotFather لتفعيل الرد التلقائي على كلمة "بوت".'));

// أمر المساعدة
bot.help((ctx) => ctx.reply('يمكنني القيام بـ:\n1. حذف الروابط تلقائياً.\n2. الرد على استفساراتكم بالذكاء الاصطناعي (فقط اكتب كلمة "بوت" في رسالتك).'));

// 1. نظام حماية الروابط
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text;
  const entities = ctx.message.entities || [];
  
  // فحص إذا كانت الرسالة تحتوي على رابط
  const hasLink = entities.some(e => e.type === 'url' || e.type === 'text_link');
  
  if (hasLink) {
    try {
      // محاولة حذف الرسالة
      await ctx.deleteMessage().catch(() => console.log("Missing delete permissions"));
      await ctx.reply(`عذراً يا ${ctx.from.first_name || 'عزيزي'}، يمنع إرسال الروابط هنا. 🛡️`);
      return; // توقف هنا
    } catch (e) {
      console.error("Error in link protection:", e);
    }
  }
  return next(); // انتقل للمرحلة التالية (الذكاء الاصطناعي)
});

// 2. نظام الرد الذكي
bot.on('message', async (ctx) => {
  if (!ctx.message || !ctx.message.text) return;

  const text = ctx.message.text.toLowerCase();
  
  // شروط الرد: كلمة "بوت" أو الرد على رسالة البوت أو منشن للبوت
  const isReplyToBot = ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo?.id;
  const mentionsBot = text.includes('بوت') || (ctx.botInfo && text.includes(`@${ctx.botInfo.username.toLowerCase()}`));

  if (isReplyToBot || mentionsBot) {
    try {
      // إرسال حالة "جاري الكتابة" لإعطاء انطباع طبيعي
      await ctx.sendChatAction('typing');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `المستخدم ${ctx.from.first_name} يقول: ${ctx.message.text}`,
        config: {
          systemInstruction: "أنت Guardia AI، بوت حماية ومساعد ذكي لمجموعات تلجرام. ردك يجب أن يكون باللغة العربية، ودوداً جداً ومختصراً. أنت صديق للأعضاء ومسؤول عن أمن المجموعة.",
        },
      });

      const replyText = response.text;
      if (replyText) {
        await ctx.reply(replyText, {
          reply_to_message_id: ctx.message.message_id
        });
      }
    } catch (error) {
      console.error("Gemini Error:", error);
    }
  }
});

// معالج Vercel
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } else {
      res.status(200).send('Guardia AI is Online and Protected.');
    }
  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).send('Internal Server Error');
  }
};

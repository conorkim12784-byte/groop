Enter
const { Telegraf } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

// تهيئة نموذج الذكاء الاصطناعي
const model = genAI.models.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  systemInstruction: "أنت Guardia AI، بوت حماية ومساعد ذكي لمجموعات تلجرام. ردك يجب أن يكون باللغة العربية، ودوداً ومختصراً. مهمتك حماية المجموعة والرد على استفسارات الأعضاء."
});

// 1. حماية الروابط
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text;
  const entities = ctx.message.entities || [];
  
  const hasLink = entities.some(e => e.type === 'url' || e.type === 'text_link');
  
  if (hasLink) {
    try {
      await ctx.deleteMessage();
      await ctx.reply(`عذراً يا @${ctx.from.username || ctx.from.first_name}، يمنع إرسال الروابط في هذه المجموعة لحماية الأعضاء. 🛡️`);
      return; // توقف هنا ولا تكمل للذكاء الاصطناعي
    } catch (e) {
      console.error("Permission error: Could not delete message", e);
    }
  }
  return next();
});

// 2. الرد الذكي بالذكاء الاصطناعي
bot.on('message', async (ctx) => {
  if (!ctx.message.text) return;

  const isReplyToBot = ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id;
  const isMentioned = ctx.message.text.includes(`@${ctx.botInfo.username}`) || ctx.message.text.toLowerCase().includes('بوت');

  if (isReplyToBot || isMentioned) {
    try {
      // إرسال حالة "جاري الكتابة"
      await ctx.sendChatAction('typing');
      
      const prompt = `العضو ${ctx.from.first_name} يقول: ${ctx.message.text}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      await ctx.reply(response.text(), {
        reply_to_message_id: ctx.message.message_id
      });
    } catch (error) {
      console.error("Gemini Error:", error);
      await ctx.reply("عذراً، واجهت مشكلة في معالجة طلبك حالياً.");
    }
  }
});

// التصدير ليعمل كـ Vercel Serverless Function
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('Bot is running...');
  }
};

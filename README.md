
# Guardia AI Telegram Bot

بوت حماية متطور يعمل بالذكاء الاصطناعي، جاهز للرفع على Vercel.

## خطوات التشغيل:
1. ارفع الكود على Vercel.
2. أضف `TELEGRAM_BOT_TOKEN` من @BotFather.
3. أضف `API_KEY` من [Google AI Studio](https://aistudio.google.com/).
4. قم بضبط الويب هوك الخاص بك عن طريق زيارة هذا الرابط في المتصفح:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR_VERCEL_DOMAIN>/api/webhook`

## الميزات:
- منع الروابط (Anti-Link).
- رد ذكي باستخدام Gemini 1.5 Flash.
- يدعم الردود على الرسائل (Replies) والإشارات (Mentions).

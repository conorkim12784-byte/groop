
# Guardia AI Telegram Bot

بوت حماية متطور يعمل بالذكاء الاصطناعي، جاهز للرفع على Vercel.

## خطوات التشغيل الهامة:
1. ارفع الكود على Vercel.
2. أضف `TELEGRAM_BOT_TOKEN` و `API_KEY` في Environment Variables.
3. **خطوة حاسمة**: يجب تفعيل الويب هوك يدوياً مرة واحدة بزيارة الرابط التالي في متصفحك:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR_PROJECT_NAME>.vercel.app/api/webhook`

## الميزات:
- حماية ضد الروابط والتصفية.
- أوامر البحث الديني بالذكاء الاصطناعي (م1).
- أوامر التحكم (م2، م3، م4).

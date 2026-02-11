
const { Telegraf, Markup, session } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

// إعداد البوت والذكاء الاصطناعي
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// بيانات المبرمج والمجموعة (يمكن تطويرها لتعمل مع قاعدة بيانات)
const DEVELOPER_ID = 1923931101;
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// إعدادات افتراضية للمجموعة (في بيئة الإنتاج يفضل استخدام Redis أو MongoDB)
let groupSettings = {
  antiLink: true,
  antiBadWords: true,
  antiBots: true,
  lockStickers: false,
  lockMedia: false,
  forcedChannel: "@YourChannel", // غير هذا لقناتك
  warnLimit: 3
};

// --- وظائف مساعدة ---
const isAdmin = async (ctx) => {
  if (ctx.chat.type === 'private') return true;
  const member = await ctx.getChatMember(ctx.from.id);
  return ['administrator', 'creator'].includes(member.status) || ctx.from.id === DEVELOPER_ID;
};

// --- أوامر البداية ---
bot.start(async (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url('➕ أضف البوت لمجموعتك', `https://t.me/${ctx.botInfo.username}?startgroup=true`)],
    [
      Markup.button.callback('📜 شرح الأوامر', 'help_cmds'),
      Markup.button.url('👨‍💻 المبرمج', `tg://user?id=${DEVELOPER_ID}`)
    ],
    [Markup.button.callback('⚙️ لوحة التحكم', 'open_settings')]
  ]);

  await ctx.replyWithAnimation(START_IMAGE, {
    caption: `*مرحباً بك في Guardia AI Pro* 🛡️\n\nأنا بوت الحماية الأكثر تطوراً بدعم الذكاء الاصطناعي.\n\nاستخدم الأزرار أدناه للتحكم أو التعرف على مميزاتي.`,
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// --- لوحة التحكم (Settings) ---
bot.action('open_settings', async (ctx) => {
  if (!(await isAdmin(ctx))) return ctx.answerCbQuery('❌ هذا الأمر للمشرفين فقط!');
  
  const settingsKeys = Markup.inlineKeyboard([
    [Markup.button.callback(`الروابط: ${groupSettings.antiLink ? '✅' : '❌'}`, 'toggle_link')],
    [Markup.button.callback(`الكلمات السيئة: ${groupSettings.antiBadWords ? '✅' : '❌'}`, 'toggle_words')],
    [Markup.button.callback(`الملصقات: ${groupSettings.lockStickers ? '🔒' : '🔓'}`, 'toggle_stickers')],
    [Markup.button.callback('🔙 عودة', 'back_to_start')]
  ]);

  await ctx.editMessageCaption('⚙️ *لوحة تحكم الحماية:*\nاضغط على الزر لتغيير الإعداد.', {
    parse_mode: 'Markdown',
    ...settingsKeys
  });
});

bot.action(/toggle_(.+)/, async (ctx) => {
  const setting = ctx.match[1];
  if (setting === 'link') groupSettings.antiLink = !groupSettings.antiLink;
  if (setting === 'words') groupSettings.antiBadWords = !groupSettings.antiBadWords;
  if (setting === 'stickers') groupSettings.lockStickers = !groupSettings.lockStickers;
  
  ctx.answerCbQuery('تم التحديث بنجاح!');
  return ctx.editMessageCaption('⚙️ *تم تحديث الإعدادات:*', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(`الروابط: ${groupSettings.antiLink ? '✅' : '❌'}`, 'toggle_link')],
      [Markup.button.callback(`الكلمات السيئة: ${groupSettings.antiBadWords ? '✅' : '❌'}`, 'toggle_words')],
      [Markup.button.callback(`الملصقات: ${groupSettings.lockStickers ? '🔒' : '🔓'}`, 'toggle_stickers')],
      [Markup.button.callback('🔙 عودة', 'open_settings')]
    ])
  });
});

// --- نظام الحماية الذكي ---
bot.on(['message', 'edited_message'], async (ctx, next) => {
  if (!ctx.message || !ctx.message.text) return next();
  const text = ctx.message.text;
  const user = ctx.from;

  // 1. تجاهل المشرفين والمبرمج
  if (await isAdmin(ctx)) return next();

  // 2. حماية الروابط
  if (groupSettings.antiLink && (text.includes('t.me/') || text.includes('http'))) {
    await ctx.deleteMessage().catch(() => {});
    return ctx.reply(`⚠️ عذراً [${user.first_name}](tg://user?id=${user.id})، الروابط ممنوعة!`, { parse_mode: 'Markdown' });
  }

  // 3. منع الكلمات السيئة بالذكاء الاصطناعي
  if (groupSettings.antiBadWords) {
    try {
      const check = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Is this message toxic or contains bad words? Answer ONLY with 'YES' or 'NO': "${text}"`,
      });
      if (check.text.includes('YES')) {
        await ctx.deleteMessage().catch(() => {});
        return ctx.reply(`🚫 [${user.first_name}](tg://user?id=${user.id})، يرجى تحسين أسلوبك في الكلام.`, { parse_mode: 'Markdown' });
      }
    } catch (e) { console.error("AI Shield Error:", e); }
  }

  return next();
});

// --- منع الوسائط ---
bot.on('sticker', async (ctx) => {
  if (groupSettings.lockStickers && !(await isAdmin(ctx))) {
    await ctx.deleteMessage().catch(() => {});
  }
});

// --- منع البوتات المضافة ---
bot.on('new_chat_members', async (ctx) => {
  const newMembers = ctx.message.new_chat_members;
  for (const member of newMembers) {
    if (member.is_bot && groupSettings.antiBots && !(await isAdmin(ctx))) {
      await ctx.banChatMember(member.id).catch(() => {});
      ctx.reply(`🛡️ تم طرد البوت المضاف بدون إذن: @${member.username}`);
    } else {
      // رسالة ترحيب
      ctx.reply(`أهلاً بك يا ${member.first_name} في مجموعتنا! 🌸\nيرجى قراءة القوانين لتجنب الحظر.`);
    }
  }
});

// --- أوامر المشرفين (طرد، كتم، رفع) ---
bot.command('ban', async (ctx) => {
  if (!(await isAdmin(ctx))) return;
  if (!ctx.message.reply_to_message) return ctx.reply('يجب الرد على رسالة الشخص المراد طرده.');
  const userId = ctx.message.reply_to_message.from.id;
  await ctx.banChatMember(userId);
  ctx.reply('✅ تم طرد العضو بنجاح.');
});

bot.command('mute', async (ctx) => {
  if (!(await isAdmin(ctx))) return;
  if (!ctx.message.reply_to_message) return ctx.reply('يجب الرد على رسالة الشخص لكتمه.');
  const userId = ctx.message.reply_to_message.from.id;
  await ctx.restrictChatMember(userId, { can_send_messages: false });
  ctx.reply('🔇 تم كتم العضو.');
});

bot.command('unmute', async (ctx) => {
  if (!(await isAdmin(ctx))) return;
  if (!ctx.message.reply_to_message) return ctx.reply('يجب الرد على رسالة الشخص لفك الكتم.');
  const userId = ctx.message.reply_to_message.from.id;
  await ctx.restrictChatMember(userId, { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true });
  ctx.reply('🔊 تم فك الكتم عن العضو.');
});

// --- الرد الذكي على كلمة "بوت" ---
bot.on('message', async (ctx) => {
  if (!ctx.message.text) return;
  const text = ctx.message.text;

  if (text.includes('بوت') || (ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id)) {
    await ctx.sendChatAction('typing');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: "أنت Guardia AI Pro، مساعد ذكي ومرح في تلجرام. رد بالعربية بأسلوب ودود وقصير. المبرمج هو MoSalem ومعرفه 1923931101.",
        },
      });
      await ctx.reply(response.text, { reply_to_message_id: ctx.message.message_id });
    } catch (e) { console.error("AI Error:", e); }
  }
});

// معالج Vercel
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } else {
      res.status(200).send('Guardia AI Pro Server is Running.');
    }
  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).send('Error');
  }
};

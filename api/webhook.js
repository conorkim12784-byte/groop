
// Fix: Use import instead of require for @google/genai as per guidelines
import { Telegraf, Markup } from 'telegraf';
import { GoogleGenAI } from "@google/genai";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });

// محاكاة قاعدة بيانات متطورة (يجب استبدالها بـ Firestore للإنتاج)
const db = {
  groups: {}, // { chatId: settings }
  warnings: {}, // { chatId_userId: count }
  devs: [1923931101],
  globalRanks: {}, // { userId: rankName }
  subs: {}, // { channelId: url }
  liquidationLog: {} // { chatId: adminList }
};

const BOT_NAME = "سـيـلا";
const DEVELOPER_ID = 1923931101;
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// --- مساعدات الإدارة ---
const getSettings = (chatId) => {
  if (!db.groups[chatId]) {
    db.groups[chatId] = {
      id: chatId,
      title: 'Group',
      lockLinks: true,
      lockAbuse: true,
      lockForward: false,
      lockPhotos: false,
      lockNSFW: true,
      aiEnabled: true,
      aiMode: 'funny',
      warnLimit: 3,
      muteDuration: 10,
      punishment: 'warn',
      welcomeEnabled: true,
      antiLiquidation: true,
      forcedSubChannel: '',
      customRanks: {}
    };
  }
  return db.groups[chatId];
};

const isAdmin = async (ctx, userId) => {
  if (db.devs.includes(userId)) return true;
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return ['administrator', 'creator'].includes(member.status);
  } catch (e) { return false; }
};

const checkForcedSub = async (ctx, userId, channel) => {
  if (!channel || db.devs.includes(userId)) return true;
  try {
    const member = await ctx.telegram.getChatMember(channel, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (e) { return false; }
};

// --- واجهة المستخدم Box UI ---
const getBoxUI = (ctx) => {
  const s = getSettings(ctx.chat.id);
  return `
╔═══ 🛡️ لوحة تحكم ${BOT_NAME} ═══╗
   المجموعة: ${ctx.chat.title}

🔗 الروابط : ${s.lockLinks ? '🔒' : '🔓'}
🚫 الإساءة : ${s.lockAbuse ? '🔒' : '🔓'}
🔞 الإباحي : ${s.lockNSFW ? '🔒' : '🔓'}
🛡️ التوجيه : ${s.lockForward ? '🔒' : '🔓'}

🛡️ تصفية  : ${s.antiLiquidation ? '✅' : '❌'}
⚠️ التحذيرات: ${s.warnLimit}
⚖️ العقوبة : ${s.punishment}
╚══════════════════════╝
`;
};

// --- معالجة منع التصفية ---
bot.on('chat_member', async (ctx) => {
  const update = ctx.chatMember;
  const chatId = ctx.chat.id;
  const s = getSettings(chatId);

  if (!s.antiLiquidation) return;

  // فحص إذا تم طرد أدمن أو سحب صلاحياته
  if (update.old_chat_member.status === 'administrator' && update.new_chat_member.status !== 'administrator') {
    const actorId = update.from.id;
    if (!db.devs.includes(actorId)) {
      try {
        await ctx.banChatMember(actorId);
        await ctx.reply(`🚨 محاولة تصفية من [${update.from.first_name}](tg://user?id=${actorId}) - تم حظر المخالف فوراً وتأمين المجموعة.`, { parse_mode: 'Markdown' });
      } catch (e) { console.error("Liquidation Shield Fail:", e); }
    }
  }
});

// --- الحماية العامة (Middleware) ---
bot.use(async (ctx, next) => {
  if (!ctx.chat || ctx.chat.type === 'private') return next();

  const userId = ctx.from?.id;
  if (!userId) return next();

  const s = getSettings(ctx.chat.id);

  // تخطي المطور والأدمن
  const isUserAdmin = await isAdmin(ctx, userId);
  if (isUserAdmin) return next();

  // فحص الاشتراك الإجباري
  if (s.forcedSubChannel) {
    const isSubbed = await checkForcedSub(ctx, userId, s.forcedSubChannel);
    if (!isSubbed) {
      return ctx.reply(`⚠️ عذراً عزيزي، يجب عليك الاشتراك في القناة أولاً للتحدث:\n${s.forcedSubChannel}`);
    }
  }

  // فحص المحتوى
  if (!ctx.message) return next();
  const text = ctx.message.text || '';
  let violated = false;
  let reason = '';

  if (s.lockLinks && (text.match(/https?:\/\//) || text.includes('t.me/'))) {
    violated = true; reason = 'إرسال روابط';
  } else if (s.lockForward && (ctx.message.forward_from || ctx.message.forward_from_chat)) {
    violated = true; reason = 'توجيه رسائل';
  }

  if (violated) {
    await ctx.deleteMessage().catch(() => {});
    return applyPunishment(ctx, userId, s, reason);
  }

  return next();
});

const applyPunishment = async (ctx, userId, s, reason) => {
  const key = `${ctx.chat.id}_${userId}`;
  db.warnings[key] = (db.warnings[key] || 0) + 1;
  const count = db.warnings[key];

  if (s.punishment === 'delete') return;

  if (s.punishment === 'warn' || count < s.warnLimit) {
    if (count >= s.warnLimit) {
      await ctx.restrictChatMember(userId, { until_date: Math.floor(Date.now()/1000) + 3600, permissions: { can_send_messages: false } });
      return ctx.reply(`🔇 تم كتم [${ctx.from.first_name}](tg://user?id=${userId}) لمدة ساعة لتجاوز حد التحذيرات.`, { parse_mode: 'Markdown' });
    }
    return ctx.reply(`⚠️ تحذير (${count}/${s.warnLimit}) للمستخدم بسبب ${reason}.`, { parse_mode: 'Markdown' });
  }

  if (s.punishment === 'mute') {
    await ctx.restrictChatMember(userId, { until_date: Math.floor(Date.now()/1000) + 3600, permissions: { can_send_messages: false } });
    return ctx.reply(`🔇 تم كتمك تلقائياً بسبب ${reason}.`);
  }

  if (s.punishment === 'ban') {
    await ctx.banChatMember(userId);
    return ctx.reply(`🚷 تم حظر المستخدم تلقائياً بسبب ${reason}.`);
  }
};

// --- أوامر التحكم ---
bot.start((ctx) => {
  if (ctx.chat.type !== 'private') return;
  ctx.replyWithAnimation(START_IMAGE, {
    caption: `≡ أهلاً بك في نظام ${BOT_NAME} الاحترافي 🛡️\n\nنظام حماية متكامل، منع تصفية، وتحكم ذكي.\n\nاستخدم الأزرار للتنقل 👇`,
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📋 الأوامر', 'nav_cmds'), Markup.button.callback('⚙️ الإعدادات', 'nav_home')],
      [Markup.button.url('🚀 المطور', 'https://t.me/FY_TF')]
    ])
  });
});

bot.hears(['تفعيل', 'الاوامر', 'اعدادات'], async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;
  ctx.reply(getBoxUI(ctx), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🛡️ الحماية', 'nav_shield'), Markup.button.callback('👮 الرتب', 'nav_ranks')],
      [Markup.button.callback('🎭 الذكاء الاصطناعي', 'nav_ai'), Markup.button.callback('⚖️ العقوبات', 'nav_punish')]
    ])
  });
});

// --- التبديل الديناميكي ---
bot.action(/nav_(.*)/, async (ctx) => {
  const page = ctx.match[1];
  const s = getSettings(ctx.chat.id);
  let text = '';
  let buttons = [];

  switch(page) {
    case 'home':
      text = getBoxUI(ctx);
      buttons = [
        [Markup.button.callback('🛡️ الحماية', 'nav_shield'), Markup.button.callback('👮 الرتب', 'nav_ranks')],
        [Markup.button.callback('🎭 الذكاء الاصطناعي', 'nav_ai'), Markup.button.callback('⚖️ العقوبات', 'nav_punish')]
      ];
      break;
    case 'shield':
      text = `🛡️ *إعدادات المنع والتحكم*:`;
      buttons = [
        [Markup.button.callback(`${s.lockLinks ? '✅' : '❌'} الروابط`, 'toggle_lockLinks'), Markup.button.callback(`${s.lockAbuse ? '✅' : '❌'} الإساءة`, 'toggle_lockAbuse')],
        [Markup.button.callback(`${s.lockForward ? '✅' : '❌'} التوجيه`, 'toggle_lockForward'), Markup.button.callback(`${s.lockNSFW ? '✅' : '❌'} الإباحي`, 'toggle_lockNSFW')],
        [Markup.button.callback(`${s.antiLiquidation ? '✅' : '❌'} منع التصفية`, 'toggle_antiLiquidation')],
        [Markup.button.callback('‹ رجوع', 'nav_home')]
      ];
      break;
    case 'punish':
      text = `⚖️ *اختر نوع العقوبة للمخالفين*:`;
      buttons = [
        [Markup.button.callback(`${s.punishment === 'delete' ? '●' : '○'} حذف فقط`, 'set_punish_delete')],
        [Markup.button.callback(`${s.punishment === 'warn' ? '●' : '○'} تحذير`, 'set_punish_warn')],
        [Markup.button.callback(`${s.punishment === 'mute' ? '●' : '○'} كتم`, 'set_punish_mute')],
        [Markup.button.callback(`${s.punishment === 'ban' ? '●' : '○'} حظر`, 'set_punish_ban')],
        [Markup.button.callback('‹ رجوع', 'nav_home')]
      ];
      break;
  }

  await ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
});

bot.action(/toggle_(.*)/, async (ctx) => {
  const key = ctx.match[1];
  const s = getSettings(ctx.chat.id);
  s[key] = !s[key];
  ctx.answerCbQuery(`تم التغيير: ${s[key] ? 'تفعيل' : 'تعطيل'}`);
  // تحديث الصفحة الحالية
  return ctx.editMessageReplyMarkup(ctx.callbackQuery.message.reply_markup);
});

bot.action(/set_punish_(.*)/, async (ctx) => {
  const type = ctx.match[1];
  const s = getSettings(ctx.chat.id);
  s.punishment = type;
  ctx.answerCbQuery(`العقوبة الآن: ${type}`);
  return ctx.editMessageReplyMarkup(ctx.callbackQuery.message.reply_markup);
});

// --- الأوامر الإدارية (النصية) ---
bot.hears(/^كتم$/, async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id)) || !ctx.message.reply_to_message) return;
  const targetId = ctx.message.reply_to_message.from.id;
  await ctx.restrictChatMember(targetId, { permissions: { can_send_messages: false } });
  ctx.reply("🔇 تم كتم العضو بنجاح.");
});

bot.hears(/^حظر$/, async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id)) || !ctx.message.reply_to_message) return;
  const targetId = ctx.message.reply_to_message.from.id;
  await ctx.banChatMember(targetId);
  ctx.reply("🚷 تم حظر العضو بنجاح.");
});

bot.hears(/^مسح (\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx, ctx.from.id))) return;
  const count = parseInt(ctx.match[1]);
  if (count > 100) return ctx.reply("⚠️ الحد الأقصى للمسح هو 100 رسالة.");
  
  for (let i = 0; i < count; i++) {
    await ctx.deleteMessage(ctx.message.message_id - i).catch(() => {});
  }
  ctx.reply(`✅ تم مسح ${count} رسالة.`, { reply_to_message_id: ctx.message.message_id });
});

// --- أوامر المطور ---
bot.hears('اذاعة', (ctx) => {
  if (ctx.from.id !== DEVELOPER_ID) return;
  ctx.reply("✏️ أرسل رسالة الإذاعة الآن:");
  // منطق الإذاعة سيتم تنفيذه في bot.on('text')
});

// --- الذكاء الاصطناعي (Gemini) ---
bot.on('text', async (ctx, next) => {
  const s = getSettings(ctx.chat.id);
  const msg = ctx.message.text;

  // فحص الإساءة بالـ AI
  if (s.lockAbuse && !(await isAdmin(ctx, ctx.from.id))) {
    try {
      const check = await aiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `هل النص التالي مسيء أو سباب؟ "${msg}". رد بكلمة نعم أو لا فقط.`,
      });
      // Fix: Directly access .text property as it is not a method
      if (check.text && check.text.includes('نعم')) {
        await ctx.deleteMessage().catch(() => {});
        return applyPunishment(ctx, ctx.from.id, s, 'إساءة (AI Check)');
      }
    } catch (e) {}
  }

  // الرد الذكي
  if (s.aiEnabled && (msg.includes(BOT_NAME) || ctx.chat.type === 'private')) {
    await ctx.sendChatAction('typing');
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: msg,
        config: { systemInstruction: `أنت ${BOT_NAME}، بوت حماية وتفاعل مرح. رد باللهجة المصرية.` }
      });
      // Fix: Directly access .text property as it is not a method
      ctx.reply(response.text || "أنا هنا لحماية مجموعتك!", { reply_to_message_id: ctx.message.message_id });
    } catch (e) {}
  }
  return next();
});

export default async (req, res) => {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } else {
    res.status(200).send('Sila Professional Guard Online');
  }
};

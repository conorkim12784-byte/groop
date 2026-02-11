
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const BOT_NAME = "Guardia Pro";
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// مخزن مؤقت (يتم تصفيره عند إعادة تشغيل السيرفر - يفضل ربط MongoDB لاحقاً)
let db = {
  permissions: { [DEVELOPER_ID]: { role: 'DEV', level: 5 } },
  settings: { antiLink: true, antiBadWords: true, antiNsfw: true },
  stats: { users: new Set() }
};

// --- المساعدات (Helpers) ---
const getRank = (userId) => {
  if (Number(userId) === DEVELOPER_ID) return { label: '👑 المطور الأساسي', level: 5 };
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

const canExec = (userId, minLevel) => getRank(userId).level >= minLevel;

// --- لوحات المفاتيح (Keyboards) ---
const keyboards = {
  main: Markup.inlineKeyboard([
    [Markup.button.callback('‹ الأوامر ›', 'menu_cmds')],
    [Markup.button.url('‹ قناة البوت ›', 'https://t.me/YourChannel')],
    [Markup.button.url('‹ أضف البوت لمجموعتك ›', `https://t.me/${process.env.BOT_USERNAME || 'bot'}?startgroup=true`)],
    [Markup.button.callback('‹ المطور ›', 'menu_dev'), Markup.button.callback('‹ لغات البوت ›', 'menu_lang')]
  ]),
  cmds: Markup.inlineKeyboard([
    [Markup.button.callback('أوامر الحماية', 'cmds_shield'), Markup.button.callback('أوامر الرتب', 'cmds_ranks')],
    [Markup.button.callback('أوامر الردود', 'cmds_resp'), Markup.button.callback('أوامر المنع', 'cmds_prevent')],
    [Markup.button.callback('الأوامر الإضافية', 'cmds_extra')],
    [Markup.button.callback('العودة', 'menu_main')]
  ]),
  backToCmds: Markup.inlineKeyboard([[Markup.button.callback('العودة', 'menu_cmds')]])
};

// --- الأوامر الأساسية ---
bot.start((ctx) => {
  db.stats.users.add(ctx.from.id);
  const rank = getRank(ctx.from.id);
  return ctx.replyWithAnimation(START_IMAGE, {
    caption: `≡ اهلا بك عزيزي انا بوت ${BOT_NAME}\n≡ يمكنك تشغيل الموسيقى وحماية المجموعة\n≡ رتبتك الحالية: *${rank.label}*\n\nصلِ على النبي وتبسم ❤️✨`,
    parse_mode: 'Markdown',
    ...keyboards.main
  });
});

// --- معالجة الأزرار (Actions) ---
bot.action('menu_main', (ctx) => ctx.editMessageCaption(`≡ اهلا بك عزيزي انا بوت ${BOT_NAME} ...`, keyboards.main));
bot.action('menu_cmds', (ctx) => ctx.editMessageCaption(`≡ قائمة الأوامر المتاحة في البوت ⚡:`, keyboards.cmds));

bot.action('cmds_shield', (ctx) => ctx.editMessageCaption(`⚡ *اوامر الحمايه :*\n\n» كتم - الغاء كتم - مسح المكتومين\n» تقييد - الغاء تقييد - مسح المقيدين\n» حظر - الغاء حظر - مسح المحظورين\n» مسح + الرد - مسح + عدد الرسائل\n\n» المشرفين - جلب قائمة المشرفين\n» البوتات - جلب قائمة البوتات\n» طرد البوتات - حذف البوتات`, { parse_mode: 'Markdown', ...keyboards.backToCmds }));

bot.action('cmds_ranks', (ctx) => ctx.editMessageCaption(`⚡ *اوامر الرتب :*\n\n- رفع [الرتبة] بالرد على المستخدم\n- تنزيل بالرد لتجريد المستخدم\n\nالرتب المتوفرة:\n(مدير عام، مدير، ادمن، مميز)`, { parse_mode: 'Markdown', ...keyboards.backToCmds }));

bot.action('cmds_prevent', (ctx) => ctx.editMessageCaption(`⚡ *اوامر المنع :*\n\n» منع الروابط - فتح الروابط\n» منع الاساءه - فتح الاساءه\n» منع الاباحي - فتح الاباحي\n» منع التوجيه - فتح التوجيه`, { parse_mode: 'Markdown', ...keyboards.backToCmds }));

bot.action('cmds_extra', (ctx) => ctx.editMessageCaption(`⚡ *الاوامر الإضافية :*\n\n• صراحه » اسئلة صراحه\n• تويت » اسئلة ترفيهيه\n• لو خيروك » اختيارات منوعه\n• لغز » الغاز وحلها\n• مشاهير » معرفة المشاهير من الصور`, { parse_mode: 'Markdown', ...keyboards.backToCmds }));

bot.action('cmds_resp', (ctx) => ctx.editMessageCaption(`⚡ *اوامر الردود :*\n\n- اضف رد عام (للكلمة)\n- اضف رد مخصص\n- مسح الردود\n- الردود المتاحة حالياً مفعلة بالذكاء الاصطناعي.`, { parse_mode: 'Markdown', ...keyboards.backToCmds }));

// --- نظام الإدارة (الحظر والكتم بالكلمات) ---
bot.hears(['كتم', 'حظر', 'تقييد', 'طرد'], async (ctx) => {
  if (!canExec(ctx.from.id, 2)) return ctx.reply('⚠️ عذراً، هذا الأمر للمشرفين فقط.');
  if (!ctx.message.reply_to_message) return ctx.reply('⚠️ قم بالرد على الشخص الذي تريد اتخاذ إجراء ضده.');
  
  const target = ctx.message.reply_to_message;
  const command = ctx.message.text;

  try {
    if (command === 'حظر') await ctx.banChatMember(target.from.id);
    if (command === 'كتم' || command === 'تقييد') await ctx.restrictChatMember(target.from.id, { permissions: { can_send_messages: false } });
    ctx.reply(`✅ تم تنفيذ أمر الـ *${command}* على المستخدم ${target.from.first_name}`, { parse_mode: 'Markdown' });
  } catch (e) {
    ctx.reply('❌ فشل التنفيذ. تأكد أنني مشرف وأملك الصلاحيات.');
  }
});

// --- نظام الرتب بالكلمات (رفع/تنزيل) ---
bot.on('message', async (ctx, next) => {
  const text = ctx.message.text || '';
  if (ctx.message.reply_to_message && (text.startsWith('رفع') || text.startsWith('تنزيل'))) {
    if (!canExec(ctx.from.id, 4)) return ctx.reply('⚠️ الترقية محصورة للمديرين العامين فقط.');
    
    const target = ctx.message.reply_to_message.from;
    if (text.startsWith('تنزيل')) {
      delete db.permissions[target.id];
      return ctx.reply(`❌ تم تنزيل ${target.first_name} من كافة الرتب.`);
    }

    const roleMap = { 'مدير عام': 'G_ADMIN', 'مدير': 'M_MANAGER', 'ادمن': 'M_ADMIN', 'مميز': 'M_VIP' };
    const roleName = text.replace('رفع ', '').trim();
    const roleKey = roleMap[roleName];

    if (roleKey) {
      db.permissions[target.id] = { role: roleKey };
      return ctx.reply(`✅ تم رفع ${target.first_name}\n⚡ الرتبة الجديدة: *${roleName}*`, { parse_mode: 'Markdown' });
    }
  }
  return next();
});

// --- نظام الترفيه ---
bot.hears('صراحه', (ctx) => {
  const questions = [
    "هل شعرت بالظلم يوماً ما؟", "ما هو أكبر مخاوفك؟", "هل انت شخص اجتماعي ام انطوائي؟", "متى كانت آخر مرة بكيت فيها؟"
  ];
  ctx.reply(`❓ *سؤال صراحة:* \n\n${questions[Math.floor(Math.random() * questions.length)]}`, { parse_mode: 'Markdown' });
});

bot.hears('لو خيروك', (ctx) => {
  const choices = [
    "تسافر للمستقبل ولا ترجع للماضي؟", "تعيش في غابة ولا تعيش في صحراء؟", "تخسر حاسة السمع ولا تخسر حاسة البصر؟"
  ];
  ctx.reply(`🤔 *لو خيروك:* \n\n${choices[Math.floor(Math.random() * choices.length)]}`, { parse_mode: 'Markdown' });
});

// --- حماية الروابط والذكاء الاصطناعي ---
bot.on('message', async (ctx) => {
  const text = ctx.message.text || '';
  
  // حماية الروابط
  if (db.settings.antiLink && !canExec(ctx.from.id, 2) && (text.includes('t.me') || text.includes('http'))) {
    await ctx.deleteMessage().catch(() => {});
    return ctx.reply(`⚠️ عذراً ${ctx.from.first_name}، الروابط ممنوعة.`);
  }

  // رد الذكاء الاصطناعي
  if (text.includes('بوت') || (ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id)) {
    try {
      await ctx.sendChatAction('typing');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: `أنت بوت مساعد ذكي اسمه ${BOT_NAME}. المطور هو MoSalem. رتبة المستخدم: ${getRank(ctx.from.id).label}. رد بلهجة مصرية قصيرة ومرحة.`,
          maxOutputTokens: 100
        }
      });
      ctx.reply(response.text, { reply_to_message_id: ctx.message.message_id });
    } catch (e) {
      ctx.reply('أنا معاك يا بطل، محتاج حاجة؟');
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
  } catch (e) {
    console.error(e);
    res.status(200).send('OK');
  }
};

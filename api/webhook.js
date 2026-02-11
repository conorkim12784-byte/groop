
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEVELOPER_ID = 1923931101;
const DEV_CHANNEL = "https://t.me/FY_TF";
const BOT_NAME = "سـيـلا";
const START_IMAGE = 'https://i.postimg.cc/wxV3PspQ/1756574872401.gif';

// مخزن البيانات (ستاتيك للتجربة - يصفر مع ريستارت السيرفر)
let db = {
  permissions: { [DEVELOPER_ID]: { role: 'DEV', level: 5 } },
  settings: { antiLink: true, antiBadWords: true },
  responses: {}
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

// --- توليد محتوى الألعاب بالذكاء الاصطناعي (AI Games) ---
async function generateGameContent(prompt, systemInstruction) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction, maxOutputTokens: 100 }
    });
    return response.text;
  } catch (e) {
    return "حدث خطأ في استدعاء الذكاء الاصطناعي، حاول لاحقاً.";
  }
}

// --- لوحات المفاتيح (Keyboards) ---
const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('‹ الأوامر ›', 'menu_cmds')],
  [Markup.button.url('‹ قناة المطور ›', DEV_CHANNEL)],
  [Markup.button.url('‹ أضف البوت لمجموعتك ›', `https://t.me/${process.env.BOT_USERNAME || 'bot'}?startgroup=true`)],
  [Markup.button.callback('‹ المطور ›', 'menu_dev'), Markup.button.callback('‹ لغات البوت ›', 'menu_lang')]
]);

const cmdsKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('اوامر الحمايه', 'cmds_shield'), Markup.button.callback('اوامر الرتب', 'cmds_ranks')],
  [Markup.button.callback('اوامر الردود', 'cmds_resp'), Markup.button.callback('اوامر المنع', 'cmds_prevent')],
  [Markup.button.callback('الاوامر الإضافية', 'cmds_extra')],
  [Markup.button.callback('العودة', 'menu_main')]
]);

const backBtn = Markup.inlineKeyboard([[Markup.button.callback('العودة', 'menu_cmds')]]);

// --- الأوامر الأساسية ---
bot.start((ctx) => {
  return ctx.replyWithAnimation(START_IMAGE, {
    caption: `≡ اهلا بك عزيزي انا بوت ${BOT_NAME}\n≡ يمكنني حماية مجموعتك وتسلية الأعضاء\n≡ رتبتك: *${getRank(ctx.from.id).label}*\n\nصلِ على النبي وتبسم ❤️✨`,
    parse_mode: 'Markdown',
    ...mainKeyboard
  });
});

// --- معالجة الأزرار (Actions) ---
bot.action('menu_main', (ctx) => ctx.editMessageCaption(`≡ اهلا بك عزيزي انا بوت ${BOT_NAME} ...`, mainKeyboard));
bot.action('menu_cmds', (ctx) => ctx.editMessageCaption(`≡ قائمة الأوامر المتاحة ⚡:`, cmdsKeyboard));

bot.action('cmds_shield', (ctx) => {
  ctx.editMessageCaption(`⚡ *اوامر الحمايه :*\n\n» كتم - الغاء كتم - مسح المكتومين\n» تقييد - الغاء تقييد - مسح المقيدين\n» حظر - الغاء حظر - مسح المحظورين\n» مسح + عدد الرسائل\n\n» المشرفين - البوتات - طرد البوتات`, { parse_mode: 'Markdown', ...backBtn });
});

bot.action('cmds_ranks', (ctx) => {
  ctx.editMessageCaption(`⚡ *اوامر الرتب :*\n\n» رفع (مدير عام - مدير - ادمن - مميز)\n» تنزيل\n» رتبتي\n\n- الاوامر بالرد على المستخدم`, { parse_mode: 'Markdown', ...backBtn });
});

bot.action('cmds_prevent', (ctx) => {
  ctx.editMessageCaption(`⚡ *اوامر المنع :*\n\n» منع الروابط - فتح الروابط\n» منع التوجيه - فتح التوجيه\n» منع المعرفات - فتح المعرفات`, { parse_mode: 'Markdown', ...backBtn });
});

bot.action('cmds_extra', (ctx) => {
  ctx.editMessageCaption(`⚡ *الاوامر الإضافية :*\n\n• صراحه » اسئلة منوعة\n• لو خيروك » اختيارات صعبة\n• تويت » تغريدات مضحكة\n• لغز » فوازير ذكية`, { parse_mode: 'Markdown', ...backBtn });
});

bot.action('menu_dev', (ctx) => ctx.answerCbQuery(`المطور: أحمد \nID: ${DEVELOPER_ID}`, { show_alert: true }));

// --- الأوامر النصية (الرتب والحماية) ---
bot.on('message', async (ctx, next) => {
  const text = ctx.message.text || '';
  const userId = ctx.from.id;

  // رتبتي
  if (text === 'رتبتي') {
    return ctx.reply(`🛡️ رتبتك هي: *${getRank(userId).label}*`, { parse_mode: 'Markdown' });
  }

  // أوامر الإدارة بالرد
  if (ctx.message.reply_to_message) {
    const target = ctx.message.reply_to_message.from;
    
    // نظام الرتب
    if (text.startsWith('رفع ') || text === 'تنزيل') {
      if (!canExec(userId, 4)) return ctx.reply('⚠️ للأسف، هذا الأمر للمطور أو المدير العام.');
      
      if (text === 'تنزيل') {
        delete db.permissions[target.id];
        return ctx.reply(`❌ تم تنزيل ${target.first_name} من كافة الرتب.`);
      }

      const roleMap = { 'مدير عام': 'G_ADMIN', 'مدير': 'M_MANAGER', 'ادمن': 'M_ADMIN', 'مميز': 'M_VIP' };
      const roleName = text.replace('رفع ', '').trim();
      const roleKey = roleMap[roleName];

      if (roleKey) {
        db.permissions[target.id] = { role: roleKey, level: Object.keys(roleMap).indexOf(roleName) + 1 };
        return ctx.reply(`✅ تم رفع ${target.first_name} ليكون *${roleName}*`, { parse_mode: 'Markdown' });
      }
    }

    // نظام الحماية
    if (['كتم', 'حظر', 'تقييد', 'طرد'].includes(text)) {
      if (!canExec(userId, 2)) return ctx.reply('⚠️ أنت لست أدمن لتنفيذ هذا الأمر.');
      try {
        if (text === 'حظر') await ctx.banChatMember(target.id);
        if (text === 'كتم') await ctx.restrictChatMember(target.id, { permissions: { can_send_messages: false } });
        if (text === 'طرد') await ctx.unbanChatMember(target.id);
        ctx.reply(`✅ تم تنفيذ *${text}* بنجاح على ${target.first_name}`, { parse_mode: 'Markdown' });
      } catch (e) {
        ctx.reply('❌ فشل الأمر، تأكد من صلاحيات البوت.');
      }
    }
  }

  // مسح الرسائل
  if (text.startsWith('مسح ')) {
    if (!canExec(userId, 2)) return;
    const count = parseInt(text.replace('مسح ', ''));
    if (!isNaN(count) && count > 0) {
      for (let i = 0; i < Math.min(count, 100); i++) {
        try { await ctx.deleteMessage(ctx.message.message_id - i); } catch(e) {}
      }
      ctx.reply(`✅ تم مسح ${count} رسالة.`).then(m => setTimeout(() => ctx.deleteMessage(m.message_id).catch(()=>{}), 3000));
    }
  }

  // ألعاب الذكاء الاصطناعي (AI Games)
  const gamePrompts = {
    'صراحه': 'اسأل سؤال صراحة جريء ومحرج جداً لشخص في مجموعة تلجرام. رد بالسؤال فقط.',
    'لو خيروك': 'اعطني خيارين صعبين جداً "لو خيروك" بلهجة مصرية. رد بالخيارين فقط.',
    'تويت': 'اكتب تغريدة مضحكة جداً (نكشة) عن الشباب والبنات. رد بالتغريدة فقط.',
    'لغز': 'اعطني لغزاً ذكياً وصعباً مع كتابة الحل في سطر منفصل مخفي.'
  };

  if (gamePrompts[text]) {
    await ctx.sendChatAction('typing');
    const aiContent = await generateGameContent(gamePrompts[text], "أنت بوت ترفيهي مصري مرح جداً. لا تكرر الأسئلة.");
    return ctx.reply(`🎮 *${text}:*\n\n${aiContent}`, { parse_mode: 'Markdown' });
  }

  return next();
});

// --- حماية الروابط والرد التلقائي ---
bot.on('message', async (ctx) => {
  const text = ctx.message.text || '';
  
  // حماية الروابط
  if (db.settings.antiLink && !canExec(ctx.from.id, 2) && (text.includes('t.me') || text.includes('http'))) {
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  // الرد الذكي
  if (text.includes('بوت') || (ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.botInfo.id)) {
    try {
      await ctx.sendChatAction('typing');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: `أنت بوت مساعد ذكي اسمه ${BOT_NAME}. مطورك أحمد (ID: ${DEVELOPER_ID}). قناته: ${DEV_CHANNEL}. رد بلهجة مصرية خفيفة وذكية. رتبة المستخدم: ${getRank(ctx.from.id).label}.`,
          maxOutputTokens: 150
        }
      });
      ctx.reply(response.text, { reply_to_message_id: ctx.message.message_id });
    } catch (e) {
      ctx.reply('معاك يا غالي، اتفضل؟');
    }
  }
});

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } else {
      res.status(200).send(`${BOT_NAME} Bot is Online! 🛡️`);
    }
  } catch (e) {
    console.error(e);
    res.status(200).send('OK');
  }
};

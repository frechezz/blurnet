const { PHOTO_IDS } = require("../constants/media");
const {
  getMainKeyboard,
  getInstructionInlineKeyboard,
  getTariffsInlineKeyboard,
} = require("../keyboards");
const { SUBSCRIPTION_URL } = require("../config");
const { TARIFFS } = require("../constants/tariffs");

/**
 * Handles the /start command
 */
async function handleStart(ctx) {
  await ctx.reply(
    "Вы запустили <b>blurnet</b> 🙌🏻 - выгодный VPN для высших устройств без каких либо ограничений.\n\n" +
      "Наш сервис поддерживает такие устройства как:\n" +
      "- iOS\n" +
      "- Android\n" +
      "- MacOS\n" +
      "- Windows\n\n" +
      "Мы отличаемся от конкурентов тем, что мы используем высокоскоростные сервера (2.5 Гбит/с) и самое современное оборудование, а также не ведем никаких записей поисковых запросов, IP адресов, и остальных цифровых следов.\n\n" +
      "Внимательно ознакомьтесь с инструкцией и начинайте!\n\n" +
      "У нас как и у всех есть свои правила, следует их также прочитать и принять. ",
    { parse_mode: "HTML", reply_markup: getMainKeyboard() },
  );
}

/**
 * Handles the "Instruction" button
 */
async function handleInstruction(ctx) {
  await ctx.replyWithPhoto(PHOTO_IDS.instruction, {
    caption:
      "<b>Инструкция:</b>\n" +
      "<blockquote>1. Для управления ботом используйте кнопки\n" +
      "2. Следуйте указаниям бота\n" +
      "3. При возникновении проблем с оплатой обращайтесь: @blurnet_support 💳\n" +
      "4. Все актуальные новости: @blurnet_news 📰</blockquote>",
    parse_mode: "HTML",
    reply_markup: getInstructionInlineKeyboard(),
  });
}

/**
 * Handles the "Start Work" button
 */
async function handleStartWork(ctx) {
  await ctx.replyWithPhoto(PHOTO_IDS.tariffs, {
    caption:
      "Выберите свой тарифный план:\n" +
      "🏆12 месяцев - <b>Цена: 1000 ₽</b>\n" +
      "🥇6 месяцев - <b>Цена: 550 ₽</b>\n" +
      "🥈3 месяца - <b>Цена: 280 ₽</b>\n" +
      "🥉1 месяц - <b>Цена: 100 ₽</b>\n\n" +
      "🌟 Попробовать бесплатный пробный период на <b>5 дней</b>",
    parse_mode: "HTML",
    reply_markup: getTariffsInlineKeyboard(),
  });
}

/**
 * Handles the "Rules" button
 */
async function handleRules(ctx) {
  await ctx.replyWithPhoto(PHOTO_IDS.rules, {
    caption:
      "Правила использования <b>blurnet</b>\n" +
      "<blockquote>1. <b>Запрещено использовать VPN для незаконной деятельности</b>\n" +
      "Наш сервис предназначен для обеспечения конфиденциальности и безопасности, а не для обхода законов.\n\n" +
      "2. <b>Не допускается использование для вредоносных действий</b>\n" +
      "Запрещены DDoS-атаки, распространение вредоносного ПО, хакерские взломы и любые другие действия, наносящие вред третьим лицам.\n\n" +
      "3. <b>Запрещена передача учетных данных третьим лицам</b>\n" +
      "Аккаунт предоставляется только для личного использования. Распространение данных доступа может привести к блокировке.\n\n" +
      "4. <b>Администрация оставляет за собой право ограничить доступ</b>\n" +
      "В случае нарушения правил доступ к сервису может быть приостановлен без возврата средств.\n\n" +
      "5. <b>Сервис работает без гарантий</b>\n" +
      "Мы стремимся к стабильной работе, но не несем ответственности за возможные сбои, блокировки со стороны провайдеров или снижение скорости. (но при возникновении проблем мы обязательно постараемся их решить как можно быстрее)</blockquote>\n\n" +
      "Используя <b>blurnet</b>, вы автоматически соглашаетесь с данными правилами.",
    parse_mode: "HTML",
    reply_markup: getMainKeyboard(),
  });
}

/**
 * Handles tariff selection
 */
async function handleTariffSelection(ctx, tariffKey) {
  const tariff = TARIFFS[tariffKey];
  ctx.session.tariff = tariff.name;

  if (tariffKey === "tariff_trial") {
    await ctx.reply(
      "<b>Пробный период активирован</b> ✅\n\n" +
        "Переходите по ссылке и следуйте инструкции по подключению\n\n" +
        `👀 <a href='${SUBSCRIPTION_URL}'>Подписка</a>`,
      {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: require("../keyboards").getReturnTariffInlineKeyboard(),
      },
    );

    // Notify admin
    await ctx.api.sendMessage(
      require("../config").ADMIN_ID,
      `Новый пользователь активировал пробный период!\n` +
        `Пользователь: ${ctx.from.username ? "@" + ctx.from.username : "не указан"}\n` +
        `ID: ${ctx.from.id}`,
    );
  } else {
    await ctx.reply(tariff.message, {
      reply_markup: require("../keyboards").getPaymentInlineKeyboard(),
    });
  }
}

module.exports = {
  handleStart,
  handleInstruction,
  handleStartWork,
  handleRules,
  handleTariffSelection,
};

const { ADMIN_ID } = require("../config");
const api = require("../services/api"); // Импортируем наш API сервис

/**
 * Handles payment approval by admin
 */
async function handleApproval(ctx, bot, userId, tariff) {
  console.log("handleApproval called with parameters:");
  console.log("userId:", userId);
  console.log("tariff:", tariff);

  try {
    const originalCaption = ctx.callbackQuery.message.caption;
    const newCaption = `${originalCaption}\n\n✅ ПОДТВЕРЖДЕНО\nОбработано: ${new Date().toLocaleString()}`;

    // Проверка на пустой тариф
    if (!tariff) {
      console.error("ERROR: tariff is undefined in handleApproval!");
      tariff = "🥉1 месяц"; // Устанавливаем дефолтный тариф
      console.log("Using default tariff:", tariff);
    }

    // Генерируем имя пользователя
    const username = `tg_${userId}_${Math.floor(Math.random() * 1000)}`;
    console.log("Generated username:", username);

    // Создаем пользователя в системе через API
    let subscriptionUrl = require("../config").SUBSCRIPTION_URL; // Дефолтный URL на случай проблем с API

    try {
      // Создаем пользователя с указанием тарифа в описании
      console.log("Calling API createUser with tariff:", tariff);
      const userResponse = await api.createUser(username, userId, tariff);
      console.log("Пользователь успешно создан:", userResponse.uuid);

      // Получаем персональную ссылку на подписку пользователя
      if (userResponse.subscriptionUrl) {
        subscriptionUrl = userResponse.subscriptionUrl;
      }
    } catch (apiError) {
      console.error("Ошибка при создании пользователя в API:", apiError);
      // Продолжаем выполнение даже если API вернуло ошибку
    }

    await bot.api.sendPhoto(
      userId,
      require("../constants/media").PHOTO_IDS.payment_success,
      {
        caption:
          "<b>Платеж подтвержден</b>✔️\n\n" +
          "Переходите по ссылке и следуйте инструкции по подключению\n\n" +
          `👀 <a href='${subscriptionUrl}'>Подписка</a>`,
        parse_mode: "HTML",
        reply_markup: require("../keyboards").getMainKeyboard(),
      },
    );

    if (ctx.callbackQuery.message.photo || ctx.callbackQuery.message.document) {
      await bot.api.editMessageCaption(
        ADMIN_ID,
        ctx.callbackQuery.message.message_id,
        {
          caption: newCaption,
          reply_markup: { inline_keyboard: [] },
        },
      );
    }
  } catch (error) {
    console.error("Error in handleApproval:", error);
  }
}

/**
 * Handles payment rejection by admin
 */
async function handleRejection(ctx, bot, userId, tariff) {
  console.log("handleRejection called with parameters:");
  console.log("userId:", userId);
  console.log("tariff:", tariff);

  try {
    const originalCaption = ctx.callbackQuery.message.caption;
    const newCaption = `${originalCaption}\n\n❌ ОТКЛОНЕНО\nОбработано: ${new Date().toLocaleString()}`;

    // Проверка на пустой тариф
    if (!tariff || tariff.trim() === "") {
      // Извлекаем тариф из подписи сообщения через регулярное выражение
      const captionMatch = originalCaption.match(/Тариф: (.*?)(?:\n|$)/);
      if (captionMatch && captionMatch[1]) {
        tariff = captionMatch[1].trim();
        console.log("Извлечен тариф из подписи:", tariff);
      }
    }

    // Проверяем тариф еще раз перед созданием пользователя
    if (!tariff || tariff.trim() === "") {
      console.error("Тариф не определен после всех проверок");
      tariff = "🥉1 месяц"; // Устанавливаем тариф по умолчанию
    }

    await bot.api.sendPhoto(
      userId,
      require("../constants/media").PHOTO_IDS.payment_rejected,
      {
        caption:
          "<b>УВЕДОМЛЕНИЕ\n</b>" +
          "❗️ <b>Ошибка в оплате</b> ❗️\n\n" +
          `Ваш платеж за тариф «${tariff}» не подтвержден.\n\n` +
          "<u>Проверьте:</u>\n" +
          "1. Корректность введенных реквизитов\n" +
          "2. Правильность суммы\n\n" +
          "После этого попробуйте произвести оплату снова.\n\n" +
          "При возникновении вопросов обращайтесь к администратору(@blurnet_support)",
        parse_mode: "HTML",
        reply_markup: require("../keyboards").getMainKeyboard(),
      },
    );

    // Show tariffs again
    await bot.api.sendMessage(
      userId,
      "Выберите свой тарифный план:\n" +
        "🏆12 месяцев - <b>Цена: 1000 ₽</b>\n" +
        "🥇6 месяцев - <b>Цена: 550 ₽</b>\n" +
        "🥈3 месяца - <b>Цена: 280 ₽</b>\n" +
        "🥉1 месяц - <b>Цена: 100 ₽</b>\n\n" +
        "🌟 Попробовать бесплатный пробный период на <b>5 дней</b>",
      {
        parse_mode: "HTML",
        reply_markup: require("../keyboards").getTariffsInlineKeyboard(),
      },
    );

    if (ctx.callbackQuery.message.photo || ctx.callbackQuery.message.document) {
      await bot.api.editMessageCaption(
        ADMIN_ID,
        ctx.callbackQuery.message.message_id,
        {
          caption: newCaption,
          reply_markup: { inline_keyboard: [] },
        },
      );
    }
  } catch (error) {
    console.error("Error in handleRejection:", error);
  }
}

module.exports = {
  handleApproval,
  handleRejection,
};

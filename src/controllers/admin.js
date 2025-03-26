const { ADMIN_ID } = require("../config");

/**
 * Handles payment approval by admin
 */
async function handleApproval(ctx, bot, userId, tariff) {
  try {
    const originalCaption = ctx.callbackQuery.message.caption;
    const newCaption = `${originalCaption}\n\n✅ ПОДТВЕРЖДЕНО\nОбработано: ${new Date().toLocaleString()}`;

    await bot.api.sendPhoto(
      userId,
      require("../constants/media").PHOTO_IDS.payment_success,
      {
        caption:
          "<b>Платеж подтвержден</b>✔️\n\n" +
          "Переходите по ссылке и следуйте инструкции по подключению\n\n" +
          `👀 <a href='${require("../config").SUBSCRIPTION_URL}'>Подписка</a>`,
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
  try {
    const originalCaption = ctx.callbackQuery.message.caption;
    const newCaption = `${originalCaption}\n\n❌ ОТКЛОНЕНО\nОбработано: ${new Date().toLocaleString()}`;

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

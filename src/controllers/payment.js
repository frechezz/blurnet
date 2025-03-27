const { PHOTO_IDS } = require("../constants/media");
const messages = require("../constants/messages");
const {
  getAdminInlineKeyboard,
  getReturnTariffInlineKeyboard,
} = require("../keyboards");
const logger = require("../utils/logger");
const config = require("../../config");

/**
 * Обрабатывает отправку квитанции (фото или документа)
 * @param {Context} ctx - Контекст бота
 */
async function handleReceipt(ctx) {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username ? "@" + ctx.from.username : "не указан";
    const selectedTariff = ctx.session.tariff || "Тариф не указан";

    // Отправляем сообщение об ожидании пользователю
    await ctx.replyWithPhoto(PHOTO_IDS.waiting, {
      caption: messages.payment.waiting,
      parse_mode: "HTML",
      reply_markup: getReturnTariffInlineKeyboard(),
    });

    // Формируем текст для администратора
    const caption = messages.admin.new_payment
      .replace("{username}", username)
      .replace("{userId}", userId)
      .replace("{tariff}", selectedTariff);

    // Пересылаем квитанцию администратору
    if (ctx.message.photo) {
      const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      await ctx.api.sendPhoto(config.bot.adminId, photoId, {
        caption: caption,
        reply_markup: getAdminInlineKeyboard(userId, selectedTariff),
      });
    } else if (ctx.message.document) {
      await ctx.api.sendDocument(
        config.bot.adminId,
        ctx.message.document.file_id,
        {
          caption: caption,
          reply_markup: getAdminInlineKeyboard(userId, selectedTariff),
        },
      );
    }

    logger.info(
      `Пользователь ${userId} отправил квитанцию для тарифа ${selectedTariff}`,
    );
  } catch (error) {
    logger.error(`Ошибка в handleReceipt: ${error.message}`);
    await ctx.reply(messages.errors.general);
  }
}

module.exports = {
  handleReceipt,
};

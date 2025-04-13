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

    // Отправляем улучшенное сообщение об ожидании пользователю
    const waitingMsg = await ctx.replyWithPhoto(PHOTO_IDS.waiting, {
      caption: messages.payment.waiting,
      parse_mode: "HTML",
      reply_markup: getReturnTariffInlineKeyboard(),
    });
    
    // Сохраняем ID сообщения для последующего обновления
    ctx.session.waitingMessageId = waitingMsg.message_id;
    
    // Запускаем процесс отправки интерактивных статусов
    startInteractiveUpdates(ctx);

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

/**
 * Запускает процесс интерактивных обновлений статуса платежа
 * @param {Context} ctx - Контекст бота
 */
async function startInteractiveUpdates(ctx) {
  if (!ctx.session.waitingMessageId) return;
  
  const statusMessages = [
    "⌛ Администратор обрабатывает ваш платеж...",
    "⌛ Проверка платежной информации...",
    "⌛ Ваш платеж в очереди на обработку...",
    "⌛ Скоро ваш платеж будет обработан..."
  ];
  
  let currentIndex = 0;
  
  // Сохраняем интервал в сессии, чтобы его можно было остановить
  ctx.session.statusUpdateInterval = setInterval(async () => {
    try {
      if (!ctx.session.waitingMessageId) {
        clearInterval(ctx.session.statusUpdateInterval);
        return;
      }
      
      // Обновляем сообщение с новым статусом
      await ctx.api.editMessageCaption(ctx.chat.id, ctx.session.waitingMessageId, {
        caption: `${messages.payment.waiting}\n\n${statusMessages[currentIndex]}`,
        parse_mode: "HTML",
        reply_markup: getReturnTariffInlineKeyboard(),
      });
      
      // Переходим к следующему статусу
      currentIndex = (currentIndex + 1) % statusMessages.length;
    } catch (error) {
      logger.error(`Ошибка при обновлении статуса: ${error.message}`);
      clearInterval(ctx.session.statusUpdateInterval);
    }
  }, 30000); // Обновляем каждые 30 секунд
}

/**
 * Останавливает процесс интерактивных обновлений статуса
 * @param {Context} ctx - Контекст бота
 */
function stopInteractiveUpdates(ctx) {
  if (ctx.session.statusUpdateInterval) {
    clearInterval(ctx.session.statusUpdateInterval);
    ctx.session.statusUpdateInterval = null;
  }
}

module.exports = {
  handleReceipt,
  stopInteractiveUpdates,
};

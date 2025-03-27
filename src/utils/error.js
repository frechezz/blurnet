const logger = require("./logger");
const messages = require("../constants/messages");

/**
 * Централизованная обработка ошибок
 */
class ErrorHandler {
  /**
   * Обрабатывает ошибку и отправляет соответствующее сообщение пользователю
   * @param {Context} ctx - Контекст бота
   * @param {Error} error - Объект ошибки
   * @param {string} source - Источник ошибки (название функции)
   */
  static async handle(ctx, error, source) {
    logger.error(`Ошибка в ${source}: ${error.message}`, error.stack);

    // Определяем тип ошибки и выбираем соответствующее сообщение
    let errorMessage = messages.errors.general;

    if (error.message.includes("права") || error.message.includes("прав")) {
      errorMessage = messages.errors.unauthorized;
    } else if (
      error.message.includes("API") ||
      error.message.includes("сервер")
    ) {
      errorMessage = messages.errors.api_error;
    }

    // Отправляем сообщение об ошибке пользователю
    try {
      await ctx.reply(errorMessage, { parse_mode: "HTML" });
    } catch (replyError) {
      logger.error(
        `Не удалось отправить сообщение об ошибке: ${replyError.message}`,
      );
    }
  }

  /**
   * Отправляет уведомление об ошибке администратору
   * @param {object} bot - Объект бота
   * @param {number} adminId - ID администратора
   * @param {string} message - Сообщение об ошибке
   * @param {Error} error - Объект ошибки
   */
  static async notifyAdmin(bot, adminId, message, error) {
    try {
      const errorDetails = error ? `\n\nДетали ошибки: ${error.message}` : "";
      await bot.api.sendMessage(adminId, `⚠️ ${message}${errorDetails}`);
    } catch (notifyError) {
      logger.error(
        `Не удалось уведомить администратора: ${notifyError.message}`,
      );
    }
  }
}

module.exports = ErrorHandler;

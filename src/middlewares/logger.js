const logger = require("../utils/logger");

/**
 * Middleware для логирования всех запросов к боту
 * @param {Context} ctx - Контекст бота
 * @param {Function} next - Функция перехода к следующему middleware
 */
async function logRequests(ctx, next) {
  const start = new Date();
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const chatId = ctx.chat?.id;
  const messageType = ctx.message
    ? ctx.message.text
      ? "text"
      : Object.keys(ctx.message).find((key) => key !== "text")
    : "callback_query";

  const content =
    ctx.message?.text || ctx.callbackQuery?.data || "Медиа-контент";

  logger.info(
    `Входящий запрос: ${messageType}, пользователь: ${userId} (${username}), чат: ${chatId}, содержимое: "${content}"`,
  );

  try {
    await next();

    const ms = new Date() - start;
    logger.debug(`Запрос обработан за ${ms}ms`);
  } catch (error) {
    const ms = new Date() - start;
    logger.error(`Ошибка обработки запроса (${ms}ms): ${error.message}`);
    throw error;
  }
}

module.exports = {
  logRequests,
};

const config = require("../../config");
const logger = require("../utils/logger");
const messages = require("../constants/messages");

/**
 * Middleware для проверки прав администратора
 * @param {Context} ctx - Контекст бота
 * @param {Function} next - Функция перехода к следующему middleware
 */
async function adminOnly(ctx, next) {
  const userId = ctx.from ? ctx.from.id : null;

  if (!userId) {
    logger.warn("Попытка обращения без идентификатора пользователя");
    return;
  }

  if (userId !== config.bot.adminId) {
    logger.warn(`Попытка доступа к админ-функциям от пользователя: ${userId}`);
    await ctx.reply(messages.errors.unauthorized);
    return;
  }

  return next();
}

/**
 * Middleware для проверки наличия сессии пользователя
 * @param {Context} ctx - Контекст бота
 * @param {Function} next - Функция перехода к следующему middleware
 */
async function requireSession(ctx, next) {
  if (!ctx.session) {
    logger.warn(`Отсутствует сессия для пользователя: ${ctx.from?.id}`);
    await ctx.reply("Пожалуйста, перезапустите бота командой /start");
    return;
  }

  return next();
}

module.exports = {
  adminOnly,
  requireSession,
};

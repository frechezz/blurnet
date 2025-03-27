const { InputFile } = require("grammy");
const path = require("path");
const logger = require("./logger");

/**
 * Загружает медиафайлы и получает их ID
 * @param {Context} ctx - Контекст бота
 * @returns {Promise<Object>} Объект с ID медиафайлов
 */
async function uploadMediaAndGetIds(ctx) {
  const photos = [
    "tariffs.png",
    "instruction.png",
    "payment_success.png",
    "payment_rejected.png",
    "waiting.png",
    "rules.png",
  ];

  const fileIds = {};

  for (const photo of photos) {
    try {
      const photoPath = path.join(__dirname, "../../images", photo);
      const { photo: photoArray } = await ctx.replyWithPhoto(
        new InputFile(photoPath),
      );
      const fileId = photoArray[photoArray.length - 1].file_id;
      const photoName = photo.replace(".png", "");
      fileIds[photoName] = fileId;
      logger.info(`Загружено фото: ${photoName}, ID: ${fileId}`);
    } catch (error) {
      logger.error(`Ошибка при загрузке фото ${photo}: ${error.message}`);
    }
  }

  return fileIds;
}

/**
 * Форматирует сообщение, заменяя плейсхолдеры значениями
 * @param {string} template - Шаблон сообщения
 * @param {Object} values - Объект с значениями для замены
 * @returns {string} Отформатированное сообщение
 */
function formatMessage(template, values) {
  return template.replace(/{(\w+)}/g, (match, key) =>
    values.hasOwnProperty(key) ? values[key] : match,
  );
}

/**
 * Создает генератор уникальных имен пользователей
 * @param {number} telegramId - Telegram ID пользователя
 * @param {string} prefix - Префикс для имени пользователя
 * @returns {string} Уникальное имя пользователя
 */
function generateUsername(telegramId, prefix = "tg_") {
  const randomSuffix = Math.floor(Math.random() * 10000);
  return `${prefix}${telegramId}_${randomSuffix}`;
}

module.exports = {
  uploadMediaAndGetIds,
  formatMessage,
  generateUsername,
};

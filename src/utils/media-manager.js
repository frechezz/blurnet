const fs = require('fs');
const path = require('path');
const { InputFile } = require('grammy');
const logger = require('./logger');

const MEDIA_IDS_FILE = path.join(__dirname, '../../data/media_ids.json');

function ensureMediaIdsFileExists() {
  try {
    const dir = path.dirname(MEDIA_IDS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Создана директория для хранения ID медиа: ${dir}`);
    }

    if (!fs.existsSync(MEDIA_IDS_FILE)) {
      fs.writeFileSync(MEDIA_IDS_FILE, JSON.stringify({}, null, 2), 'utf8');
      logger.info(`Создан файл для хранения ID медиа: ${MEDIA_IDS_FILE}`);
    }
  } catch (error) {
    logger.error(`Ошибка при создании файла медиа: ${error.message}`);
  }
}

/**
 * Получает сохраненные ID медиа-файлов
 * @returns {Object} Объект с ID медиа-файлов
 */
function getSavedMediaIds() {
  ensureMediaIdsFileExists();
  try {
    const data = fs.readFileSync(MEDIA_IDS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Ошибка при чтении ID медиа: ${error.message}`);
    return {};
  }
}

/**
 * Сохраняет ID медиа-файлов
 * @param {Object} mediaIds - Объект с ID медиа-файлов
 */
function saveMediaIds(mediaIds) {
  ensureMediaIdsFileExists();
  try {
    fs.writeFileSync(MEDIA_IDS_FILE, JSON.stringify(mediaIds, null, 2), 'utf8');
    logger.info(`ID медиа-файлов сохранены в ${MEDIA_IDS_FILE}`);
  } catch (error) {
    logger.error(`Ошибка при сохранении ID медиа: ${error.message}`);
  }
}

/**
 * Загружает медиа-файлы и сохраняет их ID
 * @param {Object} bot - Экземпляр бота
 * @param {number} chatId - ID чата для загрузки (обычно ID админа)
 * @returns {Promise<Object>} Объект с ID медиа-файлов
 */
async function uploadAndSaveMediaIds(bot, chatId) {
  const photos = [
    "tariffs.png",
    "instruction.png",
    "payment_success.png",
    "payment_rejected.png",
    "waiting.png",
    "rules.png"
  ];

  const fileIds = {};
  
  logger.info('Начинаю загрузку медиа-файлов...');

  for (const photo of photos) {
    try {
      const photoPath = path.join(__dirname, "../../images", photo);
      
      if (!fs.existsSync(photoPath)) {
        logger.warn(`Фото не найдено: ${photoPath}`);
        continue;
      }
      
      const result = await bot.api.sendPhoto(chatId, new InputFile(photoPath));
      const photoArray = result.photo;
      const fileId = photoArray[photoArray.length - 1].file_id;
      const photoName = photo.replace(".png", "");
      
      fileIds[photoName] = fileId;
      logger.info(`Загружено фото: ${photoName}, ID: ${fileId}`);
      
      await bot.api.deleteMessage(chatId, result.message_id);
    } catch (error) {
      logger.error(`Ошибка при загрузке фото ${photo}: ${error.message}`);
    }
  }

  saveMediaIds(fileIds);
  
  return fileIds;
}

/**
 * Получает ID медиа-файлов, при необходимости загружает их
 * @param {Object} bot - Экземпляр бота
 * @param {number} adminId - ID администратора
 * @returns {Promise<Object>} Объект с ID медиа-файлов
 */
async function getOrUploadMediaIds(bot, adminId) {
  const savedIds = getSavedMediaIds();
  
  const requiredPhotos = ['tariffs', 'instruction', 'payment_success', 
                          'payment_rejected', 'waiting', 'rules'];
  
  const hasAllIds = requiredPhotos.every(photo => savedIds[photo]);
  
  if (hasAllIds) {
    logger.info('Все ID медиа-файлов найдены в сохраненных данных');
    return savedIds;
  }
  
  logger.info('Не все ID медиа-файлов найдены, начинаю загрузку...');
  
  try {
    await bot.api.sendMessage(
      adminId, 
      '⚙️ Выполняется автоматическая загрузка фотографий для работы бота...'
    );
    
    const newIds = await uploadAndSaveMediaIds(bot, adminId);
    
    const updatedIds = { ...savedIds, ...newIds };
    saveMediaIds(updatedIds);
    
    await bot.api.sendMessage(
      adminId, 
      '✅ Фотографии успешно загружены и ID сохранены!'
    );
    
    return updatedIds;
  } catch (error) {
    logger.error(`Ошибка при автоматической загрузке медиа: ${error.message}`);
    
    try {
      await bot.api.sendMessage(
        adminId, 
        `❌ Ошибка при автоматической загрузке фотографий: ${error.message}`
      );
    } catch (notifyError) {
      logger.error(`Не удалось отправить уведомление админу: ${notifyError.message}`);
    }
    
    return savedIds;
  }
}

module.exports = {
  getSavedMediaIds,
  saveMediaIds,
  uploadAndSaveMediaIds,
  getOrUploadMediaIds
};
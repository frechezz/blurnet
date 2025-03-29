/**
 * Media file IDs for fast access
 */
const { getSavedMediaIds } = require('../utils/media-manager');

let PHOTO_IDS = getSavedMediaIds();

const DEFAULT_PHOTO_IDS = {
  tariffs: null,
  instruction: null,
  payment_success: null,
  payment_rejected: null,
  waiting: null,
  rules: null,
};

PHOTO_IDS = { ...DEFAULT_PHOTO_IDS, ...PHOTO_IDS };

/**
 * Обновляет ID фотографий
 * @param {Object} newIds - Новые ID фотографий
 */
function updatePhotoIds(newIds) {
  PHOTO_IDS = { ...PHOTO_IDS, ...newIds };
}

/**
 * Получить ID фото по ключу
 * @param {string} key - Ключ фото
 * @returns {string|null} - ID фото или null, если не найден
 */
function getPhotoId(key) {
  return PHOTO_IDS[key] || null;
}

/**
 * Получить все ID фото
 * @returns {object} - Объект с ID фото
 */
function getAllPhotoIds() {
  return { ...PHOTO_IDS };
}

module.exports = {
  PHOTO_IDS,
  getPhotoId,
  getAllPhotoIds,
  updatePhotoIds
};
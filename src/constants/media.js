/**
 * Media file IDs for fast access
 */
const PHOTO_IDS = {
  tariffs:
    "AgACAgIAAxkDAAICdGfkYeX6pSis8rp2TCDaygW9ZWZOAALp7jEbN7IhS-JeiWKVefYqAQADAgADdwADNgQ",
  instruction:
    "AgACAgIAAxkDAAICdWfkYeZbwWPAb1PUcOnm4WLgNQ5_AALq7jEbN7IhS3NQKpH-W56AAQADAgADdwADNgQ",
  payment_success:
    "AgACAgIAAxkDAAICdmfkYecUZuv7eyzQ9M0-sKUkV8B_AALr7jEbN7IhS8qf-VbLbbSrAQADAgADdwADNgQ",
  payment_rejected:
    "AgACAgIAAxkDAAICd2fkYegeIX5D3XyYyGw5OaRrzBSNAALs7jEbN7IhS80EROhHs_SuAQADAgADdwADNgQ",
  waiting:
    "AgACAgIAAxkDAAICeGfkYel4289BsyWtqcylZbLYZhaAAALt7jEbN7IhS454wdpCPt1JAQADAgADdwADNgQ",
  rules:
    "AgACAgIAAxkDAAICeWfkYeoPBQ8ewTeon6bv2cwsJgK5AALu7jEbN7IhS1r3FbCn-RPsAQADAgADdwADNgQ",
};

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
};

const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

// Путь к файлу с данными пользователей
const dataPath = path.join(__dirname, "users.json");

/**
 * Инициализирует файл данных, если он не существует
 */
function initDataFile() {
  try {
    if (!fs.existsSync(path.dirname(dataPath))) {
      fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    }

    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, JSON.stringify({ users: {} }), "utf8");
      logger.info(`Файл данных пользователей создан: ${dataPath}`);
    }
  } catch (error) {
    logger.error(`Ошибка при инициализации файла данных: ${error.message}`);
  }
}

/**
 * Получает данные всех пользователей
 * @returns {Object} Объект с данными пользователей
 */
function getUsers() {
  initDataFile();
  try {
    const data = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(data).users || {};
  } catch (error) {
    logger.error(`Ошибка при чтении данных пользователей: ${error.message}`);
    return {};
  }
}

/**
 * Сохраняет данные пользователей
 * @param {Object} users - Объект с данными пользователей
 */
function saveUsers(users) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify({ users }, null, 2), "utf8");
  } catch (error) {
    logger.error(
      `Ошибка при сохранении данных пользователей: ${error.message}`,
    );
  }
}

/**
 * Проверяет, использовал ли пользователь пробный период
 * @param {number} telegramId - Telegram ID пользователя
 * @returns {boolean} true, если пользователь использовал пробный период
 */
function hasUsedTrial(telegramId) {
  const users = getUsers();
  return users[telegramId] && users[telegramId].usedTrial === true;
}

/**
 * Отмечает, что пользователь использовал пробный период
 * @param {number} telegramId - Telegram ID пользователя
 * @param {string} username - Имя пользователя
 */
function markTrialUsed(telegramId, username) {
  const users = getUsers();
  users[telegramId] = {
    username: username || `user_${telegramId}`,
    usedTrial: true,
    trialActivatedAt: new Date().toISOString(),
  };
  saveUsers(users);
  logger.info(
    `Пользователь ${telegramId} (${username}) отмечен как использовавший пробный период`,
  );
}

/**
 * Получает данные конкретного пользователя
 * @param {number} telegramId - Telegram ID пользователя
 * @returns {Object|null} Данные пользователя или null, если не найден
 */
function getUser(telegramId) {
  const users = getUsers();
  return users[telegramId] || null;
}

/**
 * Обновляет данные пользователя
 * @param {number} telegramId - Telegram ID пользователя
 * @param {Object} userData - Данные пользователя для обновления
 */
function updateUser(telegramId, userData) {
  const users = getUsers();
  users[telegramId] = {
    ...users[telegramId],
    ...userData,
    updatedAt: new Date().toISOString(),
  };
  saveUsers(users);
  logger.info(`Обновлены данные пользователя ${telegramId}`);
}

module.exports = {
  hasUsedTrial,
  markTrialUsed,
  getUser,
  getUsers,
  updateUser,
};

const authAPI = require("./auth");
const usersAPI = require("./users");

/**
 * Объединенный API-модуль для доступа ко всем API-функциям
 */
module.exports = {
  // Методы авторизации
  login: () => authAPI.login(),
  getToken: () => authAPI.getToken(),
  testConnection: () => authAPI.testConnection(),

  // Методы работы с пользователями
  getInboundUuid: () => usersAPI.getInboundUuid(),
  createUser: (username, telegramId, tariffKey) =>
    usersAPI.createUser(username, telegramId, tariffKey),

  getAllUsers: () => usersAPI.getAllUsers(),

  // Для удобства можно добавить другие методы здесь
};

const axios = require("axios");
const config = require("../../config");
const logger = require("../utils/logger");

/**
 * API модуль для авторизации
 */
class AuthAPI {
  constructor() {
    this.baseURL = config.api.url;
    this.token = null;
  }

  /**
   * Выполнить авторизацию и получить токен доступа
   * @returns {Promise<string>} Токен доступа
   */
  async login() {
    try {
      logger.info("Попытка авторизации в API");

      const response = await axios.post(
        `${this.baseURL}/api/auth/login`,
        {
          username: config.api.username,
          password: config.api.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: config.api.cookie || "",
          },
        },
      );

      this.token = response.data.response.accessToken;
      logger.info("Успешная авторизация в API");

      return this.token;
    } catch (error) {
      logger.error(
        "Ошибка авторизации в API:",
        error.response?.data || error.message,
      );
      throw new Error("Не удалось авторизоваться в панели управления");
    }
  }

  /**
   * Получить текущий токен или авторизоваться, если токен отсутствует
   * @returns {Promise<string>} Токен доступа
   */
  async getToken() {
    if (!this.token) {
      return this.login();
    }
    return this.token;
  }
}

module.exports = new AuthAPI();

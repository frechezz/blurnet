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
    this.lastLoginAttempt = 0;
    this.loginAttempts = 0;
    this.MAX_LOGIN_ATTEMPTS = 3;
    this.LOGIN_COOLDOWN = 5000; // 5 секунд
  }

  /**
   * Проверяет, можно ли выполнить новую попытку авторизации
   * @returns {boolean}
   */
  canAttemptLogin() {
    const now = Date.now();
    if (now - this.lastLoginAttempt < this.LOGIN_COOLDOWN) {
      return false;
    }
    if (this.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      return false;
    }
    return true;
  }

  /**
   * Выполнить авторизацию и получить токен доступа
   * @returns {Promise<string>} Токен доступа
   */
  async login() {
    const MAX_RETRIES = 3;
    let attempts = 0;
    
    while (attempts < MAX_RETRIES) {
      attempts++;
      try {
        if (!this.canAttemptLogin()) {
          throw new Error("Превышено количество попыток авторизации. Попробуйте позже.");
        }

        this.lastLoginAttempt = Date.now();
        this.loginAttempts++;

        logger.info("Попытка авторизации в API");
        logger.debug(`URL: ${this.baseURL}/api/auth/login`);
        logger.debug(`Username: ${config.api.username}`);
        logger.debug(`Cookie: ${config.api.cookie}`);

        const response = await axios.post(
          `${this.baseURL}/api/auth/login`,
          {
            username: config.api.username,
            password: config.api.password
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Cookie': config.api.cookie || ""
            },
            timeout: 10000 // Добавляем таймаут в 10 секунд
          }
        );

        if (!response.data || !response.data.response || !response.data.response.accessToken) {
          throw new Error("Неверный формат ответа от сервера");
        }

        this.token = response.data.response.accessToken;
        this.loginAttempts = 0; // Сбрасываем счетчик при успешной авторизации
        logger.info("Успешная авторизация в API");

        return this.token;
      } catch (error) {
        if (attempts >= MAX_RETRIES) {
          logger.error(
            "Ошибка авторизации в API после всех попыток:",
            error.response?.data || error.message,
          );
          
          if (error.response?.status === 403) {
            throw new Error("Доступ запрещен. Проверьте учетные данные и cookie.");
          }
          
          throw new Error(`Не удалось авторизоваться в панели управления: ${error.message}`);
        }
        
        const isNetworkError = error.code === 'ECONNREFUSED' || 
                             error.code === 'ETIMEDOUT' || 
                             error.code === 'ENOTFOUND' ||
                             error.message.includes('timeout');
        
        if (isNetworkError) {
          logger.warn(`Ошибка сети при авторизации, попытка ${attempts}/${MAX_RETRIES}: ${error.message}`);
          // Уменьшаем счетчик попыток авторизации, так как это сетевая ошибка, а не проблема с учетными данными
          this.loginAttempts = Math.max(0, this.loginAttempts - 1);
          // Ждем перед повторной попыткой
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        } else {
          logger.error(
            "Ошибка авторизации в API:",
            error.response?.data || error.message,
          );
          
          if (error.response?.status === 403) {
            throw new Error("Доступ запрещен. Проверьте учетные данные и cookie.");
          }
          
          throw new Error(`Не удалось авторизоваться в панели управления: ${error.message}`);
        }
      }
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

  /**
   * Тестирует соединение с API
   * @returns {Promise<boolean>} Результат проверки
   */
  async testConnection() {
    try {
      logger.info(`Проверка соединения с API (${this.baseURL})...`);
      const response = await axios.get(`${this.baseURL}/api/status`, {
        timeout: 10000,
        validateStatus: () => true // Принимаем любой статус
      });
      
      if (response.status >= 200 && response.status < 500) {
        logger.info(`Соединение с API установлено, статус: ${response.status}`);
        return true;
      } else {
        logger.error(`Ошибка соединения с API, статус: ${response.status}`);
        return false;
      }
    } catch (error) {
      logger.error(`Ошибка проверки соединения с API: ${error.message}`);
      return false;
    }
  }
}

module.exports = new AuthAPI();

const axios = require("axios");
const config = require("../../config");
const logger = require("../utils/logger");
const {
  BlurnetApiError,
  ApiNetworkError,
  ApiAuthError,
  ApiServerError,
} = require("../utils/errors");

/**
 * API модуль для авторизации
 */
class AuthAPI {
  constructor() {
    this.baseURL = config.api.url;
    this.token = null;
    this.tokenExpiresAt = 0; // Добавляем время истечения токена
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
          throw new BlurnetApiError("Неверный формат ответа от сервера при авторизации");
        }

        this.token = response.data.response.accessToken;
        this.loginAttempts = 0; // Сбрасываем счетчик при успешной авторизации
        // Устанавливаем время истечения токена (например, 1 час = 3600 * 1000 мс)
        this.tokenExpiresAt = Date.now() + 3600 * 1000; 
        logger.info("Успешная авторизация в API");

        return this.token;
      } catch (error) {
        if (attempts >= MAX_RETRIES) {
          logger.error(
            "Ошибка авторизации в API после всех попыток:",
            error.response?.data || error.message,
          );
          logger.error(`[CRITICAL] Не удалось авторизоваться в API Blurnet после ${MAX_RETRIES} попыток.`, error);

          if (error instanceof BlurnetApiError) {
            throw error; // Просто перебрасываем нашу специфическую ошибку
          }
          
          if (error.response?.status === 401 || error.response?.status === 403) {
            throw new ApiAuthError("Доступ запрещен. Проверьте учетные данные и cookie.", error);
          }

          // Если это не наша ошибка и не 401/403, выбрасываем общую
          throw new BlurnetApiError(`Не удалось авторизоваться в панели управления: ${error.message}`, error);
        }
        
        const isNetworkError = error.code === 'ECONNREFUSED' || 
                             error.code === 'ETIMEDOUT' || 
                             error.code === 'ENOTFOUND' ||
                             error.message.includes('timeout');
        
        if (isNetworkError) {
          logger.warn(`Ошибка сети при авторизации, попытка ${attempts}/${MAX_RETRIES}: ${error.message}`);
          this.loginAttempts = Math.max(0, this.loginAttempts - 1);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Увеличиваем задержку
          continue;
        } else if (error.response?.status >= 500) {
          // Ошибка сервера, тоже пробуем повторить
          logger.warn(`Ошибка сервера (${error.response.status}) при авторизации, попытка ${attempts}/${MAX_RETRIES}: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
          continue;
        } else if (error.response?.status === 401 || error.response?.status === 403) {
          // Ошибка авторизации - нет смысла повторять
          logger.error("Ошибка авторизации в API:", error.response?.data || error.message);
          throw new ApiAuthError("Доступ запрещен. Проверьте учетные данные и cookie.", error);
        } else {
          // Другие ошибки клиента (4xx, кроме 401/403) - нет смысла повторять
          logger.error(
            "Неизвестная ошибка при авторизации:",
            error.response?.data || error.message,
          );
          throw new BlurnetApiError(`Неизвестная ошибка при авторизации: ${error.message}`, error);
        }
      }
    }
  }

  /**
   * Получить текущий токен или авторизоваться, если токен отсутствует
   * @returns {Promise<string>} Токен доступа
   */
  async getToken() {
    // Проверяем, есть ли токен и не истек ли он
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }
    // Если токен отсутствует или истек, выполняем вход
    logger.info("Токен отсутствует или истек. Выполняется вход...");
    return this.login();
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
      
      if (response.status >= 200 && response.status < 400) { // 2xx и 3xx считаем успехом
        logger.info(`Соединение с API установлено, статус: ${response.status}`);
        return true;
      } else if (response.status >= 500) {
        logger.error(`Ошибка соединения с API (ошибка сервера), статус: ${response.status}`);
        return false;
      } else {
        logger.error(`Ошибка соединения с API, статус: ${response.status}`);
        return false;
      }
    } catch (error) {
      logger.error(`Ошибка проверки соединения с API: ${error.message}`);
      // Если это сетевая ошибка, логируем как ApiNetworkError
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
         logger.error("[CRITICAL] Не удается подключиться к API Blurnet. Проверьте доступность сервера и сетевые настройки.", new ApiNetworkError(error.message, error));
      }
      return false;
    }
  }
}

module.exports = new AuthAPI();

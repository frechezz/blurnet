const axios = require("axios");
const config = require("../../config");
const authAPI = require("./auth");
const logger = require("../utils/logger");
const { calculateExpireDate } = require("../constants/tariffs");
const {
  BlurnetApiError,
  ApiNetworkError,
  ApiAuthError,
  ApiValidationError,
  ApiNotFoundError,
  ApiServerError,
} = require("../utils/errors");

/**
 * Вспомогательная функция для повторных попыток API-запросов
 * @param {Function} requestFn Функция, выполняющая API-запрос
 * @param {string} operationName Название операции для логирования
 * @param {number} maxRetries Максимальное количество попыток
 * @param {number} initialDelay Начальная задержка перед повтором (в мс)
 * @returns {Promise<any>} Результат выполнения запроса
 */
async function retryApiRequest(requestFn, operationName, maxRetries = 3, initialDelay = 1000) {
  let attempts = 0;
  while (attempts < maxRetries) {
    attempts++;
    try {
      logger.debug(`[${operationName}] Попытка ${attempts}/${maxRetries}...`);
      return await requestFn();
    } catch (error) {
      logger.warn(`[${operationName}] Ошибка при попытке ${attempts}/${maxRetries}: ${error.message}`);

      const isNetworkError = error instanceof ApiNetworkError || 
                             (error.originalError && (error.originalError.code === 'ECONNREFUSED' || error.originalError.code === 'ETIMEDOUT' || error.originalError.code === 'ENOTFOUND' || error.originalError.message.includes('timeout')));
      
      const isServerError = error instanceof ApiServerError || (error.response?.status >= 500 && error.response?.status < 600);
      
      const shouldRetry = isNetworkError || isServerError;

      if (shouldRetry && attempts < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempts - 1); // Экспоненциальная задержка
        logger.warn(`[${operationName}] Повторная попытка через ${delay / 1000} сек...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        logger.error(`[${operationName}] Ошибка после ${attempts} попыток.`, error);
        // Логируем критическую ошибку, если она не была обработана
        if (!(error instanceof BlurnetApiError)) {
           logger.error(`[CRITICAL] Неустранимая ошибка при выполнении операции '${operationName}'.`, new BlurnetApiError(`Ошибка при ${operationName}`, error));
        } else {
           logger.error(`[CRITICAL] Не удалось выполнить операцию '${operationName}' после ${maxRetries} попыток. Тип ошибки: ${error.name}.`, error);
        }
        throw error; // Перебрасываем последнюю ошибку
      }
    }
  }
}

/**
 * API модуль для работы с пользователями
 */
class UsersAPI {
  constructor() {
    this.baseURL = config.api.url;
    this.inboundUuid = null;
    this.requestQueue = [];
    this.processingRequest = false;
    this.REQUEST_DELAY = 1000; // 1 секунда между запросами
  }

  /**
   * Обрабатывает очередь запросов с задержкой
   * @param {Function} requestFn - Функция запроса
   * @returns {Promise<any>}
   */
  async processWithDelay(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Обрабатывает очередь запросов
   */
  async processQueue() {
    if (this.processingRequest || this.requestQueue.length === 0) {
      return;
    }

    this.processingRequest = true;
    const { requestFn, resolve, reject } = this.requestQueue.shift();

    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      setTimeout(() => {
        this.processingRequest = false;
        this.processQueue();
      }, this.REQUEST_DELAY);
    }
  }

  /**
   * Получить список всех пользователей
   * @returns {Promise<Object>} Данные о пользователях
   */
  async getAllUsers() {
    // Используем обертку retryApiRequest
    return this.processWithDelay(() => 
      retryApiRequest(async () => {
        try {
          const token = await authAPI.getToken();
          const response = await axios.get(`${this.baseURL}/api/users/v2`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
              "Cookie": config.api.cookie || "",
            },
            timeout: 10000, // Таймаут для запроса
          });

          if (!response.data || !response.data.response) {
            throw new BlurnetApiError("Неверный формат ответа при получении пользователей");
          }

          logger.info(
            `Успешно получены данные о ${response.data.response.total} пользователях`,
          );
          return response.data.response;
        } catch (error) {
          throw this.handleApiError(error, "получении списка пользователей");
        }
      }, "getAllUsers", 3, 1000) // 3 попытки, начальная задержка 1 сек
    );
  }

  /**
   * Получить UUID инбаунда для создания пользователей
   * @returns {Promise<string>} UUID инбаунда
   */
  async getInboundUuid() {
    if (this.inboundUuid) {
      logger.debug(`Используем кэшированный UUID инбаунда: ${this.inboundUuid}`);
      return this.inboundUuid;
    }

    // Используем обертку retryApiRequest
    return this.processWithDelay(() => 
      retryApiRequest(async () => {
        try {
          const token = await authAPI.getToken();
          logger.info(`Получение списка инбаундов для тега: ${config.api.inboundTag}`);
          const response = await axios.get(`${this.baseURL}/api/inbounds`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Cookie": config.api.cookie || "",
            },
            timeout: 15000 // Увеличиваем таймаут до 15 секунд
          });

          // Проверка структуры ответа
          if (!response.data) {
            throw new BlurnetApiError("Сервер вернул пустой ответ при получении инбаундов");
          }
          
          if (!response.data.response || !Array.isArray(response.data.response)) {
            logger.error(`Неверный формат ответа от сервера: ${JSON.stringify(response.data)}`);
            throw new BlurnetApiError("Неверный формат ответа от сервера при получении инбаундов");
          }

          const inbounds = response.data.response;
          logger.debug(`Получено ${inbounds.length} инбаундов`);
          
          // Детальное логирование для отладки
          inbounds.forEach((inbound, index) => {
            logger.debug(`Инбаунд #${index+1}: tag=${inbound.tag}, uuid=${inbound.uuid}`);
          });

          // Ищем инбаунд по тегу
          const targetInbound = inbounds.find(
            (inbound) => inbound.tag === config.api.inboundTag,
          );

          if (!targetInbound) {
            // Если не нашли точное совпадение, попробуем найти частичное
            const similarInbound = inbounds.find(
              (inbound) => inbound.tag && inbound.tag.includes(config.api.inboundTag)
            );
            
            if (similarInbound) {
              logger.warn(`Инбаунд с точным тегом "${config.api.inboundTag}" не найден, используем похожий: ${similarInbound.tag}`);
              this.inboundUuid = similarInbound.uuid;
              return this.inboundUuid;
            }
            
            // Если и похожего нет, берем первый в списке
            if (inbounds.length > 0 && inbounds[0].uuid) {
              logger.warn(`Инбаунд "${config.api.inboundTag}" не найден, используем первый доступный: ${inbounds[0].tag}`);
              this.inboundUuid = inbounds[0].uuid;
              return this.inboundUuid;
            }
            
            throw new BlurnetApiError(`Инбаунд "${config.api.inboundTag}" не найден и нет подходящей замены`);
          }

          this.inboundUuid = targetInbound.uuid;
          logger.info(`Успешно получен UUID инбаунда: ${this.inboundUuid}`);
          return this.inboundUuid;
        } catch (error) {
          // Если не удалось получить после всех попыток внутри retryApiRequest,
          // пробуем использовать значение по умолчанию
          if (error instanceof BlurnetApiError && config.api.defaultInboundUuid) {
             logger.warn(`Не удалось получить UUID инбаунда после всех попыток. Используем UUID по умолчанию: ${config.api.defaultInboundUuid}`);
             this.inboundUuid = config.api.defaultInboundUuid;
             return this.inboundUuid;
          }
          // Если значения по умолчанию нет или ошибка другого типа, перебрасываем ее
          // Обработка специфичных ошибок происходит в handleApiError
          throw this.handleApiError(error, "получении UUID инбаунда"); 
        }
      }, "getInboundUuid", 3, 2000) // 3 попытки, начальная задержка 2 сек
    );
  }

  /**
   * Создать нового пользователя
   * @param {string} token - Токен пользователя
   * @param {object} userData - Данные пользователя
   * @returns {Promise<object>} Созданный пользователь
   */
  async createUser(token, userData) {
    const username = userData.username; // Получаем username для логирования
    
    // Используем обертку retryApiRequest
    return this.processWithDelay(() => 
      retryApiRequest(async () => {
        try {
          logger.info(`[API createUser] Попытка создания пользователя: ${username}`);
          logger.debug(`Данные запроса для создания: ${JSON.stringify(userData)}`);

          const response = await axios.post(`${this.baseURL}/api/users`, userData, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
              "Cookie": config.api.cookie || "",
            },
            timeout: 20000, // Увеличиваем таймаут
          });

          // Проверка статуса и ответа
          if (!response.data || !response.data.response || response.status >= 400) {
            // Логируем детали ошибки перед выбросом исключения
            const errorMessage = response.data?.message || "Не удалось создать пользователя";
            const errorDetails = response.data?.response || response.data || "No details";
            logger.error(`[API createUser] Ошибка ответа (${response.status}): ${errorMessage}. Детали: ${JSON.stringify(errorDetails)}`);
            
            // Генерируем специфическую ошибку в зависимости от статуса
            if (response.status === 400 || response.status === 422) {
              throw new ApiValidationError(`Ошибка валидации при создании пользователя: ${errorMessage}`, null, errorDetails);
            } else if (response.status === 401 || response.status === 403) {
              throw new ApiAuthError(`Ошибка авторизации при создании пользователя: ${errorMessage}`);
            } else if (response.status === 404) {
              throw new ApiNotFoundError(`Не найден API endpoint для создания пользователя`);
            } else if (response.status >= 500) {
              throw new ApiServerError(`Ошибка сервера (${response.status}) при создании пользователя: ${errorMessage}`, null, response.status);
            } else {
              throw new BlurnetApiError(`Ошибка (${response.status}) при создании пользователя: ${errorMessage}`);
            }
          }

          logger.info(`[API createUser] Пользователь ${username} успешно создан`);
          return response.data.response; // Возвращаем созданного пользователя

        } catch (error) {
          // Если axios выбросил ошибку (например, таймаут, сетевая ошибка), обрабатываем ее
          // Если это уже наша специфическая ошибка (из блока if выше), она будет обработана в handleApiError
          throw this.handleApiError(error, `создании пользователя ${username}`);
        }
      }, "createUser", 3, 1500) // 3 попытки, начальная задержка 1.5 сек
    );
  }

  /**
   * Получить пользователя по Telegram ID
   * @param {number|string} telegramId - Telegram ID пользователя
   * @returns {Promise<Object>} Данные пользователя
   */
  async getUserByTelegramId(telegramId) {
    // Используем обертку retryApiRequest
    return this.processWithDelay(() => 
      retryApiRequest(async () => {
        try {
          const token = await authAPI.getToken();
          logger.info(`[API getUserByTelegramId] Запрос пользователя по TG ID: ${telegramId}`);
          
          const response = await axios.get(`${this.baseURL}/api/users/tg/${telegramId}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
              "Cookie": config.api.cookie || "",
            },
            timeout: 10000, // Таймаут для запроса
          });

          if (!response.data || !response.data.response) {
            throw new BlurnetApiError("Неверный формат ответа при получении пользователя по Telegram ID");
          }

          logger.info(`Успешно получены данные пользователя с TG ID: ${telegramId}`);
          return response.data.response;
        } catch (error) {
          throw this.handleApiError(error, `получении пользователя по Telegram ID ${telegramId}`);
        }
      }, "getUserByTelegramId", 3, 1000) // 3 попытки, начальная задержка 1 сек
    );
  }

  /**
   * Обработчик ошибок API для стандартизации и генерации специфических исключений
   * @param {Error} error Исходная ошибка
   * @param {string} operation Описание операции, во время которой произошла ошибка
   * @returns {BlurnetApiError}
   */
  handleApiError(error, operation) {
    if (error instanceof BlurnetApiError) {
      // Если это уже наша специфическая ошибка, просто возвращаем ее
      // Логирование уже должно было произойти в retryApiRequest или при создании ошибки
      return error;
    }

    // Анализируем ошибку axios или другую стандартную ошибку
    logger.error(`Ошибка при ${operation}:`, error.response?.data || error.message, error.stack);

    const isNetworkError = error.code === 'ECONNREFUSED' || 
                         error.code === 'ETIMEDOUT' || 
                         error.code === 'ENOTFOUND' ||
                         error.message.includes('timeout');
    
    if (isNetworkError) {
      return new ApiNetworkError(`Сетевая ошибка при ${operation}`, error);
    }
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const message = data?.message || error.message;
      
      if (status === 401 || status === 403) {
        return new ApiAuthError(`Ошибка авторизации (${status}) при ${operation}: ${message}`, error);
      }
      if (status === 400 || status === 422) {
        return new ApiValidationError(`Ошибка валидации (${status}) при ${operation}: ${message}`, error, data);
      }
      if (status === 404) {
        return new ApiNotFoundError(`Ресурс не найден (${status}) при ${operation}: ${message}`, error);
      }
      if (status >= 500) {
        return new ApiServerError(`Ошибка сервера (${status}) при ${operation}: ${message}`, error, status);
      }
    }

    // Если не удалось определить тип ошибки, возвращаем общую
    return new BlurnetApiError(`Неизвестная ошибка при ${operation}: ${error.message}`, error);
  }
}

module.exports = new UsersAPI();

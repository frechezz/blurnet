const axios = require("axios");
const config = require("../../config");
const authAPI = require("./auth");
const logger = require("../utils/logger");
const { calculateExpireDate } = require("../constants/tariffs");

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
    return this.processWithDelay(async () => {
      try {
        const token = await authAPI.getToken();

        const response = await axios.get(
          `${this.baseURL}/api/users?page=1&pageSize=1000`,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
              "Cookie": config.api.cookie || "",
            },
          },
        );

        if (!response.data || !response.data.response) {
          throw new Error("Неверный формат ответа от сервера");
        }

        logger.info(
          `Успешно получены данные о пользователях: ${response.data.response.total} записей`,
        );
        return response.data.response;
      } catch (error) {
        logger.error(
          "Ошибка получения списка пользователей:",
          error.response?.data || error.message,
        );
        throw new Error(`Не удалось получить список пользователей: ${error.message}`);
      }
    });
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

    return this.processWithDelay(async () => {
      const MAX_RETRIES = 3;
      let attempts = 0;
      
      while (attempts < MAX_RETRIES) {
        attempts++;
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
            throw new Error("Сервер вернул пустой ответ");
          }
          
          if (!response.data.response || !Array.isArray(response.data.response)) {
            logger.error(`Неверный формат ответа от сервера: ${JSON.stringify(response.data)}`);
            throw new Error("Неверный формат ответа от сервера");
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
            
            throw new Error(`Инбаунд "${config.api.inboundTag}" не найден и нет подходящей замены`);
          }

          this.inboundUuid = targetInbound.uuid;
          logger.info(`Успешно получен UUID инбаунда: ${this.inboundUuid}`);
          return this.inboundUuid;
        } catch (error) {
          if (attempts >= MAX_RETRIES) {
            logger.error(
              "Ошибка получения инбаунда после всех попыток:",
              error.response?.data || error.message,
              error.stack
            );
            
            // Проверяем, есть ли у нас значение по умолчанию в конфиге
            if (config.api.defaultInboundUuid) {
              logger.warn(`Используем UUID инбаунда по умолчанию из конфига: ${config.api.defaultInboundUuid}`);
              this.inboundUuid = config.api.defaultInboundUuid;
              return this.inboundUuid;
            }
            
            throw new Error(`Не удалось получить информацию об инбаунде: ${error.message}`);
          }
          
          const isNetworkError = error.code === 'ECONNREFUSED' || 
                               error.code === 'ETIMEDOUT' || 
                               error.code === 'ENOTFOUND' ||
                               error.message.includes('timeout');
          
          if (isNetworkError) {
            logger.warn(`Ошибка сети при получении инбаунда, попытка ${attempts}/${MAX_RETRIES}: ${error.message}`);
            // Ждем перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          } else {
            logger.error(
              "Ошибка получения инбаунда:",
              error.response?.data || error.message,
              error.stack
            );
            
            // Если это ошибка 400-го или 500-го уровня, логируем детально
            if (error.response?.status) {
              logger.error(`Статус ошибки: ${error.response.status}`);
              if (error.response.data) {
                logger.error(`Детали: ${JSON.stringify(error.response.data)}`);
              }
            }
            
            // Пробуем еще раз с другим запросом
            if (attempts < MAX_RETRIES) {
              logger.warn(`Попробуем еще раз (попытка ${attempts + 1}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            
            throw new Error(`Не удалось получить информацию об инбаунде: ${error.message}`);
          }
        }
      }
    });
  }

  /**
   * Создать нового пользователя
   * @param {string} token - Токен пользователя
   * @param {object} userData - Данные пользователя
   * @returns {Promise<object>} Созданный пользователь
   */
  async createUser(token, userData) {
    // Принимает токен, UUID и подготовленные данные
    // Ставит в очередь ТОЛЬКО сам запрос на создание пользователя
    const username = userData.username; // Получаем username для логирования
    return this.processWithDelay(async () => {
      const MAX_RETRIES = 3; // Можно уменьшить, т.к. подготовка уже пройдена
      let attempts = 0;
      
      while (attempts < MAX_RETRIES) {
        attempts++;
        try {
          logger.info(`[API createUser] Попытка ${attempts}/${MAX_RETRIES} создания пользователя: ${username}`);
          logger.debug(`Данные запроса для создания: ${JSON.stringify(userData)}`);

          const response = await axios.post(`${this.baseURL}/api/users`, userData, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
              "Cookie": config.api.cookie || "",
            },
            timeout: 15000 // Увеличиваем таймаут до 15 секунд
          });

          if (!response.data || !response.data.response) {
            throw new Error("Неверный формат ответа от сервера");
          }

          logger.info(`Пользователь ${username} успешно создан с UUID: ${response.data.response.uuid}`);
          
          // Добавляем генерацию URL подписки для пользователя
          try {
            const createdUser = response.data.response;
            let subscriptionUrl = null;
            
            // Пытаемся получить URL из ответа или формируем сами
            if (createdUser.subscriptionUrl) {
              // Используем URL из ответа
              subscriptionUrl = createdUser.subscriptionUrl;
            } else if (createdUser.uuid) {
              // Формируем URL из UUID
              // Получаем короткий UUID (первые 8 символов)
              const shortUuid = createdUser.uuid.split('-')[0];
              subscriptionUrl = `${config.urls.subscription}${shortUuid}/singbox`;
            }
            
            return {
              ...createdUser,
              subscriptionUrl
            };
          } catch (urlError) {
            logger.error(`Ошибка при генерации URL подписки: ${urlError.message}`);
            // Возвращаем пользователя даже если не удалось создать URL
            return response.data.response;
          }
        } catch (error) {
          // Логируем ошибку с более подробной информацией
          const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
          logger.error(`Ошибка создания пользователя ${username} (попытка ${attempts}/${MAX_RETRIES}): ${errorMessage}`, error.stack);

          if (attempts >= MAX_RETRIES) {
            // Ошибка возникла именно при POST запросе
            throw new Error(`Не удалось создать пользователя ${username} после ${MAX_RETRIES} попыток POST запроса: ${errorMessage}`);
          }

          // Добавляем задержку перед повторной попыткой
          await new Promise(resolve => setTimeout(resolve, 1500)); 
        }
      }
      // Если все попытки неудачны, выбрасываем ошибку (хотя цикл while должен был выйти раньше)
      throw new Error(`Не удалось создать пользователя ${username} после ${MAX_RETRIES} попыток POST запроса.`);
    });
  }

  // /**
  //  * Генерирует URL подписки для пользователя
  //  * @param {string} shortUuid - Короткий UUID пользователя
  //  * @returns {string} URL подписки
  //  */
  // generateSubscriptionUrl(shortUuid) {
  //   // Используем корректный формат URL для подписки согласно API документации
  //   return `${config.urls.subscription}${shortUuid}/singbox`;
  // }
}

module.exports = new UsersAPI();

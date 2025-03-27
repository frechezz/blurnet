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
  }

  /**
   * Получить список всех пользователей
   * @returns {Promise<Object>} Данные о пользователях
   */
  async getAllUsers() {
    try {
      const token = await authAPI.getToken();

      // Используем правильный API URL из конфигурации и путь
      const response = await axios.get(
        `${this.baseURL}/api/users?page=1&pageSize=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Cookie: config.api.cookie || "",
          },
        },
      );

      // Возвращаем структуру данных
      if (response.data && response.data.response) {
        logger.info(
          `Успешно получены данные о пользователях: ${response.data.response.total} записей`,
        );
        return response.data.response;
      } else {
        logger.warn(
          "Неожиданный формат ответа API (без response):",
          response.data,
        );
        return { users: [] };
      }
    } catch (error) {
      logger.error(
        "Ошибка получения списка пользователей:",
        error.response?.data || error.message,
      );
      throw new Error("Не удалось получить список пользователей");
    }
  }

  /**
   * Получить UUID инбаунда для создания пользователей
   * @returns {Promise<string>} UUID инбаунда
   */
  async getInboundUuid() {
    if (this.inboundUuid) {
      return this.inboundUuid;
    }

    try {
      const token = await authAPI.getToken();

      const response = await axios.get(`${this.baseURL}/api/inbounds`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const inbounds = response.data.response;
      const targetInbound = inbounds.find(
        (inbound) => inbound.tag === config.api.inboundTag,
      );

      if (!targetInbound) {
        throw new Error(`Инбаунд "${config.api.inboundTag}" не найден`);
      }

      this.inboundUuid = targetInbound.uuid;
      return this.inboundUuid;
    } catch (error) {
      logger.error(
        "Ошибка получения инбаунда:",
        error.response?.data || error.message,
      );
      throw new Error("Не удалось получить информацию об инбаунде");
    }
  }

  /**
   * Создать нового пользователя
   * @param {string} username - Имя пользователя
   * @param {number} telegramId - Telegram ID пользователя
   * @param {string} tariffKey - Ключ тарифа
   * @returns {Promise<object>} Созданный пользователь
   */
  async createUser(username, telegramId, tariffKey) {
    try {
      const token = await authAPI.getToken();
      if (!this.inboundUuid) {
        await this.getInboundUuid();
      }

      // Получить дату окончания из тарифа
      const expireDate = calculateExpireDate(tariffKey);

      // Формируем данные для создания пользователя
      const userData = {
        username: username,
        telegramId: telegramId,
        trafficLimitBytes: 0, // Неограниченный трафик
        trafficLimitStrategy: "MONTH",
        expireAt: expireDate.toISOString(),
        status: "ACTIVE",
        activateAllInbounds: true,
        description: `Тариф: ${tariffKey}`, // Тариф в описании
      };

      logger.info(`Создание пользователя: ${username}, тариф: ${tariffKey}`);

      const response = await axios.post(`${this.baseURL}/api/users`, userData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Просто возвращаем данные ответа, включая subscriptionUrl
      return response.data.response;
    } catch (error) {
      logger.error(
        "Ошибка создания пользователя:",
        error.response?.data || error.message,
      );
      throw new Error("Не удалось создать пользователя");
    }
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

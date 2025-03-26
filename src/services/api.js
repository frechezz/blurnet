const axios = require("axios");
const { COOKIE, USERNAME, PASSWORD } = require("../config");

class RemnavaveAPI {
  constructor() {
    this.baseURL = "https://panel.blurnet.ru";
    this.token = null;
    this.inboundUuid = null;
  }

  // Авторизация в системе
  async login() {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/auth/login`,
        {
          username: USERNAME,
          password: PASSWORD,
        },
        {
          headers: {
            "Content-Type": "application/json",
            // Дополнительно передаем куки из URL если нужно
            Cookie: COOKIE,
          },
        },
      );

      this.token = response.data.response.accessToken;
      return this.token;
    } catch (error) {
      console.error(
        "Ошибка авторизации:",
        error.response?.data || error.message,
      );
      throw new Error("Не удалось авторизоваться в панели управления");
    }
  }

  // Получение UUID инбаунда "Steal"
  async getInboundUuid() {
    if (!this.token) {
      await this.login();
    }

    try {
      const response = await axios.get(`${this.baseURL}/api/inbounds`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      const inbounds = response.data.response;
      const stealInbound = inbounds.find((inbound) => inbound.tag === "Steal");

      if (!stealInbound) {
        throw new Error('Инбаунд "Steal" не найден');
      }

      this.inboundUuid = stealInbound.uuid;
      return this.inboundUuid;
    } catch (error) {
      console.error(
        "Ошибка получения инбаунда:",
        error.response?.data || error.message,
      );
      throw new Error("Не удалось получить информацию об инбаунде");
    }
  }

  // Создание пользователя с учетом тарифа
  async createUser(username, telegramId, tariff) {
    if (!this.token) {
      await this.login();
    }

    if (!this.inboundUuid) {
      await this.getInboundUuid();
    }

    // Преобразуем информацию о тарифе в параметры для API
    const tariffParams = this.getTariffParams(tariff);

    try {
      const response = await axios.post(
        `${this.baseURL}/api/users`,
        {
          username: username,
          telegramId: telegramId,
          trafficLimitBytes: tariffParams.trafficLimitBytes,
          trafficLimitStrategy: "MONTH", // или другая стратегия в зависимости от тарифа
          expireAt: tariffParams.expireAt,
          status: "ACTIVE",
          activateAllInbounds: true, // Или указать конкретный инбаунд через activeUserInbounds: [this.inboundUuid]
          description: `Тариф: ${tariff}`, // Явно указываем тариф в описании для всех типов тарифов
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data.response;
    } catch (error) {
      console.error(
        "Ошибка создания пользователя:",
        error.response?.data || error.message,
      );
      throw new Error("Не удалось создать пользователя");
    }
  }

  // Преобразование тарифа в параметры для API
  getTariffParams(tariff) {
    console.log("Получен тариф для обработки:", tariff); // Отладочная информация

    let trafficLimitBytes = 0; // 0 - неограниченный трафик
    const now = new Date(); // Текущая дата
    let expireAt = new Date(); // Создаем новую дату для изменения

    // Защита от неопределенного тарифа
    if (!tariff) {
      console.log(
        "Предупреждение: получен пустой тариф, устанавливаем дефолтное значение (1 месяц)",
      );
      expireAt.setMonth(now.getMonth() + 1);
      return {
        expireAt: expireAt.toISOString(),
        trafficLimitBytes: trafficLimitBytes,
      };
    }

    // Выводим все существующие кейсы для проверки
    console.log('Проверка на тариф "🏆12 месяцев":', tariff === "🏆12 месяцев");
    console.log('Проверка на тариф "🥇6 месяцев":', tariff === "🥇6 месяцев");
    console.log('Проверка на тариф "🥈3 месяца":', tariff === "🥈3 месяца");
    console.log('Проверка на тариф "🥉1 месяц":', tariff === "🥉1 месяц");
    console.log(
      'Проверка на тариф "🌟 Пробный период":',
      tariff === "🌟 Пробный период",
    );

    switch (tariff) {
      case "🏆12 месяцев":
        console.log("Установка тарифа на 12 месяцев");
        expireAt.setMonth(now.getMonth() + 12);
        break;
      case "🥇6 месяцев":
        console.log("Установка тарифа на 6 месяцев");
        expireAt.setMonth(now.getMonth() + 6);
        break;
      case "🥈3 месяца":
        console.log("Установка тарифа на 3 месяца");
        expireAt.setMonth(now.getMonth() + 3);
        break;
      case "🥉1 месяц":
        console.log("Установка тарифа на 1 месяц");
        expireAt.setMonth(now.getMonth() + 1);
        break;
      case "🌟 Пробный период":
        console.log("Установка пробного периода на 5 дней");
        expireAt.setDate(now.getDate() + 5);
        break;
      default:
        console.log("Выбран дефолтный случай: установка тарифа на 1 месяц");
        expireAt.setMonth(now.getMonth() + 1);
    }

    console.log("Итоговая дата истечения:", expireAt.toISOString());

    return {
      expireAt: expireAt.toISOString(),
      trafficLimitBytes: trafficLimitBytes,
    };
  }
}

module.exports = new RemnavaveAPI();

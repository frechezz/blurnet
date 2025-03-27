/**
 * Tariffs configuration
 */
const config = require("../../config");

// Базовые данные о тарифах
const TARIFF_DATA = {
  year: {
    key: "tariff_year",
    name: "🏆12 месяцев",
    price: 1000,
    duration: 12, // месяцев
    durationUnit: "month",
    discount: "Скидка 17%",
  },
  halfYear: {
    key: "tariff_halfyear",
    name: "🥇6 месяцев",
    price: 550,
    duration: 6,
    durationUnit: "month",
    discount: "Скидка 8%",
  },
  quarter: {
    key: "tariff_quarter",
    name: "🥈3 месяца",
    price: 280,
    duration: 3,
    durationUnit: "month",
    discount: "Скидка 7%",
  },
  month: {
    key: "tariff_month",
    name: "🥉1 месяц",
    price: 100,
    duration: 1,
    durationUnit: "month",
    discount: null,
  },
  trial: {
    key: "tariff_trial",
    name: "🌟 Пробный период",
    price: 0,
    duration: 5,
    durationUnit: "day",
    discount: "Бесплатно",
  },
};

// Сформированные тарифы с дополнительной информацией для отображения
const TARIFFS = {
  tariff_year: {
    ...TARIFF_DATA.year,
    priceFormatted: `${TARIFF_DATA.year.price}₽`,
    message: `Сумма к оплате ${TARIFF_DATA.year.price}₽.\n
💳Реквизиты: ${config.payment.requisites}\n
Оплата прошла успешно?`,
  },
  tariff_halfyear: {
    ...TARIFF_DATA.halfYear,
    priceFormatted: `${TARIFF_DATA.halfYear.price}₽`,
    message: `Сумма к оплате ${TARIFF_DATA.halfYear.price}₽.\n
💳Реквизиты: ${config.payment.requisites}\n
Оплата прошла успешно?`,
  },
  tariff_quarter: {
    ...TARIFF_DATA.quarter,
    priceFormatted: `${TARIFF_DATA.quarter.price}₽`,
    message: `Сумма к оплате ${TARIFF_DATA.quarter.price}₽.\n
💳Реквизиты: ${config.payment.requisites}\n
Оплата прошла успешно?`,
  },
  tariff_month: {
    ...TARIFF_DATA.month,
    priceFormatted: `${TARIFF_DATA.month.price}₽`,
    message: `Сумма к оплате ${TARIFF_DATA.month.price}₽.\n
💳Реквизиты: ${config.payment.requisites}\n
Оплата прошла успешно?`,
  },
  tariff_trial: {
    ...TARIFF_DATA.trial,
    priceFormatted: `Бесплатно`,
    message: `Ваш бесплатный пробный период на 5 дней будет активирован в ближайшее время!`,
  },
};

/**
 * Получить тариф по ключу
 * @param {string} key - Ключ тарифа
 * @returns {object|null} - Объект тарифа или null, если не найден
 */
function getTariff(key) {
  return TARIFFS[key] || null;
}

/**
 * Рассчитать дату окончания тарифа
 * @param {string} tariffKey - Ключ тарифа
 * @returns {Date} - Дата окончания
 */
function calculateExpireDate(tariffKey) {
  const tariff = getTariff(tariffKey);
  if (!tariff) return null;

  const now = new Date();
  const expireDate = new Date(now);

  if (tariff.durationUnit === "month") {
    expireDate.setMonth(now.getMonth() + tariff.duration);
  } else if (tariff.durationUnit === "day") {
    expireDate.setDate(now.getDate() + tariff.duration);
  }

  return expireDate;
}

/**
 * Получить все тарифы для отображения
 * @returns {array} - Массив тарифов
 */
function getAllTariffs() {
  return Object.values(TARIFFS);
}

/**
 * Получить название тарифа по умолчанию
 * если произошла ошибка с определением
 */
function getDefaultTariffName() {
  return TARIFF_DATA.month.name;
}

module.exports = {
  TARIFFS,
  getTariff,
  calculateExpireDate,
  getAllTariffs,
  getDefaultTariffName,
};

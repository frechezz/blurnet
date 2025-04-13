const { Keyboard, InlineKeyboard } = require("grammy");
const config = require("../../config");
const { getAllTariffs } = require("../constants/tariffs");

/**
 * Создает клавиатуру главного меню
 * @returns {Keyboard} Клавиатура главного меню
 */
function getMainKeyboard() {
  return new Keyboard()
    .row("Инструкция 📑")
    .row("Начать работу с " + config.service.name + " 🚀")
    .row("Правила использования")
    .placeholder("Выбери действие")
    .resized();
}

/**
 * Создает клавиатуру выбора тарифа
 * @returns {InlineKeyboard} Клавиатура выбора тарифа
 */
function getTariffsInlineKeyboard() {
  const keyboard = new InlineKeyboard()
    .row()
    .text("🏆12 месяцев", "tariff_year")
    .text("🥇6 месяцев", "tariff_halfyear")


    
    .text("🥈3 месяца", "tariff_quarter")
    .row()
    .text("🥉1 месяц", "tariff_month")
    .row()
    .text("🌟 Пробный период", "tariff_trial")
    .row()
    .text("🔙 в главное меню", "back_main");

  return keyboard;
}

/**
 * Создает клавиатуру подтверждения оплаты
 * @returns {InlineKeyboard} Клавиатура подтверждения оплаты
 */
function getPaymentInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .text("Да, успешно✔", "payment_success")
    .text("🔙 к тарифам", "payment_cancel");
}

/**
 * Создает клавиатуру для возврата к выбору тарифа
 * @returns {InlineKeyboard} Клавиатура возврата к тарифам
 */
function getReturnTariffInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .text("Вернуться к тарифным планам ↩️", "back_tariffs");
}

/**
 * Создает клавиатуру администратора для подтверждения платежа
 * @param {number} userId - Идентификатор пользователя
 * @param {string} tariff - Название тарифа
 * @returns {InlineKeyboard} Клавиатура администратора
 */
function getAdminInlineKeyboard(userId, tariff) {
  // Encode tariff to base64
  const encodedTariff = Buffer.from(tariff).toString("base64");

  return new InlineKeyboard()
    .row()
    .text("✅ Подтвердить", `approve:${userId}:${encodedTariff}`)
    .text("❌ Отклонить", `reject:${userId}:${encodedTariff}`);
}

/**
 * Создает клавиатуру с поддержкой и новостями
 * @returns {InlineKeyboard} Клавиатура с ссылками
 */
function getInstructionInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .url("Сапорт", `https://t.me/${config.service.supportUsername}`)
    .url("Новости", `https://t.me/${config.service.newsChannel}`);
}

module.exports = {
  getMainKeyboard,
  getTariffsInlineKeyboard,
  getPaymentInlineKeyboard,
  getReturnTariffInlineKeyboard,
  getAdminInlineKeyboard,
  getInstructionInlineKeyboard,
};

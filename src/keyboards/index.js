const { Keyboard, InlineKeyboard } = require("grammy");

/**
 * Creates the main menu keyboard
 */
function getMainKeyboard() {
  return new Keyboard()
    .row("Инструкция 📑")
    .row("Начать работу с blurnet 🚀")
    .row("Правила использования")
    .placeholder("Выбери действие")
    .resized();
}

/**
 * Creates the tariff selection keyboard
 */
function getTariffsInlineKeyboard() {
  return new InlineKeyboard()
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
}

/**
 * Creates the payment confirmation keyboard
 */
function getPaymentInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .text("Да, успешно✔", "payment_success")
    .text("🔙 к тарифам", "payment_cancel");
}

/**
 * Creates a keyboard to return to tariff selection
 */
function getReturnTariffInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .text("Вернуться к тарифным планам ↩️", "back_tariffs");
}

/**
 * Creates an admin keyboard for payment approval
 */
function getAdminInlineKeyboard(userId, tariff) {
  const encodedTariff = tariff.replace(/[^a-zA-Z0-9]/g, "_");
  return new InlineKeyboard()
    .row()
    .text("✅ Подтвердить", `approve_${userId}_${encodedTariff}`)
    .text("❌ Отклонить", `reject_${userId}_${encodedTariff}`);
}

/**
 * Creates a keyboard with support and news links
 */
function getInstructionInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .url("Сапорт", "https://t.me/blurnet_support")
    .url("Новости", "https://t.me/blurnet_news");
}

module.exports = {
  getMainKeyboard,
  getTariffsInlineKeyboard,
  getPaymentInlineKeyboard,
  getReturnTariffInlineKeyboard,
  getAdminInlineKeyboard,
  getInstructionInlineKeyboard,
};

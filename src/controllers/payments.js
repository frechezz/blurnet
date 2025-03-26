const { PHOTO_IDS } = require("../constants/media");
const { ADMIN_ID } = require("../config");
const {
  getAdminInlineKeyboard,
  getReturnTariffInlineKeyboard,
} = require("../keyboards");

/**
 * Handles receipt submission (photo or document)
 */
async function handleReceipt(ctx) {
  const userId = ctx.from.id;
  const username = ctx.from.username ? "@" + ctx.from.username : "не указан";
  const selectedTariff = ctx.session.tariff || "Тариф не указан";

  try {
    // Send waiting message to user
    await ctx.replyWithPhoto(PHOTO_IDS.waiting, {
      caption:
        "<b>Благодарим за покупку!</b>\n\n" +
        "Ожидайте подтверждение перевода администратором ⌛️",
      parse_mode: "HTML",
      reply_markup: getReturnTariffInlineKeyboard(),
    });

    // Forward receipt to admin
    const caption = `Новый платеж!\nПользователь: ${username}\nID: ${userId}\nТариф: ${selectedTariff}`;

    if (ctx.message.photo) {
      const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      await ctx.api.sendPhoto(ADMIN_ID, photoId, {
        caption: caption,
        reply_markup: getAdminInlineKeyboard(userId, selectedTariff),
      });
    } else if (ctx.message.document) {
      await ctx.api.sendDocument(ADMIN_ID, ctx.message.document.file_id, {
        caption: caption,
        reply_markup: getAdminInlineKeyboard(userId, selectedTariff),
      });
    }
  } catch (error) {
    console.error("Error handling receipt:", error);
  }
}

module.exports = {
  handleReceipt,
};

const { Bot, session } = require("grammy");
const { BOT_TOKEN, ADMIN_ID } = require("./config");
const { TARIFFS } = require("./constants/tariffs");
const { PHOTO_IDS } = require("./constants/media");
const {
  getMainKeyboard,
  getTariffsInlineKeyboard,
  getReturnTariffInlineKeyboard,
} = require("./keyboards");
const { handleApproval, handleRejection } = require("./controllers/admin");
const {
  handleStart,
  handleInstruction,
  handleStartWork,
  handleRules,
  handleTariffSelection,
} = require("./controllers/user");
const { handleReceipt } = require("./controllers/payments");
const { uploadMediaAndGetIds } = require("./utils/helpers");

// Initialize bot with token
const bot = new Bot(BOT_TOKEN);

// Add session middleware
bot.use(
  session({
    initial: () => ({ tariff: null }),
  }),
);

// Command handlers
bot.command("start", handleStart);

// For admin photo upload - commented out by default
// Uncomment to use and then comment again
// bot.command("upload_photos", async (ctx) => {
//   if (ctx.from.id !== Number(ADMIN_ID)) {
//     return ctx.reply("Only admin can use this command.");
//   }
//   const fileIds = await uploadMediaAndGetIds(ctx);
//   console.log("Media file IDs:", fileIds);
//   await ctx.reply("File IDs have been logged to console.");
// });

// Button handlers
bot.hears("Инструкция 📑", handleInstruction);
bot.hears("Начать работу с blurnet 🚀", handleStartWork);
bot.hears("Правила использования", handleRules);

// Callback query handlers
bot.on("callback_query", async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  try {
    // Handle tariff selection
    if (callbackData.startsWith("tariff_")) {
      await handleTariffSelection(ctx, callbackData);
    }
    // Return to main menu
    else if (callbackData === "back_main") {
      await ctx.deleteMessage();
      await handleStart(ctx);
    }
    // Return to tariffs menu
    else if (callbackData === "back_tariffs") {
      await ctx.replyWithPhoto(PHOTO_IDS.tariffs, {
        caption:
          "Выберите свой тарифный план:\n" +
          "🏆12 месяцев - <b>Цена: 1000 ₽</b>\n" +
          "🥇6 месяцев - <b>Цена: 550 ₽</b>\n" +
          "🥈3 месяца - <b>Цена: 280 ₽</b>\n" +
          "🥉1 месяц - <b>Цена: 100 ₽</b>\n\n" +
          "🌟 Попробовать бесплатный пробный период на <b>5 дней</b>",
        parse_mode: "HTML",
        reply_markup: getTariffsInlineKeyboard(),
      });
    }
    // Handle payment confirmation
    else if (callbackData === "payment_success") {
      await ctx.reply(
        " ❗️Пришлите квитанцию об оплате или скриншот перевода❗️",
      );
    }
    // Cancel payment and return to tariffs
    else if (callbackData === "payment_cancel") {
      await handleStartWork(ctx);
    }
    // Admin approval/rejection handlers
    else if (
      callbackData.startsWith("approve:") ||
      callbackData.startsWith("reject:")
    ) {
      if (userId !== Number(ADMIN_ID)) {
        throw new Error("У вас нет прав для этого действия");
      }

      // Используем разделитель ":" вместо "_"
      const [action, targetUserId, encodedTariff] = callbackData.split(":");

      // Добавляем подробное логирование
      console.log("Callback data:", callbackData);
      console.log("Action:", action);
      console.log("Target User ID:", targetUserId);
      console.log("Encoded Tariff:", encodedTariff);

      // Проверяем, что encodedTariff определен
      if (!encodedTariff) {
        console.error("ERROR: encodedTariff is undefined!");
        await ctx.answerCallbackQuery({
          text: "Ошибка: Не удалось определить тариф",
          show_alert: true,
        });
        return;
      }

      // Декодируем тариф из base64
      try {
        const tariff = Buffer.from(encodedTariff, "base64").toString();
        console.log("Decoded Tariff:", tariff);

        if (action === "approve") {
          await handleApproval(ctx, bot, Number(targetUserId), tariff);
          await ctx.answerCallbackQuery({ text: "Платеж подтвержден" });
        } else if (action === "reject") {
          await handleRejection(ctx, bot, Number(targetUserId), tariff);
          await ctx.answerCallbackQuery({ text: "Платеж отклонен" });
        }
      } catch (error) {
        console.error("Error decoding tariff:", error);
        await ctx.answerCallbackQuery({
          text: "Ошибка при обработке тарифа",
          show_alert: true,
        });
      }
    }

    // Always answer the callback query to stop loading state
    if (!ctx.callbackQuery.answered) {
      await ctx.answerCallbackQuery();
    }
  } catch (error) {
    console.error("Error handling callback:", error);
    await ctx.answerCallbackQuery({
      text: `Ошибка: ${error.message}`,
      show_alert: true,
    });
  }
});
// Media message handlers
bot.on(["message:photo", "message:document"], handleReceipt);

// Error handler
bot.catch((err) => {
  console.error("Bot error:", err);
});

module.exports = { bot };

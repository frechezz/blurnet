const { Bot, session } = require("grammy");
const config = require("../config");
const logger = require("./utils/logger");
const messages = require("./constants/messages");

// Импорт функций обработчиков
const {
  handleStart,
  handleInstruction,
  handleStartWork,
  handleRules,
  handleTariffSelection,
  handlePaymentRequest,
  handlePaymentCancel,
} = require("./controllers/user");

const {
  handleApproval,
  handleRejection,
  handleGetUsers,
} = require("./controllers/admin");

const { handleReceipt } = require("./controllers/payment");


// Импорт middlewares
const { logRequests } = require("./middlewares/logger");
const { adminOnly } = require("./middlewares/auth");

// Импорт утилит
const ErrorHandler = require("./utils/error");
const mediaManager = require("./utils/media-manager");
const { updatePhotoIds } = require("./constants/media");

// Инициализация бота
const bot = new Bot(config.bot.token);

// Логирование запросов
bot.use(logRequests);

// Сессия для хранения данных пользователя
bot.use(
  session({
    initial: () => ({ tariff: null }),
  }),
);

// Обработка команды /start
bot.command("start", async (ctx) => {
  try {
    await handleStart(ctx);
  } catch (error) {
    await ErrorHandler.handle(ctx, error, "command:start");
  }
});

// Команда для загрузки фотографий (только для админа)
bot.command("upload_photos", adminOnly, async (ctx) => {
  try {
    logger.info("Запуск загрузки фотографий администратором");
    await ctx.reply("⚙️ Начинаю загрузку фотографий...");
    const fileIds = await mediaManager.uploadAndSaveMediaIds(bot, ctx.from.id);
    updatePhotoIds(fileIds); // Обновляем ID в текущей сессии
    await ctx.reply("✅ Фотографии успешно загружены и ID сохранены!");
  } catch (error) {
    await ErrorHandler.handle(ctx, error, "command:upload_photos");
  }
});

// Обработка кнопок основного меню
bot.hears("Инструкция 📑", async (ctx) => {
  try {
    await handleInstruction(ctx);
  } catch (error) {
    await ErrorHandler.handle(ctx, error, "hears:Инструкция");
  }
});

bot.hears(
  new RegExp(`Начать работу с ${config.service.name} 🚀`),
  async (ctx) => {
    try {
      await handleStartWork(ctx);
    } catch (error) {
      await ErrorHandler.handle(ctx, error, "hears:НачатьРаботу");
    }
  },
);

bot.hears("Правила использования", async (ctx) => {
  try {
    await handleRules(ctx);
  } catch (error) {
    await ErrorHandler.handle(ctx, error, "hears:Правила");
  }
});

// Обработка callback-запросов (inline кнопок)
bot.on("callback_query", async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  try {
    // Маршрутизация callback-запросов
    if (callbackData.startsWith("tariff_")) {
      await handleTariffSelection(ctx, callbackData);
    } else if (callbackData === "back_main") {
      await ctx.deleteMessage();
      await handleStart(ctx);
    } else if (callbackData === "back_tariffs") {
      await handleStartWork(ctx);
    } else if (callbackData === "payment_success") {
      await handlePaymentRequest(ctx);
    } else if (callbackData === "payment_cancel") {
      await handlePaymentCancel(ctx);
    } else if (
      callbackData.startsWith("approve:") ||
      callbackData.startsWith("reject:")
    ) {
      // Проверка прав администратора
      if (userId !== config.bot.adminId) {
        throw new Error(messages.errors.unauthorized);
      }

      // Используем разделитель ":" вместо "_"
      const [action, targetUserId, encodedTariff] = callbackData.split(":");

      // Проверка наличия необходимых данных
      if (!encodedTariff) {
        logger.error("Ошибка: encodedTariff не определен!");
        await ctx.answerCallbackQuery({
          text: "Ошибка: Не удалось определить тариф",
          show_alert: true,
        });
        return;
      }

      // Декодирование тарифа
      try {
        const tariff = Buffer.from(encodedTariff, "base64").toString();
        logger.debug(`Декодирован тариф: ${tariff}`);

        if (action === "approve") {
          await handleApproval(ctx, bot, Number(targetUserId), tariff);
          await ctx.answerCallbackQuery({ text: "Платеж подтвержден" });
        } else if (action === "reject") {
          await handleRejection(ctx, bot, Number(targetUserId), tariff);
          await ctx.answerCallbackQuery({ text: "Платеж отклонен" });
        }
      } catch (error) {
        logger.error(`Ошибка декодирования тарифа: ${error.message}`);
        await ctx.answerCallbackQuery({
          text: "Ошибка при обработке тарифа",
          show_alert: true,
        });
      }
    }

    // Всегда отвечаем на callback-запрос, чтобы убрать состояние загрузки
    if (!ctx.callbackQuery.answered) {
      await ctx.answerCallbackQuery();
    }
  } catch (error) {
    await ErrorHandler.handle(ctx, error, "callback_query");
    await ctx.answerCallbackQuery({
      text: `Ошибка: ${error.message}`,
      show_alert: true,
    });
  }
});

// Обработка медиа-сообщений (квитанций)
bot.on(["message:photo", "message:document"], async (ctx) => {
  try {
    await handleReceipt(ctx);
  } catch (error) {
    await ErrorHandler.handle(ctx, error, "media_handler");
  }
});

// Команда /users (только для админа)
bot.command("users", adminOnly, async (ctx) => {
  try {
    await handleGetUsers(ctx);
  } catch (error) {
    await ErrorHandler.handle(ctx, error, "command:users");
  }
});

/**
 * Инициализация медиа-файлов при запуске бота
 * @returns {Promise<void>}
 */
async function initializeMedia() {
  try {
    logger.info("Начинаю инициализацию медиа-файлов...");
    const mediaIds = await mediaManager.getOrUploadMediaIds(bot, config.bot.adminId);
    updatePhotoIds(mediaIds);
    logger.info("Медиа-файлы успешно инициализированы");
    return true;
  } catch (error) {
    logger.error(`Ошибка при инициализации медиа-файлов: ${error.message}`);
    return false;
  }
}

// Глобальный обработчик ошибок
bot.catch((err) => {
  logger.error("Необработанная ошибка бота:", err);
});

// Запуск бота с инициализацией медиа
async function startBot() {
  try {
    logger.info(`Инициализация медиа-файлов...`);
    await initializeMedia();
    
    logger.info(`Запуск бота ${config.service.name}...`);
    await bot.start();
    
    logger.info(`Бот ${config.service.name} успешно запущен`);
    return true;
  } catch (error) {
    logger.error(`Ошибка при запуске бота: ${error.message}`);
    return false;
  }
}

// Модифицируем экспорт, чтобы предоставить доступ к функции запуска
module.exports = {
  bot,
  startBot
};
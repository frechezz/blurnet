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

const { handleReceipt, stopInteractiveUpdates } = require("./controllers/payment");


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
    initial: () => ({ 
      tariff: null,
      waitingMessageId: null,
      statusUpdateInterval: null
    }),
  }),
);

// Обработка команды /start
bot.command("start", async (ctx) => {
  try {
    // Останавливаем предыдущие интерактивные обновления при перезапуске бота
    stopInteractiveUpdates(ctx);
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
    // Останавливаем предыдущие интерактивные обновления
    stopInteractiveUpdates(ctx);
    await handleInstruction(ctx);
  } catch (error) {
    await ErrorHandler.handle(ctx, error, "hears:Инструкция");
  }
});

bot.hears(
  new RegExp(`Начать работу с ${config.service.name} 🚀`),
  async (ctx) => {
    try {
      // Останавливаем предыдущие интерактивные обновления
      stopInteractiveUpdates(ctx);
      await handleStartWork(ctx);
    } catch (error) {
      await ErrorHandler.handle(ctx, error, "hears:НачатьРаботу");
    }
  },
);

bot.hears("Правила использования", async (ctx) => {
  try {
    // Останавливаем предыдущие интерактивные обновления
    stopInteractiveUpdates(ctx);
    await handleRules(ctx);
  } catch (error) {
    await ErrorHandler.handle(ctx, error, "hears:Правила");
  }
});

// Обработка callback-запросов (inline кнопок)
bot.on("callback_query", async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const userId = ctx.from.id;

    try {
      // Маршрутизация callback-запросов
      if (callbackData.startsWith("tariff_")) {
        // Останавливаем предыдущие интерактивные обновления
        stopInteractiveUpdates(ctx);
        await handleTariffSelection(ctx, callbackData);
      } else if (callbackData === "back_main") {
        // Останавливаем предыдущие интерактивные обновления
        stopInteractiveUpdates(ctx);
        await ctx.deleteMessage();
        await handleStart(ctx);
      } else if (callbackData === "back_tariffs") {
        // Останавливаем предыдущие интерактивные обновления
        stopInteractiveUpdates(ctx);
        await handleStartWork(ctx);
      } else if (callbackData === "payment_success") {
        // Показываем пользователю индикатор загрузки
        await ctx.answerCallbackQuery({ text: "Подготовка формы оплаты...", show_alert: false });
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

        // Показываем администратору индикатор обработки
        await ctx.answerCallbackQuery({ text: "Обработка платежа...", show_alert: false });

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
    } catch (innerError) {
      logger.error(`Ошибка при обработке callback: ${innerError.message}`, innerError.stack);
      try {
        await ErrorHandler.handle(ctx, innerError, "callback_query");
        if (!ctx.callbackQuery.answered) {
          await ctx.answerCallbackQuery({
            text: `Ошибка: ${innerError.message}`,
            show_alert: true,
          });
        }
      } catch (handlerError) {
        logger.error(`Ошибка в обработчике ошибок: ${handlerError.message}`);
        try {
          if (!ctx.callbackQuery.answered) {
            await ctx.answerCallbackQuery({
              text: `Произошла ошибка`,
              show_alert: true,
            });
          }
        } catch (finalError) {
          logger.error(`Критическая ошибка в обработке callback: ${finalError.message}`);
        }
      }
    }
  } catch (criticalError) {
    logger.error(`Критическая ошибка при обработке callback_query: ${criticalError.message}`, criticalError.stack);
    try {
      await ctx.answerCallbackQuery({
        text: "Произошла критическая ошибка",
        show_alert: true,
      });
    } catch (finalError) {
      logger.error(`Не удалось ответить на callback_query: ${finalError.message}`);
    }
  }
});

// Обработка медиа-сообщений (квитанций)
bot.on(["message:photo", "message:document"], async (ctx) => {
  try {
    // Останавливаем предыдущие интерактивные обновления
    stopInteractiveUpdates(ctx);
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

// Добавим обработчики для предотвращения завершения скрипта
process.on("SIGINT", () => {
  logger.info("Получен сигнал SIGINT, завершение работы...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Получен сигнал SIGTERM, завершение работы...");
  process.exit(0);
});

// Запуск бота с инициализацией медиа
async function startBot() {
  try {
    logger.info(`Инициализация медиа-файлов...`);
    try {
      await initializeMedia();
    } catch (mediaError) {
      logger.error(`Ошибка при инициализации медиа-файлов: ${mediaError.message}`, mediaError.stack);
      logger.warn('Продолжаем запуск бота без инициализации медиа-файлов');
    }
    
    logger.info(`Запуск бота ${config.service.name}...`);
    try {
      await bot.start({
        drop_pending_updates: true, // Игнорируем обновления, накопившиеся за время остановки
        allowed_updates: ["message", "callback_query"] // Ограничиваем типы обновлений
      });
      
      logger.info(`Бот ${config.service.name} успешно запущен`);
    } catch (startError) {
      logger.error(`Ошибка при запуске бота: ${startError.message}`, startError.stack);
      return false;
    }
    // Не возвращаем true, чтобы функция не завершалась
  } catch (error) {
    logger.error(`Критическая ошибка при запуске бота: ${error.message}`, error.stack);
    return false;
  }
}

// Модифицируем экспорт, чтобы предоставить доступ к функции запуска
module.exports = {
  bot,
  startBot
};
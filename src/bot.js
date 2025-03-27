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
  handlePaymentRequest, // Добавлены новые функции
  handlePaymentCancel, // Добавлены новые функции
} = require("./controllers/user");

const {
  handleApproval,
  handleRejection,
  handleGetUsers, // Добавлена новая функция
} = require("./controllers/admin");

const { handleReceipt } = require("./controllers/payment");

// Импорт клавиатур
const { getMainKeyboard, getTariffsInlineKeyboard } = require("./keyboards");

// Импорт middlewares
const { logRequests } = require("./middlewares/logger");
const { adminOnly } = require("./middlewares/auth");

// Импорт утилит
const { uploadMediaAndGetIds } = require("./utils/helpers");
const ErrorHandler = require("./utils/error");

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
    const fileIds = await uploadMediaAndGetIds(ctx);
    logger.info("Загруженные медиа-файлы:", fileIds);
    await ctx.reply("ID файлов были выведены в консоль.");
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

// Глобальный обработчик ошибок
bot.catch((err) => {
  logger.error("Необработанная ошибка бота:", err);
});

// Логируем готовность бота к работе
logger.info(`Бот ${config.service.name} инициализирован и готов к запуску`);

module.exports = { bot };

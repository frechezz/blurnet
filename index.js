// Точка входа для Telegram-бота
require("dotenv").config();
const { bot } = require("./src/bot");
const logger = require("./src/utils/logger");
const config = require("./config");

// Установка уровня логирования из переменной окружения
if (process.env.LOG_LEVEL) {
  logger.setLevel(process.env.LOG_LEVEL);
}

logger.info(`Запуск бота ${config.service.name}...`);

// Добавляем обработку необработанных исключений
process.on("uncaughtException", (err) => {
  logger.error("Необработанное исключение:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Необработанное отклонение Promise:", reason);
});

// Запуск бота
bot
  .start()
  .then(() => {
    logger.info(`Бот ${config.service.name} успешно запущен`);
  })
  .catch((err) => {
    logger.error(`Ошибка при запуске бота: ${err.message}`);
    process.exit(1);
  });

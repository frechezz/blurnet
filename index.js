// Точка входа для Telegram-бота
require("dotenv").config();
const { startBot } = require("./src/bot");
const logger = require("./src/utils/logger");
const config = require("./config");

// Установка уровня логирования из переменной окружения
if (process.env.LOG_LEVEL) {
  logger.setLevel(process.env.LOG_LEVEL);
}

logger.info(`Инициализация бота ${config.service.name}...`);

// Добавляем обработку необработанных исключений
process.on("uncaughtException", (err) => {
  logger.error("Необработанное исключение:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Необработанное отклонение Promise:", reason);
});

// Запуск бота с инициализацией медиа
startBot()
  .then((success) => {
    if (success) {
      logger.info(`Бот ${config.service.name} успешно запущен`);
    } else {
      logger.error("Не удалось корректно запустить бота");
      process.exit(1);
    }
  })
  .catch((err) => {
    logger.error(`Критическая ошибка при запуске бота: ${err.message}`);
    process.exit(1);
  });
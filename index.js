// Точка входа для Telegram-бота
require("dotenv").config();
const { startBot } = require("./src/bot");
const logger = require("./src/utils/logger");
const config = require("./config");
const api = require("./src/api");

// Проверка критических параметров конфигурации
function checkApiConfig() {
  const requiredApiParams = [
    { key: 'url', name: 'URL API' },
    { key: 'username', name: 'Имя пользователя API' },
    { key: 'password', name: 'Пароль API' },
    { key: 'cookie', name: 'Cookie API' },
    { key: 'inboundTag', name: 'Тег инбаунда' },
  ];

  let hasErrors = false;
  requiredApiParams.forEach(param => {
    if (!config.api || !config.api[param.key]) {
      logger.error(`Не указан обязательный параметр API: ${param.name}`);
      hasErrors = true;
    }
  });

  if (hasErrors) {
    logger.warn('Проверьте настройки API в .env или config/local.js');
  } else {
    logger.info('Конфигурация API проверена успешно');
  }

  return !hasErrors;
}

// Проверка соединения с API
async function testApiConnection() {
  try {
    logger.info('Проверка соединения с API...');
    const isConnected = await api.testConnection();
    if (isConnected) {
      logger.info('Соединение с API установлено');
    } else {
      logger.warn('Не удалось подключиться к API. Бот продолжит работу, но функциональность будет ограничена');
    }
    return isConnected;
  } catch (error) {
    logger.error(`Ошибка при проверке соединения с API: ${error.message}`);
    return false;
  }
}

// Установка уровня логирования из переменной окружения
if (process.env.LOG_LEVEL) {
  logger.setLevel(process.env.LOG_LEVEL);
}

logger.info(`Инициализация бота ${config.service.name}...`);

// Проверяем конфигурацию API
const isConfigValid = checkApiConfig();

// Добавляем обработку необработанных исключений
process.on("uncaughtException", (err) => {
  logger.error("Необработанное исключение:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Необработанное отклонение Promise:", reason);
});

// Функция для мониторинга состояния бота
function monitorBotStatus() {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  logger.info(`Статус бота: активен (uptime: ${Math.floor(uptime / 60)} мин)`);
  logger.debug(`Использование памяти: RSS ${Math.round(memoryUsage.rss / 1024 / 1024)} MB, Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}/${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
}

// Проверяем соединение с API и запускаем бота
(async () => {
  if (isConfigValid) {
    await testApiConnection();  
  }

  // Запуск бота с инициализацией медиа
  startBot()
    .then((success) => {
      if (success === false) {
        logger.error("Не удалось корректно запустить бота");
        process.exit(1);
      }
    })
    .catch((err) => {
      logger.error(`Критическая ошибка при запуске бота: ${err.message}`);
      process.exit(1);
    });

  // Добавляем интервал для поддержания работы Node.js
  // и периодического мониторинга состояния
  setInterval(() => {
    monitorBotStatus();
  }, 30 * 60000); // Проверка каждые 30 минут
})();
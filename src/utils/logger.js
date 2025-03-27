/**
 * Простой модуль логирования
 */

// Уровни логирования
const LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Текущий уровень логирования (можно изменять динамически)
let currentLevel = process.env.LOG_LEVEL
  ? LEVELS[process.env.LOG_LEVEL.toUpperCase()]
  : LEVELS.INFO;

/**
 * Форматирует сообщение лога
 * @param {string} level - Уровень логирования
 * @param {string} message - Сообщение для логирования
 * @param {any[]} args - Дополнительные аргументы
 * @returns {string} Отформатированное сообщение
 */
function formatMessage(level, message, args) {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] [${level}] ${message}`;

  if (args && args.length > 0) {
    formattedMessage +=
      " " +
      args
        .map((arg) => {
          if (typeof arg === "object") {
            return JSON.stringify(arg);
          }
          return arg;
        })
        .join(" ");
  }

  return formattedMessage;
}

/**
 * Логирует сообщение на определенном уровне
 * @param {number} level - Числовой уровень логирования
 * @param {string} levelName - Название уровня логирования
 * @param {string} message - Сообщение для логирования
 * @param  {...any} args - Дополнительные аргументы
 */
function log(level, levelName, message, ...args) {
  if (level <= currentLevel) {
    const formattedMessage = formatMessage(levelName, message, args);
    if (level <= LEVELS.ERROR) {
      console.error(formattedMessage);
    } else if (level <= LEVELS.WARN) {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }
}

// Методы логирования для разных уровней
const logger = {
  error: (message, ...args) => log(LEVELS.ERROR, "ERROR", message, ...args),
  warn: (message, ...args) => log(LEVELS.WARN, "WARN", message, ...args),
  info: (message, ...args) => log(LEVELS.INFO, "INFO", message, ...args),
  debug: (message, ...args) => log(LEVELS.DEBUG, "DEBUG", message, ...args),

  // Установка уровня логирования
  setLevel: (level) => {
    if (typeof level === "string") {
      level = LEVELS[level.toUpperCase()];
    }
    currentLevel = level;
  },
};

module.exports = logger;

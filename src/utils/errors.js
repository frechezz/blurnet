/**
 * Базовый класс для всех ошибок API Blurnet
 */
class BlurnetApiError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = this.constructor.name;
    this.originalError = originalError;
    // Захватываем стек вызовов, исключая конструктор
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибка, связанная с сетевыми проблемами при обращении к API
 */
class ApiNetworkError extends BlurnetApiError {
  constructor(message = "Ошибка сети при обращении к API", originalError = null) {
    super(message, originalError);
  }
}

/**
 * Ошибка авторизации в API (неверный токен, учетные данные и т.д.)
 */
class ApiAuthError extends BlurnetApiError {
  constructor(message = "Ошибка авторизации в API", originalError = null) {
    super(message, originalError);
  }
}

/**
 * Ошибка валидации данных, переданных в API (например, 400, 422)
 */
class ApiValidationError extends BlurnetApiError {
  constructor(message = "Ошибка валидации данных API", originalError = null, details = null) {
    super(message, originalError);
    this.details = details; // Дополнительные детали ошибки от API
  }
}

/**
 * Ошибка, указывающая, что запрашиваемый ресурс не найден (404)
 */
class ApiNotFoundError extends BlurnetApiError {
  constructor(message = "Ресурс API не найден", originalError = null) {
    super(message, originalError);
  }
}

/**
 * Ошибка сервера API (5xx)
 */
class ApiServerError extends BlurnetApiError {
  constructor(message = "Внутренняя ошибка сервера API", originalError = null, statusCode = 500) {
    super(message, originalError);
    this.statusCode = statusCode;
  }
}


module.exports = {
  BlurnetApiError,
  ApiNetworkError,
  ApiAuthError,
  ApiValidationError,
  ApiNotFoundError,
  ApiServerError,
}; 
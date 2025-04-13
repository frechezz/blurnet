const { PHOTO_IDS } = require("../constants/media");
const messages = require("../constants/messages");
const config = require("../../config");
const api = require("../api");
const logger = require("../utils/logger");
const { getMainKeyboard, getTariffsInlineKeyboard } = require("../keyboards");
const { getTariff, getDefaultTariffName, calculateExpireDate } = require("../constants/tariffs");
const { getUsers } = require("../data/users");

/**
 * Обрабатывает подтверждение платежа администратором
 * @param {Context} ctx - Контекст бота
 * @param {Bot} bot - Экземпляр бота
 * @param {number} userId - ID пользователя
 * @param {string} tariff - Название тарифа
 */
async function handleApproval(ctx, bot, userId, tariff) {
  logger.info(
    `Начало обработки подтверждения платежа: userId=${userId}, tariff=${tariff}`,
  );

  try {
    // Обновляем подпись сообщения с квитанцией
    const originalCaption = ctx.callbackQuery.message.caption;
    const newCaption = `${originalCaption}\n\n✅ ПОДТВЕРЖДЕНО\nОбработано: ${new Date().toLocaleString()}`;

    // Проверка на пустой тариф
    if (!tariff || tariff.trim() === "") {
      logger.warn(
        `Пустой тариф при подтверждении платежа для пользователя ${userId}`,
      );
      tariff = getDefaultTariffName();
      logger.info(`Установлен тариф по умолчанию: ${tariff}`);
    }

    // Генерируем имя пользователя
    const username = `tg_${userId}_${Math.floor(Math.random() * 1000)}`;
    logger.info(`Сгенерировано имя пользователя: ${username}`);

    // Создаем пользователя в системе через API
    let userResponse = null; // Переменная для хранения ответа от API

    try {
      // Шаг 1: Получение токена
      logger.info(`[AdminController] Получение токена для создания пользователя ${userId}`);
      const token = await api.getToken();

      // Определяем ключ тарифа на основе названия
      const tariffKey =
        Object.values(require("../constants/tariffs").TARIFFS).find(
          (t) => t.name === tariff,
        )?.key || "tariff_month";

      // Шаг 2: Подготовка данных пользователя
      logger.info(`[AdminController] Подготовка данных пользователя ${username} для тарифа ${tariffKey}`);
      const expireDate = calculateExpireDate(tariffKey);
      const userData = {
        username: username,
        telegramId: userId,
        trafficLimitBytes: 0, // Или взять из настроек тарифа, если нужно
        trafficLimitStrategy: "NO_RESET", // Или из настроек тарифа
        expireAt: expireDate.toISOString(),
        status: "ACTIVE",
        activateAllInbounds: true,
        description: `Тариф: ${tariffKey}`,
        // Убираем поля, которые должны генерироваться API или не обязательны
        // subscriptionUuid: null,
        // shortUuid: null,
        // trojanPassword: null,
        // vlessUuid: null,
        // ssPassword: null,
        activeUserInbounds: [], // Оставляем, если API это требует
        // createdAt: null,
        // lastTrafficResetAt: null,
        // email: null,
      };

      // Шаг 3: Создание пользователя через API
      logger.info(
        `[AdminController] Вызов api.createUser для ${username} с тарифом: ${tariff}, key=${tariffKey}`,
      );
      userResponse = await api.createUser(token, userData);
      logger.info(`[AdminController] Пользователь ${username} успешно создан: ${userResponse.uuid}`);

    } catch (apiError) {
      logger.error(
        `[AdminController] Ошибка при создании пользователя в API для ${userId}: ${apiError.message}`,
        apiError.stack
      );
      // Уведомляем администратора об ошибке
      await ctx.reply(`⚠️ Ошибка при создании пользователя ${username} в API: ${apiError.message}. Проверьте логи.`);
      // Не отправляем сообщение пользователю в случае ошибки API
      return; // Прерываем выполнение функции
    }

    // Если создание пользователя прошло успешно, получаем URL подписки
    let subscriptionUrl = userResponse?.subscriptionUrl || "";

    // Логируем полученный URL (или его отсутствие)
    if (subscriptionUrl) {
      logger.info(`[AdminController] Получен URL подписки из API: ${subscriptionUrl}`);
    } else {
      logger.warn(`[AdminController] API не вернул subscriptionUrl для пользователя ${username}.`);
    }

    // Отправляем пользователю сообщение об успешной оплате
    logger.info(
      `Отправка сообщения об успешной оплате пользователю ${userId} с URL: ${subscriptionUrl}`,
    );
    await bot.api.sendPhoto(userId, PHOTO_IDS.payment_success, {
      caption:
        messages.payment.success +
        `\n\n👀 <a href='${subscriptionUrl}'>Подписка</a>`,
      parse_mode: "HTML",
      reply_markup: getMainKeyboard(),
    });

    // Обновляем сообщение у администратора
    if (ctx.callbackQuery.message.photo || ctx.callbackQuery.message.document) {
      await bot.api.editMessageCaption(
        config.bot.adminId,
        ctx.callbackQuery.message.message_id,
        {
          caption: newCaption,
          reply_markup: { inline_keyboard: [] },
        },
      );
    }

    logger.info(
      `Успешное завершение обработки подтверждения платежа для пользователя ${userId}`,
    );
  } catch (error) {
    logger.error(`Ошибка в handleApproval: ${error.message}`);
    // Уведомляем администратора об ошибке
    await ctx.reply(`Ошибка при обработке платежа: ${error.message}`);
  }
}

/**
 * Обрабатывает отклонение платежа администратором
 * @param {Context} ctx - Контекст бота
 * @param {Bot} bot - Экземпляр бота
 * @param {number} userId - ID пользователя
 * @param {string} tariff - Название тарифа
 */
async function handleRejection(ctx, bot, userId, tariff) {
  logger.info(
    `Начало обработки отклонения платежа: userId=${userId}, tariff=${tariff}`,
  );

  try {
    // Обновляем подпись сообщения с квитанцией
    const originalCaption = ctx.callbackQuery.message.caption;
    const newCaption = `${originalCaption}\n\n❌ ОТКЛОНЕНО\nОбработано: ${new Date().toLocaleString()}`;

    // Проверка на пустой тариф
    if (!tariff || tariff.trim() === "") {
      tariff = getDefaultTariffName();
      logger.info(`Установлен тариф по умолчанию: ${tariff}`);
    }

    // Отправляем пользователю сообщение об отклонении платежа
    const rejectionMessage = messages.payment.rejected.replace(
      "{tariff}",
      tariff,
    );

    await bot.api.sendPhoto(userId, PHOTO_IDS.payment_rejected, {
      caption: rejectionMessage,
      parse_mode: "HTML",
      reply_markup: getTariffsInlineKeyboard(),
    });

    // Обновляем сообщение у администратора
    if (ctx.callbackQuery.message.photo || ctx.callbackQuery.message.document) {
      await bot.api.editMessageCaption(
        config.bot.adminId,
        ctx.callbackQuery.message.message_id,
        {
          caption: newCaption,
          reply_markup: { inline_keyboard: [] },
        },
      );
    }

    logger.info(
      `Успешное завершение обработки отклонения платежа для пользователя ${userId}`,
    );
  } catch (error) {
    logger.error(`Ошибка в handleRejection: ${error.message}`);
    // Уведомляем администратора об ошибке
    await ctx.reply(`Ошибка при отклонении платежа: ${error.message}`);
  }
}

/**
 * Получает список всех пользователей
 * @param {Context} ctx - Контекст бота
 */
async function handleGetUsers(ctx) {
  try {
    // Показываем сообщение о загрузке
    const loadingMsg = await ctx.reply("⏳ Загрузка данных о пользователях...");

    // Получаем пользователей с пробным периодом из локальной БД
    const trialUsers = getUsers();

    // Получаем всех пользователей из API
    let apiUsers = [];
    try {
      const apiResponse = await api.getAllUsers();

      // Правильно извлекаем пользователей из ответа API
      if (apiResponse && apiResponse.users) {
        apiUsers = apiResponse.users;
        logger.info(`Получено ${apiUsers.length} пользователей из API`);
      } else {
        logger.warn("Ответ API не содержит массив пользователей");
      }
    } catch (apiError) {
      logger.error(
        `Ошибка при получении пользователей из API: ${apiError.message}`,
      );
      // Продолжаем выполнение, чтобы показать хотя бы пользователей с пробным периодом
    }

    // Формируем сообщение
    let message = `📊 <b>Информация о пользователях</b>\n\n`;

    // Добавляем информацию о пользователях из API
    if (apiUsers.length > 0) {
      message += `<b>Пользователи с активной подпиской (${apiUsers.length}):</b>\n\n`;

      for (const user of apiUsers) {
        try {
          const username = user.username || "Без имени";
          const telegramId = user.telegramId || "Не указан";
          const status =
            user.status === "ACTIVE" ? "✅ Активен" : "❌ Неактивен";
          const expireAt = user.expireAt
            ? new Date(user.expireAt).toLocaleDateString()
            : "Не ограничено";

          const usedTraffic =
            typeof user.usedTrafficBytes === "number"
              ? (user.usedTrafficBytes / (1024 * 1024 * 1024)).toFixed(2)
              : "0";

          const totalTraffic =
            typeof user.trafficLimitBytes === "number" &&
            user.trafficLimitBytes > 0
              ? (user.trafficLimitBytes / (1024 * 1024 * 1024)).toFixed(2)
              : "∞";

          const trafficInfo =
            totalTraffic === "∞"
              ? "Безлимитный"
              : `${usedTraffic} GB / ${totalTraffic} GB`;

          message += `👤 <b>${username}</b> (ID: ${telegramId})\n`;
          message += `📊 Статус: ${status}\n`;
          message += `📅 Действует до: ${expireAt}\n`;
          message += `📈 Трафик: ${trafficInfo}\n\n`;
        } catch (userError) {
          logger.error(
            `Ошибка при обработке пользователя: ${userError.message}`,
          );
          // Продолжаем с следующим пользователем
        }
      }
    } else {
      message += `<b>Пользователей с активной подпиской нет</b>\n\n`;
    }

    // Добавляем информацию о пользователях с пробным периодом
    const trialUserIds = Object.keys(trialUsers);
    if (trialUserIds.length > 0) {
      message += `<b>Пользователи с пробным периодом (${trialUserIds.length}):</b>\n\n`;

      for (const [telegramId, userData] of Object.entries(trialUsers)) {
        const username = userData.username || "Без имени";
        const activatedAt = userData.trialActivatedAt
          ? new Date(userData.trialActivatedAt).toLocaleDateString()
          : "Неизвестно";

        message += `👤 ${username} (ID: ${telegramId})\n`;
        message += `📅 Активирован: ${activatedAt}\n\n`;
      }
    } else {
      message += `<b>Пользователей с пробным периодом нет</b>\n`;
    }

    // Удаляем сообщение о загрузке
    try {
      await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);
    } catch (deleteError) {
      logger.warn(
        `Не удалось удалить сообщение о загрузке: ${deleteError.message}`,
      );
    }

    // Отправляем сообщение, разбивая его при необходимости
    if (message.length > 4000) {
      const parts = message.match(/.{1,4000}/gs) || [];
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: "HTML" });
      }
    } else {
      await ctx.reply(message, { parse_mode: "HTML" });
    }

    logger.info(`Администратор ${ctx.from.id} запросил список пользователей`);
  } catch (error) {
    logger.error(`Ошибка в handleGetUsers: ${error.message}`);
    await ctx.reply(
      `❌ Ошибка при получении списка пользователей: ${error.message}`,
      { parse_mode: "HTML" },
    );
  }
}

module.exports = {
  handleApproval,
  handleRejection,
  handleGetUsers,
};

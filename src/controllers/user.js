/**
 * Контроллер для пользовательских функций
 */
const { PHOTO_IDS } = require("../constants/media");
const messages = require("../constants/messages");
const {
  getMainKeyboard,
  getInstructionInlineKeyboard,
  getTariffsInlineKeyboard,
  getPaymentInlineKeyboard,
  getReturnTariffInlineKeyboard,
} = require("../keyboards");
const { getTariff } = require("../constants/tariffs");
const api = require("../api");
const { hasUsedTrial, markTrialUsed } = require("../data/users");
const logger = require("../utils/logger");
const config = require("../../config");

/**
 * Обрабатывает команду /start
 * @param {Context} ctx - Контекст бота
 */
async function handleStart(ctx) {
  try {
    await ctx.reply(messages.welcome, {
      parse_mode: "HTML",
      reply_markup: getMainKeyboard(),
    });
    logger.info(`Пользователь ${ctx.from.id} запустил бота`);
  } catch (error) {
    logger.error(`Ошибка в handleStart: ${error.message}`);
    await ctx.reply(messages.errors.general);
  }
}

/**
 * Обрабатывает нажатие кнопки "Инструкция"
 * @param {Context} ctx - Контекст бота
 */
async function handleInstruction(ctx) {
  try {
    await ctx.replyWithPhoto(PHOTO_IDS.instruction, {
      caption: messages.instruction,
      parse_mode: "HTML",
      reply_markup: getInstructionInlineKeyboard(),
    });
    logger.info(`Пользователь ${ctx.from.id} запросил инструкцию`);
  } catch (error) {
    logger.error(`Ошибка в handleInstruction: ${error.message}`);
    await ctx.reply(messages.errors.general);
  }
}

/**
 * Обрабатывает нажатие кнопки "Начать работу"
 * @param {Context} ctx - Контекст бота
 */
async function handleStartWork(ctx) {
  try {
    await ctx.replyWithPhoto(PHOTO_IDS.tariffs, {
      caption: messages.tariffs.selection,
      parse_mode: "HTML",
      reply_markup: getTariffsInlineKeyboard(),
    });
    logger.info(`Пользователь ${ctx.from.id} запросил тарифы`);
  } catch (error) {
    logger.error(`Ошибка в handleStartWork: ${error.message}`);
    await ctx.reply(messages.errors.general);
  }
}

/**
 * Обрабатывает нажатие кнопки "Правила использования"
 * @param {Context} ctx - Контекст бота
 */
async function handleRules(ctx) {
  try {
    await ctx.replyWithPhoto(PHOTO_IDS.rules, {
      caption: messages.rules,
      parse_mode: "HTML",
      reply_markup: getMainKeyboard(),
    });
    logger.info(`Пользователь ${ctx.from.id} запросил правила`);
  } catch (error) {
    logger.error(`Ошибка в handleRules: ${error.message}`);
    await ctx.reply(messages.errors.general);
  }
}

/**
 * Обрабатывает выбор тарифа
 * @param {Context} ctx - Контекст бота
 * @param {string} tariffKey - Ключ выбранного тарифа
 */
async function handleTariffSelection(ctx, tariffKey) {
  try {
    const tariff = getTariff(tariffKey);
    if (!tariff) {
      throw new Error("Неизвестный тариф");
    }

    // Сохраняем выбранный тариф в сессии
    ctx.session.tariff = tariff.name;
    const userId = ctx.from.id;

    logger.info(
      `Пользователь ${userId} выбрал тариф: ${tariff.name} (${tariffKey})`,
    );

    // Обработка пробного периода
    if (tariffKey === "tariff_trial") {
      await handleTrialActivation(ctx, userId, tariffKey);
    } else {
      // Обработка платных тарифов
      await ctx.reply(tariff.message, {
        reply_markup: getPaymentInlineKeyboard(),
      });
    }
  } catch (error) {
    logger.error(`Ошибка в handleTariffSelection: ${error.message}`);
    await ctx.reply(messages.errors.general);
  }
}

/**
 * Обрабатывает активацию пробного периода
 * @param {Context} ctx - Контекст бота
 * @param {number} userId - ID пользователя
 * @param {string} tariffKey - Ключ тарифа
 */
async function handleTrialActivation(ctx, userId, tariffKey) {
  try {
    // Проверяем, использовал ли пользователь пробный период ранее
    if (hasUsedTrial(userId)) {
      logger.info(
        `Пользователь ${userId} пытается повторно активировать пробный период`,
      );
      await ctx.reply(messages.trial.already_used, {
        parse_mode: "HTML",
        reply_markup: getTariffsInlineKeyboard(),
      });
      return;
    }

    // Генерируем имя пользователя
    const username = `tg_${userId}_${Math.floor(Math.random() * 1000)}`;
    logger.info(`Генерация имени пользователя: ${username}`);

    try {
      // Создаем пользователя в системе через API
      logger.info(
        `Создание пользователя с пробным периодом: ${username}, тариф: ${tariffKey}`,
      );
      const userResponse = await api.createUser(username, userId, tariffKey);
      logger.info(
        `Пользователь с пробным периодом создан: ${userResponse.uuid}`,
      );

      // Получаем URL подписки напрямую из ответа API
      const subscriptionUrl = userResponse.subscriptionUrl;

      if (subscriptionUrl) {
        logger.info(`Получен URL подписки из API: ${subscriptionUrl}`);
      } else {
        logger.warn(`API не вернул subscriptionUrl для пробного периода`);
      }

      // Отмечаем пользователя как использовавшего пробный период
      markTrialUsed(userId, ctx.from.username || `user_${userId}`);

      // Отправляем сообщение об активации пробного периода
      await ctx.reply(
        messages.trial.activated +
          (subscriptionUrl
            ? `\n\n👀 <a href='${subscriptionUrl}'>Подписка</a>`
            : ""),
        {
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: getReturnTariffInlineKeyboard(),
        },
      );

      // Уведомление администратора
      const adminMessage = messages.admin.trial_activated
        .replace(
          "{username}",
          ctx.from.username ? "@" + ctx.from.username : "не указан",
        )
        .replace("{userId}", ctx.from.id);

      await ctx.api.sendMessage(config.bot.adminId, adminMessage);
    } catch (apiError) {
      logger.error(`Ошибка при создании пробного периода: ${apiError.message}`);

      // Отправляем сообщение об ошибке пользователю
      await ctx.reply(messages.trial.error, {
        parse_mode: "HTML",
        reply_markup: getReturnTariffInlineKeyboard(),
      });

      // Уведомление администратора об ошибке
      const errorMessage = messages.admin.trial_error
        .replace(
          "{username}",
          ctx.from.username ? "@" + ctx.from.username : "не указан",
        )
        .replace("{userId}", ctx.from.id)
        .replace("{error}", apiError.message);

      await ctx.api.sendMessage(config.bot.adminId, errorMessage);
    }
  } catch (error) {
    logger.error(`Ошибка в handleTrialActivation: ${error.message}`);
    await ctx.reply(messages.errors.general);
  }
}

/**
 * Обрабатывает запрос на отправку платежной квитанции
 * @param {Context} ctx - Контекст бота
 */
async function handlePaymentRequest(ctx) {
  try {
    await ctx.reply(messages.payment.send_receipt);
    logger.info(`Пользователь ${ctx.from.id} запросил отправку квитанции`);
  } catch (error) {
    logger.error(`Ошибка в handlePaymentRequest: ${error.message}`);
    await ctx.reply(messages.errors.general);
  }
}

/**
 * Обрабатывает отмену платежа и возврат к выбору тарифов
 * @param {Context} ctx - Контекст бота
 */
async function handlePaymentCancel(ctx) {
  try {
    await handleStartWork(ctx);
    logger.info(
      `Пользователь ${ctx.from.id} отменил платеж и вернулся к выбору тарифов`,
    );
  } catch (error) {
    logger.error(`Ошибка в handlePaymentCancel: ${error.message}`);
    await ctx.reply(messages.errors.general);
  }
}

module.exports = {
  handleStart,
  handleInstruction,
  handleStartWork,
  handleRules,
  handleTariffSelection,
  handlePaymentRequest,
  handlePaymentCancel,
};

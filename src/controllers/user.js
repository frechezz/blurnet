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
const { getTariff, calculateExpireDate } = require("../constants/tariffs");
const api = require("../api");
const { hasUsedTrial, markTrialUsed } = require("../data/users");
const logger = require("../utils/logger");
const config = require("../../config");
const { addUser, getUserData, updateUser, getUsers } = require("../data/users");
const bot = require("../bot");
const { getAdminInlineKeyboard } = require("../keyboards/index");

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

    // Показываем пользователю сообщение о начале активации
    const loadingMsg = await ctx.reply("⌛ Активация пробного периода началась, пожалуйста, подождите...");
    
    // Запускаем индикатор активности
    let dots = "";
    const loadingInterval = setInterval(async () => {
      try {
        dots = dots.length >= 3 ? "" : dots + ".";
        await ctx.api.editMessageText(
          ctx.chat.id,
          loadingMsg.message_id,
          `⌛ Активация пробного периода${dots}\nПожалуйста, подождите, это займёт около 30 секунд`
        );
      } catch (err) {
        logger.warn(`Ошибка при обновлении индикатора загрузки: ${err.message}`);
      }
    }, 1500);

    // Генерируем имя пользователя
    const username = `tg_${userId}_${Math.floor(Math.random() * 1000)}`;
    logger.info(`Генерация имени пользователя: ${username}`);

    try {
      // Шаг 1: Получение токена
      logger.info(`[Controller] Получение токена для пользователя ${userId}`);
      const token = await api.getToken();
      logger.info(`[Controller] Токен получен`);

      // Шаг 3: Подготовка данных пользователя
      logger.info(`[Controller] Подготовка данных пользователя ${username} для пробного периода`);
      const expireDate = calculateExpireDate(tariffKey);
      const userData = {
        username: username,
        telegramId: userId,
        trafficLimitBytes: 0,
        trafficLimitStrategy: "NO_RESET",
        expireAt: expireDate.toISOString(),
        status: "ACTIVE",
        activateAllInbounds: true,
        description: `Тариф: ${tariffKey}`,
        activeUserInbounds: [],
      };
      logger.info(`[Controller] Данные пользователя подготовлены для ${username}`);
      logger.debug(`[Controller] UserData: ${JSON.stringify(userData)}`);

      // Шаг 4: Создание пользователя через API
      logger.info(`[Controller] Вызов api.createUser для ${username}`);
      const userResponse = await api.createUser(token, userData);
      logger.info(`[Controller] Пользователь ${username} создан: ${userResponse?.uuid || 'UUID не получен'}`);

      // Останавливаем индикатор загрузки
      clearInterval(loadingInterval);
      
      // Обновляем сообщение о загрузке
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          loadingMsg.message_id,
          `✅ Активация пробного периода завершена успешно!`
        );
      } catch (updateError) {
        logger.warn(`Не удалось обновить сообщение о загрузке: ${updateError.message}`);
      }

      // Получаем URL подписки напрямую из ответа API
      let subscriptionUrl = userResponse?.subscriptionUrl;

      // Если URL не получен из API, генерируем его сами
      if (!subscriptionUrl && userResponse?.uuid) {
        // Получаем короткий UUID (первые 8 символов)
        const shortUuid = userResponse.uuid.split('-')[0];
        subscriptionUrl = `${config.urls.subscription}${shortUuid}/singbox`;
        logger.info(`URL подписки сгенерирован вручную: ${subscriptionUrl}`);
      }

      if (subscriptionUrl) {
        logger.info(`Получен URL подписки: ${subscriptionUrl}`);
      } else {
        logger.warn(`API не вернул subscriptionUrl для пробного периода и не удалось сгенерировать URL`);
      }

      // Отмечаем пользователя как использовавшего пробный период
      try {
        markTrialUsed(userId, ctx.from.username || `user_${userId}`);
      } catch (markError) {
        logger.error(`Ошибка при отметке использования пробного периода: ${markError.message}`);
        // Продолжаем выполнение даже в случае ошибки
      }

      // Отправляем сообщение об активации пробного периода
      try {
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
      } catch (replyError) {
        logger.error(`Ошибка при отправке сообщения пользователю: ${replyError.message}`);
      }

      // Уведомление администратора
      try {
        const adminMessage = messages.admin.trial_activated
          .replace(
            "{username}",
            ctx.from.username ? "@" + ctx.from.username : "не указан",
          )
          .replace("{userId}", ctx.from.id);

        await ctx.api.sendMessage(config.bot.adminId, adminMessage);
      } catch (adminMsgError) {
        logger.error(`Ошибка при отправке сообщения администратору: ${adminMsgError.message}`);
      }
    } catch (apiError) {
      // Останавливаем индикатор загрузки
      clearInterval(loadingInterval);
      
      // Обновляем сообщение о загрузке
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          loadingMsg.message_id,
          `❌ Ошибка при активации пробного периода`
        );
      } catch (updateError) {
        logger.warn(`Не удалось обновить сообщение о загрузке: ${updateError.message}`);
      }

      // Логируем ошибку со стеком вызовов
      logger.error(`[Controller] Ошибка при активации пробного периода для ${userId}: ${apiError.message}`, apiError.stack);

      // Отправляем сообщение об ошибке пользователю
      try {
        await ctx.reply(messages.trial.error, {
          parse_mode: "HTML",
          reply_markup: getReturnTariffInlineKeyboard(),
        });
      } catch (replyError) {
        logger.error(`Не удалось отправить сообщение об ошибке пользователю: ${replyError.message}`);
      }

      // Уведомление администратора об ошибке
      try {
        const errorMessage = messages.admin.trial_error
          .replace(
            "{username}",
            ctx.from.username ? "@" + ctx.from.username : "не указан",
          )
          .replace("{userId}", ctx.from.id)
          .replace("{error}", apiError.message);

        await ctx.api.sendMessage(config.bot.adminId, errorMessage);
      } catch (adminMsgError) {
        logger.error(`Ошибка при отправке сообщения администратору: ${adminMsgError.message}`);
      }
    }
  } catch (error) {
    logger.error(`Ошибка в handleTrialActivation: ${error.message}`);
    try {
      await ctx.reply(messages.errors.general, {
        reply_markup: getReturnTariffInlineKeyboard(),
      });
    } catch (replyError) {
      logger.error(`Не удалось отправить сообщение об ошибке: ${replyError.message}`);
    }
  }
}

/**
 * Обрабатывает запрос на оплату
 * @param {Context} ctx - Контекст бота
 */
async function handlePaymentRequest(ctx) {
  try {
    const userId = ctx.from.id;
    const tariff = ctx.session.tariff;

    if (!tariff) {
      logger.warn(`Пользователь ${userId} пытается оплатить без выбора тарифа`);
      await ctx.reply("Пожалуйста, сначала выберите тариф!", {
        reply_markup: getTariffsInlineKeyboard(),
      });
      return;
    }

    // Отправляем сообщение о подготовке формы оплаты
    const loadingMsg = await ctx.reply("🔄 Подготовка информации для оплаты...");

    // Имитируем процесс подготовки информации для оплаты
    setTimeout(async () => {
      try {
        // Удаляем сообщение о загрузке
        await ctx.api.deleteMessage(ctx.chat.id, loadingMsg.message_id);
        
        // Отправляем реквизиты для оплаты (только текст)
        await ctx.reply(messages.payment.send_receipt, {
          parse_mode: "HTML",
        });
        
        logger.info(`Пользователь ${userId} получил информацию для оплаты тарифа ${tariff}`);
      } catch (error) {
        logger.error(`Ошибка при отправке информации для оплаты: ${error.message}`);
      }
    }, 2000); // Задержка в 2 секунды для имитации загрузки

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

/**
 * Обрабатывает запрос личного кабинета пользователя
 * @param {Context} ctx - Контекст бота
 */
async function handleUserProfile(ctx) {
  try {
    const userId = ctx.from.id;
    logger.info(`Пользователь ${userId} запросил личный кабинет`);
    
    // Показываем сообщение о загрузке
    const loadingMsg = await ctx.reply("⏳ Загружаем данные вашего профиля...");
    
    try {
      // Получаем данные пользователя через API
      const userData = await api.getUserByTelegramId(userId);
      
      if (!userData || !userData.length) {
        logger.warn(`Пользователь с Telegram ID ${userId} не найден в системе`);
        await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);
        await ctx.reply(
          "😔 У вас пока нет активной подписки.\n\nЧтобы приобрести подписку, используйте меню «Начать работу с " + 
          config.service.name + " 🚀»", 
          { reply_markup: getMainKeyboard() }
        );
        return;
      }
      
      // Формируем сообщение для пользователя с заголовком
      let message = `👤 <b>Личный кабинет</b>\n\n`;
      
      // Информация о количестве найденных подписок
      message += `📋 <b>Найдено подписок:</b> ${userData.length}\n\n`;
      
      // Обрабатываем каждую подписку
      for (let i = 0; i < userData.length; i++) {
        const user = userData[i];
        
        // Добавляем разделитель и номер подписки, если их несколько
        if (userData.length > 1) {
          message += `${i > 0 ? '\n' : ''}🔸 <b>Подписка #${i+1}</b>\n`;
        }
        
        // Имя пользователя
        message += `• <b>Логин:</b> ${user.username || "Не указан"}\n`;
        
        // Статус
        const status = user.status === "ACTIVE" ? "✅ Активна" : "❌ Неактивна";
        message += `• <b>Статус:</b> ${status}\n`;
        
        // Дата истечения подписки
        if (user.expireAt) {
          const expireDate = new Date(user.expireAt);
          const now = new Date();
          const daysLeft = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
          
          const formattedDate = expireDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          
          if (daysLeft > 0) {
            message += `• <b>Срок действия:</b> до ${formattedDate} (осталось ${daysLeft} дн.)\n`;
          } else {
            message += `• <b>Срок действия:</b> истёк ${formattedDate}\n`;
          }
        } else {
          message += `• <b>Срок действия:</b> Бессрочно\n`;
        }
        
        // Использованный трафик
        if (typeof user.usedTrafficBytes === 'number') {
          const usedTrafficGB = (user.usedTrafficBytes / (1024 * 1024 * 1024)).toFixed(2);
          
          if (typeof user.trafficLimitBytes === 'number' && user.trafficLimitBytes > 0) {
            const totalTrafficGB = (user.trafficLimitBytes / (1024 * 1024 * 1024)).toFixed(2);
            message += `• <b>Трафик:</b> ${usedTrafficGB} GB из ${totalTrafficGB} GB\n`;
          } else {
            message += `• <b>Использовано трафика:</b> ${usedTrafficGB} GB (безлимитный)\n`;
          }
        }
        
        // Дата создания
        if (user.createdAt) {
          const createDate = new Date(user.createdAt).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          message += `• <b>Дата создания:</b> ${createDate}\n`;
        }
        
        // URL подписки
        if (user.subscriptionUrl) {
          message += `• <b>Ссылка:</b> <a href="${user.subscriptionUrl}">Открыть подписку</a>\n`;
        } else {
          message += `• <b>Ссылка:</b> Не найдена\n`;
        }
      }
      
      // Добавляем инструкцию в конце
      message += `\n<i>Используйте ссылки на подписки, чтобы настроить VPN на ваших устройствах.</i>`;
      
      // Удаляем сообщение о загрузке
      await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);
      
      // Проверяем размер сообщения и разбиваем при необходимости
      if (message.length > 4000) {
        // Разбиваем сообщение на части
        const parts = [];
        let currentPart = "";
        const lines = message.split('\n');
        
        for (const line of lines) {
          if (currentPart.length + line.length + 1 > 4000) {
            parts.push(currentPart);
            currentPart = line;
          } else {
            currentPart += (currentPart ? '\n' : '') + line;
          }
        }
        
        if (currentPart) {
          parts.push(currentPart);
        }
        
        // Отправляем части сообщения
        for (let j = 0; j < parts.length; j++) {
          const isLastPart = j === parts.length - 1;
          await ctx.reply(parts[j], { 
            parse_mode: "HTML",
            reply_markup: isLastPart ? getMainKeyboard() : undefined
          });
        }
      } else {
        // Отправляем сообщение
        await ctx.reply(message, { 
          parse_mode: "HTML",
          reply_markup: getMainKeyboard()
        });
      }
      
    } catch (apiError) {
      logger.error(`Ошибка при получении данных пользователя ${userId}: ${apiError.message}`);
      
      // Удаляем сообщение о загрузке
      await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);
      
      // Отправляем сообщение об ошибке
      await ctx.reply(
        "😔 Не удалось получить данные вашего профиля. Пожалуйста, попробуйте позже или обратитесь в поддержку.",
        { reply_markup: getMainKeyboard() }
      );
    }
  } catch (error) {
    logger.error(`Ошибка в handleUserProfile: ${error.message}`);
    await ctx.reply("Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.", {
      reply_markup: getMainKeyboard(),
    });
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
  handleUserProfile,
};

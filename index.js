require("dotenv").config();
const { Bot, Keyboard, InlineKeyboard, session, InputFile } = require("grammy");

const TOKEN = process.env.BOT_API_KEY;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Bot(TOKEN);

const path = require("path");
const fs = require("fs");

const PHOTO_IDS = {
  tariffs:
    "AgACAgIAAxkDAAICdGfkYeX6pSis8rp2TCDaygW9ZWZOAALp7jEbN7IhS-JeiWKVefYqAQADAgADdwADNgQ",
  instruction:
    "AgACAgIAAxkDAAICdWfkYeZbwWPAb1PUcOnm4WLgNQ5_AALq7jEbN7IhS3NQKpH-W56AAQADAgADdwADNgQ",
  payment_success:
    "AgACAgIAAxkDAAICdmfkYecUZuv7eyzQ9M0-sKUkV8B_AALr7jEbN7IhS8qf-VbLbbSrAQADAgADdwADNgQ",
  payment_rejected:
    "AgACAgIAAxkDAAICd2fkYegeIX5D3XyYyGw5OaRrzBSNAALs7jEbN7IhS80EROhHs_SuAQADAgADdwADNgQ",
  waiting:
    "AgACAgIAAxkDAAICeGfkYel4289BsyWtqcylZbLYZhaAAALt7jEbN7IhS454wdpCPt1JAQADAgADdwADNgQ",
  rules:
    "AgACAgIAAxkDAAICeWfkYeoPBQ8ewTeon6bv2cwsJgK5AALu7jEbN7IhS1r3FbCn-RPsAQADAgADdwADNgQ",
};

bot.use(
  session({
    initial: () => ({ tariff: null }),
  }),
);

// Определение клавиатур (оставляем без изменений)
function getMainKeyboard() {
  return new Keyboard()
    .row("Инструкция 📑")
    .row("Начать работу с blurnet 🚀")
    .row("Правила использования")
    .placeholder("Выбери действие")
    .resized();
}

function getTariffsInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .text("🏆12 месяцев", "tariff_year")
    .text("🥇6 месяцев", "tariff_halfyear")
    .text("🥈3 месяца", "tariff_quarter")
    .row()
    .text("🥉1 месяц", "tariff_month")
    .row()
    .text("🌟 Пробный период", "tariff_trial")
    .row()
    .text("🔙 в главное меню", "back_main");
}

function getPaymentInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .text("Да, успешно✔", "payment_success")
    .text("🔙 к тарифам", "payment_cancel");
}

function getReturnTariffInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .text("Вернуться к тарифным планам ↩️", "back_tariffs");
}

function getAdminInlineKeyboard(userId, tariff) {
  return new InlineKeyboard()
    .row()
    .text(
      "✅ Подтвердить",
      `approve_${userId}_${tariff.replace(/[^a-zA-Z0-9]/g, "_")}`,
    )
    .text(
      "❌ Отклонить",
      `reject_${userId}_${tariff.replace(/[^a-zA-Z0-9]/g, "_")}`,
    );
}

function getInstructionInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .url("Сапорт", "https://t.me/blurnet_support")
    .url("Новости", "https://t.me/blurnet_news");
}

const TARIFFS = {
  tariff_year: {
    name: "🏆12 месяцев",
    price: "1000₽",
    message: `Сумма к оплате 1000₽.\n
💳Реквизиты: -------\n

Оплата прошла успешно?`,
  },
  tariff_halfyear: {
    name: "🥇6 месяцев",
    price: "550₽",
    message: `Сумма к оплате 550₽.\n
💳Реквизиты: -------\n

Оплата прошла успешно?`,
  },
  tariff_quarter: {
    name: "🥈3 месяца",
    price: "280₽",
    message: `Сумма к оплате 300₽.\n
💳Реквизиты: -------\n

Оплата прошла успешно?`,
  },
  tariff_month: {
    name: "🥉1 месяц",
    price: "100₽",
    message: `Сумма к оплате 100₽.\n
💳Реквизиты: -------\n

Оплата прошла успешно?`,
  },
  tariff_trial: {
    name: "🌟 Пробный период",
    price: "Бесплатно",
    message:
      "Ваш бесплатный пробный период на 3 дня будет активирован в ближайшее время!",
  },
};

// Функции обработки подтверждения и отклонения
async function handleApproval(ctx, userId, tariff) {
  const originalCaption = ctx.callbackQuery.message.caption;
  const newCaption = `${originalCaption}\n\n✅ ПОДТВЕРЖДЕНО\nОбработано: ${new Date().toLocaleString()}`;

  await bot.api.sendPhoto(userId, PHOTO_IDS.payment_success, {
    caption:
      "<b>Платеж подтвержден</b>✔️\n\n" +
      "Переходите по ссылке и следуйте инструкции по подключению\n\n" +
      "👀 <a href='https://sub.blurnet.ru/SMbw7nGUFbweEUan'>Подписка</a>",
    parse_mode: "HTML",
    reply_markup: getMainKeyboard(),
  });

  if (ctx.callbackQuery.message.photo || ctx.callbackQuery.message.document) {
    await bot.api.editMessageCaption(
      ADMIN_ID,
      ctx.callbackQuery.message.message_id,
      {
        caption: newCaption,
        reply_markup: { inline_keyboard: [] },
      },
    );
  }
}

async function handleRejection(ctx, userId, tariff) {
  const originalCaption = ctx.callbackQuery.message.caption;
  const newCaption = `${originalCaption}\n\n❌ ОТКЛОНЕНО\nОбработано: ${new Date().toLocaleString()}`;

  await bot.api.sendPhoto(userId, PHOTO_IDS.payment_rejected, {
    caption:
      "<b>УВЕДОМЛЕНИЕ\n</b>" +
      "❗️ <b>Ошибка в оплате</b> ❗️\n\n" +
      `Ваш платеж за тариф «${tariff}» не подтвержден.\n\n` +
      "<u>Проверьте:</u>\n" +
      "1. Корректность введенных реквизитов\n" +
      "2. Правильность суммы\n\n" +
      "После этого попробуйте произвести оплату снова.\n\n" +
      "При возникновении вопросов обращайтесь к администратору(@blurnet_support)",
    parse_mode: "HTML",
    reply_markup: getMainKeyboard(),
  });

  await bot.api.sendMessage(
    userId,
    "Выберите свой тарифный план:\n" +
      "🏆12 месяцев - <b>Цена: 1000 ₽</b>\n" +
      "🥇6 месяцев - <b>Цена: 550 ₽</b>\n" +
      "🥈3 месяца - <b>Цена: 280 ₽</b>\n" +
      "🥉1 месяц - <b>Цена: 100 ₽</b>\n\n" +
      "🌟 Попробовать бесплатный пробный период на <b>5 дней</b>",
    { parse_mode: "HTML", reply_markup: getTariffsInlineKeyboard() },
  );

  if (ctx.callbackQuery.message.photo || ctx.callbackQuery.message.document) {
    await bot.api.editMessageCaption(
      ADMIN_ID,
      ctx.callbackQuery.message.message_id,
      {
        caption: newCaption,
        reply_markup: { inline_keyboard: [] },
      },
    );
  }
}

// Обработчик команд и кнопок (оставляем как есть)
bot.command("start", async (ctx) => {
  await ctx.reply(
    "Вы запустили <b>blurnet</b> 🙌🏻 - выгодный VPN для высших устройств без каких либо ограничений.\n\n" +
      "Наш сервис поддерживает такие устройства как:\n" +
      "- iOS\n" +
      "- Android\n" +
      "- MacOS\n" +
      "- Windows\n\n" +
      "Мы отличаемся от конкурентов тем, что мы используем высокоскоростные сервера (2.5 Гбит/с) и самое современное оборудование, а также не ведем никаких записей поисковых запросов, IP адресов, и остальных цифровых следов.\n\n" +
      "Внимательно ознакомьтесь с инструкцией и начинайте!\n\n" +
      "У нас как и у всех есть свои правила, следует их также прочитать и принять. ",
    { parse_mode: "HTML", reply_markup: getMainKeyboard() },
  );
});

//Команда для получения ID фото для последующей быстрой отправки
//Раскоментируйте на один раз, используйте команду и закомментируйте обратно
bot.command("upload_photos", async (ctx) => {
  const photos = [
    "tariffs.png",
    "instruction.png",
    "payment_success.png",
    "payment_rejected.png",
    "waiting.png",
    "rules.png",
  ];

  for (const photo of photos) {
    const photoPath = path.join(__dirname, "images", photo);
    const { photo: photoArray } = await ctx.replyWithPhoto(
      new InputFile(photoPath),
    );
    const fileId = photoArray[photoArray.length - 1].file_id; // Берем ID самого большого размера
    console.log(`${photo}: ${fileId}`);
  }

  await ctx.reply("File ID всех фото выведены в консоль.");
});

bot.hears("Инструкция 📑", async (ctx) => {
  await ctx.replyWithPhoto(PHOTO_IDS.instruction, {
    caption:
      "<b>Инструкция:</b>\n" +
      "<blockquote>1. Для управления ботом используйте кнопки\n" +
      "2. Следуйте указаниям бота\n" +
      "3. При возникновении проблем с оплатой обращайтесь: @blurnet_support 💳\n" +
      "4. Все актуальные новости: @blurnet_news 📰</blockquote>",
    parse_mode: "HTML",
    reply_markup: getInstructionInlineKeyboard(),
  });
});

bot.hears("Начать работу с blurnet 🚀", async (ctx) => {
  await ctx.replyWithPhoto(PHOTO_IDS.tariffs, {
    caption:
      "Выберите свой тарифный план:\n" +
      "🏆12 месяцев - <b>Цена: 1000 ₽</b>\n" +
      "🥇6 месяцев - <b>Цена: 550 ₽</b>\n" +
      "🥈3 месяца - <b>Цена: 280 ₽</b>\n" +
      "🥉1 месяц - <b>Цена: 100 ₽</b>\n\n" +
      "🌟 Попробовать бесплатный пробный период на <b>5 дней</b>",
    parse_mode: "HTML",
    reply_markup: getTariffsInlineKeyboard(),
  });
});

bot.hears("Правила использования", async (ctx) => {
  await ctx.replyWithPhoto(PHOTO_IDS.rules, {
    caption:
      "Правила использования <b>blurnet</b>\n" +
      "<blockquote>1. <b>Запрещено использовать VPN для незаконной деятельности</b>\n" +
      "Наш сервис предназначен для обеспечения конфиденциальности и безопасности, а не для обхода законов.\n\n" +
      "2. <b>Не допускается использование для вредоносных действий</b>\n" +
      "Запрещены DDoS-атаки, распространение вредоносного ПО, хакерские взломы и любые другие действия, наносящие вред третьим лицам.\n\n" +
      "3. <b>Запрещена передача учетных данных третьим лицам</b>\n" +
      "Аккаунт предоставляется только для личного использования. Распространение данных доступа может привести к блокировке.\n\n" +
      "4. <b>Администрация оставляет за собой право ограничить доступ</b>\n" +
      "В случае нарушения правил доступ к сервису может быть приостановлен без возврата средств.\n\n" +
      "5. <b>Сервис работает без гарантий</b>\n" +
      "Мы стремимся к стабильной работе, но не несем ответственности за возможные сбои, блокировки со стороны провайдеров или снижение скорости. (но при возникновении проблем мы обязательно постараемся их решить как можно быстрее)</blockquote>\n\n" +
      "Используя <b>blurnet</b>, вы автоматически соглашаетесь с данными правилами.",
    parse_mode: "HTML",
    reply_markup: getMainKeyboard(),
  });
});

// Обработчик callback_query
bot.on("callback_query", async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  console.log(`Получен callback_query: ${callbackData}, от userId: ${userId}`);

  try {
    if (callbackData.startsWith("tariff_")) {
      const tariffKey = callbackData;
      console.log(`Выбран тариф: ${tariffKey}`);

      const tariff = TARIFFS[tariffKey];
      if (!tariff) {
        throw new Error(`Тариф ${tariffKey} не найден в TARIFFS`);
      }

      ctx.session.tariff = tariff.name;
      console.log(`Сохранен тариф в сессии: ${ctx.session.tariff}`);

      if (tariffKey === "tariff_trial") {
        await ctx.reply(
          "<b>Пробный период активирован</b> ✅\n\n" +
            "Переходите по ссылке и следуйте инструкции по подключению\n\n" +
            "👀 <a href='https://sub.blurnet.ru/SMbw7nGUFbweEUan'>Подписка</a>",
          {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: getReturnTariffInlineKeyboard(),
          },
        );

        await bot.api.sendMessage(
          ADMIN_ID,
          `Новый пользователь активировал пробный период!\n` +
            `Пользователь: ${ctx.from.username ? "@" + ctx.from.username : "не указан"}\n` +
            `ID: ${userId}`,
        );
      } else {
        await ctx.reply(tariff.message, {
          reply_markup: getPaymentInlineKeyboard(),
        });
      }

      await ctx.answerCallbackQuery();
    } else if (callbackData === "back_main") {
      await ctx.deleteMessage();
      await ctx.reply(
        "Вы запустили <b>blurnet</b> 🙌🏻 - выгодный VPN для высших устройств без каких либо ограничений.\n\n" +
          "Наш сервис поддерживает такие устройства как:\n" +
          "- iOS\n" +
          "- Android\n" +
          "- MacOS\n" +
          "- Windows\n\n" +
          "Мы отличаемся от конкурентов тем, что мы используем высокоскоростные сервера (2.5 Гбит/с) и самое современное оборудование, а также не ведем никаких записей поисковых запросов, IP адресов, и остальных цифровых следов.\n\n" +
          "Внимательно ознакомьтесь с инструкцией и начинайте!\n\n" +
          "У нас как и у всех есть свои правила, следует их также прочитать и принять. ",
        {
          parse_mode: "HTML",
          reply_markup: getMainKeyboard(),
        },
      );
      await ctx.answerCallbackQuery();
    } else if (callbackData === "back_tariffs") {
      await ctx.replyWithPhoto(PHOTO_IDS.tariffs, {
        caption:
          "Выберите свой тарифный план:\n" +
          "🏆12 месяцев - <b>Цена: 1000 ₽</b>\n" +
          "  \n" +
          "🥇6 месяцев - <b>Цена: 550 ₽</b>\n" +
          "  \n" +
          "🥈3 месяца - <b>Цена: 280 ₽</b>\n" +
          "  \n" +
          "🥉1 месяц - <b>Цена: 100 ₽</b>\n\n" +
          "🌟 Попробовать бесплатный пробный период на <b>5 дней</b>",
        parse_mode: "HTML",
        reply_markup: getTariffsInlineKeyboard(),
      });
      await ctx.answerCallbackQuery();
    } else if (callbackData === "payment_success") {
      await ctx.reply(
        " ❗️Пришлите квитанцию об оплате или скриншот перевода❗️",
      );
      await ctx.answerCallbackQuery();
    } else if (callbackData === "payment_cancel") {
      await ctx.replyWithPhoto(PHOTO_IDS.tariffs, {
        caption:
          "Выберите свой тарифный план:\n" +
          "🏆12 месяцев - <b>Цена: 1000 ₽</b>\n" +
          "🥇6 месяцев - <b>Цена: 550 ₽</b>\n" +
          "🥈3 месяца - <b>Цена: 280 ₽</b>\n" +
          "🥉1 месяц - <b>Цена: 100 ₽</b>\n\n" +
          "🌟 Попробовать бесплатный пробный период на <b>5 дней</b>",
        parse_mode: "HTML",
        reply_markup: getTariffsInlineKeyboard(),
      });
      await ctx.answerCallbackQuery();
    } else if (
      callbackData.startsWith("approve_") ||
      callbackData.startsWith("reject_")
    ) {
      if (userId !== Number(ADMIN_ID)) {
        throw new Error("У вас нет прав для этого действия");
      }

      const [action, targetUserId, encodedTariff] = callbackData.split("_");
      const tariff = decodeURIComponent(encodedTariff);

      if (action === "approve") {
        await handleApproval(ctx, Number(targetUserId), tariff);
        await ctx.answerCallbackQuery({ text: "Платеж подтвержден" });
      } else if (action === "reject") {
        await handleRejection(ctx, Number(targetUserId), tariff);
        await ctx.answerCallbackQuery({ text: "Платеж отклонен" });
      }
    }
  } catch (error) {
    console.error("Ошибка при обработке callback_query:", error);
    await ctx.answerCallbackQuery({
      text: `Ошибка: ${error.message}`,
      show_alert: true,
    });
  }
});

// Обработчик фото и документов (оставляем как есть)
bot.on(["message:photo", "message:document"], async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username ? "@" + ctx.from.username : "не указан";
  const selectedTariff = ctx.session.tariff || "Тариф не указан";

  await ctx.replyWithPhoto(PHOTO_IDS.waiting, {
    caption:
      "<b>Благодарим за покупку!</b>\n\n" +
      "Ожидайте подтверждение перевода администратором ⌛️",
    parse_mode: "HTML",
    reply_markup: getReturnTariffInlineKeyboard(),
  });

  const caption = `Новый платеж!\nПользователь: ${username}\nID: ${userId}\nТариф: ${selectedTariff}`;

  try {
    if (ctx.message.photo) {
      const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      await bot.api.sendPhoto(ADMIN_ID, photoId, {
        caption: caption,
        reply_markup: getAdminInlineKeyboard(userId, selectedTariff),
      });
    } else if (ctx.message.document) {
      await bot.api.sendDocument(ADMIN_ID, ctx.message.document.file_id, {
        caption: caption,
        reply_markup: getAdminInlineKeyboard(userId, selectedTariff),
      });
    }
  } catch (error) {
    console.error("Ошибка при отправке сообщения администратору:", error);
  }
});

bot.catch((err) => {
  console.error("Ошибка бота:", err);
});

console.log("Бот запущен...");
bot.start();

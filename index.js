require("dotenv").config();
const { Bot, Keyboard, InlineKeyboard, session, InputFile } = require("grammy");

const TOKEN = process.env.BOT_API_KEY;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new Bot(TOKEN);

const path = require("path");
const fs = require("fs");

const PHOTO_IDS = {
  tariffs:
    "AgACAgIAAxkDAAICEWfeCraGseqSYZrdjWx6mUD8_sPyAAKt9DEbwXvxSoLOVNdTQS9tAQADAgADdwADNgQ",
  instruction:
    "AgACAgIAAxkDAAICF2feC17utd9-9ZquwevZ0W6pONKJAAKu9DEbwXvxSjFEIHTDHUfuAQADAgADdwADNgQ",
  payment_success:
    "AgACAgIAAxkDAAICLGfeDHODThJjEWeqctEUFi1w8jdRAAK69DEbwXvxSnaqC35K35g9AQADAgADdwADNgQ",
  payment_rejected:
    "AgACAgIAAxkDAAICOGfeDVAfUdOpND91IASEhbhk8O0MAAK79DEbwXvxStmA5u7y4lNIAQADAgADdwADNgQ",
  waiting:
    "AgACAgIAAxkDAAICImfeDCmVVBheaxXOx_JgvfE2s6nYAAKy9DEbwXvxSskNJ49btPkKAQADAgADdwADNgQ",
};

bot.use(
  session({
    initial: () => ({ tariff: null }),
  }),
);

// Определение клавиатур (оставляем без изменений)
function getMainKeyboard() {
  return new Keyboard()
    .row("🟣Инструкция🟣")
    .row("🔵Начать работу с blurnet🔵")
    .placeholder("Выбери действие")
    .resized();
}

function getTariffsInlineKeyboard() {
  return (
    new InlineKeyboard()
      .row()
      .text("🥇Год", "tariff_year")
      // .row()
      .text("🥈Полгода", "tariff_halfyear")
      // .row()
      .text("🥉Месяц", "tariff_month")
      .row()
      .text("⭐Попробовать бесплатный период", "tariff_trial")
      .row()
      .text("🔴Назад🔴", "back_main")
  );
}

function getPaymentInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .text("Да, успешно✔", "payment_success")
    .text("Нет/Назад❌", "payment_cancel");
}

function getReturnTariffInlineKeyboard() {
  return new InlineKeyboard()
    .row()
    .text("🔴Вернуться к тарифным планам🔴", "back_tariffs");
}

function getAdminInlineKeyboard(userId, tariff) {
  return new InlineKeyboard()
    .row()
    .text("✅ Подтвердить", `approve_${userId}_${encodeURIComponent(tariff)}`)
    .text("❌ Отклонить", `reject_${userId}_${encodeURIComponent(tariff)}`);
}

const TARIFFS = {
  tariff_year: {
    name: "🥇Год",
    price: "1000₽",
    message: `Сумма к оплате 1000₽.\n
💳Реквизиты: -------\n

Оплата прошла успешно?`,
  },
  tariff_halfyear: {
    name: "🥈Полгода",
    price: "550₽",
    message: `Сумма к оплате 550₽.\n
💳Реквизиты: -------\n

Оплата прошла успешно?`,
  },
  tariff_month: {
    name: "🥉Месяц",
    price: "100₽",
    message: `Сумма к оплате 100₽.\n
💳Реквизиты: -------\n

Оплата прошла успешно?`,
  },
  tariff_trial: {
    name: "⭐Пробный период",
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
      "✅Ваш платеж успешно подтвержден!\n" +
      "💌Спасибо, что пользуетесь нашими услугами!\n\n" +
      "КОНФИГ",
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
      `❌ Уведомление:\nВаш платеж за тариф '${tariff}' не подтвержден.\n` +
      `Причина: Ошибка в оплате\n` +
      `Пожалуйста:\n` +
      `1. Проверьте правильность реквизитов\n` +
      `2. Убедитесь в корректности суммы\n` +
      `3. Попробуйте оплатить снова\n\n` +
      `При возникновении вопросов обратитесь к администратору.`,
    reply_markup: getMainKeyboard(),
  });

  await bot.api.sendMessage(
    userId,
    "Выбери свой тарифный план!\n\n" +
      "🥇Год подписки за 1000₽.\n" +
      "🥈Полгода подписки за 550₽.\n" +
      "🥉Месяц подписки за 100₽.\n\n" +
      "⭐Попробовать бесплатный период на 3 дня.",
    { reply_markup: getTariffsInlineKeyboard() },
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
    "Ты запустил blurnet🔄\n\n" +
      "Внимательно ознакомься с инструкцией и вперед!",
    { reply_markup: getMainKeyboard() },
  );
});

// bot.command("upload_photos", async (ctx) => {
//   const photos = [
//     "tariffs.jpg",
//     "instruction.jpg",
//     "payment_success.jpg",
//     "payment_rejected.jpg",
//     "waiting.jpg",
//   ];

//   for (const photo of photos) {
//     const photoPath = path.join(__dirname, "images", photo);
//     const { photo: photoArray } = await ctx.replyWithPhoto(
//       new InputFile(photoPath),
//     );
//     const fileId = photoArray[photoArray.length - 1].file_id; // Берем ID самого большого размера
//     console.log(`${photo}: ${fileId}`);
//   }

//   await ctx.reply("File ID всех фото выведены в консоль.");
// });

bot.hears("🟣Инструкция🟣", async (ctx) => {
  await ctx.replyWithPhoto(PHOTO_IDS.instruction, {
    caption:
      "Инструкция:\n" +
      "1. Для управления ботом, используйте клавиши.🕹️\n" +
      "2. Следуйте указаниям бота.👌\n" +
      "3. При возникновении проблем касательно денежного перевода, обращайтесь --> @blurnet_support.💸\n" +
      "4. Все актуальные новости blurnet --> @blurnet_news.📢",
    reply_markup: getMainKeyboard(),
  });
});

bot.hears("🔵Начать работу с blurnet🔵", async (ctx) => {
  await ctx.replyWithPhoto(PHOTO_IDS.tariffs, {
    caption:
      "Выбери свой тарифный план!\n\n" +
      "🥇Год подписки за 1000₽.\n" +
      "🥈Полгода подписки за 550₽.\n" +
      "🥉Месяц подписки за 100₽.\n\n" +
      "⭐Попробовать бесплатный период на 3 дня.",
    reply_markup: getTariffsInlineKeyboard(),
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
          "✅ Спасибо за выбор пробного периода!\n" +
            "Ваш VPN будет активирован в течение нескольких минут.",
          { reply_markup: getReturnTariffInlineKeyboard() },
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
      await ctx.reply("Вы вернулись в главное меню", {
        reply_markup: getMainKeyboard(),
      });
      await ctx.answerCallbackQuery();
    } else if (callbackData === "back_tariffs") {
      await ctx.replyWithPhoto(PHOTO_IDS.tariffs, {
        caption:
          "Выбери свой тарифный план!\n\n" +
          "🥇Год подписки за 1000₽.\n" +
          "🥈Полгода подписки за 550₽.\n" +
          "🥉Месяц подписки за 100₽.\n\n" +
          "⭐Попробовать бесплатный период на 3 дня.",
        reply_markup: getTariffsInlineKeyboard(),
      });
      await ctx.answerCallbackQuery();
    } else if (callbackData === "payment_success") {
      await ctx.reply("Пришли квитанцию об оплате или скриншот перевода.📜");
      await ctx.answerCallbackQuery();
    } else if (callbackData === "payment_cancel") {
      await ctx.replyWithPhoto(PHOTO_IDS.tariffs, {
        caption:
          "Выбери свой тарифный план!\n\n" +
          "🥇Год подписки за 1000₽.\n" +
          "🥈Полгода подписки за 550₽.\n" +
          "🥉Месяц подписки за 100₽.\n\n" +
          "⭐Попробовать бесплатный период на 3 дня.",
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
      "Спасибо! Проверка займет какое-то время.⏳\n\n" + "Ожидайте ответа.🔔",
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

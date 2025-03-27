/**
 * Default configuration values
 * Copy this file and rename to local.js to override these settings
 */
module.exports = {
  // Bot configuration
  bot: {
    token: process.env.BOT_API_KEY,
    adminId: Number(process.env.ADMIN_ID),
  },

  // Service name and branding
  service: {
    name: "blurnet",
    supportUsername: "blurnet_support",
    newsChannel: "blurnet_news",
  },

  // URLs
  urls: {
    support: process.env.SUPPORT_URL,
    news: process.env.NEWS_URL,
    subscription: process.env.SUBSCRIPTION_URL,
  },

  // API credentials
  api: {
    url: "https://panel.blurnet.ru",
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    cookie: process.env.COOKIE,
    inboundTag: "Steal", // Тег инбаунда для создания пользователей
  },

  // Payment info
  payment: {
    requisites: "-------", // Платежные реквизиты
  },
};

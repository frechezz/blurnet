// Entry point for the Blurnet Telegram Bot
require("dotenv").config();
const { bot } = require("./src/bot");

console.log("Blurnet bot starting...");
bot.start();

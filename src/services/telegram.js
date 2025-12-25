const TelegramBot = require("node-telegram-bot-api");
const config = require("../../config/config");

const bot = new TelegramBot(config.telegram.botToken, {
    polling: true
});

// Send message helper
function sendTelegramMessage(text, options = {}) {
    return bot.sendMessage(config.telegram.chatId, text, options);
}

module.exports = { sendTelegramMessage };

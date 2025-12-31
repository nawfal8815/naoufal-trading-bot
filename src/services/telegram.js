const TelegramBot = require("node-telegram-bot-api");
const config = require("../../config/config");

let bot;

// ✅ Ensure SINGLE instance
if (!global._telegramBot) {
  global._telegramBot = new TelegramBot(config.telegram.botToken, {
    polling: {
      interval: 1000, // slow enough to avoid 429
      autoStart: true,
      params: {
        timeout: 20   // long polling, fewer reconnects
      }
    }
  });

  // ✅ Handle polling errors safely
  global._telegramBot.on("polling_error", async (err) => {
    console.error("[polling_error]", err.code, err.message);

    // Telegram rate limiting
    if (err.code === "ETELEGRAM" && err.message.includes("429")) {
      console.warn("⏸ Telegram rate limit hit, pausing polling...");
      global._telegramBot.stopPolling();

      setTimeout(() => {
        console.warn("▶ Resuming Telegram polling");
        global._telegramBot.startPolling();
      }, 10_000);
    }
  });
}

bot = global._telegramBot;

let lastMessageIds = [];

// ✅ Send message helper (safe)
function sendTelegramMessage(text, options = {}) {
  const msg = bot.sendMessage(config.telegram.chatId, text, options);
  lastMessageIds.push(msg.message_id);
  return msg;
}

async function clearBotMessages(chatId) {
  for (const id of lastMessageIds) {
    try {
      await bot.deleteMessage(chatId, id);
    } catch (err) {
      // ignore errors
    }
  }
  lastMessageIds = [];
}


module.exports = { sendTelegramMessage, clearBotMessages };

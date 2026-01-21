const axios = require("axios");
const config = require('../../config/config');

const twelveDataKeys = [
  config.twelveData.apiKey,
  config.twelveData.apiKey2,
  config.twelveData.apiKey3,
  config.twelveData.apiKey4,
  config.twelveData.apiKey5,
  config.twelveData.apiKey6,
  config.twelveData.apiKey7,
  config.twelveData.apiKey8,
  config.twelveData.apiKey9,
  config.twelveData.apiKey10,
  config.twelveData.apiKey11,
  config.twelveData.apiKey12,
  config.twelveData.apiKey13,
  config.twelveData.apiKey14,
  config.twelveData.apiKey15
].filter(Boolean);

let currentKeyIndex = 0;

function getNextApiKey() {
  const key = twelveDataKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % twelveDataKeys.length;
  return key;
}

function isRateLimitError(err) {
  const msg = err?.response?.data?.message || err?.message || "";
  return (
    msg.includes("limit") ||
    msg.includes("Max") ||
    msg.includes("429")
  );
}

async function requestWithKeyRotation(url, params) {
  let lastError;

  for (let i = 0; i < twelveDataKeys.length; i++) {
    const apikey = getNextApiKey();

    try {
      const res = await axios.get(url, {
        params: { ...params, apikey },
        timeout: 10_000,
      });

      // 🚨 TwelveData returns rate limit INSIDE payload
      if (res.data?.code === 429) {
        console.warn("⚠️ TwelveData credit limit hit, rotating key...", apikey);
        lastError = new Error(res.data.message);
        continue;
      }

      return res;

    } catch (err) {
      lastError = err;

      if (isRateLimitError(err)) {
        console.warn("⚠️ HTTP rate limit hit, rotating key...");
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}


module.exports = { requestWithKeyRotation };
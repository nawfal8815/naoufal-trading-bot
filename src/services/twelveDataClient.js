const axios = require("axios");
const config = require("../../config/config");

class TwelveDataKeyManager {
  constructor(keys) {
    this.keys = keys;
    this.index = 0;
    this.exhausted = false;
  }

  isRateLimitError(err) {
    const msg = err?.response?.data?.message || err?.message || "";
    return msg.includes("limit") || msg.includes("Max") || msg.includes("429");
  }

  get currentKey() {
    if (this.exhausted) return null;
    return this.keys[this.index];
  }

  rotate() {
    this.index++;
    if (this.index >= this.keys.length) {
      this.exhausted = true;
      console.error("🚫 All TwelveData API keys exhausted");
    }
  }

  async request(url, params) {
    let attempts = 0;
    let lastError;

    while (!this.exhausted && attempts < this.keys.length) {
      const apikey = this.currentKey;

      try {
        const res = await axios.get(url, {
          params: { ...params, apikey },
          timeout: 10_000,
        });

        // TwelveData rate limit inside payload
        if (res.data?.code === 429) {
          console.warn("⚠️ TwelveData credit limit hit, rotating key...", apikey);
          this.rotate();
          attempts++;
          continue;
        }

        return res;

      } catch (err) {
        lastError = err;

        if (this.isRateLimitError(err)) {
          console.warn("⚠️ HTTP rate limit hit, rotating key...", apikey);
          this.rotate();
          attempts++;
          continue;
        }

        throw err; // non-rate-limit error
      }
    }

    throw lastError || new Error("All TwelveData keys exhausted");
  }
}

module.exports = global.__TWELVE_DATA_KEY_MANAGER__ ||= 
  new TwelveDataKeyManager([
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
  ].filter(Boolean));

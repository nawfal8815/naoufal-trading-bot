const axios = require('axios');
const config = require('../../config/config');

const API_URL = `${config.url}/api/data`;
const BOT_API_KEY = process.env.BOT_API_KEY; // Get API key from environment

async function postData(data) {
  try {
    const headers = {
      authorization: `x-bot-api-key ${BOT_API_KEY}`
    };

    if (data.type === "candles") {
      await axios.post(`${API_URL}/candles`, data, { headers });
    } else if (data.type === "telegram") {
      await axios.post(`${API_URL}/telegram`, data, { headers });
    } else {
      await axios.post(API_URL, data, { headers });
    }
  } catch (error) {
    if (error.response) {
      // Server responded (401, 403, 500, etc.)
      console.error("POST FAILED");
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else if (error.request) {
      // Request sent but no response
      console.error("NO RESPONSE FROM SERVER");
      console.error(error.request);
    } else {
      // Something else went wrong
      console.error("AXIOS ERROR:", error.message);
    }
  }
}


module.exports = { postData };

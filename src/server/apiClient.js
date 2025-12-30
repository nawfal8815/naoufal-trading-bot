const axios = require('axios');
const config = require('../../config/config');

const API_URL = `${config.url}:${config.port}/api/data`;

async function postData(data) {
  try {
    if (data.type === "candles") await axios.post(API_URL + "/candles", data)
    else await axios.post(API_URL, data);
  } catch (error) {
    console.error('Error posting data to backend:', error.message);
  }
}

module.exports = { postData };

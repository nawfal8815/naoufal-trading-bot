const axios = require('axios');

const API_URL = 'http://localhost:3000/api/data';

async function postData(data) {
  try {
    await axios.post(API_URL, data);
    if (data.type !== "candles") console.log('Data posted to backend:', data);
    else console.log('Candles data posted');
  } catch (error) {
    console.error('Error posting data to backend:', error.message);
  }
}

module.exports = { postData };

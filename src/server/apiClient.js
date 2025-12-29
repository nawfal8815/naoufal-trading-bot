const axios = require('axios');

const API_URL = 'http://localhost:3000/api/data';

async function postData(data) {
  try {
    await axios.post(API_URL, data);
  } catch (error) {
    console.error('Error posting data to backend:', error.message);
  }
}

module.exports = { postData };

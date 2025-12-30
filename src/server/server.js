const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

// In-memory data store
let dataStore = [];
let candles = []

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

// Route to post data from the bot
app.post('/api/data', (req, res) => {
  const newData = req.body;
  console.log('Received data from bot:', newData);
  dataStore.push(newData);
  res.status(200).send('Data received');
});

app.post('/api/data/candles', (req, res) => {
  const newData = req.body;
  console.log("Candles data received");
  candles.push(newData);
  res.status(200).send('Data received');
});

// Route to get data for the frontend
app.get('/api/data', (req, res) => {
  res.json(dataStore);
});

app.get('/api/data/candles', (req, res) => {
  res.json(candles);
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});

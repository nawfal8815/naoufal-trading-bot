const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

// In-memory data store
let dataStore = [];

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

// Route to post data from the bot
app.post('/api/data', (req, res) => {
  const newData = req.body;
  if (newData.type !== "candles") console.log('Received data from bot:', newData);
  else console.log("Candles data received");
  dataStore.push(newData);
  res.status(200).send('Data received');
});

// Route to get data for the frontend
app.get('/api/data', (req, res) => {
  res.json(dataStore);
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});

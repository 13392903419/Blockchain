const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is working!' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

const port = 4000;
app.listen(port, () => {
  console.log(`Test server running on http://localhost:${port}`);
  console.log('Health check: http://localhost:4000/health');
  console.log('Test endpoint: http://localhost:4000/test');
});

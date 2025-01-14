const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes will be imported here
app.use('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app; 
const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);
app.use('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app; 
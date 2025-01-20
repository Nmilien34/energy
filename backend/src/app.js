const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const youtubeRoutes = require('./routes/youtube');
const recognitionRoutes = require('./routes/recognition');
const libraryRoutes = require('./routes/library');
const searchRoutes = require('./routes/search');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/youtube', youtubeRoutes);
app.use('/api/recognition', recognitionRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/search', searchRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 
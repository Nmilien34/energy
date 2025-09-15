import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import musicRoutes from './routes/musicRoutes';
import playlistRoutes from './routes/playlistRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nrgflow')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://www.yfhnrg.com',
  'https://yfhnrg.com'
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/playlists', playlistRoutes);

// Health check
app.get('/api/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

export default app; 
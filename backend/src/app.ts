import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import passport from 'passport';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import musicRoutes from './routes/musicRoutes';
import playlistRoutes from './routes/playlistRoutes';
import oauthRoutes from './routes/oauthRoutes';
import { errorHandler } from './middleware/errorHandler';

// Initialize OAuth strategies
import './controllers/oauthController';

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nrgflow')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://www.yfhnrg.com',
  'https://yfhnrg.com',
  // Add your Vercel deployment URLs here
  process.env.FRONTEND_URL,
  // Allow all Vercel preview deployments during development
  /^https:\/\/.*\.vercel\.app$/
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check against string origins
    const stringOrigins = allowedOrigins.filter(o => typeof o === 'string') as string[];
    if (stringOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Check against regex patterns
    const regexOrigins = allowedOrigins.filter(o => o instanceof RegExp) as RegExp[];
    if (regexOrigins.some(regex => regex.test(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
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

// Passport middleware
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/oauth', oauthRoutes);
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
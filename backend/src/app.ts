import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoose from 'mongoose';
import passport from 'passport';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import musicRoutes from './routes/musicRoutes';
import playlistRoutes from './routes/playlistRoutes';
import oauthRoutes from './routes/oauthRoutes';
import settingsRoutes from './routes/settingsRoutes';
import shareRoutes from './routes/shareRoutes';
import { errorHandler } from './middleware/errorHandler';

// Initialize OAuth strategies
import './controllers/oauthController';

const app = express();

// Connect to MongoDB with timeout options
const mongoOptions = {
  serverSelectionTimeoutMS: 5000, // Reduced to 5s for faster failure
  socketTimeoutMS: 30000, // Reduced socket timeout
  connectTimeoutMS: 5000, // Reduced connection timeout
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain at least 2 socket connections
  maxIdleTimeMS: 30000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  bufferCommands: true, // Buffer commands if not connected (Mongoose default)
  bufferMaxEntries: 0 // Don't buffer indefinitely
  // Note: 'w' option removed - using default write concern
};

// MongoDB connection with better error handling and retry logic
const connectMongoDB = async (retries = 3, delay = 2000) => {
  const { config } = await import('./utils/config');
  const mongoUri = config.mongodb.uri;
  
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set, using default localhost connection');
    console.warn('⚠️  This will likely fail in production!');
  } else {
    // Log connection string info (without password)
    const uriInfo = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    console.log('🔌 Attempting MongoDB connection:', uriInfo.split('?')[0]);
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📡 MongoDB connection attempt ${attempt}/${retries}...`);
      const connection = await mongoose.connect(mongoUri, mongoOptions);
      console.log('✓ Connected to MongoDB');
      console.log(`  Host: ${connection.connection.host}`);
      console.log(`  Database: ${connection.connection.name}`);
      console.log(`  ReadyState: ${connection.connection.readyState} (1=connected)`);
      return; // Success, exit retry loop
    } catch (err: any) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, {
        message: err?.message,
        name: err?.name,
        code: err?.code,
        mongoUriExists: !!process.env.MONGODB_URI,
        mongoUriLength: process.env.MONGODB_URI?.length || 0
      });
      
      // Provide helpful error messages
      if (err?.name === 'MongoServerSelectionError') {
        console.error('💡 This usually means:');
        console.error('   - Wrong connection string');
        console.error('   - Network/firewall blocking connection');
        console.error('   - MongoDB server is down');
        console.error('   - IP not whitelisted (if using MongoDB Atlas)');
      }
      
      if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED') {
        console.error('💡 Network error - check:');
        console.error('   - Connection string hostname is correct');
        console.error('   - Server can reach MongoDB (firewall/network)');
      }
      
      // If not the last attempt, wait and retry
      if (attempt < retries) {
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Last attempt failed
        console.warn('⚠️  All MongoDB connection attempts failed - database operations will fail!');
        console.warn('⚠️  App will continue to start, but login and other DB operations will return 503 errors');
      }
    }
  }
};

// Set up connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✓ MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✓ MongoDB reconnected');
});

// Attempt connection
connectMongoDB();

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', // Added for development when port 3000 is busy
  'http://localhost:3002', // Added for development when ports 3000/3001 are busy
  'https://www.yfhnrg.com',
  'https://yfhnrg.com',
  'https://enterprise.boltzman.ai',
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
app.set('trust proxy', 1); // Trust first proxy (for Render, Heroku, etc.)
app.use(compression()); // Compress responses to reduce payload size
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Passport middleware
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/music', musicRoutes);
// Debug: Log all requests to playlists routes
app.use('/api/playlists', (req, res, next) => {
  console.log(`📨 Playlist Route: ${req.method} ${req.path}`);
  next();
});

app.use('/api/playlists', playlistRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/share', shareRoutes);

// Health check with database status
app.get('/api/health', (_, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.status(dbStatus === 1 ? 200 : 503).json({ 
    status: dbStatus === 1 ? 'ok' : 'degraded',
    database: {
      status: dbStates[dbStatus as keyof typeof dbStates] || 'unknown',
      readyState: dbStatus,
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown'
    }
  });
});

// Error handling
app.use(errorHandler);

export default app; 
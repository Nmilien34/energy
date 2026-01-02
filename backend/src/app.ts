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
import anonymousRoutes from './routes/anonymousRoutes';
import recommendRoutes from './routes/recommendRoutes';
import { errorHandler } from './middleware/errorHandler';

// Initialize OAuth strategies
import './controllers/oauthController';

const app = express();

// Connect to MongoDB with timeout options
const mongoOptions = {
  serverSelectionTimeoutMS: 10000, // 10s for server selection (allows time for Atlas)
  socketTimeoutMS: 45000, // 45s socket timeout
  connectTimeoutMS: 10000, // 10s connection timeout
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain at least 2 socket connections
  maxIdleTimeMS: 30000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true
  // Note: bufferCommands is a Mongoose option, not MongoDB driver option
  // Mongoose handles command buffering automatically
};

// MongoDB connection with better error handling and retry logic
const connectMongoDB = async (retries = 3, delay = 2000) => {
  const { config } = await import('./utils/config');
  const mongoUri = config.mongodb.uri;
  
  // Detailed logging for debugging
  console.log('🔍 MongoDB Connection Diagnostics:');
  console.log('  - MONGODB_URI env var exists:', !!process.env.MONGODB_URI);
  console.log('  - MONGODB_URI length:', process.env.MONGODB_URI?.length || 0);
  console.log('  - NODE_ENV:', process.env.NODE_ENV || 'not set');
  
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in environment variables!');
    console.error('❌ Using default localhost connection which will fail in production!');
    console.error('💡 Please set MONGODB_URI in your Render environment variables');
    console.error('💡 Go to: Render Dashboard → Your Service → Environment → Add MONGODB_URI');
    return; // Don't attempt connection with localhost in production
  }
  
  // Log that we have the URI (for debugging)
  console.log('✅ MONGODB_URI is set, length:', process.env.MONGODB_URI.length);
  
  // Validate connection string format
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error('❌ Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
    return;
  }
  
  // Log connection string info (without password)
  const uriInfo = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  console.log('🔌 Attempting MongoDB connection:', uriInfo.split('?')[0]);
  
  // Check if password has special characters that need encoding
  const passwordMatch = mongoUri.match(/\/\/([^:]+):([^@]+)@/);
  if (passwordMatch && passwordMatch[2]) {
    const password = passwordMatch[2];
    if (password !== encodeURIComponent(password)) {
      console.warn('⚠️  Password contains special characters - ensure they are URL encoded!');
    }
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
        console.error('💡 MongoDB Server Selection Error - This usually means:');
        console.error('   1. IP Address not whitelisted in MongoDB Atlas');
        console.error('      → Go to MongoDB Atlas → Network Access → Add IP Address');
        console.error('      → For Render, you may need to whitelist 0.0.0.0/0 (all IPs)');
        console.error('   2. Wrong connection string format');
        console.error('      → Check username, password, and cluster address');
        console.error('   3. Password contains special characters that need URL encoding');
        console.error('      → Use encodeURIComponent() for special chars like @, #, %, etc.');
        console.error('   4. Network/firewall blocking connection');
        console.error('   5. MongoDB cluster is paused or down');
        console.error('');
        console.error('   Full error:', err.message);
      }
      
      if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED') {
        console.error('💡 Network/DNS Error - check:');
        console.error('   - Connection string hostname is correct');
        console.error('   - DNS can resolve the MongoDB hostname');
        console.error('   - Server can reach MongoDB (firewall/network)');
        console.error('   - MongoDB Atlas cluster is not paused');
        console.error('');
        console.error('   Full error:', err.message);
      }
      
      if (err?.code === 'EAUTH' || err?.message?.includes('authentication')) {
        console.error('💡 Authentication Error - check:');
        console.error('   - Username is correct');
        console.error('   - Password is correct (check for typos)');
        console.error('   - Password special characters are URL encoded');
        console.error('   - Database user has proper permissions');
        console.error('');
        console.error('   Full error:', err.message);
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
  console.warn('⚠️  MongoDB disconnected - attempting to reconnect...');
  // Attempt to reconnect after a delay
  setTimeout(() => {
    connectMongoDB().catch(err => {
      console.error('Reconnection attempt failed:', err);
    });
  }, 5000);
});

mongoose.connection.on('reconnected', () => {
  console.log('✓ MongoDB reconnected');
});

// Attempt connection (non-blocking - app will start even if connection fails)
console.log('🚀 Starting MongoDB connection attempt...');
connectMongoDB()
  .then(() => {
    console.log('✅ MongoDB connection successful on startup');
  })
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB during startup:', err);
    console.error('⚠️  App will continue, but database operations will fail until connection is established');
    console.error('💡 Check:');
    console.error('   1. MONGODB_URI environment variable is set in Render');
    console.error('   2. MongoDB Atlas Network Access allows Render IPs (or 0.0.0.0/0)');
    console.error('   3. Connection string format is correct');
    console.error('   4. MongoDB cluster is not paused');
  });

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
app.use('/api/anonymous', anonymousRoutes);
// Debug: Log all requests to playlists routes
app.use('/api/playlists', (req, res, next) => {
  console.log(`📨 Playlist Route: ${req.method} ${req.path}`);
  next();
});

app.use('/api/playlists', playlistRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/recommend', recommendRoutes);

// Health check with database status
app.get('/api/health', (_, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const mongoUri = process.env.MONGODB_URI || 'not set';
  const hasMongoUri = !!process.env.MONGODB_URI;
  
  // Extract connection info (without password)
  let connectionInfo = 'not configured';
  if (hasMongoUri) {
    try {
      const uriInfo = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
      const match = uriInfo.match(/mongodb\+?srv?:\/\/([^/]+)\/([^?]+)/);
      if (match) {
        connectionInfo = `${match[1]}/${match[2]}`;
      }
    } catch (e) {
      connectionInfo = 'invalid format';
    }
  }
  
  res.status(dbStatus === 1 ? 200 : 503).json({ 
    status: dbStatus === 1 ? 'ok' : 'degraded',
    database: {
      status: dbStates[dbStatus as keyof typeof dbStates] || 'unknown',
      readyState: dbStatus,
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown',
      mongoUriConfigured: hasMongoUri,
      connectionString: connectionInfo,
      troubleshooting: dbStatus !== 1 ? {
        check1: 'Verify MONGODB_URI is set in Render environment variables',
        check2: 'Check MongoDB Atlas Network Access - whitelist Render IPs or use 0.0.0.0/0',
        check3: 'Verify connection string format: mongodb+srv://username:password@cluster.mongodb.net/database',
        check4: 'Ensure password special characters are URL encoded',
        check5: 'Check MongoDB Atlas cluster is not paused'
      } : null
    }
  });
});

// Error handling
app.use(errorHandler);

export default app; 
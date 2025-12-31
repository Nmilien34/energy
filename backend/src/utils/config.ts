import dotenv from 'dotenv';

dotenv.config();

// Validate JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is required in production!');
  console.error('This will cause authentication failures. Please set JWT_SECRET in your environment variables.');
  // Don't exit in case this is being checked during build, but log the error
}

// Validate S3 configuration
if (process.env.NODE_ENV === 'production') {
  const s3Required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'];
  const missingS3 = s3Required.filter(key => !process.env[key]);
  if (missingS3.length > 0) {
    console.warn('WARNING: S3 configuration incomplete. Missing:', missingS3.join(', '));
    console.warn('S3 storage will be disabled until these environment variables are set.');
  }
}

export const config = {
  port: process.env.PORT || 5003,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nrgflow',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || ''
  },
  redis: {
    url: process.env.REDIS_URL || ''
  },
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.S3_BUCKET_NAME || '',
    // S3 optimization settings
    maxStorageGB: parseFloat(process.env.S3_MAX_STORAGE_GB || '50'), // Default 50GB limit
    minPlayCountForSync: parseInt(process.env.S3_MIN_PLAY_COUNT || '10'), // Minimum plays before syncing
    batchSize: parseInt(process.env.S3_BATCH_SIZE || '20'), // Songs per sync batch
    cleanupAfterDays: parseInt(process.env.S3_CLEANUP_AFTER_DAYS || '90'), // Cleanup unused songs after 90 days
    maxSongsPerDay: parseInt(process.env.S3_MAX_SONGS_PER_DAY || '100') // Rate limit: max songs uploaded per day
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000'
  },
  env: process.env.NODE_ENV || 'development'
}; 
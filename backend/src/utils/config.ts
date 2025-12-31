import dotenv from 'dotenv';

dotenv.config();

// Validate JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is required in production!');
  console.error('This will cause authentication failures. Please set JWT_SECRET in your environment variables.');
  // Don't exit in case this is being checked during build, but log the error
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
    bucketName: process.env.S3_BUCKET_NAME || ''
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000'
  },
  env: process.env.NODE_ENV || 'development'
}; 
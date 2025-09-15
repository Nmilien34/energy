import dotenv from 'dotenv';

dotenv.config();

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
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000'
  },
  env: process.env.NODE_ENV || 'development'
}; 
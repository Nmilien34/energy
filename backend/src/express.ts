import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { config } from './config/config';
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();

// Connect to MongoDB
mongoose.connect(config.mongodb.uri)
  .then(() => {
    console.log('📦 Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

// Middleware
app.use(express.json());

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

// Error handling
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${config.port}`);
  console.log(`🌍 Environment: ${config.env}`);
});

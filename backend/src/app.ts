import * as express from 'express';
import { Express, Request, Response } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app: Express = express.default();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

export default app; 
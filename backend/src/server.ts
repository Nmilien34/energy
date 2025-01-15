import app from './app';
import { config } from './config/config';
import { connectDB } from './config/database';

// Connect to MongoDB
connectDB().then(() => {
  // Start server after successful database connection
  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
}).catch((error) => {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1);
}); 
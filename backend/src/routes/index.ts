import * as express from 'express';
import authRoutes from './auth.routes';

const router = express.default.Router();

router.use('/auth', authRoutes);

export default router; 
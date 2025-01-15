import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const router = express.default.Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router; 
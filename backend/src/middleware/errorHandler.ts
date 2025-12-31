import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  status?: number;
}

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log error for debugging
  console.error('Error handler caught:', {
    message: err.message,
    stack: err.stack,
    status,
    path: req.path,
    method: req.method
  });

  // Return consistent error format matching controller responses
  res.status(status).json({
    success: false,
    error: message
  });
}; 
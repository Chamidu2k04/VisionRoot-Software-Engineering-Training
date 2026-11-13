import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export interface StandardErrorResponse {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<StandardErrorResponse>,
  _next: NextFunction
): void {
  // Handle custom application errors (ValidationError, NotFoundError, etc.)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    const isIdentifierError = err.issues.some((issue) =>
      issue.path.includes('id')
    );

    const details = err.issues.map((issue) => ({
      field: issue.path.join('.') || 'payload',
      issue: issue.message,
    }));

    res.status(400).json({
      error: {
        code: isIdentifierError ? 'INVALID_IDENTIFIER' : 'VALIDATION_ERROR',
        message: isIdentifierError
          ? 'Identifier must be a valid UUID format'
          : 'Validation failed for request payload',
        details,
      },
    });
    return;
  }

  // Handle malformed JSON body syntax error from express.json()
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status: number }).status === 400 &&
    'body' in err
  ) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON in request body',
        details: [],
      },
    });
    return;
  }

  // Log unhandled server errors internally (server console only)
  console.error('[UnhandledServerError]', err);

  // Fallback for all other unhandled runtime exceptions
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: [],
    },
  });
}

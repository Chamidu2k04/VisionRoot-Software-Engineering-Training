export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown[];

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_SERVER_ERROR',
    details: unknown[] = []
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Invalid request payload',
    code = 'VALIDATION_ERROR',
    details: unknown[] = []
  ) {
    super(message, 400, code, details);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = 'Resource not found',
    code = 'NOT_FOUND',
    details: unknown[] = []
  ) {
    super(message, 404, code, details);
  }
}

/**
 * Custom error types for data layer operations
 */

export class DataLayerError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DataLayerError';
  }
}

export class NotFoundError extends DataLayerError {
  constructor(resource: string, id: string, cause?: unknown) {
    super(`${resource} with id ${id} not found`, cause);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends DataLayerError {
  constructor(
    message: string,
    public readonly fields?: Record<string, string>,
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends DataLayerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ConflictError';
  }
}

export class OptimisticLockError extends DataLayerError {
  constructor(resource: string, id: string, cause?: unknown) {
    super(`${resource} with id ${id} was modified by another process`, cause);
    this.name = 'OptimisticLockError';
  }
}

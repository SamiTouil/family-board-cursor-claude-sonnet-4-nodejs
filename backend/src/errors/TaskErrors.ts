import { AppError, ErrorCode } from './AppError';

export class TaskNotFoundError extends AppError {
  constructor() {
    super(ErrorCode.RESOURCE_NOT_FOUND, 'Task not found', 404);
    Object.setPrototypeOf(this, TaskNotFoundError.prototype);
  }
}
export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly path: string;

  constructor(status: number, message: string, path: string, statusText = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.path = path;
  }
}

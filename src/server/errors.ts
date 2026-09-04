export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ResourceNotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} was not found.`);
    this.name = "ResourceNotFoundError";
  }
}

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("DATABASE_URL is not configured.");
    this.name = "DatabaseConfigurationError";
  }
}

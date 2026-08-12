/** Typed API error that can be mapped to a JSON response. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Wrap unexpected errors in a generic 500 with a safe message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    return new ApiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
  return new ApiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}
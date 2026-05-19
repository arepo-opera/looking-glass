/**
 * SDK error classes. All API errors are wrapped in one of these so
 * callers can branch on instanceof rather than inspecting message text.
 *
 *   401 / 403 → AuthenticationError
 *   404       → NotFoundError
 *   429       → RateLimitError
 *   other     → LookingGlassError
 *
 * `code` is the API-provided error code when one was returned in the
 * response body (`{ error: "..." }` shape); `status` is the HTTP status.
 */

export class LookingGlassError extends Error {
  public readonly code?: string;
  public readonly status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "LookingGlassError";
    this.code = code;
    this.status = status;
    // Preserve V8 stack trace if available.
    if ((Error as unknown as { captureStackTrace?: Function })
      .captureStackTrace) {
      (Error as unknown as { captureStackTrace: Function }).captureStackTrace(
        this,
        this.constructor,
      );
    }
  }
}

export class AuthenticationError extends LookingGlassError {
  constructor(message: string, code?: string, status?: number) {
    super(message, code, status);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends LookingGlassError {
  constructor(message: string, code?: string, status?: number) {
    super(message, code, status);
    this.name = "RateLimitError";
  }
}

export class NotFoundError extends LookingGlassError {
  constructor(message: string, code?: string, status?: number) {
    super(message, code, status);
    this.name = "NotFoundError";
  }
}

/**
 * Build the right error class from an HTTP response. Reads the response
 * body to extract `{ error }` if present; falls back to status text.
 */
export async function errorFromResponse(
  res: Response,
): Promise<LookingGlassError> {
  let message = `${res.status} ${res.statusText}`;
  let code: string | undefined;
  try {
    const body = (await res.json()) as { error?: string; code?: string };
    if (body && typeof body.error === "string" && body.error.length > 0) {
      message = body.error;
    }
    if (body && typeof body.code === "string") {
      code = body.code;
    }
  } catch {
    // body wasn't JSON; keep status-text message
  }
  if (res.status === 401 || res.status === 403) {
    return new AuthenticationError(message, code, res.status);
  }
  if (res.status === 404) {
    return new NotFoundError(message, code, res.status);
  }
  if (res.status === 429) {
    return new RateLimitError(message, code, res.status);
  }
  return new LookingGlassError(message, code, res.status);
}

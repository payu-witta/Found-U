declare module 'hono/http-exception' {
  export class HTTPException extends Error {
    constructor(
      status: number,
      options?: { message?: string; res?: Response; cause?: unknown }
    );
    getResponse(): Response;
    readonly status: number;
  }
}

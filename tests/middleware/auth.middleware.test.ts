import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../src/utils/errorHandler.js";

// ---------------------------------------------------------------------------
// Mock JWT
// ---------------------------------------------------------------------------
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildMocks() {
  const req = {
    headers: {} as Record<string, string>,
    // user is intentionally absent here; the middleware sets it
  } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

// ---------------------------------------------------------------------------
// authenticate middleware
// ---------------------------------------------------------------------------
describe("authenticate middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call next() and set req.user when a valid token is provided", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const payload = { id: "user_1", role: "viewer", name: "Alice" };
    vi.mocked(jwt.verify).mockReturnValue(payload as any);

    const { authenticate } = await import("../../src/middleware/auth.middleware.js");
    const { req, res, next } = buildMocks();
    req.headers = { authorization: "Bearer valid.jwt.token" };

    await new Promise<void>((resolve) => {
      const wrappedNext: NextFunction = (...args: unknown[]) => {
        (next as any)(...args);
        resolve();
      };
      authenticate(req, res, wrappedNext);
    });

    expect((req as any).user).toEqual(payload);
    expect(next).toHaveBeenCalledWith(); // called with no args = success
  });

  it("should call next(AppError) when no token is provided", async () => {
    const { authenticate } = await import("../../src/middleware/auth.middleware.js");
    const { req, res, next } = buildMocks();
    req.headers = {};

    await new Promise<void>((resolve) => {
      const wrappedNext: NextFunction = (...args: unknown[]) => {
        (next as any)(...args);
        resolve();
      };
      authenticate(req, res, wrappedNext);
    });

    const callArg = (vi.mocked(next).mock.calls[0] as unknown[])?.[0];
    expect(callArg).toBeInstanceOf(AppError);
    expect((callArg as AppError).statusCode).toBe(401);
  });

  it("should call next(AppError) when an invalid token is provided", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error("JWT error");
    });

    const { authenticate } = await import("../../src/middleware/auth.middleware.js");
    const { req, res, next } = buildMocks();
    req.headers = { authorization: "Bearer bad.token" };

    await new Promise<void>((resolve) => {
      const wrappedNext: NextFunction = (...args: unknown[]) => {
        (next as any)(...args);
        resolve();
      };
      authenticate(req, res, wrappedNext);
    });

    const callArg = (vi.mocked(next).mock.calls[0] as unknown[])?.[0];
    expect(callArg).toBeInstanceOf(AppError);
    expect((callArg as AppError).statusCode).toBe(401);
  });

  it("should extract the token from 'Bearer <token>' format correctly", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    vi.mocked(jwt.verify).mockReturnValue({ id: "x", role: "admin", name: "Y" } as any);

    const { authenticate } = await import("../../src/middleware/auth.middleware.js");
    const { req, res, next } = buildMocks();
    req.headers = { authorization: "Bearer my.special.token" };

    await new Promise<void>((resolve) => {
      const wrappedNext: NextFunction = (...args: unknown[]) => {
        (next as any)(...args);
        resolve();
      };
      authenticate(req, res, wrappedNext);
    });

    expect(jwt.verify).toHaveBeenCalledWith("my.special.token", expect.any(String));
  });
});

// ---------------------------------------------------------------------------
// authorize middleware
// ---------------------------------------------------------------------------
describe("authorize middleware", () => {
  it("should call next() when user has an allowed role", async () => {
    const { authorize } = await import("../../src/middleware/auth.middleware.js");
    const { req, res, next } = buildMocks();
    (req as any).user = { id: "u1", role: "admin", name: "Admin" };

    const middleware = authorize(["admin", "analyst"]);
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("should throw AppError 403 when user role is not allowed", async () => {
    const { authorize } = await import("../../src/middleware/auth.middleware.js");
    const { req, res } = buildMocks();
    (req as any).user = { id: "u2", role: "viewer", name: "Viewer" };

    const middleware = authorize(["admin", "analyst"]);
    let caughtErr: unknown;
    const catchingNext = (err?: unknown) => { caughtErr = err; };

    // authorize throws directly, so wrap in try/catch as Express would
    try {
      middleware(req, res, catchingNext as any);
    } catch (err) {
      caughtErr = err;
    }

    expect(caughtErr).toBeInstanceOf(AppError);
    expect((caughtErr as AppError).statusCode).toBe(403);
  });

  it("should throw AppError 403 when req.user is not set", async () => {
    const { authorize } = await import("../../src/middleware/auth.middleware.js");
    const { req, res } = buildMocks();
    // req.user is intentionally absent

    const middleware = authorize(["admin"]);
    let caughtErr: unknown;
    const noop = (err?: unknown) => { caughtErr = err; };
    try {
      middleware(req, res, noop as any);
    } catch (err) {
      caughtErr = err;
    }

    expect(caughtErr).toBeInstanceOf(AppError);
    expect((caughtErr as AppError).statusCode).toBe(403);
  });
});

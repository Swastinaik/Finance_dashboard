import { describe, it, expect } from "vitest";
import { AppError, errorHandler } from "../../src/utils/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// AppError class
// ---------------------------------------------------------------------------
describe("AppError", () => {
  it("should set message and statusCode", () => {
    const err = new AppError("Something went wrong", 422);
    expect(err.message).toBe("Something went wrong");
    expect(err.statusCode).toBe(422);
  });

  it("should be an instance of Error", () => {
    const err = new AppError("test", 400);
    expect(err).toBeInstanceOf(Error);
  });

  it("should capture a stack trace", () => {
    const err = new AppError("stack test", 500);
    expect(err.stack).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// errorHandler middleware
// ---------------------------------------------------------------------------
describe("errorHandler middleware", () => {
  function buildMocks(nodeEnv?: string): {
    req: Request;
    res: Partial<Response> & { statusCode?: number; body?: unknown };
    next: NextFunction;
    originalEnv: string | undefined;
  } {
    const originalEnv = process.env.NODE_ENV;
    if (nodeEnv !== undefined) process.env.NODE_ENV = nodeEnv;

    const res: any = {
      statusCode: undefined as number | undefined,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: unknown) {
        this.body = data;
        return this;
      },
    };
    const req = {} as Request;
    const next: NextFunction = () => {};

    return { req, res, next, originalEnv };
  }

  it("should respond with statusCode from AppError", () => {
    const { req, res, next } = buildMocks();
    const err = new AppError("Not found", 404);
    errorHandler(err, req, res as Response, next);
    expect(res.statusCode).toBe(404);
    expect((res.body as any).status).toBe("error");
    expect((res.body as any).message).toBe("Not found");
  });

  it("should default to 500 for unknown errors", () => {
    const { req, res, next } = buildMocks();
    const err = new Error("Unexpected");
    errorHandler(err, req, res as Response, next);
    expect(res.statusCode).toBe(500);
  });

  it("should include stack in development mode", () => {
    const { req, res, next, originalEnv } = buildMocks("development");
    const err = new AppError("dev error", 400);
    errorHandler(err, req, res as Response, next);
    expect((res.body as any).stack).toBeDefined();
    process.env.NODE_ENV = originalEnv;
  });

  it("should NOT include stack in production mode", () => {
    const { req, res, next, originalEnv } = buildMocks("production");
    const err = new AppError("prod error", 400);
    errorHandler(err, req, res as Response, next);
    expect((res.body as any).stack).toBeUndefined();
    process.env.NODE_ENV = originalEnv;
  });
});

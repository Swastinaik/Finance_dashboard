import { describe, it, expect } from "vitest";
import { asyncHandler } from "../../src/utils/asyncHandler.js";
import type { Request, Response, NextFunction } from "express";

describe("asyncHandler", () => {
  const mockReq = {} as Request;
  const mockRes = {} as Response;

  it("should call the wrapped async function", async () => {
    let called = false;
    const handler = asyncHandler(async (_req, _res, _next) => {
      called = true;
    });

    await new Promise<void>((resolve) => {
      handler(mockReq, mockRes, () => resolve());
      // For success path, resolve immediately after calling handler
      setTimeout(resolve, 50);
    });

    expect(called).toBe(true);
  });

  it("should forward errors to next()", async () => {
    const error = new Error("Async failure");
    const handler = asyncHandler(async (_req, _res, _next) => {
      throw error;
    });

    await new Promise<void>((resolve) => {
      const next: NextFunction = (err) => {
        expect(err).toBe(error);
        resolve();
      };
      handler(mockReq, mockRes, next);
    });
  });

  it("should not call next when no error is thrown", async () => {
    let nextCalled = false;
    const handler = asyncHandler(async (_req, _res, _next) => {
      // success — do nothing
    });

    await new Promise<void>((resolve) => {
      const next: NextFunction = () => {
        nextCalled = true;
      };
      handler(mockReq, mockRes, next);
      setTimeout(() => {
        expect(nextCalled).toBe(false);
        resolve();
      }, 50);
    });
  });
});

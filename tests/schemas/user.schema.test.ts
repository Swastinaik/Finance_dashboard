import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  userUpdateSchema,
} from "../../src/schemas/user.schema.js";

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------
describe("registerSchema", () => {
  it("should accept valid registration data", () => {
    const result = registerSchema.safeParse({
      name: "alice",
      password: "secret123",
      role: "analyst",
    });
    expect(result.success).toBe(true);
  });

  it("should accept registration without optional role", () => {
    const result = registerSchema.safeParse({
      name: "bob",
      password: "password1",
    });
    expect(result.success).toBe(true);
  });

  it("should fail when name is too short (< 3 chars)", () => {
    const result = registerSchema.safeParse({ name: "ab", password: "secret123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/at least 3/i);
    }
  });

  it("should fail when name is too long (> 50 chars)", () => {
    const result = registerSchema.safeParse({
      name: "a".repeat(51),
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("should fail when password is too short (< 6 chars)", () => {
    const result = registerSchema.safeParse({ name: "alice", password: "123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/at least 6/i);
    }
  });

  it("should fail with an invalid role value", () => {
    const result = registerSchema.safeParse({
      name: "alice",
      password: "secret123",
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("should accept all valid roles", () => {
    for (const role of ["viewer", "analyst", "admin"] as const) {
      const result = registerSchema.safeParse({
        name: "charlie",
        password: "secret123",
        role,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------
describe("loginSchema", () => {
  it("should accept valid login data", () => {
    const result = loginSchema.safeParse({ name: "alice", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("should fail when name is empty", () => {
    const result = loginSchema.safeParse({ name: "", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("should fail when password is empty", () => {
    const result = loginSchema.safeParse({ name: "alice", password: "" });
    expect(result.success).toBe(false);
  });

  it("should fail when name is missing", () => {
    const result = loginSchema.safeParse({ password: "secret" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// userUpdateSchema
// ---------------------------------------------------------------------------
describe("userUpdateSchema", () => {
  it("should accept a valid status update", () => {
    const result = userUpdateSchema.safeParse({ status: "inactive" });
    expect(result.success).toBe(true);
  });

  it("should accept a valid role update", () => {
    const result = userUpdateSchema.safeParse({ role: "admin" });
    expect(result.success).toBe(true);
  });

  it("should accept both fields at once", () => {
    const result = userUpdateSchema.safeParse({ status: "active", role: "viewer" });
    expect(result.success).toBe(true);
  });

  it("should accept an empty object (all fields are optional)", () => {
    const result = userUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should fail with an invalid status value", () => {
    const result = userUpdateSchema.safeParse({ status: "banned" });
    expect(result.success).toBe(false);
  });

  it("should fail with an invalid role value", () => {
    const result = userUpdateSchema.safeParse({ role: "superadmin" });
    expect(result.success).toBe(false);
  });
});

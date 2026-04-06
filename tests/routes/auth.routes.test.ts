import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../setup/app.js";

// ---------------------------------------------------------------------------
// Mock Mongoose models so no real DB connection is needed
// ---------------------------------------------------------------------------
vi.mock("../../src/models/index.js", () => {
  const User = {
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  };
  return { User, Record: {} };
});

// Mock bcrypt so hashing is instant in tests
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}));

// Mock jsonwebtoken
vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock_jwt_token"),
    verify: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const app = createApp();

async function getAdminToken() {
  // We'll directly generate a token representation for tests.
  return "mock_jwt_token";
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
describe("POST /api/auth/register", () => {
  beforeEach(async () => {
    const { User } = await import("../../src/models/index.js");
    vi.mocked(User.findOne).mockResolvedValue(null);
    vi.mocked(User.create).mockResolvedValue({
      _id: "user_id_1",
      name: "alice",
      role: "viewer",
    } as any);
  });

  it("should register a new user successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "alice",
      password: "secret123",
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.user.name).toBe("alice");
  });

  it("should return 400 if name is too short", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "ab",
      password: "secret123",
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });

  it("should return 400 if password is too short", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "validname",
      password: "12",
    });

    expect(res.status).toBe(400);
  });

  it("should return 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).toBe(400);
  });

  it("should return 409 when user already exists", async () => {
    const { User } = await import("../../src/models/index.js");
    vi.mocked(User.findOne).mockResolvedValue({ name: "alice" } as any);

    const res = await request(app).post("/api/auth/register").send({
      name: "alice",
      password: "secret123",
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  const mockUser = {
    _id: "user_id_1",
    name: "alice",
    role: "viewer",
    password_hash: "hashed_password",
  };

  beforeEach(async () => {
    const { User } = await import("../../src/models/index.js");
    const bcrypt = (await import("bcrypt")).default;
    vi.mocked(User.findOne).mockResolvedValue(mockUser as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
  });

  it("should login and return a token", async () => {
    const res = await request(app).post("/api/auth/login").send({
      name: "alice",
      password: "secret123",
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.token).toBe("mock_jwt_token");
    expect(res.body.data.user.name).toBe("alice");
  });

  it("should return 401 when user does not exist", async () => {
    const { User } = await import("../../src/models/index.js");
    vi.mocked(User.findOne).mockResolvedValue(null);

    const res = await request(app).post("/api/auth/login").send({
      name: "ghost",
      password: "secret123",
    });

    expect(res.status).toBe(401);
  });

  it("should return 401 when password is wrong", async () => {
    const bcrypt = (await import("bcrypt")).default;
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const res = await request(app).post("/api/auth/login").send({
      name: "alice",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it("should return 400 when body is empty", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/users/:id  (admin only)
// ---------------------------------------------------------------------------
describe("PATCH /api/auth/users/:id", () => {
  const validId = "6645d4e2a0f3c1001c8e1234";

  beforeEach(async () => {
    const jwt = (await import("jsonwebtoken")).default;
    // Make verify behave as if a valid admin token is passed
    vi.mocked(jwt.verify).mockReturnValue({
      id: "admin_id",
      role: "admin",
      name: "Admin",
    } as any);

    const { User } = await import("../../src/models/index.js");
    vi.mocked(User.findByIdAndUpdate).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: validId,
        name: "alice",
        role: "analyst",
        status: "active",
        updatedAt: new Date(),
      }),
    } as any);
  });

  it("should update user when called by admin", async () => {
    const res = await request(app)
      .patch(`/api/auth/users/${validId}`)
      .set("Authorization", "Bearer mock_jwt_token")
      .send({ role: "analyst" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });

  it("should return 403 when called by non-admin (viewer)", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    vi.mocked(jwt.verify).mockReturnValue({
      id: "viewer_id",
      role: "viewer",
      name: "Viewer",
    } as any);

    const res = await request(app)
      .patch(`/api/auth/users/${validId}`)
      .set("Authorization", "Bearer mock_jwt_token")
      .send({ role: "analyst" });

    expect(res.status).toBe(403);
  });

  it("should return 401 when no token provided", async () => {
    const res = await request(app)
      .patch(`/api/auth/users/${validId}`)
      .send({ role: "analyst" });

    expect(res.status).toBe(401);
  });

  it("should return 404 when user not found", async () => {
    const { User } = await import("../../src/models/index.js");
    vi.mocked(User.findByIdAndUpdate).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as any);

    const res = await request(app)
      .patch(`/api/auth/users/${validId}`)
      .set("Authorization", "Bearer mock_jwt_token")
      .send({ role: "analyst" });

    expect(res.status).toBe(404);
  });

  it("should use mock token", async () => {
    const token = await getAdminToken();
    expect(token).toBe("mock_jwt_token");
  });
});

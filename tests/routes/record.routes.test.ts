import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../setup/app.js";

// ---------------------------------------------------------------------------
// Mock Mongoose models
// ---------------------------------------------------------------------------
vi.mock("../../src/models/index.js", () => {
  const Record = {
    find: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  };
  return { Record, User: {} };
});

// Mock JWT so we can control the decoded payload per-test
vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------
const app = createApp();

/** Sets JWT verify to return the given payload (simulates a logged-in user) */
async function mockUser(payload: { id: string; role: string; name: string }) {
  const jwt = (await import("jsonwebtoken")).default;
  vi.mocked(jwt.verify).mockReturnValue(payload as any);
}

const adminPayload = { id: "6645d4e2a0f3c1001c8e0001", role: "admin", name: "AdminUser" };
const viewerPayload = { id: "6645d4e2a0f3c1001c8e0002", role: "viewer", name: "ViewerUser" };

const VALID_TOKEN = "Bearer valid.jwt.token";

const mockRecords = [
  {
    _id: "rec_1",
    amount: 500,
    type: "income",
    category: "Salary",
    date: new Date("2024-01-01"),
    userId: "user_1",
  },
  {
    _id: "rec_2",
    amount: 100,
    type: "expense",
    category: "Groceries",
    date: new Date("2024-01-05"),
    userId: "user_2",
  },
];

// ---------------------------------------------------------------------------
// GET /api/records — all authenticated users
// ---------------------------------------------------------------------------
describe("GET /api/records", () => {
  /** Builds the chained mock: find().sort().skip().limit() */
  function mockFindChain(records: typeof mockRecords) {
    return {
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(records),
        }),
      }),
    };
  }

  beforeEach(async () => {
    await mockUser(viewerPayload);
    const { Record } = await import("../../src/models/index.js");
    vi.mocked(Record.find).mockReturnValue(mockFindChain(mockRecords) as any);
    vi.mocked(Record.countDocuments).mockResolvedValue(2);
  });

  it("should return records with a pagination envelope", async () => {
    const res = await request(app)
      .get("/api/records")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.records).toHaveLength(2);
    expect(res.body.data.pagination).toMatchObject({
      totalCount: 2,
      totalPages: 1,
      currentPage: 1,
      limit: 10,
    });
  });

  it("should default to page=1 and limit=10 when no query params given", async () => {
    const res = await request(app)
      .get("/api/records")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.currentPage).toBe(1);
    expect(res.body.data.pagination.limit).toBe(10);
  });

  it("should respect custom page and limit query params", async () => {
    const { Record } = await import("../../src/models/index.js");
    vi.mocked(Record.countDocuments).mockResolvedValue(25);
    vi.mocked(Record.find).mockReturnValue(mockFindChain(mockRecords) as any);

    const res = await request(app)
      .get("/api/records?page=2&limit=5")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.currentPage).toBe(2);
    expect(res.body.data.pagination.limit).toBe(5);
    expect(res.body.data.pagination.totalPages).toBe(5); // ceil(25/5)
  });

  it("should clamp page to 1 when page=0 is provided", async () => {
    const res = await request(app)
      .get("/api/records?page=0")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.currentPage).toBe(1);
  });

  it("should clamp limit to 100 when a larger value is provided", async () => {
    const res = await request(app)
      .get("/api/records?limit=999")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(100);
  });

  it("should return 401 without a token", async () => {
    const res = await request(app).get("/api/records");
    expect(res.status).toBe(401);
  });

  it("should return an empty records array and totalCount=0 when no records exist", async () => {
    const { Record } = await import("../../src/models/index.js");
    vi.mocked(Record.find).mockReturnValue(mockFindChain([]) as any);
    vi.mocked(Record.countDocuments).mockResolvedValue(0);

    const res = await request(app)
      .get("/api/records")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.records).toEqual([]);
    expect(res.body.data.pagination.totalCount).toBe(0);
    expect(res.body.data.pagination.totalPages).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// POST /api/records — admin only
// ---------------------------------------------------------------------------
describe("POST /api/records", () => {
  const newRecord = {
    amount: 250,
    type: "expense",
    category: "Utilities",
    notes: "Electric bill",
  };

  const createdRecord = {
    _id: "rec_new",
    ...newRecord,
    userId: "admin_id",
    date: new Date(),
  };

  beforeEach(async () => {
    await mockUser(adminPayload);
    const { Record } = await import("../../src/models/index.js");
    vi.mocked(Record.create).mockResolvedValue(createdRecord as any);
  });

  it("should create a record when called by admin", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", VALID_TOKEN)
      .send(newRecord);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.record.category).toBe("Utilities");
  });

  it("should return 403 when called by a viewer", async () => {
    await mockUser(viewerPayload);

    const res = await request(app)
      .post("/api/records")
      .set("Authorization", VALID_TOKEN)
      .send(newRecord);

    expect(res.status).toBe(403);
  });

  it("should return 400 for invalid payload (missing type)", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", VALID_TOKEN)
      .send({ amount: 100, category: "Food" }); // type missing

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid amount string", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", VALID_TOKEN)
      .send({ amount: "not-a-number", type: "expense", category: "Food" });

    expect(res.status).toBe(400);
  });

  it("should return 401 without a token", async () => {
    const res = await request(app).post("/api/records").send(newRecord);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/records/:id — admin only
// ---------------------------------------------------------------------------
describe("PATCH /api/records/:id", () => {
  const recordId = "6645d4e2a0f3c1001c8e9999";

  beforeEach(async () => {
    await mockUser(adminPayload);
    const { Record } = await import("../../src/models/index.js");
    vi.mocked(Record.findByIdAndUpdate).mockResolvedValue({
      _id: recordId,
      amount: 300,
      type: "income",
      category: "Bonus",
    } as any);
  });

  it("should update a record when called by admin", async () => {
    const res = await request(app)
      .patch(`/api/records/${recordId}`)
      .set("Authorization", VALID_TOKEN)
      .send({ amount: 300, category: "Bonus" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.record.amount).toBe(300);
  });

  it("should return 404 when record not found", async () => {
    const { Record } = await import("../../src/models/index.js");
    vi.mocked(Record.findByIdAndUpdate).mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/records/${recordId}`)
      .set("Authorization", VALID_TOKEN)
      .send({ amount: 300 });

    expect(res.status).toBe(404);
  });

  it("should return 403 when called by viewer", async () => {
    await mockUser(viewerPayload);

    const res = await request(app)
      .patch(`/api/records/${recordId}`)
      .set("Authorization", VALID_TOKEN)
      .send({ amount: 300 });

    expect(res.status).toBe(403);
  });

  it("should return 401 without a token", async () => {
    const res = await request(app)
      .patch(`/api/records/${recordId}`)
      .send({ amount: 300 });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/records/:id — admin only
// ---------------------------------------------------------------------------
describe("DELETE /api/records/:id", () => {
  const recordId = "6645d4e2a0f3c1001c8e8888";

  beforeEach(async () => {
    await mockUser(adminPayload);
    const { Record } = await import("../../src/models/index.js");
    vi.mocked(Record.findByIdAndDelete).mockResolvedValue({ _id: recordId } as any);
  });

  it("should delete a record and return 204", async () => {
    const res = await request(app)
      .delete(`/api/records/${recordId}`)
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(204);
  });

  it("should return 404 when record not found", async () => {
    const { Record } = await import("../../src/models/index.js");
    vi.mocked(Record.findByIdAndDelete).mockResolvedValue(null);

    const res = await request(app)
      .delete(`/api/records/${recordId}`)
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(404);
  });

  it("should return 403 when called by viewer", async () => {
    await mockUser(viewerPayload);

    const res = await request(app)
      .delete(`/api/records/${recordId}`)
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(403);
  });

  it("should return 401 without a token", async () => {
    const res = await request(app).delete(`/api/records/${recordId}`);
    expect(res.status).toBe(401);
  });
});

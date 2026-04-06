import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../setup/app.js";

// ---------------------------------------------------------------------------
// Mock Mongoose models
// ---------------------------------------------------------------------------
vi.mock("../../src/models/index.js", () => {
  const Record = {
    aggregate: vi.fn(),
    find: vi.fn(),
  };
  return { Record, User: {} };
});

// Mock JWT
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

async function mockJwtUser(payload: { id: string; role: string; name: string }) {
  const jwt = (await import("jsonwebtoken")).default;
  vi.mocked(jwt.verify).mockReturnValue(payload as any);
}

const VALID_TOKEN = "Bearer valid.jwt.token";

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------
const mockTotalsRaw = [
  { _id: "income", total: 5000 },
  { _id: "expense", total: 2000 },
];

const mockCategoryTotals = [
  { category: "Salary", type: "income", total: 5000 },
  { category: "Groceries", type: "expense", total: 2000 },
];

const mockRecentActivity = [
  { _id: "rec_1", amount: 5000, type: "income", category: "Salary", date: new Date("2024-06-01") },
  { _id: "rec_2", amount: 2000, type: "expense", category: "Groceries", date: new Date("2024-05-28") },
];

const mockMonthlyTrendsRaw = [
  { _id: { month: "2024-06", type: "income" }, total: 5000 },
  { _id: { month: "2024-06", type: "expense" }, total: 2000 },
  { _id: { month: "2024-05", type: "income" }, total: 3000 },
];

// ---------------------------------------------------------------------------
// GET /api/summary — admin and analyst only
// ---------------------------------------------------------------------------
describe("GET /api/summary", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { Record } = await import("../../src/models/index.js");

    // aggregate is called 3 times: totals, categoryTotals, monthlyTrends
    vi.mocked(Record.aggregate)
      .mockResolvedValueOnce(mockTotalsRaw)
      .mockResolvedValueOnce(mockCategoryTotals)
      .mockResolvedValueOnce(mockMonthlyTrendsRaw);

    vi.mocked(Record.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(mockRecentActivity),
      }),
    } as any);
  });

  it("should return financial summary for admin", async () => {
    await mockJwtUser({ id: "admin_id", role: "admin", name: "Admin" });

    const res = await request(app)
      .get("/api/summary")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");

    const { summary, categoryTotals, recentActivity, monthlyTrends } = res.body.data;
    expect(summary.totalIncome).toBe(5000);
    expect(summary.totalExpenses).toBe(2000);
    expect(summary.netBalance).toBe(3000);
    expect(categoryTotals).toHaveLength(2);
    expect(recentActivity).toHaveLength(2);
    expect(monthlyTrends).toHaveLength(2); // 2024-06 and 2024-05
  });

  it("should return financial summary for analyst", async () => {
    await mockJwtUser({ id: "analyst_id", role: "analyst", name: "Analyst" });

    const res = await request(app)
      .get("/api/summary")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
  });

  it("should return 403 for viewer role", async () => {
    await mockJwtUser({ id: "viewer_id", role: "viewer", name: "Viewer" });

    const res = await request(app)
      .get("/api/summary")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(403);
  });

  it("should return 401 without a token", async () => {
    const res = await request(app).get("/api/summary");
    expect(res.status).toBe(401);
  });

  it("should calculate net balance correctly (income - expenses)", async () => {
    await mockJwtUser({ id: "admin_id", role: "admin", name: "Admin" });

    const res = await request(app)
      .get("/api/summary")
      .set("Authorization", VALID_TOKEN);

    const { summary } = res.body.data;
    expect(summary.netBalance).toBe(summary.totalIncome - summary.totalExpenses);
  });

  it("should return 0 for totals when no records exist", async () => {
    await mockJwtUser({ id: "admin_id", role: "admin", name: "Admin" });

    const { Record } = await import("../../src/models/index.js");
    // Reset any queued values from beforeEach so only our empty arrays are returned
    vi.mocked(Record.aggregate).mockReset();
    vi.mocked(Record.aggregate)
      .mockResolvedValueOnce([]) // totals
      .mockResolvedValueOnce([]) // categoryTotals
      .mockResolvedValueOnce([]); // monthlyTrends

    vi.mocked(Record.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const res = await request(app)
      .get("/api/summary")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    const { summary } = res.body.data;
    expect(summary.totalIncome).toBe(0);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.netBalance).toBe(0);
  });

  it("should group monthly trends correctly from raw aggregate data", async () => {
    await mockJwtUser({ id: "admin_id", role: "admin", name: "Admin" });

    const res = await request(app)
      .get("/api/summary")
      .set("Authorization", VALID_TOKEN);

    const { monthlyTrends } = res.body.data;
    const june = monthlyTrends.find((t: any) => t.month === "2024-06");
    expect(june).toBeDefined();
    expect(june.income).toBe(5000);
    expect(june.expense).toBe(2000);

    const may = monthlyTrends.find((t: any) => t.month === "2024-05");
    expect(may).toBeDefined();
    expect(may.income).toBe(3000);
    expect(may.expense).toBe(0); // no expense entry for May
  });
});

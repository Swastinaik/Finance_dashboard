import { describe, it, expect } from "vitest";
import {
  recordCreateSchema,
  recordUpdateSchema,
} from "../../src/schemas/record.schema.js";

// ---------------------------------------------------------------------------
// recordCreateSchema
// ---------------------------------------------------------------------------
describe("recordCreateSchema", () => {
  it("should accept valid record with numeric amount", () => {
    const result = recordCreateSchema.safeParse({
      amount: 100,
      type: "income",
      category: "Salary",
    });
    expect(result.success).toBe(true);
  });

  it("should accept amount as a valid string number", () => {
    const result = recordCreateSchema.safeParse({
      amount: "49.99",
      type: "expense",
      category: "Groceries",
    });
    expect(result.success).toBe(true);
  });

  it("should accept all optional fields", () => {
    const result = recordCreateSchema.safeParse({
      amount: 200.5,
      type: "income",
      category: "Freelance",
      date: "2024-01-15",
      notes: "January payment",
    });
    expect(result.success).toBe(true);
  });

  it("should fail when amount is not a valid string pattern", () => {
    const result = recordCreateSchema.safeParse({
      amount: "abc",
      type: "income",
      category: "Salary",
    });
    expect(result.success).toBe(false);
  });

  it("should fail when type is invalid", () => {
    const result = recordCreateSchema.safeParse({
      amount: 100,
      type: "loan",
      category: "Bank",
    });
    expect(result.success).toBe(false);
  });

  it("should fail when category is empty", () => {
    const result = recordCreateSchema.safeParse({
      amount: 100,
      type: "expense",
      category: "",
    });
    expect(result.success).toBe(false);
  });

  it("should fail when amount is missing", () => {
    const result = recordCreateSchema.safeParse({
      type: "expense",
      category: "Food",
    });
    expect(result.success).toBe(false);
  });

  it("should transform a valid date string into a Date object", () => {
    const result = recordCreateSchema.safeParse({
      amount: 50,
      type: "expense",
      category: "Bills",
      date: "2024-06-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBeInstanceOf(Date);
    }
  });

  it("should produce undefined date when date field is omitted", () => {
    const result = recordCreateSchema.safeParse({
      amount: 50,
      type: "expense",
      category: "Bills",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBeUndefined();
    }
  });

  it("should accept both 'income' and 'expense' types", () => {
    for (const type of ["income", "expense"] as const) {
      const result = recordCreateSchema.safeParse({
        amount: 1,
        type,
        category: "Test",
      });
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// recordUpdateSchema (partial of create)
// ---------------------------------------------------------------------------
describe("recordUpdateSchema", () => {
  it("should accept a partial update (only amount)", () => {
    const result = recordUpdateSchema.safeParse({ amount: 500 });
    expect(result.success).toBe(true);
  });

  it("should accept a partial update (only type)", () => {
    const result = recordUpdateSchema.safeParse({ type: "expense" });
    expect(result.success).toBe(true);
  });

  it("should accept an empty object (all fields optional)", () => {
    const result = recordUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should fail with invalid type in partial update", () => {
    const result = recordUpdateSchema.safeParse({ type: "refund" });
    expect(result.success).toBe(false);
  });
});

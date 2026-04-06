import type { Request, Response } from "express";
import { Record } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getFinancialSummary = asyncHandler(async (req: Request, res: Response) => {
  // 1. Total Income and Expenses
  const totalsRaw = await Record.aggregate([
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const totalIncome = totalsRaw.find((t) => t._id === "income")?.total ?? 0;
  const totalExpenses = totalsRaw.find((t) => t._id === "expense")?.total ?? 0;
  const netBalance = totalIncome - totalExpenses;

  // 2. Category-wise Totals
  const categoryTotals = await Record.aggregate([
    {
      $group: {
        _id: { category: "$category", type: "$type" },
        total: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id.category",
        type: "$_id.type",
        total: 1,
      },
    },
  ]);

  // 3. Recent Activity (Latest 5 records)
  const recentActivity = await Record.find().sort({ date: -1 }).limit(5);

  // 4. Monthly Trend (Income vs Expenses over time)
  const monthlyTrendsRaw = await Record.aggregate([
    {
      $group: {
        _id: {
          month: { $dateToString: { format: "%Y-%m", date: "$date" } },
          type: "$type",
        },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.month": -1 } },
  ]);

  // Transform trends for easier frontend usage
  const monthlyTrendsMap: Record<string, { income: number; expense: number }> = {};
  monthlyTrendsRaw.forEach((item) => {
    const month: string = item._id.month;
    if (!monthlyTrendsMap[month]) {
      monthlyTrendsMap[month] = { income: 0, expense: 0 };
    }
    if (item._id.type === "income") monthlyTrendsMap[month]!.income = item.total;
    if (item._id.type === "expense") monthlyTrendsMap[month]!.expense = item.total;
  });

  const monthlyTrends = Object.entries(monthlyTrendsMap).map(([month, values]) => ({
    month,
    ...values,
  }));

  res.status(200).json({
    status: "success",
    data: {
      summary: {
        totalIncome,
        totalExpenses,
        netBalance,
      },
      categoryTotals,
      recentActivity,
      monthlyTrends,
    },
  });
});

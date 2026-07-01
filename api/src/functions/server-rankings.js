const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function rankRows(rows, sortKey, direction = "desc", limit = 10) {
  const sorted = [...rows].sort((a, b) => {
    const av = Number(a[sortKey] || 0);
    const bv = Number(b[sortKey] || 0);

    return direction === "desc" ? bv - av : av - bv;
  });

  return sorted.slice(0, limit).map((row, index) => ({
    rank: index + 1,
    year: row.year ? toNumber(row.year) : null,
    serverEmpId: toNumber(row.server_emp_id),
    serverName: `${row.server_first_name || ""} ${row.server_last_name || ""}`.trim(),
    restaurantName: row.restaurant_name,
    visitCount: toNumber(row.visit_count),
    totalRevenue: toNumber(row.total_revenue),
    totalTips: toNumber(row.total_tips),
    averageTipPercent: toNumber(row.avg_tip_percent)
  }));
}

function buildYearRange(rows) {
  const years = rows.map((row) => Number(row.year)).filter(Boolean);

  if (years.length === 0) {
    return [];
  }

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const result = [];

  for (let year = minYear; year <= maxYear; year++) {
    result.push(year);
  }

  return result;
}

app.http("server-rankings", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "server-rankings",
  handler: async (request, context) => {
    try {
      const yearlyRows = await query(`
        SELECT
          YEAR(v.visit_date) AS year,
          s.server_emp_id,
          s.server_first_name,
          s.server_last_name,
          r.restaurant_name,
          COUNT(v.visit_id) AS visit_count,
          SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)) AS total_revenue,
          SUM(COALESCE(v.tip_amount, 0)) AS total_tips,
          ROUND(
            100 * SUM(COALESCE(v.tip_amount, 0))
            / NULLIF(SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)), 0),
            2
          ) AS avg_tip_percent
        FROM visits v
        JOIN servers s
          ON v.server_emp_id = s.server_emp_id
        LEFT JOIN restaurants r
          ON s.restaurant_id = r.restaurant_id
        WHERE v.server_emp_id IS NOT NULL
          AND v.visit_date IS NOT NULL
        GROUP BY
          YEAR(v.visit_date),
          s.server_emp_id,
          s.server_first_name,
          s.server_last_name,
          r.restaurant_name
        HAVING COUNT(v.visit_id) > 0
      `);

      const allTimeRows = await query(`
        SELECT
          s.server_emp_id,
          s.server_first_name,
          s.server_last_name,
          r.restaurant_name,
          COUNT(v.visit_id) AS visit_count,
          SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)) AS total_revenue,
          SUM(COALESCE(v.tip_amount, 0)) AS total_tips,
          ROUND(
            100 * SUM(COALESCE(v.tip_amount, 0))
            / NULLIF(SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)), 0),
            2
          ) AS avg_tip_percent
        FROM visits v
        JOIN servers s
          ON v.server_emp_id = s.server_emp_id
        LEFT JOIN restaurants r
          ON s.restaurant_id = r.restaurant_id
        WHERE v.server_emp_id IS NOT NULL
        GROUP BY
          s.server_emp_id,
          s.server_first_name,
          s.server_last_name,
          r.restaurant_name
        HAVING COUNT(v.visit_id) > 0
      `);

      const years = buildYearRange(yearlyRows);
      const yearly = yearlyRows.map((row) => ({
        year: toNumber(row.year),
        serverEmpId: toNumber(row.server_emp_id),
        serverName: `${row.server_first_name || ""} ${row.server_last_name || ""}`.trim(),
        restaurantName: row.restaurant_name,
        visitCount: toNumber(row.visit_count),
        totalRevenue: toNumber(row.total_revenue),
        totalTips: toNumber(row.total_tips),
        averageTipPercent: toNumber(row.avg_tip_percent)
      }));

      const data = {
        years,
        yearly,
        revenueRanking: rankRows(allTimeRows, "total_revenue", "desc", 10),
        visitCountRanking: rankRows(allTimeRows, "visit_count", "desc", 10),
        averageTipPercentRanking: rankRows(allTimeRows, "avg_tip_percent", "desc", 10),
        formulas: {
          revenue: "food_bill + alcohol_bill",
          averageTipPercent: "total tips / total revenue"
        },
        sensitiveFieldsExcluded: [
          "ssn",
          "birth_date",
          "hourly_rate",
          "customer_email",
          "customer_phone"
        ]
      };

      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: true,
          data,
          time: new Date().toISOString()
        })
      };
    } catch (error) {
      context.error(error);

      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          message: "Server rankings query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

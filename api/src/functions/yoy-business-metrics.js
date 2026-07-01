const { app } = require("@azure/functions");
const { query } = require("../db");

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function buildYearRange(rows) {
  const years = rows.map((row) => Number(row.visit_year)).filter(Boolean);

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

app.http("yoy-business-metrics", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "yoy-business-metrics",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          YEAR(visit_date) AS visit_year,
          MONTH(visit_date) AS visit_month,
          COUNT(*) AS total_visits,
          SUM(COALESCE(food_bill, 0) + COALESCE(alcohol_bill, 0)) AS total_revenue,
          ROUND(
            SUM(COALESCE(food_bill, 0) + COALESCE(alcohol_bill, 0)) / NULLIF(COUNT(*), 0),
            2
          ) AS avg_revenue_per_visit,
          ROUND(AVG(wait_time), 2) AS avg_wait_time
        FROM visits
        WHERE visit_date IS NOT NULL
        GROUP BY
          YEAR(visit_date),
          MONTH(visit_date)
        ORDER BY
          YEAR(visit_date),
          MONTH(visit_date)
      `);

      const years = buildYearRange(rows);
      const rowMap = new Map();

      for (const row of rows) {
        rowMap.set(`${row.visit_year}-${row.visit_month}`, row);
      }

      const monthly = [];

      for (const year of years) {
        for (let month = 1; month <= 12; month++) {
          const row = rowMap.get(`${year}-${month}`);

          monthly.push({
            year,
            month,
            monthLabel: MONTH_LABELS[month - 1],
            totalRevenue: row ? toNumber(row.total_revenue) : 0,
            totalVisits: row ? toNumber(row.total_visits) : 0,
            averageRevenuePerVisit: row ? toNumber(row.avg_revenue_per_visit) : null,
            averageWaitTime: row ? toNumber(row.avg_wait_time) : null
          });
        }
      }

      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: true,
          data: {
            years,
            months: MONTH_LABELS,
            monthly,
            revenueDefinition: "food_bill + alcohol_bill"
          },
          rowCount: monthly.length,
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
          message: "YOY business metrics query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

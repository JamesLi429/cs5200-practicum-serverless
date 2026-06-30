const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function toYearMonth(year, month) {
  const y = Number(year);
  const m = String(Number(month)).padStart(2, "0");

  return `${y}-${m}`;
}

app.http("monthly-trends", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "monthly-trends",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          YEAR(visit_date) AS visit_year,
          MONTH(visit_date) AS visit_month,
          COUNT(*) AS visit_count,
          SUM(food_bill) AS food_sales,
          SUM(alcohol_bill) AS alcohol_sales,
          SUM(food_bill + alcohol_bill) AS total_sales,
          SUM(tip_amount) AS total_tips,
          ROUND(AVG(party_size), 2) AS avg_party_size,
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

      const data = rows.map((row) => ({
        year: toNumber(row.visit_year),
        month: toNumber(row.visit_month),
        yearMonth: toYearMonth(row.visit_year, row.visit_month),
        visitCount: toNumber(row.visit_count),
        foodSales: toNumber(row.food_sales),
        alcoholSales: toNumber(row.alcohol_sales),
        totalSales: toNumber(row.total_sales),
        totalTips: toNumber(row.total_tips),
        averagePartySize: toNumber(row.avg_party_size),
        averageWaitTime: toNumber(row.avg_wait_time)
      }));

      return {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ok: true,
          data,
          rowCount: data.length,
          time: new Date().toISOString()
        })
      };
    } catch (error) {
      context.error(error);

      return {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ok: false,
          message: "Monthly trends query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});
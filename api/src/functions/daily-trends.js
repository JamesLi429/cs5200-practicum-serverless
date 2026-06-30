const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

app.http("daily-trends", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "daily-trends",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          CAST(visit_date AS CHAR) AS visit_date,
          COUNT(*) AS visit_count,
          SUM(COALESCE(food_bill, 0)) AS food_sales,
          SUM(COALESCE(alcohol_bill, 0)) AS alcohol_sales,
          SUM(COALESCE(food_bill, 0) + COALESCE(alcohol_bill, 0)) AS total_sales,
          SUM(COALESCE(tip_amount, 0)) AS total_tips,
          ROUND(AVG(party_size), 2) AS avg_party_size,
          ROUND(AVG(wait_time), 2) AS avg_wait_time
        FROM visits
        WHERE visit_date IS NOT NULL
        GROUP BY
          visit_date
        ORDER BY
          visit_date
      `);

      const data = rows.map((row) => ({
        visitDate: row.visit_date,
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
          message: "Daily trends query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

app.http("summary", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "summary",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          COUNT(*) AS total_visits,
          DATE_FORMAT(MIN(visit_date), '%Y-%m-%d') AS first_visit_date,
          DATE_FORMAT(MAX(visit_date), '%Y-%m-%d') AS last_visit_date,
          SUM(food_bill) AS total_food_sales,
          SUM(alcohol_bill) AS total_alcohol_sales,
          SUM(food_bill + alcohol_bill) AS total_sales,
          SUM(tip_amount) AS total_tips,
          ROUND(AVG(party_size), 2) AS avg_party_size,
          ROUND(AVG(wait_time), 2) AS avg_wait_time,
          SUM(CASE WHEN ordered_alcohol = 1 THEN 1 ELSE 0 END) AS alcohol_visit_count
        FROM visits
      `);

      const row = rows[0];

      return {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ok: true,
          data: {
            totalVisits: toNumber(row.total_visits),
            firstVisitDate: row.first_visit_date,
            lastVisitDate: row.last_visit_date,
            totalFoodSales: toNumber(row.total_food_sales),
            totalAlcoholSales: toNumber(row.total_alcohol_sales),
            totalSales: toNumber(row.total_sales),
            totalTips: toNumber(row.total_tips),
            averagePartySize: toNumber(row.avg_party_size),
            averageWaitTime: toNumber(row.avg_wait_time),
            alcoholVisitCount: toNumber(row.alcohol_visit_count)
          },
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
          message: "Summary query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});
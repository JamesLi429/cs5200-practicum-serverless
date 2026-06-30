const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

app.http("loyalty-summary", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "loyalty-summary",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          CASE
            WHEN v.cust_id IS NULL THEN 'Anonymous / Unknown'
            WHEN c.loyalty_member = 1 THEN 'Loyalty Member'
            ELSE 'Non-Loyalty Member'
          END AS loyalty_status,
          COUNT(v.visit_id) AS visit_count,
          SUM(COALESCE(v.food_bill, 0)) AS food_sales,
          SUM(COALESCE(v.alcohol_bill, 0)) AS alcohol_sales,
          SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)) AS total_sales,
          SUM(COALESCE(v.tip_amount, 0)) AS total_tips,
          ROUND(AVG(v.party_size), 2) AS avg_party_size,
          ROUND(AVG(v.wait_time), 2) AS avg_wait_time
        FROM visits v
        LEFT JOIN customers c
          ON v.cust_id = c.cust_id
        GROUP BY
          CASE
            WHEN v.cust_id IS NULL THEN 'Anonymous / Unknown'
            WHEN c.loyalty_member = 1 THEN 'Loyalty Member'
            ELSE 'Non-Loyalty Member'
          END
        ORDER BY
          total_sales DESC,
          visit_count DESC
      `);

      const data = rows.map((row) => ({
        loyaltyStatus: row.loyalty_status,
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
          message: "Loyalty summary query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

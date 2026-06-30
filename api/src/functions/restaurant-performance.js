const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

app.http("restaurant-performance", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "restaurant-performance",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          r.restaurant_id,
          r.restaurant_name,
          r.city,
          r.state,
          r.has_table_service,
          COUNT(v.visit_id) AS visit_count,
          SUM(v.food_bill) AS food_sales,
          SUM(v.alcohol_bill) AS alcohol_sales,
          SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)) AS total_sales,
          SUM(v.tip_amount) AS total_tips,
          ROUND(AVG(v.party_size), 2) AS avg_party_size,
          ROUND(AVG(v.wait_time), 2) AS avg_wait_time
        FROM restaurants r
        LEFT JOIN visits v
          ON r.restaurant_id = v.restaurant_id
        GROUP BY
          r.restaurant_id,
          r.restaurant_name,
          r.city,
          r.state,
          r.has_table_service
        ORDER BY
          total_sales DESC,
          visit_count DESC
      `);

      const data = rows.map((row) => ({
        restaurantId: toNumber(row.restaurant_id),
        restaurantName: row.restaurant_name,
        city: row.city,
        state: row.state,
        hasTableService: Boolean(Number(row.has_table_service)),
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
          message: "Restaurant performance query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});
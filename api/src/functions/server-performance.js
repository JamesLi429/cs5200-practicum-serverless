const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

app.http("server-performance", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "server-performance",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          s.server_emp_id,
          s.server_first_name,
          s.server_last_name,
          r.restaurant_id,
          r.restaurant_name,
          COUNT(v.visit_id) AS visit_count,
          SUM(COALESCE(v.food_bill, 0)) AS food_sales,
          SUM(COALESCE(v.alcohol_bill, 0)) AS alcohol_sales,
          SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)) AS total_sales,
          SUM(COALESCE(v.tip_amount, 0)) AS total_tips,
          ROUND(SUM(COALESCE(v.tip_amount, 0)) / NULLIF(COUNT(v.visit_id), 0), 2) AS avg_tip_per_visit,
          ROUND(AVG(v.wait_time), 2) AS avg_wait_time
        FROM servers s
        INNER JOIN restaurants r
          ON s.restaurant_id = r.restaurant_id
        LEFT JOIN visits v
          ON s.server_emp_id = v.server_emp_id
         AND s.restaurant_id = v.restaurant_id
        GROUP BY
          s.server_emp_id,
          s.server_first_name,
          s.server_last_name,
          r.restaurant_id,
          r.restaurant_name
        ORDER BY
          total_sales DESC,
          visit_count DESC,
          s.server_emp_id
      `);

      const data = rows.map((row) => ({
        serverEmployeeId: toNumber(row.server_emp_id),
        serverFirstName: row.server_first_name,
        serverLastName: row.server_last_name,
        restaurantId: toNumber(row.restaurant_id),
        restaurantName: row.restaurant_name,
        visitCount: toNumber(row.visit_count),
        foodSales: toNumber(row.food_sales),
        alcoholSales: toNumber(row.alcohol_sales),
        totalSales: toNumber(row.total_sales),
        totalTips: toNumber(row.total_tips),
        averageTipPerVisit: toNumber(row.avg_tip_per_visit),
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
          message: "Server performance query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

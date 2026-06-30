const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

app.http("meal-type-performance", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "meal-type-performance",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          mt.meal_type_id,
          mt.meal_type,
          COUNT(v.visit_id) AS visit_count,
          SUM(COALESCE(v.food_bill, 0)) AS food_sales,
          SUM(COALESCE(v.alcohol_bill, 0)) AS alcohol_sales,
          SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)) AS total_sales,
          SUM(COALESCE(v.tip_amount, 0)) AS total_tips,
          ROUND(AVG(v.party_size), 2) AS avg_party_size,
          ROUND(AVG(v.wait_time), 2) AS avg_wait_time
        FROM mealtypes mt
        LEFT JOIN visits v
          ON mt.meal_type_id = v.meal_type_id
        GROUP BY
          mt.meal_type_id,
          mt.meal_type
        ORDER BY
          total_sales DESC,
          visit_count DESC,
          mt.meal_type_id
      `);

      const data = rows.map((row) => ({
        mealTypeId: toNumber(row.meal_type_id),
        mealType: row.meal_type,
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
          message: "Meal type performance query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

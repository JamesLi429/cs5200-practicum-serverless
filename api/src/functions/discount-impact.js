const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

app.http("discount-impact", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "discount-impact",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          CASE
            WHEN food_discount_pct = 0 THEN 'No Discount'
            WHEN food_discount_pct > 0 AND food_discount_pct <= 0.10 THEN '0% to 10%'
            WHEN food_discount_pct > 0.10 AND food_discount_pct <= 0.20 THEN '10% to 20%'
            ELSE 'More than 20%'
          END AS discount_group,
          CASE
            WHEN food_discount_pct = 0 THEN 1
            WHEN food_discount_pct > 0 AND food_discount_pct <= 0.10 THEN 2
            WHEN food_discount_pct > 0.10 AND food_discount_pct <= 0.20 THEN 3
            ELSE 4
          END AS discount_sort,
          COUNT(*) AS visit_count,
          ROUND(AVG(food_discount_pct) * 100, 2) AS avg_discount_percentage,
          SUM(COALESCE(food_bill, 0)) AS food_sales,
          SUM(COALESCE(alcohol_bill, 0)) AS alcohol_sales,
          SUM(COALESCE(food_bill, 0) + COALESCE(alcohol_bill, 0)) AS total_sales,
          SUM(COALESCE(tip_amount, 0)) AS total_tips,
          ROUND(AVG(party_size), 2) AS avg_party_size
        FROM visits
        GROUP BY
          CASE
            WHEN food_discount_pct = 0 THEN 'No Discount'
            WHEN food_discount_pct > 0 AND food_discount_pct <= 0.10 THEN '0% to 10%'
            WHEN food_discount_pct > 0.10 AND food_discount_pct <= 0.20 THEN '10% to 20%'
            ELSE 'More than 20%'
          END,
          CASE
            WHEN food_discount_pct = 0 THEN 1
            WHEN food_discount_pct > 0 AND food_discount_pct <= 0.10 THEN 2
            WHEN food_discount_pct > 0.10 AND food_discount_pct <= 0.20 THEN 3
            ELSE 4
          END
        ORDER BY
          discount_sort
      `);

      const data = rows.map((row) => ({
        discountGroup: row.discount_group,
        visitCount: toNumber(row.visit_count),
        averageDiscountPercentage: toNumber(row.avg_discount_percentage),
        foodSales: toNumber(row.food_sales),
        alcoholSales: toNumber(row.alcohol_sales),
        totalSales: toNumber(row.total_sales),
        totalTips: toNumber(row.total_tips),
        averagePartySize: toNumber(row.avg_party_size)
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
          message: "Discount impact query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

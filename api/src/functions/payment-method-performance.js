const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

app.http("payment-method-performance", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "payment-method-performance",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          pm.payment_method_id,
          pm.payment_method,
          COUNT(v.visit_id) AS visit_count,
          SUM(COALESCE(v.food_bill, 0)) AS food_sales,
          SUM(COALESCE(v.alcohol_bill, 0)) AS alcohol_sales,
          SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)) AS total_sales,
          SUM(COALESCE(v.tip_amount, 0)) AS total_tips,
          ROUND(AVG(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)), 2) AS avg_transaction_value
        FROM paymentmethods pm
        LEFT JOIN visits v
          ON pm.payment_method_id = v.payment_method_id
        GROUP BY
          pm.payment_method_id,
          pm.payment_method
        ORDER BY
          total_sales DESC,
          visit_count DESC,
          pm.payment_method_id
      `);

      const data = rows.map((row) => ({
        paymentMethodId: toNumber(row.payment_method_id),
        paymentMethod: row.payment_method,
        visitCount: toNumber(row.visit_count),
        foodSales: toNumber(row.food_sales),
        alcoholSales: toNumber(row.alcohol_sales),
        totalSales: toNumber(row.total_sales),
        totalTips: toNumber(row.total_tips),
        averageTransactionValue: toNumber(row.avg_transaction_value)
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
          message: "Payment method performance query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

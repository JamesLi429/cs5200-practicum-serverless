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

app.http("alcohol-trends", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "alcohol-trends",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          YEAR(visit_date) AS visit_year,
          MONTH(visit_date) AS visit_month,
          SUM(CASE WHEN ordered_alcohol = 1 THEN 1 ELSE 0 END) AS alcohol_visit_count,
          SUM(CASE WHEN ordered_alcohol = 1 THEN 0 ELSE 1 END) AS non_alcohol_visit_count,
          SUM(COALESCE(alcohol_bill, 0)) AS alcohol_sales,
          SUM(COALESCE(food_bill, 0) + COALESCE(alcohol_bill, 0)) AS total_sales,
          ROUND(
            100 * SUM(COALESCE(alcohol_bill, 0)) /
            NULLIF(SUM(COALESCE(food_bill, 0) + COALESCE(alcohol_bill, 0)), 0),
            2
          ) AS alcohol_sales_percentage
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
        alcoholVisitCount: toNumber(row.alcohol_visit_count),
        nonAlcoholVisitCount: toNumber(row.non_alcohol_visit_count),
        alcoholSales: toNumber(row.alcohol_sales),
        totalSales: toNumber(row.total_sales),
        alcoholSalesPercentage: toNumber(row.alcohol_sales_percentage)
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
          message: "Alcohol trends query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

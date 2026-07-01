const { app } = require("@azure/functions");
const { query } = require("../db");

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function buildYearRange(rows) {
  const years = rows.map((row) => Number(row.visit_year)).filter(Boolean);

  if (years.length === 0) {
    return [];
  }

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const result = [];

  for (let year = minYear; year <= maxYear; year++) {
    result.push(year);
  }

  return result;
}

app.http("restaurant-revenue-yoy", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "restaurant-revenue-yoy",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          YEAR(v.visit_date) AS visit_year,
          MONTH(v.visit_date) AS visit_month,
          r.restaurant_id,
          r.restaurant_name,
          SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)) AS total_revenue
        FROM visits v
        JOIN restaurants r
          ON v.restaurant_id = r.restaurant_id
        WHERE v.visit_date IS NOT NULL
        GROUP BY
          YEAR(v.visit_date),
          MONTH(v.visit_date),
          r.restaurant_id,
          r.restaurant_name
        ORDER BY
          YEAR(v.visit_date),
          MONTH(v.visit_date),
          r.restaurant_name
      `);

      const years = buildYearRange(rows);
      const restaurantMap = new Map();

      for (const row of rows) {
        restaurantMap.set(String(row.restaurant_id), {
          restaurantId: toNumber(row.restaurant_id),
          restaurantName: row.restaurant_name
        });
      }

      const restaurants = Array.from(restaurantMap.values())
        .sort((a, b) => a.restaurantName.localeCompare(b.restaurantName));

      const rowMap = new Map();

      for (const row of rows) {
        rowMap.set(`${row.visit_year}-${row.visit_month}-${row.restaurant_id}`, row);
      }

      const monthly = [];

      for (const year of years) {
        for (let month = 1; month <= 12; month++) {
          const restaurantRevenue = {};

          for (const restaurant of restaurants) {
            const row = rowMap.get(`${year}-${month}-${restaurant.restaurantId}`);
            restaurantRevenue[restaurant.restaurantId] = row ? toNumber(row.total_revenue) : 0;
          }

          monthly.push({
            year,
            month,
            monthLabel: MONTH_LABELS[month - 1],
            restaurantRevenue
          });
        }
      }

      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: true,
          data: {
            years,
            months: MONTH_LABELS,
            restaurants,
            monthly,
            chartType: "stacked-column",
            revenueDefinition: "food_bill + alcohol_bill"
          },
          rowCount: monthly.length,
          time: new Date().toISOString()
        })
      };
    } catch (error) {
      context.error(error);

      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          message: "Restaurant revenue YOY query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

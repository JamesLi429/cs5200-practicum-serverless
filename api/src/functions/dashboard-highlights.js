const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function percentChange(currentValue, previousValue) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);

  if (previous === 0) {
    return null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function byYear(rows, year) {
  return rows.find((row) => Number(row.visit_year) === Number(year)) || null;
}

app.http("dashboard-highlights", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "dashboard-highlights",
  handler: async (request, context) => {
    try {
      const rangeRows = await query(`
        SELECT
          YEAR(MAX(visit_date)) AS latest_year,
          MONTH(MAX(visit_date)) AS latest_month,
          DATE_FORMAT(MAX(visit_date), '%Y-%m-%d') AS data_last_updated
        FROM visits
        WHERE visit_date IS NOT NULL
      `);

      const range = rangeRows[0];

      if (!range || !range.latest_year || !range.latest_month) {
        return {
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ok: true,
            data: null,
            message: "No visit data is available.",
            time: new Date().toISOString()
          })
        };
      }

      const latestYear = Number(range.latest_year);
      const comparisonYear = latestYear - 1;
      const latestMonth = Number(range.latest_month);

      const yearRows = await query(`
        SELECT
          YEAR(visit_date) AS visit_year,
          COUNT(*) AS total_visits,
          SUM(COALESCE(food_bill, 0) + COALESCE(alcohol_bill, 0)) AS total_revenue,
          ROUND(
            SUM(COALESCE(food_bill, 0) + COALESCE(alcohol_bill, 0)) / NULLIF(COUNT(*), 0),
            2
          ) AS avg_revenue_per_visit,
          ROUND(AVG(wait_time), 2) AS avg_wait_time
        FROM visits
        WHERE visit_date IS NOT NULL
          AND YEAR(visit_date) IN (?, ?)
          AND MONTH(visit_date) <= ?
        GROUP BY YEAR(visit_date)
      `, [comparisonYear, latestYear, latestMonth]);

      const latest = byYear(yearRows, latestYear);
      const previous = byYear(yearRows, comparisonYear);

      const restaurantRows = await query(`
        SELECT
          r.restaurant_id,
          r.restaurant_name,
          YEAR(v.visit_date) AS visit_year,
          SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)) AS total_revenue
        FROM visits v
        JOIN restaurants r
          ON v.restaurant_id = r.restaurant_id
        WHERE v.visit_date IS NOT NULL
          AND YEAR(v.visit_date) IN (?, ?)
          AND MONTH(v.visit_date) <= ?
        GROUP BY
          r.restaurant_id,
          r.restaurant_name,
          YEAR(v.visit_date)
      `, [comparisonYear, latestYear, latestMonth]);

      const restaurantMap = new Map();

      for (const row of restaurantRows) {
        const key = String(row.restaurant_id);

        if (!restaurantMap.has(key)) {
          restaurantMap.set(key, {
            restaurantId: toNumber(row.restaurant_id),
            restaurantName: row.restaurant_name,
            currentRevenue: 0,
            previousRevenue: 0
          });
        }

        const item = restaurantMap.get(key);

        if (Number(row.visit_year) === latestYear) {
          item.currentRevenue = toNumber(row.total_revenue) || 0;
        }

        if (Number(row.visit_year) === comparisonYear) {
          item.previousRevenue = toNumber(row.total_revenue) || 0;
        }
      }

      const revenueByRestaurantYoy = Array.from(restaurantMap.values()).map((item) => ({
        ...item,
        revenueYoyPercent: percentChange(item.currentRevenue, item.previousRevenue)
      }));

      const bestRestaurantYoy =
        revenueByRestaurantYoy
          .filter((item) => item.revenueYoyPercent !== null)
          .sort((a, b) => b.revenueYoyPercent - a.revenueYoyPercent)[0] || null;

      const data = {
        latestYear,
        comparisonYear,
        comparisonMonthEnd: latestMonth,
        dataLastUpdated: range.data_last_updated,
        yoyMethod:
          "Compares the latest data year to the prior year using the same month range.",
        revenueDefinition: "food_bill + alcohol_bill",
        totalRevenueYoy: {
          current: latest ? toNumber(latest.total_revenue) : 0,
          previous: previous ? toNumber(previous.total_revenue) : 0,
          percentChange: percentChange(
            latest ? latest.total_revenue : 0,
            previous ? previous.total_revenue : 0
          )
        },
        totalVisitsYoy: {
          current: latest ? toNumber(latest.total_visits) : 0,
          previous: previous ? toNumber(previous.total_visits) : 0,
          percentChange: percentChange(
            latest ? latest.total_visits : 0,
            previous ? previous.total_visits : 0
          )
        },
        averageRevenuePerVisitYoy: {
          current: latest ? toNumber(latest.avg_revenue_per_visit) : null,
          previous: previous ? toNumber(previous.avg_revenue_per_visit) : null,
          percentChange: percentChange(
            latest ? latest.avg_revenue_per_visit : 0,
            previous ? previous.avg_revenue_per_visit : 0
          )
        },
        averageWaitTimeYoy: {
          current: latest ? toNumber(latest.avg_wait_time) : null,
          previous: previous ? toNumber(previous.avg_wait_time) : null,
          percentChange: percentChange(
            latest ? latest.avg_wait_time : 0,
            previous ? previous.avg_wait_time : 0
          )
        },
        bestRestaurantYoy,
        revenueByRestaurantYoy
      };

      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: true,
          data,
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
          message: "Dashboard highlights query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

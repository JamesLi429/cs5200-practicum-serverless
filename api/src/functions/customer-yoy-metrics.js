const { app } = require("@azure/functions");
const { query } = require("../db");

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function ratioPercent(numerator, denominator) {
  const n = Number(numerator || 0);
  const d = Number(denominator || 0);

  if (d === 0) {
    return null;
  }

  return Number(((n / d) * 100).toFixed(2));
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

app.http("customer-yoy-metrics", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "customer-yoy-metrics",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          YEAR(v.visit_date) AS visit_year,
          MONTH(v.visit_date) AS visit_month,
          COUNT(*) AS total_visits,
          SUM(CASE WHEN v.cust_id IS NOT NULL THEN 1 ELSE 0 END) AS known_customer_visits,
          SUM(COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)) AS total_revenue,
          SUM(
            CASE
              WHEN c.loyalty_member = 1
              THEN COALESCE(v.food_bill, 0) + COALESCE(v.alcohol_bill, 0)
              ELSE 0
            END
          ) AS loyalty_revenue
        FROM visits v
        LEFT JOIN customers c
          ON v.cust_id = c.cust_id
        WHERE v.visit_date IS NOT NULL
        GROUP BY
          YEAR(v.visit_date),
          MONTH(v.visit_date)
        ORDER BY
          YEAR(v.visit_date),
          MONTH(v.visit_date)
      `);

      const years = buildYearRange(rows);
      const rowMap = new Map();

      for (const row of rows) {
        rowMap.set(`${row.visit_year}-${row.visit_month}`, row);
      }

      const monthly = [];

      for (const year of years) {
        for (let month = 1; month <= 12; month++) {
          const row = rowMap.get(`${year}-${month}`);

          const totalVisits = row ? toNumber(row.total_visits) : 0;
          const knownCustomerVisits = row ? toNumber(row.known_customer_visits) : 0;
          const totalRevenue = row ? toNumber(row.total_revenue) : 0;
          const loyaltyRevenue = row ? toNumber(row.loyalty_revenue) : 0;

          monthly.push({
            year,
            month,
            monthLabel: MONTH_LABELS[month - 1],
            totalVisits,
            knownCustomerVisits,
            knownCustomerCaptureRate: row ? ratioPercent(knownCustomerVisits, totalVisits) : null,
            totalRevenue,
            loyaltyRevenue,
            loyaltyMemberRevenueShare: row ? ratioPercent(loyaltyRevenue, totalRevenue) : null
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
            monthly,
            formulas: {
              knownCustomerCaptureRate: "visits with cust_id / total visits",
              loyaltyMemberRevenueShare: "revenue from loyalty members / total revenue",
              revenueDefinition: "food_bill + alcohol_bill"
            }
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
          message: "Customer YOY metrics query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

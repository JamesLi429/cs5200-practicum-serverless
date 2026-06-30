const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function toBoolean(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Boolean(Number(value));
}

app.http("metadata", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "metadata",
  handler: async (request, context) => {
    try {
      const [restaurantRows, mealTypeRows, paymentMethodRows, dateRangeRows] = await Promise.all([
        query(`
          SELECT
            restaurant_id,
            restaurant_name,
            city,
            state,
            has_table_service
          FROM restaurants
          ORDER BY
            restaurant_name,
            restaurant_id
        `),
        query(`
          SELECT
            meal_type_id,
            meal_type
          FROM mealtypes
          ORDER BY
            meal_type_id
        `),
        query(`
          SELECT
            payment_method_id,
            payment_method
          FROM paymentmethods
          ORDER BY
            payment_method_id
        `),
        query(`
          SELECT
            CAST(MIN(visit_date) AS CHAR) AS first_visit_date,
            CAST(MAX(visit_date) AS CHAR) AS last_visit_date,
            COUNT(*) AS total_visits
          FROM visits
        `)
      ]);

      const restaurants = restaurantRows.map((row) => ({
        restaurantId: toNumber(row.restaurant_id),
        restaurantName: row.restaurant_name,
        city: row.city,
        state: row.state,
        hasTableService: toBoolean(row.has_table_service)
      }));

      const mealTypes = mealTypeRows.map((row) => ({
        mealTypeId: toNumber(row.meal_type_id),
        mealType: row.meal_type
      }));

      const paymentMethods = paymentMethodRows.map((row) => ({
        paymentMethodId: toNumber(row.payment_method_id),
        paymentMethod: row.payment_method
      }));

      const dateRange = dateRangeRows[0] || {};

      return {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ok: true,
          data: {
            restaurants,
            mealTypes,
            paymentMethods,
            dateRange: {
              firstVisitDate: dateRange.first_visit_date || null,
              lastVisitDate: dateRange.last_visit_date || null,
              totalVisits: toNumber(dateRange.total_visits)
            }
          },
          counts: {
            restaurants: restaurants.length,
            mealTypes: mealTypes.length,
            paymentMethods: paymentMethods.length
          },
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
          message: "Metadata query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

const { app } = require("@azure/functions");
const { query } = require("../db");

app.http("db-test", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "db-test",
  handler: async (request, context) => {
    try {
      const rows = await query(
        "SELECT COUNT(*) AS visit_count FROM visits"
      );

      return {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ok: true,
          table: "visits",
          count: Number(rows[0].visit_count),
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
          message: "Database test failed.",
          error: error.code || error.message
        })
      };
    }
  }
});
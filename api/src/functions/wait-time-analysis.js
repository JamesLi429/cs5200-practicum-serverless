const { app } = require("@azure/functions");
const { query } = require("../db");

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

app.http("wait-time-analysis", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "wait-time-analysis",
  handler: async (request, context) => {
    try {
      const rows = await query(`
        SELECT
          CASE
            WHEN wait_time IS NULL THEN 'Unknown'
            WHEN wait_time BETWEEN 0 AND 5 THEN '0-5 minutes'
            WHEN wait_time BETWEEN 6 AND 15 THEN '6-15 minutes'
            WHEN wait_time BETWEEN 16 AND 30 THEN '16-30 minutes'
            ELSE '31+ minutes'
          END AS wait_time_group,
          CASE
            WHEN wait_time IS NULL THEN 5
            WHEN wait_time BETWEEN 0 AND 5 THEN 1
            WHEN wait_time BETWEEN 6 AND 15 THEN 2
            WHEN wait_time BETWEEN 16 AND 30 THEN 3
            ELSE 4
          END AS wait_time_sort,
          COUNT(*) AS visit_count,
          ROUND(AVG(COALESCE(food_bill, 0) + COALESCE(alcohol_bill, 0)), 2) AS avg_sales,
          ROUND(AVG(tip_amount), 2) AS avg_tips,
          ROUND(AVG(party_size), 2) AS avg_party_size,
          ROUND(AVG(wait_time), 2) AS avg_wait_time
        FROM visits
        GROUP BY
          CASE
            WHEN wait_time IS NULL THEN 'Unknown'
            WHEN wait_time BETWEEN 0 AND 5 THEN '0-5 minutes'
            WHEN wait_time BETWEEN 6 AND 15 THEN '6-15 minutes'
            WHEN wait_time BETWEEN 16 AND 30 THEN '16-30 minutes'
            ELSE '31+ minutes'
          END,
          CASE
            WHEN wait_time IS NULL THEN 5
            WHEN wait_time BETWEEN 0 AND 5 THEN 1
            WHEN wait_time BETWEEN 6 AND 15 THEN 2
            WHEN wait_time BETWEEN 16 AND 30 THEN 3
            ELSE 4
          END
        ORDER BY
          wait_time_sort
      `);

      const data = rows.map((row) => ({
        waitTimeGroup: row.wait_time_group,
        visitCount: toNumber(row.visit_count),
        averageSales: toNumber(row.avg_sales),
        averageTips: toNumber(row.avg_tips),
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
          message: "Wait time analysis query failed.",
          error: error.code || error.message
        })
      };
    }
  }
});

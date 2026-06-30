const { app } = require("@azure/functions");
const mysql = require("mysql2/promise");

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getDbConfig() {
  return {
    host: requiredEnv("MYSQL_HOST"),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: requiredEnv("MYSQL_USER"),
    password: requiredEnv("MYSQL_PASSWORD"),
    database: requiredEnv("MYSQL_DATABASE"),
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true
    }
  };
}

app.http("db-test", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "db-test",
  handler: async (request, context) => {
    let connection;

    try {
      connection = await mysql.createConnection(getDbConfig());

      const [rows] = await connection.execute(
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
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
});
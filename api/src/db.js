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

async function query(sql, params = []) {
  let connection;

  try {
    connection = await mysql.createConnection(getDbConfig());
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

module.exports = {
  query
};
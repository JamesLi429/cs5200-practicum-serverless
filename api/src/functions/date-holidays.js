const { app } = require("@azure/functions");

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function nthWeekdayOfMonth(year, monthIndex, weekday, nth) {
  const date = new Date(Date.UTC(year, monthIndex, 1));

  while (date.getUTCDay() !== weekday) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  date.setUTCDate(date.getUTCDate() + (nth - 1) * 7);
  return date;
}

function lastWeekdayOfMonth(year, monthIndex, weekday) {
  const date = new Date(Date.UTC(year, monthIndex + 1, 0));

  while (date.getUTCDay() !== weekday) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return date;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function usHolidayDates(year) {
  return [
    { name: "New Year's Day", date: new Date(Date.UTC(year, 0, 1)) },
    { name: "Martin Luther King Jr. Day", date: nthWeekdayOfMonth(year, 0, 1, 3) },
    { name: "Presidents' Day", date: nthWeekdayOfMonth(year, 1, 1, 3) },
    { name: "Memorial Day", date: lastWeekdayOfMonth(year, 4, 1) },
    { name: "Juneteenth", date: new Date(Date.UTC(year, 5, 19)) },
    { name: "Independence Day", date: new Date(Date.UTC(year, 6, 4)) },
    { name: "Labor Day", date: nthWeekdayOfMonth(year, 8, 1, 1) },
    { name: "Columbus Day", date: nthWeekdayOfMonth(year, 9, 1, 2) },
    { name: "Veterans Day", date: new Date(Date.UTC(year, 10, 11)) },
    { name: "Thanksgiving Day", date: nthWeekdayOfMonth(year, 10, 4, 4) },
    { name: "Christmas Day", date: new Date(Date.UTC(year, 11, 25)) }
  ];
}

function upcomingHolidays(today, count = 3) {
  const startYear = today.getUTCFullYear();
  const all = [
    ...usHolidayDates(startYear),
    ...usHolidayDates(startYear + 1)
  ]
    .filter((holiday) => isoDate(holiday.date) >= isoDate(today))
    .sort((a, b) => a.date - b.date)
    .slice(0, count)
    .map((holiday) => ({
      name: holiday.name,
      date: isoDate(holiday.date)
    }));

  return all;
}

app.http("date-holidays", {
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  route: "date-holidays",
  handler: async () => {
    const today = new Date();

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        data: {
          today: isoDate(today),
          upcomingHolidays: upcomingHolidays(today, 3),
          holidayScope: "Common U.S. federal holidays"
        },
        time: new Date().toISOString()
      })
    };
  }
});

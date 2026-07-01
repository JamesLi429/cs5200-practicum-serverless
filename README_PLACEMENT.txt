Place the files in your project as follows:

api/src/functions/dashboard-highlights.js
  -> cs5200-practicum-serverless/api/src/functions/dashboard-highlights.js

api/src/functions/date-holidays.js
  -> cs5200-practicum-serverless/api/src/functions/date-holidays.js

api/src/functions/yoy-business-metrics.js
  -> cs5200-practicum-serverless/api/src/functions/yoy-business-metrics.js

api/src/functions/restaurant-revenue-yoy.js
  -> cs5200-practicum-serverless/api/src/functions/restaurant-revenue-yoy.js

api/src/functions/customer-yoy-metrics.js
  -> cs5200-practicum-serverless/api/src/functions/customer-yoy-metrics.js

api/src/functions/server-rankings.js
  -> cs5200-practicum-serverless/api/src/functions/server-rankings.js

public/dashboard.html
  -> cs5200-practicum-serverless/public/dashboard.html

public/css/dashboard.css
  -> cs5200-practicum-serverless/public/css/dashboard.css

public/js/dashboard.js
  -> cs5200-practicum-serverless/public/js/dashboard.js

public/js/api.js
  -> cs5200-practicum-serverless/public/js/api.js

TEST_API_ENDPOINTS.ps1
  -> cs5200-practicum-serverless/TEST_API_ENDPOINTS.ps1

api-reader-grants-final-dashboard.sql
  -> cs5200-practicum-serverless/api-reader-grants-final-dashboard.sql

Before testing the new dashboard endpoints, run api-reader-grants-final-dashboard.sql as your Azure MySQL admin user.

Then test locally and deploy:
1. cd api
2. func start
3. In another window, from project root: swa start ./public --api-devserver-url http://localhost:7071
4. Open http://localhost:4280/dashboard.html
5. After tests pass, commit and push.

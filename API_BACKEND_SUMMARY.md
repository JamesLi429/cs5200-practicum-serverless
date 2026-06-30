# CS5200 Practicum Backend API Summary

## Production Domain

https://yourconsultant.cc

## Architecture

This backend uses:

- Azure Static Web Apps
- Managed Azure Functions API
- Azure Database for MySQL
- Read-only MySQL API user

## Security Design

The API does not hard-code database credentials.

Database connection values are stored in:

- `api/local.settings.json` for local testing
- Azure Static Web Apps environment variables for production

The production API uses a read-only MySQL user named:

`cs5200_api_reader`

The API user has only the SELECT permissions needed by the backend endpoints.

Sensitive fields are not returned by the API, including:

- SSN
- birth date
- hourly rate
- customer email
- customer phone

## Completed API Endpoints

| Endpoint | Purpose |
|---|---|
| `/api/health` | Confirms the Azure Function API is running |
| `/api/db-test` | Confirms Azure MySQL connection and returns visit count |
| `/api/summary` | Returns high-level business summary |
| `/api/monthly-trends` | Returns monthly trend data |
| `/api/restaurant-performance` | Returns performance by restaurant |
| `/api/meal-type-performance` | Returns performance by meal type |
| `/api/payment-method-performance` | Returns performance by payment method |
| `/api/alcohol-trends` | Returns alcohol-related monthly trends |
| `/api/loyalty-summary` | Returns loyalty vs non-loyalty aggregate performance |
| `/api/discount-impact` | Returns performance by discount group |
| `/api/wait-time-analysis` | Returns performance by wait-time group |
| `/api/server-performance` | Returns safe server-level performance data |
| `/api/daily-trends` | Returns daily trend data |
| `/api/metadata` | Returns available dashboard filter metadata |

## Current Status

All local and deployed API endpoint tests passed.

The backend API layer is ready to support the future dashboard UI.
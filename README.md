@"
# CS5200 Practicum Serverless Web Service

This project is the first serverless web service test for the CS5200 Practicum I mission.

## Architecture

This project uses:

- Azure Static Web Apps
- Managed Azure Functions API
- Existing Azure Database for MySQL

## Current Scope

This version only tests the serverless backend service. It does not include the final dashboard UI yet.

## Deployed URL

https://zealous-ground-086976b10.7.azurestaticapps.net

## API Endpoints

### Health Check

GET /api/health

Purpose:

Confirms that the Azure Function API is running.

### Database Test

GET /api/db-test

Purpose:

Connects to the existing Azure MySQL database and returns COUNT(*) from the visits table.

Current test result:

visits count = 209874

## Local Testing

Start the API:

```powershell
cd api
func start
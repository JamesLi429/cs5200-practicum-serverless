# Azure Serverless Web Service Test Evidence

## Static Web App URL

https://zealous-ground-086976b10.7.azurestaticapps.net

## API Endpoint 1: Health Check

URL:

https://zealous-ground-086976b10.7.azurestaticapps.net/api/health

Expected result:

- ok = true
- service = CS5200 Azure Functions API

## API Endpoint 2: Database Test

URL:

https://zealous-ground-086976b10.7.azurestaticapps.net/api/db-test

Expected result:

- ok = true
- table = visits
- count = 209874

## Notes

This confirms that Azure Static Web Apps can serve the dummy web page, the managed Azure Functions API works, and the API can connect to the existing Azure MySQL database.

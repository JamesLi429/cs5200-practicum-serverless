# Step 40 - Final Dashboard QA Checklist

Project: CS5200 Practicum I Serverless Dashboard  
Production URL: https://yourconsultant.cc/dashboard.html  
API Status URL: https://yourconsultant.cc/

## 1. Deployment Check

- [ ] GitHub Actions latest deployment has a green check mark.
- [ ] https://yourconsultant.cc loads successfully.
- [ ] https://yourconsultant.cc/dashboard.html loads successfully.
- [ ] Browser shows HTTPS as secure.
- [ ] No visible certificate warning remains.

## 2. API Status Page Check

Open: https://yourconsultant.cc/

- [ ] Page does not load all API data automatically.
- [ ] Click "Run Lightweight API Tests".
- [ ] Result shows 14 of 14 endpoints passed.
- [ ] Preview /api/db-test works.
- [ ] Preview /api/summary works.
- [ ] Page is readable on desktop.
- [ ] Page is readable on mobile width.

## 3. Dashboard Page Check

Open: https://yourconsultant.cc/dashboard.html

- [ ] Page loads without large data loading at first.
- [ ] Load Dashboard Data button works.
- [ ] KPI cards display values.
- [ ] Monthly trend chart displays.
- [ ] Restaurant performance section displays.
- [ ] Meal type performance section displays.
- [ ] Payment method performance section displays.
- [ ] Executive insights display.
- [ ] Data coverage section displays.
- [ ] Tables render safely without broken layout.

## 4. Export and Print Check

- [ ] CSV export button works.
- [ ] JSON export button works.
- [ ] Print button opens browser print view.
- [ ] Printed page is readable.
- [ ] Exported files do not include passwords or secrets.
- [ ] Exported files do not include SSN, birth date, hourly rate, customer email, or customer phone.

## 5. Responsive Web Design Check

Test the dashboard at these approximate widths:

- [ ] Desktop width: 1200px or wider.
- [ ] Tablet width: around 768px.
- [ ] Mobile width: around 390px.

Confirm:

- [ ] Cards stack correctly.
- [ ] Charts or chart containers fit the screen.
- [ ] Tables scroll or wrap correctly.
- [ ] Buttons are easy to click.
- [ ] Text is readable.

## 6. Browser Console Check

In the browser, press F12 and open Console.

- [ ] No JavaScript errors.
- [ ] No failed API calls.
- [ ] No mixed-content warnings.
- [ ] No CORS errors.

## 7. Final API Endpoint Direct Checks

Confirm these URLs return JSON with ok=true:

- [ ] https://yourconsultant.cc/api/health
- [ ] https://yourconsultant.cc/api/db-test
- [ ] https://yourconsultant.cc/api/summary
- [ ] https://yourconsultant.cc/api/monthly-trends
- [ ] https://yourconsultant.cc/api/restaurant-performance
- [ ] https://yourconsultant.cc/api/meal-type-performance
- [ ] https://yourconsultant.cc/api/payment-method-performance
- [ ] https://yourconsultant.cc/api/alcohol-trends
- [ ] https://yourconsultant.cc/api/loyalty-summary
- [ ] https://yourconsultant.cc/api/discount-impact
- [ ] https://yourconsultant.cc/api/wait-time-analysis
- [ ] https://yourconsultant.cc/api/server-performance
- [ ] https://yourconsultant.cc/api/daily-trends
- [ ] https://yourconsultant.cc/api/metadata

## Step 40 Result

- [ ] Passed
- [ ] Passed with minor issues
- [ ] Failed and needs fixes

Notes:


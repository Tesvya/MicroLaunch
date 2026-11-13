# MICROLAUNCH

An Intelligent Web-Based Side-Hustle Recommendation and Income Planning System for Inclusive Workforce Development.

## Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Zustand, React Hook Form, Recharts
- **Backend**: Node.js, Express.js, MongoDB + Mongoose, JWT (httpOnly cookies)
- **ML**: Random Forest Classifier (ml-random-forest), Rule-Based + Weighted Scoring hybrid

## Quick Start

### 1. Backend
```bash
cd server
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
npm install
npm run seed:all      # creates roles, admin account, sample listings
npm run ml:train      # trains the Random Forest model
npm run dev           # starts on http://localhost:4000
```

Admin credentials (default):
- Email: admin@microlaunch.local
- Password: Admin12345!

### 2. Frontend
```bash
cd web
cp .env.example .env
npm install
npm run dev           # starts on http://localhost:5173
```

### 3. Payment Gateway (optional — mock works without keys)
Add to `server/.env`:
```
PAYMONGO_SECRET_KEY=sk_test_...     # GCash + Maya
PAYPAL_CLIENT_ID=...                 # PayPal
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox
```

## Modules
| Module | Description |
|---|---|
| Auth | Register with **email verification**, login, JWT sessions, role-based guard (USER/ADMIN) |
| Profile | Skills, interests, availability, qualifications, income/savings goals |
| Side-Hustles | Admin CRUD, user browse/search |
| Recommendations | Hybrid engine: Rule-Based Filter + Weighted Scoring + Random Forest |
| Applications | Apply, cancel, admin approve/reject/complete |
| Income Tracker | Log entries, edit, complete, chart, goal progress |
| Ratings | 1-5 star ratings with accurate-match flag |
| Payments | GCash/Maya (PayMongo), PayPal, mock fallback |
| Notifications | In-app notifications with unread badge |
| Reports | Admin generates 6 report types |
| Activity Logs | Audit trail of all admin actions |

## Deployment
See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the step-by-step guide (MongoDB Atlas + Render, free tier). `render.yaml` is included.
The default admin login (`admin@microlaunch.local` / `Admin12345!`) is for **local development only**; the seed script refuses it on a real database.

## Email verification
New accounts must verify their email before logging in (24-hour single-use link; only a hash of the token is stored).
- **Development (no SMTP set):** the link is printed in the server console and shown on the "Check your email" screen.
- **With SMTP set** (see `server/.env.example`, Gmail app password works): the link is emailed, and the on-screen shortcut is never shown.
- The seeded admin and any accounts that existed before this feature stay verified.

## Testing
With MongoDB running and the server started (`npm run dev`), run in `server/`:
```bash
npm run test:e2e        # full feature suite (95 checks)
npm run test:gateways   # GCash/Maya/PayPal flows against a simulated provider (22 checks)
npm run test:hardening  # production-mode safety guards, rate limiting, headers (34 checks)
npm run smoke -- https://your-site.onrender.com   # read-only checks for a live deployment (16 checks)
```

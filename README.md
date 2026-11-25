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
| Payouts | User requests, admin confirms the job was completed and approves (GCash/Maya via PayMongo, PayPal, mock fallback) |
| PWD verification | User uploads PWD card/documents, admin approves or rejects; unverified PWD does not affect matching |
| Notifications | In-app notifications with unread badge |
| Reports | Admin generates 6 report types |
| Activity Logs | Audit trail of all admin actions |

## Email verification
New accounts must verify their email before logging in (24-hour single-use link; only a hash of the token is stored).
- **Development (no SMTP set):** the link is printed in the server console and shown on the "Check your email" screen.
- **With SMTP set** (see `server/.env.example`, Gmail app password works): the link is emailed, and the on-screen shortcut is never shown.
- The seeded admin and any accounts that existed before this feature stay verified.

## Testing
Run in `server/` (no setup needed; build `web/` first so the hardening suite can serve it):
```bash
npm run test:integration   # all suites, on a throwaway in-memory MongoDB with mock email and payments
npm run smoke -- https://your-site.onrender.com   # read-only checks for a live deployment (16 checks)
```

## Applications, files, favorites (latest update)
- Applicants can attach up to 3 files (PDF, PNG, JPG, DOC, DOCX; 3 MB each, change with `UPLOAD_MAX_MB`). Types are checked by file content, not just the extension.
- Files are stored in MongoDB (`applicationfiles` collection) and count toward your Atlas M0 512 MB storage.
- Admins see the applicant's message, profile summary and files on the Applications page. Rejecting requires a reason (min 10 chars) that is sent to the applicant as a notification and email. Rejected applicants can apply again while the listing is open.
- Listings have "Applicants needed" (`openings`); a listing closes automatically when all openings are approved. Older listings with no number are uncapped until edited.
- "Save" is now "Favorite" with a Favorites page. Wording lives in `web/src/shared/labels.js`.

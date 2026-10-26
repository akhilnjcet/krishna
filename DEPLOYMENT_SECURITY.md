# Secure Deployment Guide & Security Architecture

This document describes the security configurations, deployment hardening measures, network restrictions, and logging mechanisms implemented in the application.

---

## 1. HTTPS & Transport Security

### Automated HTTPS Enforcement
* **Express Production Redirect:** `backend/middleware/securityMiddleware.js` (`enforceHttps`) detects `x-forwarded-proto` and immediately responds with a permanent `301 Moved Permanently` redirect if any HTTP request is received in `NODE_ENV === 'production'`.
* **Reverse Proxy Trust:** `server.js` enables `app.set('trust proxy', 1)` so that load balancers (Vercel, AWS ALB, NGINX, Cloudflare) properly pass the original protocol and client IP address.
* **HTTP Strict Transport Security (HSTS):** Helmet configures HSTS with:
  ```javascript
  strictTransportSecurity: {
    maxAge: 31536000,           // 1 year
    includeSubDomains: true,   // Covers all subdomains
    preload: true              // Eligible for browser HSTS preload list
  }
  ```
* **Frontend CDN Headers:** `vercel.json` applies `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.

---

## 2. Secrets Management & Storage

### Startup Environment Validation
Before the server begins serving traffic, `backend/config/validateEnv.js` executes:
1. **Critical Variable Check:** Verifies `MONGODB_URI` and `JWT_SECRET` are provided.
2. **Production Strength Enforcement:** In `NODE_ENV === 'production'`, any default or weak secrets (e.g., `secret123`, `dev_secret`, `password123`, strings shorter than 16 characters) cause the process to **exit immediately with code 1**.
3. **Database URI Sanity:** Confirms `MONGODB_URI` starts with `mongodb://` or `mongodb+srv://`.
4. **HTTPS CORS Enforce:** Warns if `CLIENT_URL` contains unencrypted `http://` when in production.

### Safe Secrets Handling
* **No Plaintext in Git:** Sensitive keys (`.env`) are git-ignored. A template is provided in `backend/.env.example`.
* **Log Masking:** `backend/config/database.js` runs `sanitizeMongoUri()` to strip passwords before logging MongoDB connection strings to STDOUT.
* **Sensitive Identifier Redaction:** Emails and usernames recorded in security logs are masked (e.g., `ad***n@domain.com`).

---

## 3. Database Network Access Restriction

### Preventing Direct Public Internet Exposure
To secure MongoDB against unauthorized external scans:
1. **Remove Wildcard Allow-list (`0.0.0.0/0`):**
   - In MongoDB Atlas (or your self-hosted firewall), delete `0.0.0.0/0` from Network Access IP Access List.
   - Whitelist **only** your application servers' static outbound IPs or NAT Gateway Elastic IPs.
2. **VPC Peering / AWS PrivateLink (Recommended for Production):**
   - Connect your application VPC directly to MongoDB Atlas via AWS PrivateLink or VPC Peering so database traffic never traverses the public internet.
3. **Mandatory TLS/SSL:**
   - In `backend/config/database.js`, `tls: true` is enforced for all remote and Atlas cluster connections.
4. **Majority Write Concern:**
   - Database operations use `w: 'majority'` and `retryWrites: true` for data durability.

---

## 4. Threat Detection, Rate Limiting & Security Logging

### Audit Log Persistence (`SecurityAuditLog`)
All security events are asynchronously persisted to the `securityauditlogs` collection in MongoDB with a **90-day TTL index** (`expireAfterSeconds: 7776000`), guaranteeing automated data retention management.

### Tracked Security Events
| Event Type | Severity | Trigger Condition |
| :--- | :--- | :--- |
| `AUTH_LOGIN_SUCCESS` | INFO | User successfully enters valid credentials / OTP / face match. Resets IP failure history. |
| `AUTH_LOGIN_FAILED` | WARN | Invalid username/email, incorrect password, or bad OTP. |
| `AUTH_LOCKOUT` | CRITICAL | User account locked out for 15 minutes after 5 consecutive failed attempts. |
| `BRUTE_FORCE_TRIGGERED`| CRITICAL | Sliding window detects 5+ failed authentication attempts from a single IP within 10 minutes. |
| `SUSPICIOUS_PROBE` | CRITICAL / WARN | Request path contains scanner patterns (`../`, `.env`, `.git`, `wp-admin`, `actuator`, `/etc/passwd`) or repeated probes. Blocked immediately with HTTP 400. |
| `RATE_LIMIT_EXCEEDED` | WARN | IP exceeds rate limits on login/auth routes, AI generation, or general API endpoints (HTTP 429). |
| `BOT_BLOCKED` | WARN | Automated scraper or scanner client detected (known User-Agents, missing User-Agent in prod, or honeypot trap trigger). Blocked with HTTP 403. |
| `SCRAPING_DETECTED` | CRITICAL | Sustained rapid requests (>50 in 30 seconds) detected on public content routes (`/api/portfolio`, `/api/blog`, `/api/rooms`). Throttled with HTTP 429. |
| `UNAUTHORIZED_ACCESS_ATTEMPT` | WARN | Unauthenticated or forbidden access attempts intercepted on protected resources (HTTP 401/403). |
| `API_SERVER_ERROR` | CRITICAL | Uncaught 500 error logged with sanitized message and request context. |
| `TENANT_ACCESS_SUCCESS` / `FAILED` | INFO / WARN | Room PIN entry attempts from tenant access portal. |

---

## 5. Abuse Protection, Anti-Bot & Rate Limiting Architecture

Implemented in `backend/middleware/abuseProtection.js`:

### Multi-Tier Rate Limiting Matrix
| Tier / Endpoint | Window | Max Limit | Response | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Global API** (`/api/`) | 15 min | 300 requests | HTTP 429 JSON | Prevents automated flood attacks and general crawl spikes (~20 req/min). |
| **Authentication** (`/api/auth/login`, `/verify-face`) | 15 min | 10 attempts | HTTP 429 JSON | Stops credential stuffing & password dictionary attacks. |
| **Tenant PIN** (`/api/bookings/verify-access`) | 15 min | 10 attempts | HTTP 429 JSON | Prevents 4-digit PIN brute-force attacks against room dashboards. |
| **Account Registration** (`/api/auth/register`) | 1 hour | 5 accounts | HTTP 429 JSON | Restricts mass spam account creation. |
| **Password Reset / OTP** (`/api/auth/*otp*`, `reset-password`) | 15 min | 5 requests | HTTP 429 JSON | Thwarts SMS/email spam abuse and token enumeration. |
| **AI Generation** (`/api/chat`) | 10 min | 15 prompts | HTTP 429 JSON | Protects expensive LLM quota & token expenditure (Groq/Gemini). |
| **AI Generation Burst** (`/api/chat`) | 15 sec | 3 prompts | HTTP 429 JSON | Thwarts automated script loops spamming prompt generation. |
| **Public Form Submissions** (`/api/lead`) | 15 min | 10 forms | HTTP 429 JSON | Defends contact and lead submission forms against bot spamming. |
| **Content Scraping** (`/api/portfolio`, `/api/blogs`, `/api/rooms`) | 1 min | 60 requests | HTTP 429 JSON | Throttles high-frequency catalog and content harvesters. |

### Bad Bot & Headless Tool Detection (`preventBadBots`)
* **User-Agent Filtering:** Blocks known automated harvesting tools, vulnerability scanners, and headless engines (`scrapy`, `aiohttp`, `python-requests`, `selenium`, `puppeteer`, `phantomjs`, `sqlmap`, `nikto`, `wpscan`, `gobuster`, `libwww-perl`).
* **Missing Header Rejection:** In production, any API request with a blank or missing `User-Agent` header is immediately rejected with HTTP 403.
* **CLI Restriction in Production:** Blocks direct command-line clients (`curl`, `wget`, `powershell`) from public API routes in production.

### Anti-Scraping Rapid Harvest Detector (`detectRapidScraping`)
* In-memory sliding window tracks requests across public listing endpoints per IP.
* If an IP submits >50 read requests within 30 seconds, a `SCRAPING_DETECTED` security alert is generated and requests are temporarily throttled with HTTP 429.

### Honeypot Trap Form Defense (`honeypotProtection`)
* Protects `/api/auth/register`, `/api/chat`, and `/api/lead` by inspecting hidden decoy fields (`_hp_website`, `company_fax_hp`, `honeypot_trap`).
* Form bots that automatically populate all form inputs trigger an immediate silent rejection with HTTP 400 and log `BOT_BLOCKED`.

## 6. Input Validation, Sanitization & Safe File Uploads

### Recursive Request Sanitization (`backend/middleware/sanitizeMiddleware.js`)
* **Global Scope:** Intercepts every incoming request across `req.body`, `req.query`, and `req.params`.
* **NoSQL Query Operator Neutralization:** Recursively strips query operators (`$where`, `$regex`, `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$nin`, `$or`, `$and`, `$not`, `$nor`, `$exists`, `$expr`, etc.) and leading `$` characters.
* **Prototype Pollution Prevention:** Object keys matching `__proto__`, `constructor`, or `prototype` are stripped before reaching controller logic.
* **Script & XSS Injection Neutralization:** Recursively strips `<script>`, `<iframe/object/embed>`, inline event handlers (`onload=`, `onerror=`), and `javascript:` pseudo-protocols.
* **Null Byte Stripping:** Eliminates `\0` and `%00` to prevent byte truncation attacks.

### Strict Route Parameter & Type Enforcement (`backend/utils/validateInputs.js`)
* **MongoDB ObjectId Enforcement:** Dual-compatible middleware & `router.param()` callbacks validate that `:id`, `:roomId`, `:lodgeId`, `:bookingId`, and `:paymentId` strictly conform to 24-character hexadecimal strings (`/^[0-9a-fA-F]{24}$/`). Malformed parameters are rejected immediately with HTTP 400 without hitting the database.
* **Numeric & Range Validation:** `parsePositiveNumber()` enforces positive finite numbers, preventing negative price/deposit values or NaN injection.
* **Pagination Hard Limits:** `parsePagination()` constrains page and limit (capped at maximum 100 items per request).
* **Length Bounds:** Chat messages and lead forms enforce maximum payload and length caps (e.g. 25 messages max, 2500 chars max per message).

### Hardened File Uploads (`backend/config/cloudinary.js`)
* **Extension Whitelist:** Strictly permits `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, and `.pdf`.
* **MIME Type Whitelist:** Matches MIME against `image/jpeg`, `image/png`, `image/webp`, `image/gif`, and `application/pdf`.
* **Dangerous File Blacklist:** Explicitly rejects `.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.js`, `.py`, `.svg` (SVG XSS prevention), `.html`, `.msi`, `.dll`, `.vbs`, etc.
* **Crypto Randomized Filenames:** Replaces user-supplied original filenames with `Date.now() + crypto.randomBytes(16).toString('hex') + ext`, completely neutralizing path traversal (`../../`) and file overwrite attacks.
* **10MB Size Limit:** Enforces a strict 10MB limit with Multer error interception returning structured HTTP 400 responses.

---

## 7. Verification Commands

Verify syntax across all security files:
```powershell
node -c backend/server.js
node -c backend/config/validateEnv.js
node -c backend/config/database.js
node -c backend/middleware/securityMiddleware.js
node -c backend/middleware/abuseProtection.js
node -c backend/utils/securityLogger.js
node -c backend/models/SecurityAuditLog.js
node -c backend/controllers/authController.js
node -c backend/routes/bookingRoutes.js
node -c backend/routes/chat.js
node -c backend/routes/lead.js
node -c backend/routes/authRoutes.js
node -c backend/routes/analyticsRoutes.js
```


# CMS Backend — Environment Setup Guide

Complete guide to every environment variable the CMS needs, what it does, and exactly how to get the value.

---

## Quick Reference

| Variable | Required | Category |
|---|---|---|
| `DATABASE_URL` | **Yes** | Database (MySQL) |
| `MONGO_URI` | Only for one-time data migration | Legacy Database |
| `DB_NAME` | Only for one-time data migration | Legacy Database |
| `JWT_SECRET` | **Yes** | Auth |
| `PRODUCTION_URL` | **Yes** | CORS / Revalidation |
| `REVALIDATE_SECRET` | **Yes** | Cache |
| `SMTP_HOST` | **Yes** | Auth Email (OTP) |
| `SMTP_PORT` | **Yes** | Auth Email (OTP) |
| `SMTP_USER` | **Yes** | Auth Email (OTP) |
| `SMTP_PASSWORD` | **Yes** | Auth Email (OTP) |
| `SMTP_FROM` | **Yes** | Auth Email (OTP) |
| `SMTP_SECURE` | No | Auth Email (OTP) |
| `ADMIN_NOTIFY_EMAIL` | **Yes, for alerts** | Notification Email |
| `NOTIFY_CC_EMAIL` | No | Notification Email |
| `NOTIFY_SMTP_HOST` | No — only if separate account | Notification Email |
| `NOTIFY_SMTP_PORT` | No — only if separate account | Notification Email |
| `NOTIFY_SMTP_USER` | No — only if separate account | Notification Email |
| `NOTIFY_SMTP_PASSWORD` | No — only if separate account | Notification Email |
| `NOTIFY_SMTP_FROM` | No — only if separate account | Notification Email |
| `NOTIFY_SMTP_SECURE` | No — only if separate account | Notification Email |
| `HOSTINGER_FTP_HOST` | **Yes** | Media Storage |
| `HOSTINGER_FTP_USER` | **Yes** | Media Storage |
| `HOSTINGER_FTP_PASS` | **Yes** | Media Storage |
| `HOSTINGER_FTP_PORT` | No | Media Storage |
| `HOSTINGER_MEDIA_PATH` | No | Media Storage |
| `HOSTINGER_MEDIA_URL` | **Yes** | Media Storage |
| `HOSTINGER_LEAD_PATH` | No — defaults to `<MEDIA_PATH>/leads` | Media Storage (lead CVs) |
| `HOSTINGER_LEAD_URL` | No — defaults to `<MEDIA_URL>/leads` | Media Storage (lead CVs) |

---

## 1. Database (MySQL via Prisma)

### `DATABASE_URL`
**Required.**

Your full MySQL connection string. The app connects through Prisma using this value.

```
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DBNAME?connection_limit=5"
```

**How to get it from Hostinger (hPanel):**
1. Log in to [hpanel.hostinger.com](https://hpanel.hostinger.com) and select your hosting plan.
2. Go to **Databases** → **Management**.
3. Under **Create a New MySQL Database and Database User**, enter a database name (e.g. `rebellabz_cms`), a username, and a strong password → **Create**.
4. Note the values shown in the database list:
   - **Database name**: e.g. `u698468992_rebellabz_cms` (Hostinger prefixes your account id)
   - **Username**: e.g. `u698468992_rebellabz-cms`
   - **Host**: shown on the same page (e.g. `srv1234.hstgr.io` or `localhost` when the app runs on the same plan)
5. **For local development / external access:** go to **Databases** → **Remote MySQL**, enter your public IP (or `%` for any host — less secure, fine for testing), select the database, and click **Create**. Use the remote host shown there (e.g. `srv1234.hstgr.io`) in the URL.
6. Assemble the URL:
   ```
   DATABASE_URL="mysql://u698468992_rebellabz-cms:YourPassword@srv1234.hstgr.io:3306/u698468992_rebellabz_cms?connection_limit=5"
   ```
   > If the password contains special characters (`@ # % / :`), URL-encode them (e.g. `@` → `%40`).

Keep `connection_limit=5` — Hostinger shared MySQL caps concurrent connections; a small pool prevents "too many connections" errors.

**After setting it, create the tables:**
```bash
npx prisma migrate dev --name init      # local/dev (also generates the client)
# or on a server/CI:
npx prisma migrate deploy
```

**If missing:** Every API call returns 500 — the app is non-functional.

---

### `MONGO_URI` / `DB_NAME` (legacy — one-time data migration only)
**Optional.** Only needed while running `npm run migrate:data` (copies your old MongoDB data into MySQL). See `scripts/migrate-mongo-to-mysql.mjs`. After migrating, these can be removed.

```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/rebellabz-cms-cms
DB_NAME=rebellabz-cms-cms
```

---

## 2. Authentication

### `JWT_SECRET`
**Required.**

A secret string used to sign and verify login tokens. Anyone with this value can forge admin sessions — keep it private.

**How to get it:**
Run this in your terminal to generate a secure random value:
```bash
openssl rand -hex 32
```
Copy the output and use it as the value. Example output:
```
a3f9c2e1b4d87654321fedcba9876543210abcdef1234567890abcdef123456
```

**If missing or weak:** All login sessions and protected dashboard routes fail.

---

## 3. CORS & Cache Revalidation

### `PRODUCTION_URL`
**Required.**

The public URL of the **frontend** (Rebellabz website). Two things depend on this:
1. **CORS** — only these origins may call the public APIs (blog, services, careers, lead capture)
2. **Cache clearing** — after publishing content, the CMS calls `{PRODUCTION_URL}/api/revalidate` to clear the Next.js cache. This uses the **first** entry.

```
PRODUCTION_URL=https://rebel-labz.com
```

**Multiple domains.** A site is usually reachable on more than one origin — typically the apex and the `www` form. List them comma-separated, most canonical first:

```
PRODUCTION_URL=https://rebel-labz.com,https://www.rebel-labz.com
```

Every listed origin is allowed through CORS; the **first** one is used to build the revalidation URL. A single value still works exactly as before.

**How to get it:** The public URL(s) your frontend is served on — the real domain, not the `*.vercel.app` preview URL, unless that is genuinely what visitors use. No trailing slash.

**If it doesn't match the domain visitors are on:** every browser request is blocked. The response comes back with a non-matching `Access-Control-Allow-Origin`, the browser discards it, and the site reports it as a network/"couldn't reach the server" error — which looks like an outage rather than a config problem. Any localhost port is always allowed, so this only bites in production.

---

### `REVALIDATE_SECRET`
**Required.**

A shared secret between the CMS backend and the frontend. After a post/page is published, the CMS sends this value in a request header to the frontend to authorize a cache clear.

**How to get it:** Generate another random string the same way as `JWT_SECRET`:
```bash
openssl rand -hex 32
```

> **Important:** Set the exact same value in **both** the CMS backend env and the frontend env. If they don't match, published content won't appear on the site until the 1-hour cache expires.

**If missing:** Content updates are delayed up to 1 hour. Nothing crashes.

---

## 4. Email — Auth (OTP / Password Reset)

This email is sent to CMS users when they use the **Forgot Password** feature. It delivers a 6-digit OTP code.

The CMS uses **Nodemailer** with any standard SMTP server. The setup below uses **Gmail** which is the easiest option.

### Getting Gmail App Password (Recommended)

> You cannot use your regular Gmail password here. Google requires an **App Password** for third-party apps.

1. Go to your Google Account → [myaccount.google.com](https://myaccount.google.com).
2. Click **Security** in the left sidebar.
3. Under "How you sign in to Google", make sure **2-Step Verification is ON**. (App Passwords require 2FA to be enabled.)
4. Go back to Security → scroll down → click **App passwords** (or search "App passwords" in the search bar).
5. Under "App name" type anything, e.g. `Rebellabz CMS`.
6. Click **Create**.
7. Google shows a 16-character password like `abcd efgh ijkl mnop`. **Copy it immediately** — it won't be shown again. Remove the spaces when pasting.

---

### `SMTP_HOST`
**Required.** The SMTP server address.
```
SMTP_HOST=smtp.gmail.com
```
For other providers: Zoho → `smtp.zoho.com`, Outlook → `smtp.office365.com`, custom → ask your hosting provider.

---

### `SMTP_PORT`
**Required.**
```
SMTP_PORT=587
```
Use `587` for TLS (recommended). Use `465` only if your provider requires SSL and you set `SMTP_SECURE=true`.

---

### `SMTP_USER`
**Required.** The full Gmail address you generated the App Password for.
```
SMTP_USER=youraddress@gmail.com
```

---

### `SMTP_PASSWORD`
**Required.** The 16-character App Password from Step 7 above (no spaces).
```
SMTP_PASSWORD=abcdefghijklmnop
```

---

### `SMTP_FROM`
**Required.** The display name and address shown as the sender in the email client.
```
SMTP_FROM="Rebellabz CMS <youraddress@gmail.com>"
```

---

### `SMTP_SECURE`
**Optional.** Set to `true` only if using port 465. For port 587 leave it unset or `false`.
```
SMTP_SECURE=false
```

**If any `SMTP_*` variable is missing:** The forgot-password flow fails with a 500 error. Regular login still works — only password reset is affected.

---

## 5. Email — Notification (Registration Alerts)

Every time a visitor submits their email on the frontend (early access form, contact page, blog, about page), the CMS sends an alert email to the admin inbox.

### How the fallback works

The notification system checks for `NOTIFY_SMTP_*` variables first. If they are not set, it automatically falls back to the `SMTP_*` variables above.

**In most cases you do not need to set any `NOTIFY_SMTP_*` variable.** Just set `SMTP_*` once (already done above) and add `ADMIN_NOTIFY_EMAIL`. The same Gmail account handles both OTP and notification emails.

Only set `NOTIFY_SMTP_*` if you want notification emails to come from a **completely different email address** than OTP emails.

---

### `ADMIN_NOTIFY_EMAIL`
**Required if you want alert emails.**

This is the on/off switch for the entire notification system. The `To:` address that receives the registration alert.

```
ADMIN_NOTIFY_EMAIL=team@yourdomain.com
```

**If missing:** No alert emails are sent at all. Registration data is still saved to the database — nothing is lost. You just won't get real-time inbox notifications.

---

### `NOTIFY_CC_EMAIL`
**Optional.** A second address added as CC on every alert. If not set, defaults to `ADMIN_NOTIFY_EMAIL`.

```
NOTIFY_CC_EMAIL=founder@yourdomain.com
```

---

### `NOTIFY_SMTP_*` (only if using a separate email account)

If you want notifications from a different address (e.g. `alerts@yourdomain.com` instead of your Gmail):

```
NOTIFY_SMTP_HOST=smtp.zoho.com
NOTIFY_SMTP_PORT=587
NOTIFY_SMTP_SECURE=false
NOTIFY_SMTP_USER=alerts@yourdomain.com
NOTIFY_SMTP_PASSWORD=that-accounts-password
NOTIFY_SMTP_FROM="Rebellabz Alerts <alerts@yourdomain.com>"
```

Follow the same App Password steps above for whichever provider you use. If you skip these, the SMTP fallback kicks in and notifications go out from the same account as OTP emails.

---

## 6. Media Storage (Hostinger FTP)

Images uploaded through the CMS Media Library are stored on Hostinger via FTP. The CMS connects via FTP on upload, saves the file to a public directory, and returns the public URL that gets stored in the database.

### Getting Hostinger FTP Credentials

1. Log in to [hpanel.hostinger.com](https://hpanel.hostinger.com).
2. Select your hosting plan / website.
3. In the left sidebar go to **Files** → **FTP Accounts**.
4. You will see your default FTP account listed (or create a new one).
5. The details shown are:
   - **FTP Host** / Server: something like `navajowhite-octopus-630288.hostingersite.com` — this is your `HOSTINGER_FTP_HOST`
   - **FTP Username**: something like `u698468992.navajowhite-octopus-630288.hostingersite.com` — this is your `HOSTINGER_FTP_USER`
   - **Port**: `21` (default, always)
   - **Password**: the password you set when creating the FTP account. If you forgot it, click **Change Password** to set a new one — this is your `HOSTINGER_FTP_PASS`

6. For `HOSTINGER_MEDIA_URL` — this is the **public HTTP URL** that maps to the folder where files are uploaded. If your Hostinger site domain is `yourdomain.com` and files are stored in `public_html/media`, the URL is `https://yourdomain.com/media`. If you are using a temporary Hostinger subdomain (`.hostingersite.com`), use that instead.

---

### `HOSTINGER_FTP_HOST`
**Required.** The FTP server hostname from hPanel.
```
HOSTINGER_FTP_HOST=navajowhite-octopus-630288.hostingersite.com
```

---

### `HOSTINGER_FTP_USER`
**Required.** The FTP username from hPanel.
```
HOSTINGER_FTP_USER=u698468992.navajowhite-octopus-630288.hostingersite.com
```

---

### `HOSTINGER_FTP_PASS`
**Required.** The FTP account password you set in hPanel.
```
HOSTINGER_FTP_PASS=your-ftp-password
```

---

### `HOSTINGER_FTP_PORT`
**Optional.** Always `21` for Hostinger. Only set this if your provider uses a non-standard port.
```
HOSTINGER_FTP_PORT=21
```

---

### `HOSTINGER_MEDIA_PATH`
**Optional.** The remote folder path on the FTP server where uploads are saved. Defaults to `/public_html/media` if not set. The folder is created automatically on first upload if it does not exist.
```
HOSTINGER_MEDIA_PATH=/public_html/media
```

---

### `HOSTINGER_MEDIA_URL`
**Required.** The public HTTPS URL that serves files from the folder above. This is what gets stored in the database and embedded in pages.
```
HOSTINGER_MEDIA_URL=https://navajowhite-octopus-630288.hostingersite.com/media
```

> Make sure there is **no trailing slash** at the end of this URL.

**If any Hostinger variable is missing:** The media upload API fails. The upload button in the CMS Media Library returns an error. Images already saved in the database are not affected — their URLs still work.

---

### `HOSTINGER_LEAD_PATH` / `HOSTINGER_LEAD_URL`
**Optional — leave unset.**

CVs and resumes attached to website forms are stored separately from the editors' Media Library, in a `leads` folder derived from the two variables above:

```
HOSTINGER_MEDIA_PATH=/public_html/media-rebellabz
  → CVs are written to  /public_html/media-rebellabz/leads

HOSTINGER_MEDIA_URL=https://your-site.hostingersite.com/media-rebellabz
  → CVs are served from https://your-site.hostingersite.com/media-rebellabz/leads
```

The folder is created automatically on the first upload. Set these two only if you need CVs somewhere else entirely:

```
HOSTINGER_LEAD_PATH=/public_html/private-cvs
HOSTINGER_LEAD_URL=https://your-site.hostingersite.com/private-cvs
```

They must point at the same place — the path is where the file is written over FTP, the URL is what the dashboard links to. No trailing slash on either.

> **Note:** uploaded CVs are served as ordinary files, so anyone holding the URL can open them. Filenames are randomised (timestamp + random suffix) so they cannot be guessed, but there is no login check on the file itself.

**If the FTP variables are missing:** the upload endpoint returns a clean "File uploads are not configured" message and the visitor can still submit the form without a CV — the lead is never lost.

---

## Complete `.env` Template

Copy this, fill in your values, and add it to Render (or wherever the CMS is hosted) under **Environment Variables**.

```env
# ── Database (MySQL / Prisma) ─────────────────────────────────────────
DATABASE_URL="mysql://u000000000_user:password@srv0000.hstgr.io:3306/u000000000_rebellabz_cms?connection_limit=5"

# Only needed while running the one-time Mongo → MySQL data migration:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/rebellabz-cms-cms
# DB_NAME=rebellabz-cms-cms

# ── Auth ──────────────────────────────────────────────────────────────
JWT_SECRET=paste-openssl-rand-hex-32-output-here

# ── Frontend URL + Cache ───────────────────────────────────────────────
PRODUCTION_URL=https://your-frontend.vercel.app
REVALIDATE_SECRET=paste-another-openssl-rand-hex-32-output-here

# ── Auth Email (OTP / password reset) ─────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youraddress@gmail.com
SMTP_PASSWORD=your16charapppassword
SMTP_FROM="Rebellabz CMS <youraddress@gmail.com>"

# ── Notification Email (registration alerts) ──────────────────────────
# Uses the same SMTP account above. Only these two needed:
ADMIN_NOTIFY_EMAIL=team@yourdomain.com
NOTIFY_CC_EMAIL=founder@yourdomain.com

# ── Media Storage (Hostinger FTP) ─────────────────────────────────────
HOSTINGER_FTP_HOST=your-site.hostingersite.com
HOSTINGER_FTP_USER=u000000000.your-site.hostingersite.com
HOSTINGER_FTP_PASS=your-ftp-password
HOSTINGER_FTP_PORT=21
HOSTINGER_MEDIA_PATH=/public_html/media
HOSTINGER_MEDIA_URL=https://your-site.hostingersite.com/media
```

---

## Email Setup — Decision Tree

```
Do you want CMS users to be able to reset their password?
  YES → Set all SMTP_* variables (Gmail App Password recommended)
  NO  → Leave SMTP_* unset (login still works, reset flow will error)

Do you want an email alert when a visitor submits the early access form?
  YES → Set ADMIN_NOTIFY_EMAIL to your inbox
        (reuses the same Gmail account from SMTP_* above)
  NO  → Leave ADMIN_NOTIFY_EMAIL unset (registrations still save to DB)

Do you want notification alerts sent from a DIFFERENT address than OTP emails?
  YES → Also set all NOTIFY_SMTP_* variables with that account's credentials
  NO  → Skip NOTIFY_SMTP_* entirely
```

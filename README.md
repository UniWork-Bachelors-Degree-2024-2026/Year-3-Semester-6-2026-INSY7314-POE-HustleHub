# HustleHub+ 💸

Welcome to HustleHub+, the secure freelance marketplace where every gig finds its match and every hustle is protected from the ground up!

## POE Part 3: DevSecOps, Monitoring and Finalisation

### 🎥 Demonstration videos:
> [!important]
> **Part 3: Final application flow**
>
> [![Watch the video](https://img.youtube.com/vi/5FC33ud0JO0/maxresdefault.jpg)](https://www.youtube.com/watch?v=5FC33ud0JO0)
>
> **Part 2: Full application flow**
>
> [![Watch the video](https://img.youtube.com/vi/1RSccZO0qlo/maxresdefault.jpg)](https://www.youtube.com/watch?v=1RSccZO0qlo)
>
> **Part 1: Secure backend foundations**
>
> [![Watch the video](https://img.youtube.com/vi/QHpWdKYzTTA/maxresdefault.jpg)](https://www.youtube.com/watch?v=QHpWdKYzTTA)
>

### 📑 Contents:

> [!note]
> **Start here**
> - [Demonstration videos](#-demonstration-videos)
> - [Marking guide](#-marking-guide)
> - [What Changed in Part 3](#-what-changed-in-part-3)
> - [Feedback from Parts 1 and 2](#-feedback-from-parts-1-and-2)
>
> **The system**
> - [System Explanation](#-system-explanation)
> - [Architecture Diagram](#%EF%B8%8F-architecture-diagram)
> - [Users](#-users)
> - [Running the Application (Docker)](#%EF%B8%8F-running-the-application)
> - [Evaluating the Application](#-evaluating-the-application)
>
> **Part 3 rubric (in rubric order)**
> - [Tax and Income Dashboard](#-tax-and-income-dashboard)
> - [CI/CD Pipeline](#%EF%B8%8F-cicd-pipeline)
> - [Static Code Analysis](#-static-code-analysis)
> - [Dockerisation](#-dockerisation)
> - [Logging](#-logging)
> - [Security (core protections from Parts 1 and 2)](#-security-implementation)
> - [Own Security Features](#%EF%B8%8F-own-security-features)
> - [Final Security Review](#%EF%B8%8F-final-security-review)
> - [Testing](#-testing)
> - [Part 3 Evidence](#-part-3-evidence)
>
> **Parts 1 and 2 (still in place)**
> - [Backend Structure](#%EF%B8%8F-backend-structure)
> - [Part 2 Evidence](#%EF%B8%8F-part-2-evidence)
> - [Screenshots of API responses (Part 1)](#-screenshots-of-api-responses-part-1)
>
> **Project**
> - [Changelog](#-changelog)
> - [Team Contributions](#-team-contributions)
> - [Reference List](#-reference-list)

### 🧭 Marking guide:

> [!tip]
> Each Part 3 rubric criterion and where its explanation and evidence can be found.
>
> | Rubric criterion | Explanation | Evidence |
> |---|---|---|
> | Final Features (Tax + Income Dashboard) | [Tax and Income Dashboard](#-tax-and-income-dashboard) | [Dashboard screenshot](#-part-3-evidence), `backend/tests/tax.test.js`, `TaxSummary.test.tsx` |
> | CI/CD Pipeline (Backend + Frontend) | [CI/CD Pipeline](#%EF%B8%8F-cicd-pipeline), [Testing](#-testing) | `.github/workflows/`, `Integration_Testing/` (32 Playwright tests), `newman-output` and `playwright-report` artifacts, the images on Docker Hub, [pipeline screenshots](#-part-3-evidence), GitHub Actions tab |
> | Static Code Analysis | [Static Code Analysis](#-static-code-analysis) | `static-analysis.yml`, `codeql.yml`, `codeql-results` artifact, [screenshots](#-part-3-evidence) |
> | Docker (Backend + Frontend) | [Dockerisation](#-dockerisation), [Running the Application](#%EF%B8%8F-running-the-application) | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, Docker and Docker Hub jobs in `ci.yml`, [screenshots](#-part-3-evidence) |
> | Logging | [Logging](#-logging) | `utils/logger.js`, [log file and Better Stack screenshots](#-part-3-evidence) |
> | Own Security Features | [Own Security Features](#%EF%B8%8F-own-security-features) | `utils/lockout.js`, `twoFactorController.js`, `utils/audit.js`, `models/auditEventModel.js`, the admin page, `utils/logger.js`, `auth.spec.js` and `accounts.spec.js` (Playwright), [screenshots](#-part-3-evidence) |
> | Security Review in README | [Final Security Review](#%EF%B8%8F-final-security-review) | Threat to control mapping tables, `security.spec.js` (Playwright) |
> | README Update | [What Changed in Part 3](#-what-changed-in-part-3), [Feedback from Parts 1 and 2](#-feedback-from-parts-1-and-2), [Changelog](#-changelog) | This README |
> | Demonstration video | [Demonstration videos](#-demonstration-videos) | Part 3 video link |

### 🆕 What Changed in Part 3:

> [!important]
> <ins> **Summary of changes since Part 2** </ins>
>
> Part 3 is the final version of HustleHub+. Everything from Parts 1 and 2 is still in place, and the sections below have been updated to describe the system as it is now. The main changes are:
>
> - **SARS tax estimate:** a new `utils/tax.js` works out an estimated income tax from the SARS individuals' tax table for the 2027 tax year (1 March 2026 to 28 February 2027), including the primary rebate and the under 65 tax threshold. A new `GET /api/transactions/tax-estimate` endpoint returns the estimate and plain language insights for the logged in freelancer, and a new `TaxSummary` component shows it on the freelancer dashboard.
> - **Docker:** the backend and the frontend each have their own `Dockerfile`. The backend runs on Node.js 24 Alpine as the non-root `node` user, and the frontend is built with Vite and served by unprivileged Nginx over HTTPS. A `docker-compose.yml` runs both as separate services on a bridge network, maps the backend logs to the host, and passes the certificates and environment variables through.
> - **Configuration from the environment:** the allowed CORS origins are now read from the `ALLOWED_ORIGINS` environment variable instead of being hard coded, the React app reads its API address from `VITE_API_URL`, and the Nginx Content Security Policy fills in the API address from `API_ORIGIN` when the container starts.
> - **Logging:** a new `utils/logger.js` and `middleware/loggerMiddleware.js` log every HTTP request and every important event (logins, registrations, bookings, transactions, access control failures, rate limiting, database and server errors) to the terminal, to daily log files and to **Better Stack**, a cloud based log ingesting service.
> - **CI/CD with GitHub Actions:** three workflows. `ci.yml` checks that no secrets or logs are committed, runs the backend and frontend unit tests, builds the frontend, audits dependencies, runs the Postman collection with Newman against a MongoDB service container, runs the Playwright frontend integration tests, builds and runs both Docker images, and once every check has passed on `main`, publishes both images to Docker Hub. `static-analysis.yml` runs ESLint and Prettier on both apps, and `codeql.yml` runs CodeQL security scanning.
> - **Static analysis fixes:** the issues found by `npm audit`, ESLint, Prettier and the pipeline review were fixed: three vulnerable dependencies were updated, runtime logs were removed from git and ignored, unused values were removed, token signing moved to one module, all files were formatted with Prettier, and the backend now requires Node.js 24. CodeQL went from 26 alerts to 10: request values in database queries are now compared with `$eq`, the profile save only passes known fields as plain values, the sanitiser skips a `__proto__` key, the frontend sanitiser repeats its clean-up until the text stops changing, the Newman runner checks the server certificate against the local CA instead of switching certificate checks off, and the logger removes line breaks from every message (see [Static Code Analysis](#-static-code-analysis)).
> - **Backend unit tests:** a new `backend/tests/` folder with 68 tests in 10 files (Node.js test runner) for JWTs, passcodes, sanitisation, validation, the tax calculation, CORS origins, the account lockout, the security audit trail, email masking, the logger and the profile update.
> - **Own security features** (listed strongest to weakest, see [Own Security Features](#%EF%B8%8F-own-security-features)):
>   1. **Two-factor login:** an optional emailed code at every login, so a stolen password alone cannot open the account.
>   2. **Account lockout:** an account is locked for 15 minutes after 5 wrong passwords.
>   3. **Token revocation on password change:** every older login token stops working once the password is changed or reset.
>   4. **Secure password reset:** a single use, six digit emailed code that expires after 10 minutes, with no hint whether the email exists.
>   5. **Email-verified registration:** an account is only created after the emailed code is confirmed.
>   6. **Security audit trail:** logins, lockouts, registrations, password changes and resets, and two-factor events are stored as audit records for 90 days.
>   7. **Dependency audit gate:** the pipeline fails if a production package has a high or critical vulnerability.
>   8. **Secrets and logs check:** the pipeline fails if a key, `.env` file or log file is committed.
>   9. **Admin audit log view:** admins can review the stored security events on the admin page, 10 at a time, filtered by event type.
>   10. **File signature check on profile photos:** a photo must really be a JPEG, PNG or WebP image, checked from its first bytes, not just labelled as one.
>   11. **CSP violation reporting:** the browser reports any content the Content Security Policy blocks, and the API logs it.
>   12. **Email addresses masked in the logs:** every email address in the logs shows only its first letter and the domain, for example `k***@gmail.com`.
> - **Frontend integration tests (Playwright):** a new `Integration_Testing/` folder with 32 Playwright tests in 7 files that open the real React app in Chromium, connected to the real API and a real MongoDB database. They cover registration with the emailed code, password reset, two-factor login, login, logout, lockout, tampered and expired tokens, editing and deleting gigs, the full gig, booking, delivery, cancellation, refund and income flow, the SARS tax figures on the dashboard, form validation, the admin overview, and security controls such as role checks, ownership checks, stored markup and the Content Security Policy. A new `integration-tests` job runs them on every push.
> - **Testing:** the Postman collection now has 58 requests with 102 tests (including the tax estimate and the audit trail), the frontend has 134 unit tests across 15 files, and 32 Playwright integration tests run in the pipeline.

### 💬 Feedback from Parts 1 and 2:

> [!note]
> Parts 1 and 2 were both awarded full marks (100%), and no changes were requested in the feedback. All Part 1 and Part 2 functionality is still in place and working in this final version, and is still covered by the Postman, backend and frontend tests that run in the [CI/CD Pipeline](#%EF%B8%8F-cicd-pipeline).

### 💻 System Explanation:

> [!important]
> <ins> **System Overview of HustleHub+** </ins>
>
> HustleHub+ is a **secure, full-stack freelance marketplace platform** built on the **MERN stack (MongoDB, Express.js, React, Node.js)**. The platform enables freelancers to advertise services (gigs), empowers clients to browse and book these offerings, and records all resulting financial transactions. To assist freelancers in managing their finances, the system automatically tracks income and provides real-time estimations of tax obligations via a dedicated user-facing dashboard.
>
> Part 1 of the Proof of Evidence delivered the foundational backend authentication engine: a Node.js and Express API supporting registration and login, backed by password hashing, token-based authentication, local HTTPS, input validation, and safe error handling. Part 2 builds on that foundation to deliver the full-stack application. The API now supports email-verified registration, password reset, account management, member profiles, gig management, bookings, and simulated transaction recording, all protected by JWT authentication, role-based access control, ownership checks, sanitisation, rate limiting and security headers. A React frontend, also served over HTTPS, lets users register, verify their email, log in, browse gigs, book them, and view their bookings and income. Part 3 completes the system: freelancers now get an estimated income tax figure based on the SARS tax tables, both applications run as Docker containers managed by Docker Compose, every important event is logged locally and to the Better Stack cloud platform, and GitHub Actions tests, builds, scans and runs the whole stack on every push. Twelve own security features, led by two-factor login and account lockout, protect accounts, the logs and the pipeline beyond the minimum requirements (see [Own Security Features](#%EF%B8%8F-own-security-features)).
>
> <ins> **Application Features** </ins>
>
> | Feature | Description |
> | ----------- | ----------- |
> | **Public landing and gig browsing** | Visitors can read about the platform and browse live gigs by category or search term. Opening a gig asks them to log in or register before they can book. |
> | **Registration with email verification** | Users register as a client or a freelancer, with live password strength rules and confirmation. A six-digit code is then emailed to them and entered in a six-box code input (paste is supported). The account is only created once the code is confirmed, and the code can be resent after a 60-second cooldown. |
> | **Login** | Users log in with email and password. The session token is kept in `sessionStorage` and cleared when the tab closes or the user logs out. After 5 wrong passwords the account is locked for 15 minutes. |
> | **Two-factor login (Part 3)** | From the profile page, any user can switch on two-factor login after confirming their password. From then on, a correct password is followed by a six-digit code emailed to them, and no token is issued until that code is confirmed. |
> | **Forgot password** | From the login page, users request a reset code by email, then enter the code with a new password. The response is the same whether or not the email is registered, and the user must log in again afterwards. |
> | **Role-based dashboards** | Freelancers see total income, a six month income line chart, an income per gig donut chart, recent activity and the SARS based income and tax estimate with insights (see [Tax and Income Dashboard](#-tax-and-income-dashboard)). Clients see their spending and quick links. Admins see an overview of every booking and the total transaction volume. |
> | **Gig management** | Freelancers create, edit, pause and delete their own gigs from the *My gigs* page. Inputs are limited to safe characters as the user types. |
> | **Booking flow** | Clients open a gig, write a brief, choose a date and a simulated payment method (card or EFT), and receive a receipt with a unique transaction reference. |
> | **Booking history** | Clients see the gigs they booked and can cancel before work starts. Freelancers see incoming bookings and move them through the lifecycle (`confirmed`, `in_progress`, `completed`). Clients can copy their transactions as CSV. |
> | **Transactions and income** | Each booking creates a `Transaction` record. Cancelling a booking marks its transaction as `refunded`, so it no longer counts towards the freelancer's income. |
> | **Profiles** | Every user can edit their profile (cropped photo, banner, headline, bio, skills, rate, links and client details) with a live preview, and choose whether it is visible to other members, who can open it from a gig or booking. The shareable part is saved to the server, and other members never see the email address. |
> | **Account settings** | From the profile page, users can change their username and email, and change their password after confirming the current one. Changing the password signs out every other device while keeping the current one logged in. |

### 🗺️ Architecture Diagram:
> [!important]
> <ins> **Architecture Diagram of HustleHub+ (Draw.io, 2026).** </ins>
>
> <img width="1447" height="1351" alt="System Architecture part 3" src="https://github.com/user-attachments/assets/46f05bdb-585b-4729-bd25-9d80245a8923" />
>
> The diagram shows the HustleHub+ system across all three parts of the POE. Clients, Freelancers and Admins access the system through a React frontend, while Postman is used for testing.
> All requests first pass through the HTTPS gateway, where TLS and CORS controls are applied.
> 
> Within the backend, requests move through API routes and security middleware before reaching the controllers, services and data layer.
> Security measures include input validation, JWT authentication, RBAC, rate limiting and sanitisation. MongoDB is used for data storage through Mongoose.
> 
> The diagram also includes the logging, monitoring and DevSecOps processes, and the two outside services the backend calls: Brevo for the emailed codes and Better Stack for the cloud logs. In the final system the backend and the frontend each run in their own Docker container on a shared bridge network, the backend sends its logs to local files and to Better Stack, and GitHub Actions tests, scans and builds both containers on every push. These Part 3 components are described in detail in the [Dockerisation](#-dockerisation), [Logging](#-logging) and [CI/CD Pipeline](#%EF%B8%8F-cicd-pipeline) sections.
>

### 👤 Users:

> [!important]
> <ins> **Intended Users of HustleHub+** </ins>
>
> The system incorporates role-based access control (RBAC) for its three intended user types: **Clients, Freelancers, and Admins**, ensuring that authentication only confirms a user’s identity while access to functionality is restricted according to their assigned role (The IIE, 2026). The **User model** enforces this through a `role` field with an **enum** containing `client`, `freelancer`, and `admin`, defaulting to 'client' upon registration.
>
> Registration is a public endpoint, so the `role` value in a request body is fully attacker-controlled and can never be trusted as-is. `otpController.js`'s `startRegistration` therefore only allows a caller to self-assign `client` or `freelancer`; any other value submitted (including `admin`) is silently downgraded to `client`, and that role is stored with the pending sign-up until the emailed code is confirmed. **Admin accounts can never be created through the public `/api/auth/register` endpoint** and are provisioned separately with the `npm run seed:admin` script, which reads the admin's details from `.env` and applies the same password rules as public registration (The IIE, 2026).
>
> **What each intended user can do at each part of the POE:**
>
> | Role | Part 1 | Part 2 | Part 3 | 
> | ----------- | ----------- | ----------- | ----------- |
> | **Client** | Register (self-assignable) and login with hashed password and JWT; can view their own profile via the protected `GET /api/auth/profile` route. | Registers with an emailed verification code and can reset a forgotten password; manages their account and public profile. Browses gig listings, books a gig with a simulated payment, and triggers a transaction record on each booking; views and cancels their own bookings before work starts. Requests are rate-limited, validated and sanitised so bad or excessive input can't slip through. | Can switch on two-factor login from the profile page, and is protected by the account lockout after repeated wrong passwords. Logins, bookings and the transactions they create are now logged for monitoring. |
> | **Freelancer** | Register (self-assignable) and login with hashed password and JWT; can view their own profile via the protected `GET /api/auth/profile` route. | Same verified registration, password reset and account management as clients. Create, update, view, and delete their own gigs; view bookings made against their gigs and update their status; income is tracked per booking and shown on the dashboard with an estimated tax figure. Freelancers cannot book gigs. | Sees an income and tax estimate for the current SARS tax year from `GET /api/transactions/tax-estimate`: income, estimated tax, income after tax, a projection for the year, progress towards the tax threshold, how much to set aside and where the next bracket starts. Two-factor login and account lockout apply as for clients. |
> | **Admin** | Login with hashed password and JWT once an admin account exists (not self-assignable at registration); can view their own profile via `GET /api/auth/profile` the same as any other role. | The first admin is created with `npm run seed:admin`. Admin can act on any gig or booking regardless of owner and can view every booking and transaction on the platform, going beyond a freelancer's own-gig-only access, enforced via backend RBAC. The frontend shows admins an overview page with all bookings and the total transaction volume, and hides these controls for non-admins as a UX convenience; the backend remains the real security boundary. | Admin retains the same override capabilities from Part 2 (any gig or booking). Admin requests and status changes are now written to the event log with the admin's username and role, giving an audit trail of admin activity. The tax estimate is blocked for admins (`403`) because tax is worked out per individual freelancer. |
>
> 

### ▶️ Running the Application:

> [!important]
> HustleHub+ runs as **two Docker containers** (the Express API and the React app) managed by **Docker Compose**, so the whole stack starts with one command. Running each app directly with Node.js is still possible for development and is described at the end of this section.
>
> <ins> **Quick start (summary)** </ins>
>
> | Step | What you do | Command |
> |---|---|---|
> | 1 | Clone the repository | `git clone` |
> | 2 | Create the local HTTPS certificate | `openssl` (four commands) |
> | 3 | Create `backend/.env` | `cp backend/.env.example backend/.env` |
> | 4 | Optional: change the Docker Compose addresses | Root `.env` file |
> | 5 | Prepare the log folder | `mkdir -p backend/logs` |
> | 6 | Build and start both containers | `docker compose up --build -d` |
> | 7 | Check that everything is running | `docker compose ps` |
> | 8 | Create the first admin | `docker compose exec backend npm run seed:admin` |
> | 9 | Stop the stack | `docker compose down` |
>
> <ins> **Prerequisites** </ins>
>
> | Requirement | Why it is needed |
> |---|---|
> | [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose), running | Builds and runs the two containers |
> | Git | Clones the repository |
> | OpenSSL (included with Git Bash on Windows, and with macOS and Linux) | Creates the local HTTPS certificate |
> | A MongoDB Atlas connection string, with your IP address allowed under **Network Access** in Atlas | The database |
> | A Brevo account with a verified sender email | Sends the registration, password reset and two-factor login codes |
> | Optional: a Better Stack account with an HTTP source | Cloud logging (logging to the terminal and files works without it) |
> | Optional: Node.js 24 and npm | Only for running the tests or the apps outside Docker |
>
> All commands below are run from the **repository root** in a terminal (Git Bash on Windows, or Terminal on macOS and Linux), unless a step says otherwise.
>
> <ins> **1. Clone the repository** </ins>
>
> ```bash
> git clone https://github.com/EMECPE/insy7314-2026-poe-kylelotter.git
> cd insy7314-2026-poe-kylelotter
> ```
>
> <ins> **2. Create the local HTTPS certificate** </ins>
>
> Both containers serve HTTPS with a locally generated certificate. The private keys are never committed, so each developer creates their own set with OpenSSL (OpenSSL, 2026):
>
> ```bash
> # A local certificate authority (CA)
> openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.crt -days 365 -subj "/CN=HustleHub Local CA"
>
> # A certificate for localhost, signed by that CA
> openssl req -newkey rsa:2048 -nodes -keyout cert.key -out cert.csr -subj "/CN=localhost"
> printf "subjectAltName=DNS:localhost" > san.ext
> openssl x509 -req -in cert.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out cert.crt -days 365 -extfile san.ext
> ```
>
> Check that the certificate is valid:
>
> ```bash
> openssl verify -CAfile ca.crt cert.crt
> # Expected: cert.crt: OK
> ```
>
> > **Windows (Git Bash):** if `openssl` reports a problem with `/CN=`, run `export MSYS_NO_PATHCONV=1` first, so Git Bash does not treat `/CN=...` as a file path, then run the commands again.
> >
> > **macOS and Linux:** the containers run as non-root users, so they must be able to read the key. Run `chmod 644 cert.key`.
>
> Optionally import `ca.crt` into your browser or operating system's trusted root certificates to remove the browser warning.
>
> <ins> **3. Configure the backend (`backend/.env`)** </ins>
>
> Copy the template, then open `backend/.env` and fill in the values. Docker Compose passes this whole file into the backend container. The block below lists every variable the backend reads. `.env.example` has the same keys apart from `PORT` and `ACCOUNT_RATE_LIMIT_MAX`, which are optional and can be added to `backend/.env` when needed:
>
> ```bash
> cp backend/.env.example backend/.env
> ```
>
> ```env
> # Copy this file to .env and fill in the values. The .env file is ignored by Git and by Docker builds.
>
> # Required: the API refuses to start without these two
> # MongoDB connection string (use MongoDB Atlas when running in Docker)
> CONN_STRING=
> # Long random string used to sign login tokens, for example from: openssl rand -hex 32
> JWT_SECRET=
>
> # Email delivery for the registration, password reset and two-factor login codes (https://www.brevo.com)
> # Use "console" only for local development or tests without Docker; it refuses to run in production.
> EMAIL_PROVIDER=brevo
> BREVO_API_KEY=
> # Must be a sender verified in Brevo
> MAIL_FROM_EMAIL=
> MAIL_FROM_NAME=HustleHub+
>
> # Only used by "npm run seed:admin" to create the first admin account
> ADMIN_USERNAME=
> ADMIN_EMAIL=
> ADMIN_PASSWORD=
>
> # Optional: cloud logging with Better Stack (the source token and ingesting host from your HTTP source)
> BETTERSTACK_SOURCE_TOKEN=
> BETTERSTACK_INGESTING_HOST=
>
> # Optional: separate secret for hashing one-time codes (falls back to JWT_SECRET)
> OTP_SECRET=
>
> # Only needed when running without Docker (docker-compose.yml sets these for the containers)
> # Full path to ca.crt, so Node trusts the local HTTPS certificate
> NODE_EXTRA_CA_CERTS=
> # Origins allowed to call the API (comma separated). Defaults to https://localhost:5173 when empty.
> ALLOWED_ORIGINS=https://localhost:5173
> # Port the API listens on. Defaults to 3000; leave it unset when running in Docker.
> PORT=
>
> # Optional: account lockout overrides (failed logins before the lock, and minutes locked). Defaults: 5 and 15.
> LOCKOUT_MAX_ATTEMPTS=
> LOCKOUT_MINUTES=
>
> # Optional: rate limit overrides (requests per 15 minutes per IP). Defaults: 300, 10, 20, 20 and 15.
> API_RATE_LIMIT_MAX=
> AUTH_RATE_LIMIT_MAX=
> OTP_RATE_LIMIT_MAX=
> BOOKING_RATE_LIMIT_MAX=
> ACCOUNT_RATE_LIMIT_MAX=
> ```
>
> A long random value for `JWT_SECRET` (and `OTP_SECRET`) can be generated with:
>
> ```bash
> openssl rand -hex 32
> ```
>
> | Variable | Required | Purpose |
> |---|---|---|
> | `CONN_STRING` | Yes | MongoDB connection string. The API refuses to start without it. |
> | `JWT_SECRET` | Yes | Signs the login tokens. The API refuses to start without it. |
> | `EMAIL_PROVIDER`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | Yes, to register or reset passwords | Sends the six-digit codes through Brevo. `MAIL_FROM_EMAIL` must be a sender verified in Brevo. |
> | `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Only for step 8 | Details of the first admin account. |
> | `BETTERSTACK_SOURCE_TOKEN`, `BETTERSTACK_INGESTING_HOST` | No | Sends the logs to Better Stack. |
> | `OTP_SECRET` | No | Separate secret for hashing the codes (falls back to `JWT_SECRET`). |
> | `NODE_EXTRA_CA_CERTS`, `ALLOWED_ORIGINS`, `PORT` | Only without Docker | The path to `ca.crt` so Node trusts the local certificate, the origins allowed by CORS (default `https://localhost:5173`) and the API port (default `3000`). `docker-compose.yml` sets the first two for the container. |
> | `LOCKOUT_MAX_ATTEMPTS`, `LOCKOUT_MINUTES` | No | Override the lockout defaults (5 failed logins, 15 minutes). |
> | `API_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `OTP_RATE_LIMIT_MAX`, `BOOKING_RATE_LIMIT_MAX`, `ACCOUNT_RATE_LIMIT_MAX` | No | Override the rate limit defaults (300, 10, 20, 20 and 15 requests per 15 minutes). |
>
> Things to know when running in Docker:
>
> - Inside the container, `localhost` means the container itself, so use a MongoDB Atlas connection string. A database running on your own machine can be reached at `host.docker.internal` instead of `localhost`.
> - The backend container runs with `NODE_ENV=production`, so `EMAIL_PROVIDER` must be `brevo`. The `console` provider (codes printed in the terminal) is only for running without Docker and refuses to run in production.
> - Leave `PORT` empty (or `3000`), because Docker Compose publishes port `3000`.
> - `NODE_EXTRA_CA_CERTS` and `ALLOWED_ORIGINS` are set by `docker-compose.yml`, which overrides the values in `backend/.env`, so they can be left as they are for Docker.
> - `backend/.env` is ignored by git and by Docker builds, so the secrets are never committed or copied into an image.
>
> <ins> **4. Optional: change the addresses used by Docker Compose** </ins>
>
> `docker-compose.yml` reads three variables from a `.env` file in the **repository root** (not `backend/.env`). If the file does not exist, the local defaults below are used, so this step can be skipped for a local run:
>
> ```env
> # Origins the API accepts through CORS (comma separated)
> ALLOWED_ORIGINS=https://localhost:5173
> # API address built into the React app (needs a rebuild to change)
> VITE_API_URL=https://localhost:3000/api
> # API address placed in the frontend Content Security Policy
> API_ORIGIN=https://localhost:3000
> ```
>
> <ins> **5. Prepare the log folder** </ins>
>
> The backend writes its log files to `backend/logs`, which Docker Compose maps out of the container. The folder is not in git, so create it first:
>
> ```bash
> mkdir -p backend/logs
> ```
>
> > **macOS and Linux:** the backend runs as the non-root `node` user, so it also needs permission to write to the folder: `chmod 777 backend/logs`. Docker Desktop on Windows does not need this.
>
> <ins> **6. Build and start the stack** </ins>
>
> Make sure Docker Desktop is running, then:
>
> ```bash
> docker compose up --build -d
> ```
>
> | Part of the command | Meaning |
> |---|---|
> | `up` | Creates and starts the `backend` and `frontend` services |
> | `--build` | Builds both images from `backend/Dockerfile` and `frontend/Dockerfile` first |
> | `-d` | Runs the containers in the background so the terminal stays free |
>
> The first build downloads the base images and installs the packages, so it can take a few minutes. The frontend only starts once the backend reports healthy.
>
> <ins> **7. Check that everything is running** </ins>
>
> ```bash
> docker compose ps
> ```
>
> Both services should show `Up` with `(healthy)` in the `STATUS` column. It can take up to a minute after starting for both to become healthy. Then check the API and the frontend:
>
> ```bash
> # API health check (--cacert checks the certificate against the local CA from step 2)
> curl --cacert ca.crt https://localhost:3000/api/health
> # Expected: {"message":"API up and running!"}
>
> # Security headers sent by the frontend
> curl --cacert ca.crt -I https://localhost:5173/
> # Expected to include: content-security-policy, strict-transport-security, x-content-type-options
> ```
>
> Then open the app in a browser:
>
> | App | Address |
> |---|---|
> | Frontend | `https://localhost:5173` |
> | Backend health check | `https://localhost:3000/api/health` |
>
> If the browser blocks API calls because of the self-signed certificate, open `https://localhost:3000/api/health` once and accept the certificate, then reload the frontend.
>
> The backend's logs are written to `backend/logs/YYYY-MM-DD-combined.log` on your machine, and can also be followed live:
>
> ```bash
> docker compose logs -f backend
> ```
>
> <ins> **8. Create the first admin account** </ins>
>
> Admin accounts cannot be created through registration. With `ADMIN_USERNAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` set in `backend/.env`, run the seed script inside the running backend container:
>
> ```bash
> docker compose exec backend npm run seed:admin
> ```
>
> The script uses the same email and password rules as registration, does nothing if that admin already exists, and will not promote an existing client or freelancer account.
>
> <ins> **9. Stop the stack** </ins>
>
> ```bash
> docker compose down
> ```
>
> The containers are removed, but the data stays in MongoDB Atlas and the log files stay in `backend/logs`.
>
> <ins> **Optional: pull the published images from Docker Hub** </ins>
>
> The steps above build the images from the code. The pipeline also publishes every image that passes all checks to Docker Hub (see [Dockerisation](#-dockerisation)). The images are published under the team's Docker Hub account `st10336577`:
>
> ```bash
> docker pull st10336577/hustlehub-backend:latest
> docker pull st10336577/hustlehub-frontend:latest
> ```
>
> The published images need the same certificate files, `backend/.env` and environment variables as above.
>
> <ins> **Useful Docker commands** </ins>
>
> | Task | Command |
> |---|---|
> | Rebuild after changing code or `VITE_API_URL` | `docker compose up --build -d` |
> | Apply a change to `backend/.env` | `docker compose up -d --force-recreate backend` |
> | Restart one service | `docker compose restart backend` |
> | Follow the logs of both services | `docker compose logs -f` |
> | Follow the logs of one service | `docker compose logs -f frontend` |
> | Open a shell in the backend container | `docker compose exec backend sh` |
> | Check the logger and Better Stack connection | `docker compose exec backend npm run test:logger` |
> | Stop and remove the containers | `docker compose down` |
>
> <ins> **Troubleshooting** </ins>
>
> | Problem | Cause and fix |
> |---|---|
> | `backend` keeps restarting or never becomes healthy | Run `docker compose logs backend`. `Missing required environment variable(s)` means `CONN_STRING` or `JWT_SECRET` is empty in `backend/.env`. A database error usually means the Atlas connection string is wrong or your IP address is not allowed under **Network Access**. |
> | `ENOENT` for `cert.key`, `cert.crt` or `ca.crt` | The certificate files are missing from the repository root. Repeat step 2. |
> | `EACCES` (permission denied) for `cert.key` or a log file on macOS or Linux | Run `chmod 644 cert.key` and `chmod 777 backend/logs`, then `docker compose up -d`. |
> | `port is already allocated` | Another program (often a development server from `npm run dev`) is using port `3000` or `5173`. Stop it, then start the stack again. |
> | The page loads but every API call fails | The browser has not accepted the API's certificate yet. Open `https://localhost:3000/api/health`, accept it, and reload. |
> | Registration says the code could not be sent | Check `BREVO_API_KEY` and that `MAIL_FROM_EMAIL` is a verified sender in Brevo. |
> | Changes to `backend/.env` have no effect | The container still has the old values. Run `docker compose up -d --force-recreate backend`. |
>
> <ins> **Running without Docker (development)** </ins>
>
> This needs Node.js 24. Set `NODE_EXTRA_CA_CERTS` in `backend/.env` to the full path of `ca.crt`, then start each app in its own terminal:
>
> ```bash
> # Terminal 1: backend API on https://localhost:3000
> cd backend
> npm install
> npm run dev
> ```
>
> ```bash
> # Terminal 2: React app on https://localhost:5173
> cd frontend
> npm install
> npm run dev
> ```
>
> Create the admin with `npm run seed:admin` from the `backend` folder. Without Docker, `EMAIL_PROVIDER=console` can be used for local development, and the codes are printed in the backend terminal instead of being emailed.
>
> <ins> **Running the tests** </ins>
>
> The four test suites (backend unit tests, Newman API tests, frontend unit tests and Playwright integration tests) are run with Node.js outside Docker. Their commands are in [Testing](#-testing). Stop the Docker stack before running the Playwright tests, because they start their own API and frontend on ports `3000` and `5173`.

### 🔎 Evaluating the Application:

> [!important]
> Once the stack is running (see [Running the Application](#%EF%B8%8F-running-the-application)), the steps below walk through every required feature and the Part 3 additions. Use two different email addresses you can receive mail on, one for the freelancer and one for the client.
>
> <ins> **1. Freelancer: register and create a gig** </ins>
>
> 1. Open `https://localhost:5173`, choose **Register**, pick the **Freelancer** role and enter a strong password.
> 2. Enter the six-digit code from the email. The account is only created once the code is confirmed.
> 3. Open **My gigs**, create a gig and make sure it is **active**.
>
> <ins> **2. Client: browse and book** </ins>
>
> 1. In a private window, register a **Client** account the same way.
> 2. Browse the gigs, open the freelancer's gig, write a brief, choose a date and a simulated payment method, and book it.
> 3. The receipt shows the booking and its unique transaction reference. The booking appears under **Bookings**, and the transaction is recorded in the database.
>
> <ins> **3. Freelancer: income and tax dashboard** </ins>
>
> 1. Back as the freelancer, open **Bookings** to see the incoming booking and move it to `in_progress` and then `completed`.
> 2. Open the **Dashboard** to see the total income, the six month income chart, the income per gig chart and the **income and tax estimate** for the current SARS tax year, with its insights.
> 3. Optional: as the client, cancel a second booking before work starts. Its transaction is marked `refunded` and no longer counts towards the freelancer's income.
>
> <ins> **4. Access control** </ins>
>
> - As the client, try to open **My gigs** or the freelancer dashboard: the frontend redirects away.
> - In Postman, send `POST /api/gigs` with the client's token: the API returns `403`. Send `GET /api/transactions/tax-estimate` with no token: the API returns `401`.
> - Log in as the admin (created with `npm run seed:admin`) to see every booking and the total transaction volume.
>
> <ins> **5. Own security features** </ins>
>
> The twelve own security features are listed strongest to weakest, as in [Own Security Features](#%EF%B8%8F-own-security-features). Each one can be checked as follows:
>
> 1. **Two-factor login:** on the **Profile** page, switch on two-factor login (the current password is required), log out, then log in again. After the correct password, a login code is emailed and must be entered before the dashboard opens. A wrong code is refused.
> 2. **Account lockout:** on the login page, enter a wrong password 5 times for one account. The sixth attempt, even with the correct password, is refused with a message saying how many minutes are left.
> 3. **Token revocation on password change:** log in to the same account in two browser windows (one normal, one private). Change the password on the **Profile** page in the first window. The second window is logged out on its next action, while the first window stays logged in.
> 4. **Secure password reset:** choose **Forgot password** on the login page and enter the account's email. Enter the emailed code and a new password. The old password no longer works and the new one does. Entering an email that has no account shows the same message, so it cannot be used to find out who is registered.
> 5. **Email-verified registration:** start a new registration and enter a wrong code. It is refused and no account is created. The account only exists once the correct emailed code is entered (step 1 above).
> 6. **Security audit trail:** the steps above (registration, logins, the lockout, the two-factor change, the password change and the reset) are each stored as an audit record. They can be seen with feature 9, or in the `auditevents` collection in MongoDB Atlas.
> 7. **Dependency audit gate:** in the repository's **Actions** tab, open the latest CI run. The **Backend tests and dependency audit** and **Frontend tests, build and dependency audit** jobs each run `npm audit --omit=dev --audit-level=high`, and the job would fail on any high or critical vulnerability. It can also be run locally:
>
>    ```bash
>    cd backend
>    npm audit --omit=dev --audit-level=high
>    ```
>
> 8. **Secrets and logs check:** in the same CI run, the **No secrets or logs committed** job checks that no key, `.env` file or log file is tracked by git.
> 9. **Admin audit log view:** log in as the admin created with `npm run seed:admin` and open the **Admin** page. The **Security audit trail** section at the bottom lists the events from the steps above, newest first, 10 per page. Choose an **Event type**, for example *Account lockout*, to show only those, and use **Previous** and **Next** to move between pages. No email addresses are shown. Logged in as a client or freelancer, the page is not available and `GET /api/admin/audit-events` answers `403`.
> 10. **File signature check on profile photos:** on the **Profile** page, upload a real JPEG, PNG or WebP photo and save, which works. Then rename a text file to `fake.png` and upload it (choose **All files** in the file picker). Saving is refused with a validation error, because the file's first bytes are not a real image.
> 11. **CSP violation reporting:** send a sample violation report to the API, the same way a browser does when the Content Security Policy blocks something:
>
>     ```bash
>     curl --cacert ca.crt -X POST https://localhost:3000/api/csp-report \
>       -H "Content-Type: application/csp-report" \
>       -d '{"csp-report":{"document-uri":"https://localhost:5173/","violated-directive":"script-src","blocked-uri":"https://evil.example/x.js"}}'
>     ```
>
>     The API answers `204`, and a `CSP violation` warning appears under `SECURITY` in `backend/logs/YYYY-MM-DD-combined.log`.
> 12. **Email addresses masked in the logs:** open `backend/logs/YYYY-MM-DD-combined.log` after the steps above. Every email address appears with only its first letter and the domain, for example `k***@gmail.com`, while the account ID still shows which user it was.
>
> <ins> **6. Logging** </ins>
>
> - Open `backend/logs/YYYY-MM-DD-combined.log` to see the registrations, logins, failed logins, lockout, bookings, transactions and refused requests from the steps above. Errors are also in `YYYY-MM-DD-error.log`.
> - With Better Stack configured, the same entries appear in the Better Stack live tail. `docker compose logs backend` shows them in the terminal.
>
> <ins> **7. Tests, pipeline and static analysis** </ins>
>
> - Run the four test suites (backend unit, Newman, frontend unit and Playwright integration) locally as described in [Testing](#-testing).
> - Open the repository's **Actions** tab to see the CI, Static analysis and CodeQL workflows for the latest commit, including the Newman output, Playwright report and CodeQL results artifacts, and the **Publish images to Docker Hub** job.

### 🧾 Tax and Income Dashboard:

> [!important]
> <ins> **What it does** </ins>
>
> Freelancers see an estimate of the income tax they may owe on what they have earned through HustleHub+ in the current tax year, together with their income charts. The estimate is worked out on the server by `utils/tax.js` and returned by `GET /api/transactions/tax-estimate`, so the dashboard, the API tests and the unit tests all use the same calculation.
>
> <ins> **Research: how South African income tax works for individuals** </ins>
>
> SARS taxes individuals on a sliding scale: income is split into brackets, and each bracket has a fixed amount of tax for all the income below it plus a percentage of the income above its lower limit. The tax worked out from the table is then reduced by rebates. Every taxpayer gets the **primary rebate**, and the result is that nobody under 65 pays tax until their income passes the **tax threshold**. The tax year runs from 1 March to the end of February and is named after the year it ends in, so 1 March 2026 to 28 February 2027 is the **2027 tax year** (South African Revenue Service, 2026).
>
> HustleHub+ uses the SARS table for the 2027 tax year:
>
> | Taxable income (R) | Tax before rebates |
> |---|---|
> | 0 to 245 100 | 18% of taxable income |
> | 245 101 to 383 100 | 44 118 + 26% of taxable income above 245 100 |
> | 383 101 to 530 200 | 79 998 + 31% of taxable income above 383 100 |
> | 530 201 to 695 800 | 125 599 + 36% of taxable income above 530 200 |
> | 695 801 to 887 000 | 185 215 + 39% of taxable income above 695 800 |
> | 887 001 to 1 878 600 | 259 783 + 41% of taxable income above 887 000 |
> | 1 878 601 and above | 666 339 + 45% of taxable income above 1 878 600 |
>
> | Value | Amount |
> |---|---|
> | Primary rebate | R17 820 |
> | Tax threshold (under 65) | R99 000 |
>
> <ins> **The calculation, step by step** </ins>
>
> 1. **Income for the tax year:** `getTaxEstimate` adds up the freelancer's own transactions with status `completed` whose date falls inside the current tax year. Refunded (cancelled) bookings and payments from earlier tax years are not counted.
> 2. **Find the bracket:** the first bracket whose upper limit is at or above the income.
> 3. **Tax before rebates:** `base + (income - bracket start) x rate`.
> 4. **Apply the rebate:** subtract the primary rebate of R17 820. The result is never allowed to go below R0 and is rounded to the cent.
> 5. **Derived figures:** the effective rate (`tax / income`) and the income after tax (`income - tax`).
>
> Worked examples (each one is also a unit test in `backend/tests/tax.test.js`):
>
> | Income | Working | Estimated tax | Effective rate |
> |---|---|---|---|
> | R80 000 | 18% x 80 000 = 14 400, minus 17 820 is below zero | R0 | 0% |
> | R99 000 | 18% x 99 000 = 17 820, minus 17 820 | R0 | 0% |
> | R300 000 | 44 118 + 26% x (300 000 - 245 100) = 58 392, minus 17 820 | R40 572 | 13.5% |
> | R1 000 000 | 259 783 + 41% x (1 000 000 - 887 000) = 306 113, minus 17 820 | R288 293 | 28.8% |
>
> <ins> **Insights** </ins>
>
> Next to the estimate, `buildInsights` turns the figures into plain language guidance:
>
> - **Projected tax this year:** continues the pace of the year so far in a straight line (income x days in the year / days elapsed) and estimates the tax on that projected income. Early in the year the projection is based on at least 30 days, so a single payment in the first week does not produce an unrealistic figure.
> - **Tax threshold progress:** how far the income is towards R99 000, shown as an accessible progress bar.
> - **Set aside:** how much of every R1 000 earned to put aside for tax, based on the projected effective rate.
> - **Next tax bracket:** where the next bracket starts, its rate, and how much more income it takes to reach it.
>
> If the current tax year has no table in `utils/tax.js` yet, the newest table is used and the response sets `rates.outOfDate`, which makes the dashboard show a warning that the rates may be out of date.
>
> <ins> **Assumptions and limits** </ins>
>
> The estimate is for planning only and the dashboard says so. It treats HustleHub+ income as the freelancer's total taxable income for the year, assumes the freelancer is under 65 (only the primary rebate), and ignores deductions, other income, medical tax credits and provisional tax rules.
>
> <ins> **How it is displayed** </ins>
>
> The freelancer dashboard (`DashboardExtras.tsx`) shows:
>
> - **Total income** with an animated count and a **six month income line chart** (`LineChart`).
> - An **income per gig donut chart** (`Donut`) and the three most recent bookings.
> - The **`TaxSummary`** section: the tax year and its dates, three cards for income this tax year, estimated tax and income after tax, a bar showing the effective rate, and four insight cards (projected tax, threshold progress, set aside and next bracket), followed by the disclaimer. The cards use the Spotlight Card style from React Bits (React Bits, 2026).
>
> _The freelancer dashboard with the income and tax estimate._
> 
> <img width="1917" height="818" alt="Screenshot 2026-11-08 130826" src="https://github.com/user-attachments/assets/8176f9f2-72fc-446f-a00a-1b356d8b0d16" />
> 
> <img width="1917" height="860" alt="Screenshot 2026-11-08 130711" src="https://github.com/user-attachments/assets/73886d60-bd3b-43b9-bf17-8275f3730e97" />
>
> <ins> **Security of the tax data** </ins>
>
> The tax estimate route uses `validateAuth` and `validateRole("freelancer")`, and the controller only reads transactions where `freelancerId` is the logged in user, so a freelancer can only ever see their own figures. Clients and admins receive `403`, and a request without a token receives `401`. These four cases are covered by the Postman collection.
>
> <ins> **How the tax figures are tested** </ins>
>
> - `backend/tests/tax.test.js` (14 tests) checks every bracket, the rebate, the threshold, the tax year dates and the insights against figures worked out by hand from the SARS table.
> - `TaxSummary.test.tsx` (10 tests) checks how the dashboard section displays each case.
> - `tax.spec.js` (Playwright) books a R300 000 gig, completes it, and checks that the real dashboard shows R300 000 income, R40 572 estimated tax and R259 428 after tax, the same as the worked example above and the API. It then cancels a booking and checks that the income and tax go back down.

### ⚙️ CI/CD Pipeline:

> [!note]
> **Note on the pipeline status:** from 8 November 2026 new GitHub Actions runs stop within a second with the message "The job was not started because recent account payments have failed or your spending limit needs to be increased", because of a billing limit on the account that hosts this repository. No workflow or code change caused this. The last runs that completed successfully are on commit `98dd1f7`: [CI](https://github.com/EMECPE/insy7314-2026-poe-kylelotter/actions/runs/42414119570), [Static analysis](https://github.com/EMECPE/insy7314-2026-poe-kylelotter/actions/runs/42414119489) and [CodeQL](https://github.com/EMECPE/insy7314-2026-poe-kylelotter/actions/runs/42414119614). The pipeline screenshots in this README were taken from successful runs on or before that commit.

> [!important]
> <ins> **Overview** </ins>
>
> The pipeline is made up of three GitHub Actions workflows in `.github/workflows/`. All three run automatically on every push and pull request to `main`, and CodeQL also runs weekly (GitHub, 2026b).
>
> | Workflow | File | Purpose |
> |---|---|---|
> | **CI** | `ci.yml` | Repository hygiene, unit tests, builds, dependency audits, API tests with Newman, frontend integration tests with Playwright, building and running both Docker containers, and publishing both images to Docker Hub |
> | **Static analysis** | `static-analysis.yml` | ESLint (linting) and Prettier (formatting) on the backend and the frontend |
> | **CodeQL** | `codeql.yml` | Security scanning of all JavaScript and TypeScript code |
>
> <ins> **CI workflow jobs (`ci.yml`)** </ins>
>
> | Job | Steps | Fails when |
> |---|---|---|
> | **No secrets or logs committed** | Lists every tracked `*.key`, `.env` and `*.log` file | Any of those files is in the repository |
> | **Backend tests and dependency audit** | `npm ci`, `npm test` (68 unit tests), `npm audit --omit=dev --audit-level=high` | A test fails, or a production dependency has a high or critical vulnerability |
> | **Frontend tests, build and dependency audit** | `npm ci`, `npm test` (134 Vitest tests), `npm run build`, `npm audit --omit=dev --audit-level=high` | A test fails, TypeScript or Vite cannot build, or the audit finds a high or critical vulnerability |
> | **API tests with Newman** | Starts a MongoDB 7 service container, creates a throwaway certificate with OpenSSL (OpenSSL, 2026), installs the backend and Newman, runs the Postman collection with `run-api-tests.js` and keeps the output as the `newman-output` artifact | Any Postman test fails |
> | **Frontend integration tests with Playwright** | Starts a MongoDB 7 service container, creates a throwaway certificate, installs the backend, frontend and Playwright, installs Chromium, then runs `npx playwright test`, which builds the React app, starts the API and the app, seeds test accounts, runs the 32 browser tests and removes the test data. The HTML report is kept as the `playwright-report` artifact | Any Playwright test fails, or the API or the React app does not start |
> | **Docker images build and run** | Creates a throwaway certificate and `backend/.env`, runs `docker compose up --build -d --wait`, then uses `curl` to check the API health check, the frontend, the API's `X-Frame-Options` header and the frontend's `Content-Security-Policy` header, prints the container logs and stops the stack | An image does not build, a container does not become healthy, or a check does not get the expected answer |
> | **All checks passed** | Runs only when every job above succeeded | Any job above failed |
> | **Publish images to Docker Hub** | Runs only after **All checks passed**, and only for a push to `main`, never for a pull request. Signs in to Docker Hub with the `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets, sets up Docker Buildx, then builds and pushes `hustlehub-backend` and `hustlehub-frontend`, each tagged `latest` and with the commit SHA (Docker, 2026b) | The sign in fails, or an image does not build or push |
>
> <ins> **How the pipeline meets each requirement** </ins>
>
> | Requirement | Where it happens |
> |---|---|
> | Install required packages | `npm ci` in every Node.js job, which also fails if `package.json` and the lock file disagree (npm, 2026b). |
> | Backend and frontend tests, failing the pipeline if a test fails | `npm test` in the backend and frontend jobs (unit tests), Newman in the API test job (backend integration tests) and Playwright in the integration test job (frontend integration tests) |
> | Build the application | `npm run build` in the frontend job, and both images in the Docker job |
> | Build the containers | `docker compose up --build` in the Docker job |
> | Publish to Docker Hub | The **Publish images to Docker Hub** job pushes both images, tagged `latest` and with the commit SHA, after every other check has passed |
> | Static code analysis | ESLint in `static-analysis.yml` and CodeQL in `codeql.yml` |
> | Formatting with Prettier | `npm run format:check` in `static-analysis.yml` |
> | Security checks | CodeQL (`security-extended` queries), `npm audit` on production dependencies, and the secrets and logs check |
>
> <ins> **Pipeline security** </ins>
>
> - The workflow token can only read the repository (`permissions: contents: read`).
> - Secrets used in the pipeline only exist for that run: the certificate is generated in the job and the `JWT_SECRET` is a throwaway value. No real secret is stored in the repository.
> - The Docker Hub username and access token are stored as GitHub repository secrets (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`), never in the workflow file, and GitHub hides their values in the run logs (GitHub, 2026c). The token is a Docker Hub personal access token rather than the account password, so it can be limited to pushing images and revoked at any time without changing the password (Docker, 2026e).
> - Only a push to `main` publishes, and only after every job in `ci.yml` has passed, so a failing commit never reaches Docker Hub and a pull request never has access to the Docker Hub secrets. The `.dockerignore` files keep `.env` files, logs and keys out of the published images.
> - A newer push to the same branch cancels the older run (`concurrency`), so only the latest commit is reported.
> - The CI jobs have time limits (`timeout-minutes`), so a stuck step cannot keep the pipeline running.
>
> _A successful pipeline run with all workflows green._
> 
> <img width="1600" height="876" alt="1 ci" src="https://github.com/user-attachments/assets/1a5b6a5f-8def-4e56-9d17-9d6c5a267938" />

### 🔍 Static Code Analysis:

> [!important]
> <ins> **Tools** </ins>
>
> | Tool | What it checks | Configuration |
> |---|---|---|
> | **ESLint** | Code quality problems and likely bugs, such as unused variables, `==` instead of `===`, `var`, and direct `console.log` calls outside the logger | `backend/eslint.config.js` (recommended rules plus project rules) and `frontend/eslint.config.js` (TypeScript, React Hooks and React Refresh rules) (ESLint, 2026). |
> | **Prettier** | Consistent formatting, so reviews focus on what code does rather than how it is laid out | `.prettierrc.json` in each app, with `eslint-config-prettier` so the two tools never disagree (Prettier, 2026). |
> | **CodeQL** | Security weaknesses in the JavaScript and TypeScript code, such as injection, cross-site scripting, unsafe regular expressions and missing rate limiting, using the `security-extended` query suite (GitHub, 2026a). | `.github/workflows/codeql.yml` |
> | **npm audit** | Known vulnerabilities in the production dependencies of both apps (npm, 2026a). | `ci.yml` |
>
> GitHub code scanning (Advanced Security) is not available on this repository, so `codeql.yml` does not upload results to the Security tab. Instead it saves the results as a SARIF file, attaches them to the run as the `codeql-results` artifact, and writes the number of alerts and a table of each rule, severity and location to the run summary page.
>
> <ins> **How the checks run** </ins>
>
> Every check runs automatically on every push and pull request to `main`, and each one fails its workflow when it finds a problem, so code that does not pass cannot be merged unnoticed:
>
> | Check | Command in the pipeline | Fails the workflow when |
> |---|---|---|
> | ESLint | `npm run lint` (backend and frontend) | Any rule set to `error` is broken |
> | Prettier | `npm run format:check` (backend and frontend) | Any file is not formatted to the Prettier rules |
> | CodeQL | `github/codeql-action/analyze` with the `security-extended` queries | The analysis cannot run; alerts are listed on the run summary and in the `codeql-results` artifact |
> | npm audit | `npm audit --omit=dev --audit-level=high` (backend and frontend) | A production dependency has a high or critical vulnerability |
>
> The same checks can be run locally before pushing:
>
> ```bash
> # In the backend folder, then again in the frontend folder
> npm ci
> npm run lint
> npm run format:check
> npm audit --omit=dev
> ```
>
> <ins> **Results** </ins>
>
> | Check | Result |
> |---|---|
> | Backend ESLint | 0 errors, 0 warnings |
> | Frontend ESLint | 0 errors, 0 warnings |
> | Backend Prettier | All matched files use Prettier code style |
> | Frontend Prettier | All matched files use Prettier code style |
> | Backend `npm audit --omit=dev` | 0 vulnerabilities |
> | Frontend `npm audit --omit=dev` | 0 vulnerabilities |
> | CodeQL (`security-extended`) | 10 alerts on the last successful run, all `warning` severity, down from 26 on the first run (listed below) |
>
> Output of the final local run on the submitted code:
>
> ```text
> backend> npm run lint
> > eslint .
> (no output: no problems found)
>
> backend> npm run format:check
> Checking formatting...
> All matched files use Prettier code style!
>
> backend> npm audit --omit=dev
> found 0 vulnerabilities
>
> frontend> npm run lint
> > eslint .
> (no output: no problems found)
>
> frontend> npm run format:check
> Checking formatting...
> All matched files use Prettier code style!
>
> frontend> npm audit --omit=dev
> found 0 vulnerabilities
> ```
>
> _The static analysis workflow and the CodeQL run summary. The CodeQL screenshot was taken before the final small fix and shows 11 alerts, and the last successful run reports 10._
> 
> <img width="1600" height="486" alt="2 ESLint and Prettier" src="https://github.com/user-attachments/assets/274a30c3-58bb-4d81-904f-504c18d03b20" />
> 
> <img width="1600" height="889" alt="3 CodeQL run summary" src="https://github.com/user-attachments/assets/274eaee3-27fa-4591-81cf-0b7a5a295c1c" />
> 
> 
> <ins> **What the results indicate** </ins>
>
> - **ESLint with 0 problems** means there are no unused variables or imports, no loose `==` comparisons, no `var` declarations and no stray `console.log` calls that bypass the logger. These are the small mistakes that hide real bugs, for example a value that was meant to be used but never is.
> - **Prettier passing** means every file follows one layout. This matters for security as well as readability, because a reviewer can see exactly what a change does instead of reading through formatting noise.
> - **npm audit with 0 vulnerabilities** means none of the packages that run in production has a known published vulnerability at the time of the run.
> - **CodeQL** follows how data moves through the code, from a request to the database or the page, and reports places where untrusted input could reach something dangerous without being checked. Its result shows whether the validation, sanitisation and access control described in this README hold up under an automated review (GitHub, 2026a).
>
> Together they show that the code is consistent and has no known vulnerable dependencies.
>
> <ins> **Issues found, why they are issues, and how they were fixed** </ins>
>
> | # | Found by | Issue | Why it is an issue | Fix |
> |---|---|---|---|---|
> | 1 | npm audit | Three production dependency advisories in the backend, in `body-parser`, `qs` and `ip-address` | These packages handle every incoming request body, query string and IP address, so a known vulnerability in them is reachable by any user of the API. The pipeline's audit step fails on high or critical findings, so the build could not pass | `npm audit fix` updated them to `body-parser` 2.4.0, `qs` 6.17.1 and `ip-address` 10.7.6. The production audit now reports 0 vulnerabilities (commit `9ea664f`) |
> | 2 | Pipeline review (hygiene check) | Runtime log files in `backend/logs/` were tracked in git | The logs contain member email addresses and IP addresses, so committing them publishes personal data together with the code, and it stays in the git history | The log files were removed from git, `backend/logs/` and `*.log` were added to `.gitignore` (commits `9ea664f` and `a7c9613`), and the CI hygiene job now fails if a log, key or `.env` file is ever committed |
> | 3 | ESLint (`no-unused-vars`) | The central error handler in `app.js` declared a `next` parameter that was never used | Unused values are a warning sign that something was meant to happen and does not. Removing the parameter would also be wrong, because Express only treats a function with four parameters as an error handler, so errors would no longer reach it and could leak a default stack trace | The parameter was renamed to `_next`, and the ESLint rule allows names that start with an underscore. A comment in `app.js` explains why the parameter must stay (commit `f7921d9`) |
> | 4 | ESLint (`no-unused-vars`) | `getGigs` in `gigController.js` read a `status` value from the query string but never used it | It suggests the public gig list can be filtered by status when it cannot. Someone could later wire it in and accidentally let the public list show paused or draft gigs, which are private to the freelancer | The unused `status` value was removed, so the public list can only ever return `active` gigs (commit `f7921d9`) |
> | 5 | ESLint review | Token signing (`generateToken`) lived inside `authController.js`, which also kept a `jsonwebtoken` import, and `otpController.js` imported it from that controller | Security code that is copied or shared between controllers is easy to change in one place and not the other, for example the expiry or the claims. Controllers importing each other also creates circular dependencies once the two-factor controller needs the same function | Token signing moved to one module, `utils/token.js`, used by every controller, with a unit test that checks the id and role claims (commit `f7921d9`) |
> | 6 | Prettier (`format:check`) | Backend files used mixed formatting, for example single quotes and 4 space indents in `dbMiddleware.js` and very long lines in the controllers | Inconsistent formatting makes changes hard to review, so a security relevant change can hide inside a large formatting diff | `npm run format` was run once over the backend and frontend, and `format:check` now fails the pipeline if any file drifts (commit `f7921d9`) |
> | 7 | Static analysis workflow | The static analysis workflow ran on Node.js 22, but the sanitiser uses `RegExp.escape`, which needs Node.js 24 | The checks would run on a different Node.js version from the one the Docker images use, so a problem could pass in one and fail in the other | The workflow was moved to Node.js 24 and an `engines` field was added to the backend `package.json`, matching the Docker images (commit `9ea664f`) |
> | 8 | Security review of the code (the same issue types CodeQL reports) | Hand written regular expressions were used to strip HTML, escape search text and check IDs and codes, for example `/<(script\|style)\b[\s\S]*?(<\/\1\s*>\|$)/gi` | Home made sanitising patterns are a common source of incomplete sanitisation (a payload the pattern does not expect gets through) and of regular expression denial of service, where crafted input makes the pattern run for a very long time and blocks the server (OWASP Foundation, 2026h) | They were replaced with documented built-ins: `RegExp.escape` for search text, the `URL` API for links, `isObjectIdOrHexString` for IDs and simple length and character checks for codes and text (commit `83912ea`) |
> | 9 | Security review of the logs | Log messages contained users' full email addresses, and every line was also sent to Better Stack | Email addresses are personal information. Copying them in full to rotating files and a third party service spreads personal data further than needed, and a leaked log becomes a list of real accounts to attack (OWASP Foundation, 2026l; South Africa, 2013) | Every log message now passes email addresses through `utils/maskEmail.js`, which keeps only the first letter and the domain, for example `k***@gmail.com`, while the account ID still identifies the user (own feature 12) |
>
> <ins> **CodeQL findings and how they were fixed** </ins>
>
> The first CodeQL run on `main` reported 26 alerts. CodeQL follows data from a request to the places it is used and warns wherever untrusted input could reach something dangerous (GitHub, 2026a). 17 of them were fixed in pull requests #43 (`fix/static-analysis-findings`) and #44 (`fix/codeql-remaining-alerts`), and one new alert appeared after the certificate fix, so the last successful run on `main` (run 42414119614) reports 10 alerts across 6 rules. The fixed alerts are listed first. For the remaining ones, the Fix column explains how the code already prevents the attack the alert describes.
>
> | Alert | Status | Where | Why it is an issue | Fix |
> |---|---|---|---|---|
> | `js/sql-injection` (NoSQL injection) | Fixed (14 of 15) | `otpController.js`, `authController.js`, `accountController.js`, `bookingController.js`, `twoFactorController.js` | Database queries were built from request values, for example `User.findOne({ email })`. If a request sends an object such as `{ "$ne": null }` instead of a string, MongoDB reads it as a query operator, which could match another user's account or record without knowing its value (OWASP Foundation, 2021) | Every value taken from the request is now wrapped in the `$eq` operator, for example `User.findOne({ email: { $eq: email } })`, and the booking lookup uses `Gig.findOne({ _id: { $eq: gigId } })` instead of `findById`. `$eq` makes MongoDB compare the value as a plain value, so an object sent in its place can never act as an operator. This is the fix CodeQL recommends (GitHub, 2026d), and it is an extra layer on top of the validators and the sanitiser, which already refuse non-string values and keys starting with `$` (commit `a9403c6`) |
> | `js/sql-injection` (NoSQL injection) | Fixed (1 of 1) | `profileController.js` | The profile save query used values from the request. The profile validator only copied a fixed list of checked fields, but CodeQL still followed the request data into the query | The profile save no longer passes the request body to the database. A new helper, `utils/profileUpdate.js`, copies each known profile field into the update only when it is plain text, true or false, or a list of plain text, so a query operator such as `{ "$ne": "" }` or a field the profile does not have can never reach the update. The query itself is tied to the logged in user from the verified token (`req.user._id`), never to an ID sent in the request. `backend/tests/profileUpdate.test.js` (8 tests) checks the copied values, the dropped fields and operators, lists with mixed items, and that the field list matches the profile model (commit `b4e5708`) |
> | `js/remote-property-injection` | Covered by the code (2) | `sanitizeMiddleware.js` | The sanitiser copies keys chosen by the request onto new objects. A key such as `__proto__` can change an object's prototype instead of adding a normal property (prototype pollution) (GitHub, 2026g; MDN Web Docs, 2026g) | The `__proto__` key is now skipped with a direct comparison (`key === "__proto__"`) at the exact point where keys are copied, so the guard sits next to the write it protects. Every key that starts with `$` or contains a dot is skipped in the same place. `backend/tests/sanitize.test.js` checks that `__proto__` is dropped at the top level and when nested (commits `a5f3e3f` and `c1de9e7`). CodeQL still lists the two writes, because it does not recognise this check as a guard, but the code already stops the attack the alert describes |
> | `js/disabling-certificate-validation` | Fixed (1 of 1) | `Postman_Testing/run-api-tests.js` | The Newman runner's health check switched off HTTPS certificate checks (`rejectUnauthorized: false`), so it would trust any server, including one placed in the middle by an attacker, and would hide real certificate problems (GitHub, 2026e) | The health check now reads the repository's `ca.crt` and passes it as the `ca` option of `https.get`, so the local certificate is verified against the project's own certificate authority like any other certificate (Node.js, 2026c) (commit `8c102f3`) |
> | `js/log-injection` | Fixed (1 of 1) | `backend/utils/logger.js` | A logged value containing a line break could start a fake line in the logs, for example a forged error entry, which makes the logs unreliable as evidence (OWASP Foundation, 2026l) | A new `stripLineBreaks` function removes carriage returns and new lines from every message before it is written to the log files, printed to the terminal or sent to Better Stack, and from the error line added after a message, so one log call always produces exactly one entry (GitHub, 2026f). `backend/tests/logger.test.js` checks that a message containing a forged entry stays on one line (commit `3d8ce9c`) |
> | `js/user-controlled-bypass` | Covered by the code (4) | `authController.js` (2), `authMiddleware.js` (2) | A condition based on request data (whether the email, password or token is present) sits in front of a sensitive action, checking the password or the token. An attacker controls that data, so the condition must never be able to let a request through (GitHub, 2026i) | The conditions only ever deny, they never grant. A missing email or password is rejected with `400` before any account is looked up, and a missing, malformed, expired, revoked or wrongly signed token is rejected with `401` before any controller runs (fail closed). Leaving a value out can never skip `bcrypt.compare()` or `jwt.verify()`, because a request without them is refused. The role used by `validateRole` is read from the database user, not from the request or the token, and the `401` and `403` cases are covered by the Postman and Playwright tests |
> | `js/incomplete-multi-character-sanitization` | Covered by the code (1) | `frontend/src/utils/sanitize.ts` | HTML tags are removed with a regular expression. Nested input such as `<scr<script>ipt>` can rebuild a tag from the pieces left behind, which is a classic way around a sanitiser (GitHub, 2026h) | `sanitizeText` repeats the tag, `javascript:` and event handler removal until the text stops changing, so a nested payload cannot rebuild itself, and it then removes every remaining `<` and `>`, so no tag can survive. This is only the first layer: the server strips HTML tags from every string again with a scanner instead of a regular expression, React escapes everything it renders, and the production Content Security Policy only allows scripts and styles from the app itself, with no inline or `eval` code. `sanitize.test.ts` tests nested payloads, and `security.spec.js` (Playwright) checks that stored markup is shown as text and never runs |
> | `js/clear-text-storage-of-sensitive-data` | Covered by the code (1) | `frontend/src/services/session.ts` | The login token is kept in `sessionStorage`, so a script that managed to run on the page could read it and use the session (GitHub, 2026k) | The token is stored in `sessionStorage` on purpose, so it is cleared when the tab closes, and the password is never stored. What would let a script run is blocked: the production Content Security Policy allows no inline or `eval` scripts, input is sanitised on both sides, and React escapes rendered text. The token also expires after 7 days, is revoked when the password is changed or reset, and the session is cleared on any `401` response. This is listed under the remaining risks in the [Final Security Review](#%EF%B8%8F-final-security-review) |
> | `js/http-to-file-access` | Covered by the code (1) | `backend/utils/logger.js` | Data from requests is written to a file, so the content of the log files is partly controlled by users (GitHub, 2026j) | Writing request data to the log is the purpose of the logger, and the code limits what a user can do with it. `stripLineBreaks` stops forged log lines, email addresses are masked, passwords, hashes, tokens and codes are never logged, and CSP report values are cut to 200 characters with control characters removed before they are logged. The files are never served to anyone, `backend/logs/` and `*.log` are ignored by git, and the pipeline fails if a log file is committed |
> | `js/file-access-to-http` | Covered by the code (1) | `Postman_Testing/run-api-tests.js` | New since the certificate fix above: the runner reads `ca.crt` from disk and uses it in an HTTPS request, and CodeQL warns whenever file contents flow into a network request in case a private file is sent out | The only file read for the request is `ca.crt`, the public certificate authority file, which holds no secret. It is passed as the trusted `ca` option to check the server certificate and is never sent as request data. The private keys (`ca.key` and `cert.key`) are never read by the runner, and `*.key` is ignored by git |
>
> ESLint's `no-console` rule also stays switched on, so any new direct `console.log` outside the logger is flagged. This keeps every event going through `utils/logger.js`, where it reaches the log files and Better Stack instead of only the terminal.


### 🐳 Dockerisation:

> [!important]
> <ins> **Overview** </ins>
>
> The backend and the frontend are built as two separate images and run as two separate services managed by Docker Compose. The Dockerfiles are based on the approach demonstrated by rudderz243 (2026).
>
> | | Backend (`hustlehub-backend`) | Frontend (`hustlehub-frontend`) |
> |---|---|---|
> | **Dockerfile** | `backend/Dockerfile` | `frontend/Dockerfile` |
> | **Base image** | `node:24-alpine` | Build stage `node:24-alpine`, final stage `nginxinc/nginx-unprivileged:alpine` |
> | **What runs** | `node app.js` with `NODE_ENV=production` | Nginx serving the built React files over HTTPS |
> | **Port** | `EXPOSE 3000`, published as `3000:3000` | `EXPOSE 5173`, published as `5173:5173` |
> | **User** | Non-root `node` user | Non-root Nginx user (`101`) |
> | **Dependencies** | `npm ci --omit=dev`, so only production packages are in the image | Dev dependencies only exist in the build stage, the final image only holds the static files |
> | **Health check** | Node requests `/api/health` over HTTPS | `curl` requests the home page over HTTPS |
>
> <ins> **How the images are built** </ins>
>
> - **Backend:** copies `package.json` and `package-lock.json` first and installs the production dependencies, so the dependency layer is cached between builds. It then copies the source, creates a `logs` folder owned by the `node` user, switches to that user and starts the server with `node` directly so shutdown signals and exit codes reach the process.
> - **Frontend:** a two stage build. The first stage installs the dependencies and runs `npm run build` (TypeScript check and Vite build) with the API address passed in as the `VITE_API_URL` build argument. The second stage copies only the `dist` folder into unprivileged Nginx. `nginx.conf` is copied in as a template, and the official Nginx image fills in `API_ORIGIN` when the container starts, so the Content Security Policy points at the right API without editing the file (Docker, 2026d).
> - **`.dockerignore`:** both apps exclude `node_modules`, build output, log files, `.env` files and git files, so secrets are never copied into an image layer.
>
> <ins> **Docker Compose (`docker-compose.yml`)** </ins>
>
> | Requirement | How it is done |
> |---|---|
> | **Separate services** | `backend` and `frontend` are two services, each built from its own folder. |
> | **Bridge network** | Both services join `app-network`, a user defined network with the `bridge` driver (Docker, 2026c). |
> | **Log volume** | `./backend/logs:/app/logs` maps the backend's log folder to `backend/logs` on the host, so the daily log files can be read and kept outside the container. |
> | **Environment variables** | `env_file: ./backend/.env` passes the connection string, JWT secret, email, Better Stack and other settings into the backend. `NODE_EXTRA_CA_CERTS` points Node at the mounted CA file. |
> | **CORS as an environment variable** | `ALLOWED_ORIGINS` is passed to the backend (default `https://localhost:5173`) and read by `securityMiddleware.js`. |
> | **Certificates** | `cert.crt`, `cert.key` and `ca.crt` are mounted read-only (`:ro`) into the backend, and `cert.crt` and `cert.key` into Nginx. The keys are never part of an image. |
> | **Start order** | The frontend `depends_on` the backend with `condition: service_healthy`, so it only starts once the API answers its health check. |
> | **Hardening** | Both services use `no-new-privileges:true`, the backend uses `init: true` to pass signals and exit codes through, and both restart `unless-stopped`. |
> | **Container log rotation** | The `json-file` logging driver keeps at most 3 files of 10 MB per container, so container output cannot fill the disk. |
>
> The pipeline builds both images and starts the stack with `docker compose up --build -d --wait`, which only returns once both services are running and healthy (Docker, 2026a). This happens on every push (see [CI/CD Pipeline](#%EF%B8%8F-cicd-pipeline)), which proves the containers start and become healthy.
>
> <ins> **Publishing to Docker Hub** </ins>
>
> After every CI job passes on `main`, the **Publish images to Docker Hub** job builds the two images again with Docker Buildx and pushes them to two separate Docker Hub repositories, [`st10336577/hustlehub-backend`](https://hub.docker.com/r/st10336577/hustlehub-backend) and [`st10336577/hustlehub-frontend`](https://hub.docker.com/r/st10336577/hustlehub-frontend) (Docker, 2026b). The account username is public by design and is not a secret; only the access token is kept secret, in GitHub's repository secrets. Each image gets two tags:
>
> | Tag | Purpose |
> |---|---|
> | `latest` | Always the newest image that passed every check |
> | The commit SHA, for example `hustlehub-backend:391eb7c...` | Ties the image to the exact commit it was built from, so any published image can be traced back to its code, and an older version can be pulled again if needed |
>
> The published frontend image is built with the default local API address (`https://localhost:3000/api`) from the `VITE_API_URL` build argument in `frontend/Dockerfile`.
>
> _`docker compose ps` with both containers healthy._
> 
> <img width="1600" height="312" alt="docker compose ps" src="https://github.com/user-attachments/assets/19f5e085-47f6-429b-8d6e-b2cabd7240a3" />

### 📜 Logging:

> [!important]
> <ins> **Purpose of logging** </ins>
>
> Logging records what happens inside the application while it runs. For HustleHub+ the logs answer three questions: **who did what, and when** (a record of logins, bookings, payments and admin actions), **is someone attacking the system** (repeated failed logins, blocked access attempts, rate limit hits, CSP violations) and **what went wrong** (database problems, crashes and unexpected errors, with enough detail to fix them). This follows the OWASP guidance that applications should log security events so that attacks can be detected, investigated and responded to (OWASP Foundation, 2026l).
>
> <ins> **How it works** </ins>
>
> All logging goes through one module, `utils/logger.js`, with three levels: `INFO` for normal events, `WARN` for refused or suspicious requests, and `ERROR` for failures. Every entry has a timestamp, a level, a context (the part of the system it came from) and a message, which covers the *when*, *where* and *what* that OWASP says every security log entry needs (OWASP Foundation, 2026l). The format is:
>
> ```text
> [YYYY-MM-DD HH:mm:ss] [LEVEL] [CONTEXT]: message
> ```
>
> Each entry is written to three places at once:
>
> | Destination | Details |
> |---|---|
> | **Terminal** | A coloured line (green for `INFO`, yellow for `WARN`, red for `ERROR`). In Docker this is the container output shown by `docker compose logs`. |
> | **Daily log files** | Every entry is appended to `logs/YYYY-MM-DD-combined.log`, and `ERROR` entries also to `logs/YYYY-MM-DD-error.log`, so errors can be found without searching through every request. In Docker the folder is mapped to `backend/logs` on the host. |
> | **Better Stack (cloud)** | Each entry is sent as JSON over HTTPS to Better Stack, with the time, level, message, context, the service name `hustlehub-api` and the environment (Better Stack, 2026). |
>
> The cloud transport is built so it can never affect users: the request runs in the background with a 4 second timeout, network errors are ignored, and if `BETTERSTACK_SOURCE_TOKEN` is missing or still the placeholder value nothing is sent. Errors are logged with their name and message only, never the full stack trace.
>
> <ins> **Log levels** </ins>
>
> | Level | Used for | Example |
> |---|---|---|
> | `INFO` | Normal, successful events that form the audit trail | A login, a booking, a payment, a tax estimate |
> | `WARN` | Requests that were refused or look suspicious, which the system handled safely | A wrong password, a `403`, a rate limit hit, an account lockout |
> | `ERROR` | Something failed and may need a developer | A database error, an unhandled exception, an email that could not be sent |
>
> Using three levels means the error file and a search for `WARN` show what needs attention without reading through thousands of normal requests. Recording a severity level with each event is part of the OWASP list of event attributes (OWASP Foundation, 2026l).
>
> <ins> **What each part of a log entry records and why** </ins>
>
> The fields follow the OWASP event attributes: when the event happened, where in the application, who was involved, and what happened and with what result (OWASP Foundation, 2026l).
>
> | Element | Example | Why it is logged |
> |---|---|---|
> | **Timestamp** | `2026-11-07 12:08:39` | Puts events in order and shows how fast they happen. Five failed logins in two seconds is an attack, five in a week is a forgetful user. It is also needed to match an entry to a booking or a payment. |
> | **Level** | `WARN` | Separates normal activity from refused requests and failures, so problems can be filtered and counted. |
> | **Context** | `SECURITY` | Shows which part of the system the event came from, so all security events, or all payment events, can be pulled out together. |
> | **Message** | `Account locked: ... locked for 15 minutes` | A plain description of what happened, readable without the code. |
> | **User (masked email, username, ID and role)** | `"Test Client" (client)`, `i***@hustlehub.test` | Accountability: shows who did something. Emails are masked (see own feature 12) because the ID already identifies the exact account. For failed logins it shows which account is being targeted, and for `403`s which user tried to go beyond their role. |
> | **Resource IDs** | Booking, gig and freelancer IDs | Links a log entry to the exact record in MongoDB, so a disputed booking or payment can be checked against the database. |
> | **Transaction reference, amount and method** | `TXN-1794046133980-019DA8`, `R1500`, `simulated_card` | Gives an independent record of every payment and refund that can be compared with the stored transactions. |
> | **HTTP method, URL and status code** | `GET /api/transactions/tax-estimate 403` | Shows exactly what was requested and what the API decided. Patterns of `401`, `403` and `404` responses show scanning and probing. |
> | **Client IP address** | `::1` | Shows where requests come from, so a single source of many failures can be spotted and blocked. |
> | **Duration** | `(25ms)` | Shows slow endpoints and possible denial of service attempts. |
> | **Error name and message** | `Error: Connection timeout after 5000ms` | Enough detail to find the cause, without a full stack trace that could expose file paths if logs were ever shared. |
> | **Service and environment** (Better Stack only) | `hustlehub-api`, `production` | Keeps entries from different apps and environments apart in the cloud dashboard. |
>
> <ins> **Logging middleware** </ins>
>
> `middleware/loggerMiddleware.js` is the first middleware in `app.js`, so it sees every request. It waits until the response has been sent and then logs one line with the HTTP method, URL, status code, how long the request took, the client IP address and, for logged in users, the username. Responses with a `5xx` status are logged as `ERROR`, `4xx` as `WARN` and everything else as `INFO`. Because the middleware writes through `utils/logger.js`, every request line is also published to Better Stack, so the cloud platform receives the full request history as well as the individual events below.
>
> <ins> **What is logged and why** </ins>
>
> The events logged match the ones OWASP says should always be recorded: authentication successes and failures, authorisation (access control) failures, input validation failures, session management failures such as invalid or revoked tokens, application errors and system events, and high risk business events such as payments (OWASP Foundation, 2026l). Consistent, fixed event names also make the logs easier to search and alert on (OWASP Foundation, 2026m).
>
> | Context | Events logged | Why it is logged |
> |---|---|---|
> | `HTTP` | Every request (method, URL, status, duration, IP, user), unknown routes (`404`), malformed JSON (`400`) and oversized bodies (`413`) | Gives a complete picture of traffic. Spikes of `4xx` responses from one IP point to scanning or guessing, and slow requests show performance problems. |
> | `AUTH` | Successful and failed logins (unknown email, wrong password, missing fields), registrations and code checks, password reset requests and resets, account and password changes | Login attempts are the first thing an attacker targets, so failed and successful logins together show brute force and credential stuffing attempts, and give a record of when each account was used. |
> | `SECURITY` | Missing, invalid, expired or revoked tokens, role checks that fail (`403`), account lockouts and logins blocked by a lock, two-factor codes sent, failed and enabled or disabled, and CSP violation reports | These are the events that show someone trying to reach something they should not. Logging them is what makes broken access control and attacks on accounts visible. |
> | `RATE_LIMIT` | Every time a limiter is exceeded, with the route and IP | Shows automated attacks and floods, and helps tune the limits so real users are not blocked. |
> | `BOOKINGS` | Bookings created (client, gig, freelancer, scheduled date), status changes with who made them, cancellations, and refused bookings or status changes | Bookings create financial records, so there must be a trail of who booked what and who changed it, including admin actions. |
> | `TRANSACTIONS` | Each simulated payment (reference, amount, method), refunds when a booking is cancelled, income summaries and tax estimates, and refused transaction lookups | Payments and income are the most sensitive business data. The log can be compared with the database if a figure is ever disputed. |
> | `GIGS` | Gigs created, updated and deleted, and refused updates or deletes by non-owners | Shows changes to what is offered on the marketplace and any attempt to change someone else's gig. |
> | `DATABASE` | Connection attempts, successful connection, errors, disconnects and reconnects | A lost database connection breaks almost every feature, so it must be noticed straight away. |
> | `SERVER` and `CRASH` | Missing environment variables at startup, server start, shutdown signals, unhandled errors, uncaught exceptions and unhandled promise rejections | Explains why the server stopped or refused to start, and catches errors that were not handled anywhere else. |
> | `APP` | Profile updates and profile errors | Records changes to what members share publicly. |
>
> <ins> **Example log entries (evidence)** </ins>
>
> These lines are taken from `backend/logs/2026-11-07-combined.log`, written while the Playwright tests ran against the API. They show a login, a failed login, an account lockout, two-factor login, a booking with its transaction, a refused request and a refund:
>
> ```text
> [2026-11-07 12:08:07] [INFO] [AUTH]: User logged in successfully: i***@hustlehub.test (Role: client, ID: 6aeef86f17697fd4901eea8f)
> [2026-11-07 12:08:14] [INFO] [SECURITY]: Two-factor login enabled for user "i***@hustlehub.test"
> [2026-11-07 12:08:16] [INFO] [SECURITY]: Two-factor login code dispatched to i***@hustlehub.test
> [2026-11-07 12:08:25] [WARN] [AUTH]: Login failed: Incorrect password attempt for email "i***@hustlehub.test"
> [2026-11-07 12:08:39] [WARN] [SECURITY]: Account locked: "i***@hustlehub.test" reached the limit of failed logins, locked for 15 minutes
> [2026-11-07 12:08:41] [WARN] [SECURITY]: Login blocked: Account "i***@hustlehub.test" is locked for another 899 seconds
> [2026-11-07 12:08:54] [INFO] [BOOKINGS]: Booking created successfully: ID 6aeef8b596884c3c383f3048 by client "Test Client" (6aeef86f17697fd4901eea8c) for gig "Playwright logo pack 818bb623" (Freelancer: 6aeef86e17697fd4901eea8b). Scheduled: 2026-11-07T10:08:53
> [2026-11-07 12:08:54] [INFO] [TRANSACTIONS]: Simulated transaction completed: Ref TXN-1794046133980-019DA8 for booking 6aeef8b596884c3c383f3048 (Amount: R1500, Method: simulated_card)
> [2026-11-07 12:09:24] [INFO] [BOOKINGS]: Booking 6aeef8d296884c3c383f304a cancelled by user "Test Client". Associated transaction marked refunded.
> [2026-11-07 12:09:24] [INFO] [TRANSACTIONS]: Transaction for booking 6aeef8d296884c3c383f304a marked refunded
> [2026-11-07 12:09:35] [WARN] [SECURITY]: Auth forbidden: User "Test Client" (client) attempted to access role-restricted route [freelancer] (GET /api/transactions/tax-estimate)
> [2026-11-07 12:09:35] [WARN] [HTTP]: GET /api/transactions/tax-estimate 403 (25ms) - IP: ::1 [User: Test Client]
> ```
>
> The accounts are throwaway test accounts created by the Playwright setup and deleted after the run. The email addresses appear masked, as they are written by the logger (own feature 12).
>
> <ins> **What is deliberately not logged** </ins>
>
> Passwords, password hashes, JWTs and passcodes are never written to the logs, following the OWASP guidance that logs must not contain secrets (OWASP Foundation, 2026l). Values are validated before they reach the logs (for example emails must match the email format), CSP reports have their control characters removed, and the logger removes line breaks from every message before it is written, so user input cannot forge a fake log line (log injection) (OWASP Foundation, 2026l). Email addresses are masked to their first letter and domain before they are logged (own feature 12). Because the logs still contain IP addresses and masked emails, `backend/logs/` and `*.log` files are ignored by git, and the pipeline fails if a log file is ever committed.
>
> <ins> **Why logging is important** </ins>
>
> Security controls can only block the attacks they were designed for. Logging is what shows an attack is happening, what was affected and whether the controls worked, so that the team can respond (OWASP Foundation, 2026l). OWASP lists Security Logging and Monitoring Failures (A09) in its Top 10, because without them breaches go unnoticed for a long time (OWASP Foundation, 2021). It also supports accountability, because every booking, payment and admin action can be traced back to a user and a time, and it makes problems faster to fix because the error, the request that caused it and the time it happened are all recorded together. Sending the logs to a cloud platform means they can be searched and monitored in one place, and they are kept even if the server or container is lost.
>
> <ins> **How the logs are used for monitoring and security** </ins>
>
> | Situation | What to look for in the logs |
> |---|---|
> | Reviewing the security history of one account | The stored audit events on the admin page, filtered by type (own features 6 and 9) |
> | Password guessing or credential stuffing | Many `Login failed` entries for one account (then `Account locked`) or for many accounts from one IP |
> | Someone probing for data they should not see | `Auth forbidden` and `403` entries from one user, or `401` entries for protected routes without a token |
> | A flood of automated requests | `RATE_LIMIT` entries for the same IP and route |
> | An attempted cross-site scripting attack | CSP violation reports under `SECURITY` |
> | A disputed booking or payment | The `BOOKINGS` and `TRANSACTIONS` entries for that booking ID or transaction reference |
> | An admin changing someone else's booking or gig | Status changes and updates logged with the admin's username and role |
> | The application failing | The daily error file, and `DATABASE`, `SERVER` and `CRASH` entries |
>
> In Better Stack these can be searched across every container and every day in one place, and the live tail shows them as they happen (Better Stack, 2026).
>
> <ins> **Setting up and checking cloud logging** </ins>
>
> 1. Create an HTTP source in Better Stack and copy its **source token** and **ingesting host**.
> 2. Add them to `backend/.env` as `BETTERSTACK_SOURCE_TOKEN` and `BETTERSTACK_INGESTING_HOST`.
> 3. Run the logger check from the `backend` folder:
>
> ```bash
> npm run test:logger
> ```
>
> The script writes sample entries for each context, checks that the combined and error log files exist and contain the right lines (and that the error file only holds errors), and sends a test entry to Better Stack, reporting whether it was accepted.
>
> _Screenshots of the log files and the Better Stack dashboard._
> 
> <img width="1600" height="962" alt="backend Logs" src="https://github.com/user-attachments/assets/7b9e7f02-d6bc-40c6-a212-6da3e457bdd7" />
> 
> <img width="1600" height="916" alt="beterstack" src="https://github.com/user-attachments/assets/af103011-e74c-477a-abed-8f86f94ee13c" />
> 
> <img width="1600" height="760" alt="live tail" src="https://github.com/user-attachments/assets/2c9ece1e-1763-4f68-bfd0-51043112e5a0" />
> 
> <img width="1600" height="760" alt="live tail 2" src="https://github.com/user-attachments/assets/9aa1e327-b99b-411c-afa4-b4d14ccbe048" />

### 🔐 Security Implementation:

> [!important]
>
> This project follows **secure-by-design development**, meaning security is built into every stage of the codebase rather than added on afterward (The IIE, 2026). In practice, this means: all input is validated before it's processed, no secrets (API keys, passwords, etc.) are hardcoded into the code, HTTP responses use status codes that accurately reflect the outcome of a request, error messages avoid exposing unnecessary internal detail, authentication and authorization are enforced wherever access needs to be restricted, and dependencies are kept up to date to patch known vulnerabilities (The IIE, 2026).
>
> <ins> **Security Decisions of HustleHub+** </ins>
>
> **Password Hashing**
>
> *What it is*
>
> Hashing converts a plain-text password into a fixed-length string using a one-way mathematical function. Unlike encryption, it cannot be reversed. Only this hashed string is stored, so even someone with direct access to the database never sees the original password (Dennis, 2024).
>
> *Why passwords are hashed*
>
> If a database is breached and passwords are stored as plain text, every account is immediately exposed, and since users often reuse passwords, the damage spreads to other services too (Batra, 2025). Storing a hash instead means a stolen database only yields unreadable strings, protecting users even when the system itself has been compromised (Dennis, 2024).
>
> *Why bcrypt*
> - **Salting:** bcrypt attaches a random value to each password before hashing, so identical passwords produce different hashes. This defeats precomputed rainbow table attacks (Dennis, 2024).
> - **Adjustable cost:** bcrypt's work factor can be tuned to slow the hashing process down. This makes brute-force guessing impractical while still being fast enough for a normal login (Dennis, 2024).
>
> *How it's implemented in HustleHub+*
>
> In `userModel.js`, a Mongoose pre-save hook checks if the password field was modified, then generates a salt with `bcrypt.genSalt(10)` and hashes the password with `bcrypt.hash()` before saving. This follows the standard bcrypt workflow of generating a salt and hashing the password with it (Dennis, 2024). This runs automatically on every registration or password change (Dennis, 2024).
>
> On login, `matchPassword()` uses `bcrypt.compare()` to re-hash the submitted password with the stored salt and check it against the stored hash, the same verification approach described by Dennis (2024). The plain-text password is never stored, logged, or compared directly (Dennis, 2024). The new sanitisation middleware deliberately skips the `password` field used at registration and login, so the password that is hashed is always exactly what the user typed. The same bcrypt hook now also hashes new passwords from the change and reset flows.
>
>  **Token-Based Authentication (JSON Web Tokens)**
>
> *What it is*
>
> A JSON Web Token (JWT) is a compact, self-contained way of representing claims (pieces of information about a user) that can be passed securely between two parties (JWT.io, 2026). A JWT is made up of three parts separated by full stops: a **header** identifying the token type and signing algorithm, a **payload** containing the actual claims (such as a user ID and role), and a **signature** that proves the token has not been altered since it was issued (Auth0, 2026). Importantly, a JWT is signed, not encrypted, so it should never be used to carry sensitive data such as a password (The IIE, 2026).
>
> *Why token-based authentication is used*
>
> HTTP is stateless: on its own, a server has no memory of a previous request, so without something like a token it would have no way of knowing a user already proved their identity, short of resending credentials on every single call (The IIE, 2026). A signed token solves this cheaply and statelessly: the server can verify a client's identity on each request just by checking the token's signature, without needing to store session data. Because that signature can only be produced with a secret the server keeps private, a client cannot tamper with a token's contents (for example, changing their own role to `admin`) without invalidating the signature and being rejected (Auth0, 2026).
>
> *How it's implemented in HustleHub+*
>
> On successful login, or once a registration code has been confirmed, the shared `generateToken()` helper in `utils/token.js` (used by the login, registration, two-factor and account controllers) calls `jwt.sign()` with a payload containing the user's MongoDB `_id` and `role`, signs it with the server-only `JWT_SECRET` from `.env`, sets a seven-day expiry, and returns the resulting token to the client alongside the user's non-sensitive details. This follows the standard header-payload-signature JWT structure and the common practice of embedding an identifier and role in the payload for later use in access control (JWT.io, 2026; Auth0, 2026).
>
> `authMiddleware.js`'s `validateAuth` function is the gatekeeper that protects `GET /api/auth/profile` and every protected gig, booking and transaction route: it reads the `Authorization: Bearer <token>` header, verifies the token's signature and expiry with `jwt.verify()`, looks up the corresponding user in MongoDB (excluding the password field), and attaches that user to `req.user` before calling `next()`. If the header is missing, malformed, expired, or signed with the wrong secret, the request is stopped with a `401` before it can reach any controller, a fail-closed design where access is denied by default rather than granted. A separate `validateRole(...roles)` function is then layered on top to check `req.user.role` against an allow-list, deliberately keeping the "who are you" check (authentication) and the "what are you allowed to do" check (authorization) as two distinct steps (The IIE, 2026). Because the role is read from the database user rather than trusted from the token alone, a role change takes effect on the next request.
>
> A signed JWT normally stays valid until it expires, so a stolen token would keep working even after the victim changes their password. To close this gap, the `User` model now has a `passwordChangedAt` timestamp, set whenever a password is changed or reset. `validateAuth` compares it with the token's `iat` (issued at) claim and rejects any token issued before the change with a `401`, so a password change or reset signs every other device out (OWASP Foundation, 2026i). After a change from the profile page, the API returns a fresh token that the frontend swaps into `sessionStorage`, so the current device stays logged in.
>
> Authorization is enforced even earlier than that at the point a role is first assigned: because a JWT's payload can only ever reflect the role a user was actually saved with, `otpController.js`'s `startRegistration` refuses to trust an attacker-supplied `role` value from the request body, only ever persisting `client` or `freelancer` for a self-registered account. This closes off the obvious escalation path of registering with `"role": "admin"` directly in the payload, complementing the signature check described above rather than replacing it (The IIE, 2026).
>
> On the frontend, the token is stored in `sessionStorage` rather than `localStorage`, so it is cleared when the browser tab closes. `marketApi.ts` attaches it to each request, and if the API ever answers `401` (an expired, revoked or tampered token) the session is cleared and the user is sent back to the login page.
>
> **Email Verification and Password Reset (One-Time Passcodes)**
>
> *What it is*
>
> A one-time passcode (OTP) is a short random code sent to the user's email address that proves they control that inbox (MDN Web Docs, 2026f). HustleHub+ uses six-digit codes for two flows: confirming the email address before an account is created, and resetting a forgotten password.
>
> *Why it matters*
>
> Without verification, anyone can register with someone else's email address, and a password reset that relies only on knowing an email would let an attacker take over any account. Reset flows are also a common way to discover which emails are registered, and short numeric codes are easy to brute-force unless guesses are limited (OWASP Foundation, 2026i).
>
> *How it's implemented in HustleHub+*
>
> - **Random, hashed codes:** `utils/otp.js` generates codes with Node's cryptographically secure `crypto.randomInt`. Only an HMAC-SHA256 hash of the code (keyed with `OTP_SECRET`, or `JWT_SECRET` as a fallback) is stored, so a leaked database does not reveal live codes, and codes are compared with `crypto.timingSafeEqual` to avoid timing attacks (Node.js, 2026a).
> - **Short-lived and single-use:** each code expires after 10 minutes and is deleted as soon as it is used. A MongoDB TTL index removes expired records automatically (MongoDB, 2026a).
> - **Brute-force protection:** a code is destroyed after 5 wrong guesses, a new code can only be requested every 60 seconds per email, and the confirm and reset endpoints sit behind `otpLimiter`. Every wrong, expired or used code gets the same message.
> - **No plain-text password, even while pending:** during registration the password is hashed with bcrypt before the pending sign-up is stored, and no `User` document exists until the code is confirmed.
> - **No account enumeration:** `forgotPassword` returns the same `200` message whether or not the email is registered, even if sending fails.
> - **Reset hygiene:** after a reset, `passwordChangedAt` retires every existing token and the user is not logged in automatically, following OWASP guidance (OWASP Foundation, 2026i).
> - **Safe email content:** `otpEmail.js` HTML-escapes every value (including the username) before placing it in the email, and the Brevo API key and any provider error are kept server-side only (Brevo, 2026).
>
> **Account Changes**
>
> Changing the password from inside a session requires the current password, so a hijacked session alone cannot lock the owner out. A wrong current password returns `400` rather than `401` (the session itself is still valid), the new password must meet the registration complexity rules and differ from the old one, and both account routes are rate limited by `accountLimiter`, which also slows guessing of the current password (OWASP Foundation, 2026a).
>
> **Role-Based Access Control and Resource Ownership**
>
> *What it is*
>
> Role-based access control limits what a user can do according to their role, while ownership checks limit which individual records they can act on. Both are needed, because a valid role alone does not prove that a user should be able to change a particular gig or booking (OWASP Foundation, 2026f).
>
> *Why it matters*
>
> Broken access control is one of the most common web application weaknesses. If an API only checked the role, any freelancer could edit or delete another freelancer's gig simply by changing the ID in the URL, an attack known as an insecure direct object reference (OWASP Foundation, 2026f).
>
> *How it's implemented in HustleHub+*
>
> - **Route level:** `validateRole` restricts gig creation, editing and deletion to freelancers and admins, booking creation to clients and admins, and the income summary to freelancers and admins.
> - **Record level:** `gigController.js` compares `gig.freelancer` with `req.user._id` before an update or delete. `bookingController.js` and `transactionController.js` only return a single record to the client, the freelancer or an admin, and list endpoints filter by the logged-in user, so a user never receives another user's bookings or transactions.
> - **Business rules:** a freelancer cannot book their own gig, only `active` gigs can be booked, and a booking can only move along the allowed lifecycle (`pending` to `confirmed` to `in_progress` to `completed`, with cancellation allowed before completion). A client may only cancel, and only before work starts. An illegal change returns `409 Conflict`.
> - **Frontend:** `RoleRoute` hides pages from roles that cannot use them, and `NavBar` only shows the links for the user's role. This improves the experience, but the backend checks above remain the real security boundary.
>
> **Input Validation**
>
> *What it is*
>
> Input validation is the process of checking that data received from a client (a registration form, a login request, or any other API payload) meets the rules the application expects (correct type, length, and format) before that data is processed further (OWASP Foundation, 2026b). It is a related but distinct concept from sanitisation, which cleans or strips unwanted content out of input rather than simply checking it against a rule (The IIE, 2026).
>
> *Why input is validated*
>
> Any data entering the system from outside must be treated as untrusted until it has been proven otherwise, because an attacker does not typically need special server access; they can submit unexpected or malicious values through the exact same registration and login endpoints a genuine user relies on (The IIE, 2026). Without validation, malformed input (missing fields, wrong data types, oversized strings, or values crafted to break assumptions elsewhere in the code) passes straight through to business logic and the database, where it can crash the application, corrupt stored data, or be used as a building block for a larger attack (OWASP Foundation, 2026b). Rejecting bad input as early as possible, before it reaches the controller or the database, keeps that downstream logic simpler and reduces the application's overall attack surface (OWASP Foundation, 2026c).
>
> *How it's implemented in HustleHub+*
>
> `validationMiddleware.js` sits in front of the controller on both authentication routes, attached in `authRoutes.js`. `validateRegistration` rejects a request unless the username is between 2 and 30 characters, the email matches a standard email-shaped pattern and is no longer than 254 characters, and the password satisfies a complexity rule requiring at least 8 characters with an uppercase letter, a lowercase letter, a digit, and a special character. `validateLogin` similarly confirms an email- and password-shaped payload is present before allowing the request through. Any failure returns a `400 Bad Request` with a descriptive but safe message, and `authController.js` is never reached. Where input does pass, the middleware also normalises it (trimming whitespace and lower-casing the email) so that downstream code always works with predictable, consistent data.
>
> The same approach now covers the marketplace. `validateGigInput` and `validateGigUpdate` check the title (5 to 100 characters), description (20 to 2000 characters), category (one of the allowed categories), price (1 to 1,000,000 ZAR, rounded to two decimals), delivery time (a whole number of days from 1 to 90) and status. `validateBookingInput` requires a valid gig ID, a real date, an allowed simulated payment method and a brief of at most 2000 characters. `validateBookingStatusUpdate` only accepts known statuses, and `validateObjectId` rejects any URL ID that is not a 24-character hex string before a database query is made. `validateOtpVerify` and `validateResetPassword` require a code of exactly six digits, and the reset password must meet the same complexity rules as registration.
>
> `profileValidationMiddleware.js` validates account and profile changes. Only fields that pass are copied into a fresh object, so unknown or private keys (such as `user` or `_id`) can never reach the database (mass assignment). Choice fields must match the allowed lists, text fields are length-limited and refuse markup and control characters, skills are limited to 12 short tags, and the hourly rate must be digits only. Profile photos must be a clean base64 JPEG, PNG or WebP data URL under the size limit, and the decoded bytes must match that format's real file signature, so a file cannot simply be relabelled as an image (OWASP Foundation, 2026j). Website and LinkedIn links are parsed with the `URL` API and must use `https`, must not contain a username or password, and LinkedIn links must be on `linkedin.com` (MDN Web Docs, 2026e).
>
> The Mongoose schemas provide a second layer of validation at the database boundary itself, with `required`, length, range and `enum` rules on every model and a `unique` constraint on `email`. This means that even a request that somehow bypassed the middleware still cannot result in an invalid or duplicate document being persisted. The frontend repeats the same rules in `validation.ts`, `gigValidation.ts` and `patterns.ts` so users get instant feedback, but the backend never relies on the frontend having checked anything.
>
> **Sanitisation (Injection and Cross-Site Scripting)**
>
> *What it is*
>
> Sanitisation removes or neutralises dangerous content from input, such as HTML tags that could run as script in another user's browser (cross-site scripting) or object keys that could change the meaning of a database query (NoSQL injection) (OWASP Foundation, 2026e).
>
> *Why it matters*
>
> Gig titles, descriptions and booking briefs are written by one user and displayed to others, which makes them a natural route for stored cross-site scripting. MongoDB queries can also be manipulated if a request supplies an object such as `{ "$ne": null }` where a plain value is expected, and user text placed directly into a regular expression can cause catastrophic backtracking that freezes the server (OWASP Foundation, 2026e; OWASP Foundation, 2026h).
>
> *How it's implemented in HustleHub+*
>
> - **Backend:** `sanitizeMiddleware.js` runs on every request. It removes `<script>` and `<style>` blocks and any other HTML tag from every string in the body, query and URL parameters, and drops any object key that starts with `$` or contains a dot, which blocks MongoDB operator injection. It also drops the `__proto__` key, because assigning to it would change the prototype of the cleaned object instead of adding a normal property (prototype pollution) (MDN Web Docs, 2026g). Text such as `5 < 6` is left untouched because it contains no tag.
> - **Search:** `gigController.js` passes search text through `escapeRegex` and caps it at 100 characters before building a regular expression, and only accepts filter values of the expected type, preventing regular expression denial of service (OWASP Foundation, 2026h).
> - **Frontend:** `sanitize.ts` blocks markup and injection characters as the user types, and cleans text again on submit by removing HTML tags, `javascript:` style URLs and inline event handlers, repeating the clean-up until the text stops changing so a nested payload such as `<scr<script>ipt>` cannot rebuild itself from the pieces left behind, then removing control characters and invisible Unicode characters. React escapes all rendered text by default, and links from other members are only made clickable when they are safe `https` addresses.
> - **CSV copy:** when a client copies their transactions as CSV, every cell is quoted and values that start with a formula character are neutralised, preventing CSV injection when the file is opened in a spreadsheet (OWASP Foundation, 2026g).
>
> **Rate Limiting**
>
> *What it is*
>
> Rate limiting caps how many requests one client can make in a period of time (express-rate-limit, 2026).
>
> *Why it matters*
>
> Without a limit, an attacker can try thousands of passwords against the login endpoint, flood the registration endpoint with fake accounts, or create large numbers of bookings and transactions to overload the system (OWASP Foundation, 2026a).
>
> *How it's implemented in HustleHub+*
>
> `rateLimitMiddleware.js` defines six limiters, each over a 15-minute window per IP address:
>
> | Limiter | Applied to | Default limit | `.env` override |
> |---|---|---|---|
> | `apiLimiter` | Every `/api` route | 300 requests | `API_RATE_LIMIT_MAX` |
> | `authLimiter` | `POST /api/auth/register`, `POST /api/auth/login` and `POST /api/auth/password/forgot` | 10 requests | `AUTH_RATE_LIMIT_MAX` |
> | `otpLimiter` | `POST /api/auth/register/verify`, `POST /api/auth/register/resend`, `POST /api/auth/login/2fa` and `POST /api/auth/password/reset` | 20 requests | `OTP_RATE_LIMIT_MAX` |
> | `accountLimiter` | `PUT /api/auth/profile`, `PUT /api/auth/password`, `PUT /api/auth/2fa` and `PUT /api/users/me/profile` | 15 requests | `ACCOUNT_RATE_LIMIT_MAX` |
> | `bookingLimiter` | `POST /api/bookings` | 20 requests | `BOOKING_RATE_LIMIT_MAX` |
> | `cspReportLimiter` | `POST /api/csp-report` | 60 requests | None |
>
> On top of the per-IP limiters, the passcode flows add a per-email limit: a new code can only be sent once every 60 seconds for the same address. Login also has a per-account limit, the account lockout described in [Own Security Features](#%EF%B8%8F-own-security-features). Every time a limiter is exceeded a `RATE_LIMIT` warning with the route and IP address is logged.
>
> When a limit is exceeded the API returns `429 Too Many Requests` with a clear JSON message, a `retryAfterSeconds` value and a `Retry-After` header, and sends the standard `RateLimit` header so clients can see how many requests remain (express-rate-limit, 2026). The frontend displays this message to the user instead of failing silently.
>
> **Security Headers and Content Security Policy**
>
> *What it is*
>
> Security headers are HTTP response headers that tell the browser to enable extra protections. The most important is the Content Security Policy (CSP), which lists exactly where scripts, styles, images and connections may come from, so that injected script is blocked even if it reaches the page (MDN Web Docs, 2026c).
>
> *Why it matters*
>
> A CSP is a second line of defence against cross-site scripting and data injection, while headers such as `X-Frame-Options` and `frame-ancestors` stop the site being framed for clickjacking, and HSTS stops browsers from falling back to plain HTTP (MDN Web Docs, 2026c; Helmet, 2026).
>
> *How it's implemented in HustleHub+*
>
> - **API:** `securityMiddleware.js` uses Helmet. Because the API only returns JSON, its CSP starts from `default-src 'none'` and also sets `base-uri`, `form-action` and `frame-ancestors` to `'none'`. Helmet also sends HSTS for one year, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff` and its other default headers (Helmet, 2026).
> - **React app:** `securityHeaders.ts` builds the CSP that Vite sends with the frontend. The production policy only allows scripts and styles from the app itself (plus the Google Fonts stylesheet), no inline or `eval` code, connections only to the app and the API, no plugins and no framing. The development policy only relaxes scripts and styles for Vite's hot reload. Both send `X-Content-Type-Options`, `Referrer-Policy` and a `Permissions-Policy` that disables the camera, microphone, location and payment APIs, and production also sends HSTS.
> - **Violation reporting:** both policies use `report-uri` and `report-to` with a `Reporting-Endpoints` header, so browsers post any blocked resource to `/api/csp-report`, where it is logged (MDN Web Docs, 2026d). Because report contents come from the browser, each value is cut to 200 characters and control characters are removed before logging.
> - **CORS:** only the origins listed in the `ALLOWED_ORIGINS` environment variable may call the API from a browser. When it is empty, only `https://localhost:5173` (the React app) is allowed.
> - **Docker:** in the containers, Nginx sends the same production headers as `securityHeaders.ts` from `nginx.conf`, and fills the API address into the CSP from the `API_ORIGIN` environment variable when the container starts. It also hides its version number with `server_tokens off` and only allows TLS 1.2 and 1.3.
>
> **HTTPS (Secure Communication)**
>
> *What it is*
>
> HTTPS is the secure version of HTTP: it uses Transport Layer Security (TLS) to encrypt the connection between a client and a server (MDN Web Docs, 2026a). The term "SSL" is still commonly used in everyday conversation (and in file names such as `cert.crt`/`cert.key`), but modern secure web communication is actually implemented using TLS, SSL's successor (MDN Web Docs, 2026b).
>
> *Why HTTPS matters*
>
> Plain HTTP sends data across the network in clear text, so anyone able to observe that traffic (a compromised router, a shared or untrusted Wi-Fi network, or an attacker positioned between the client and server) can potentially read or alter it in transit. This is known as a Man-in-the-Middle attack, and it is especially dangerous for a system like HustleHub+, which transmits login credentials, JWTs, booking details and income data (MDN Web Docs, 2026a). HTTPS defends against this by encrypting the connection so that any intercepted traffic is unreadable; OWASP specifically recommends that APIs handling credentials or tokens should only ever expose HTTPS endpoints for this reason (OWASP Foundation, 2026d).
>
> *How it's implemented in HustleHub+*
>
> For local development, `app.js` loads a locally generated SSL certificate and private key (`cert.crt`, `cert.key`) together with the project's own certificate authority file (`ca.crt`), and passes them to Node's built-in `https` module instead of using Express's default plain-HTTP server. The API only starts listening (over HTTPS, on the configured port) once `dbMiddleware.js` has confirmed a successful database connection, so it never accepts requests (encrypted or otherwise) before it is actually ready to handle them. The React app uses the same certificate in `vite.config.ts`, so the frontend is also served over HTTPS at `https://localhost:5173` and all traffic between the browser and the API is encrypted. A self-signed certificate of this kind is appropriate for local development and demonstrates the same certificate-based configuration used in production, but is not automatically trusted by browsers the way a certificate issued by a recognised Certificate Authority would be; a production deployment would instead rely on TLS termination and a trusted CA at the hosting platform level (The IIE, 2026).
>
> **Fail-Fast Startup, Safe Error Handling & Connection Monitoring**
>
> *What it is*
>
> Beyond validating what a client sends, a secure-by-design API also has to validate its own configuration and handle failure predictably: refusing to start with an incomplete configuration, never leaking internal detail (stack traces, file paths, database details) to a client when something goes wrong, and staying visible to its operator about the health of dependencies like the database (The IIE, 2026).
>
> *Why it matters*
>
> A server that starts successfully despite a missing JWT_SECRET or CONN_STRING can allow configuration problems to remain undetected until the application attempts to use the missing value, producing a delayed runtime failure rather than an immediate configuration error. Validating required configuration during startup therefore makes failures more immediate and easier to diagnose. Equally, an Express app without custom error-handling middleware relies on Express's default error handler, which can return stack traces to clients outside the production environment; these stack traces can expose implementation details that provide attackers with useful information about the application's internal structure (Express.js, 2026c; OWASP Foundation, 2026k). Finally, a MongoDB connection that succeeds once is not guaranteed to remain available; Mongoose exposes connection events such as error, disconnected, and reconnected, allowing applications to detect changes in connection state and record them for troubleshooting (Mongoose, 2026b).
> 
> *How it's implemented in HustleHub+*
>
> Before anything else runs, `app.js` checks that `CONN_STRING` and `JWT_SECRET` are present in `process.env`, logs exactly which one is missing if not, and calls `process.exit(1)` rather than allowing the server to start half-configured. Two pieces of middleware are then registered last, after every route: a catch-all handler that turns any request to an undefined route into a clean `404` JSON response, and a four-argument error-handling middleware that Express routes any otherwise-uncaught error to. That handler now returns `400` for a body that is not valid JSON and `413` for a body over 10kb, and for anything else logs the full error server-side while returning only a generic `500` message to the client. Separately, `dbMiddleware.js` attaches listeners to Mongoose's `error`, `disconnected`, and `reconnected` connection events so that problems occurring *after* the initial successful connection, such as a network blip or the database restarting, are logged rather than failing silently.
>
> On the frontend, `marketApi.ts` replaces any `5xx` response with a general "something went wrong" message and maps other status codes to plain-language messages, so server details are never shown in the interface. Invalid IDs in the address bar are rejected before any request is made, and an `ErrorBoundary` around the whole app shows a calm fallback screen if a page crashes, logging the technical detail only to the browser console.

### 🛡️ Own Security Features:

> [!important]
> HustleHub+ includes security features that go beyond the minimum requirements of the POE. The main features added in Part 3 (two-factor login, account lockout and the security audit trail) are marked in the code with the comment `Own security feature`. The others were built by the team across the project. None of these are required by the POE. Every feature is explained the same way, with its definition, purpose, how it works and its advantages, each backed by a reference.
>
> The features are listed from **strongest to weakest**, ranked by how directly they stop a real attack and how much damage that attack would cause. Features that block an account takeover come first, then the controls that detect attacks or protect the code and pipeline, and finally the supporting controls that reduce a smaller risk.
>
> | Rank | Feature | Why it is ranked here |
> |---|---|---|
> | 1 | Two-factor login | Stops an account takeover even when the attacker already has the correct password |
> | 2 | Account lockout | Stops password guessing against one account, even from many IP addresses |
> | 3 | Token revocation on password change | Shuts out an attacker who already has a stolen session as soon as the password is changed |
> | 4 | Secure password reset | Closes the most common route to taking over an account without the password |
> | 5 | Email-verified registration | Proves the person owns the email, preventing fake or impersonating accounts |
> | 6 | Security audit trail | Detects attacks and keeps the evidence, but does not block them by itself |
> | 7 | Dependency audit gate | Stops known vulnerable packages from being shipped |
> | 8 | Secrets and logs check | Stops secrets and personal data from being committed to the repository |
> | 9 | Admin audit log view | Makes the audit trail visible so attacks are noticed, relies on feature 6 |
> | 10 | File signature check on profile photos | Blocks disguised files in one upload field |
> | 11 | CSP violation reporting | Reports blocked XSS attempts; the CSP itself does the blocking |
> | 12 | Email addresses masked in the logs | Limits the personal information exposed if the logs leak |
>
> Features 7 and 8 run in the pipeline next to the security scans the POE requires (CodeQL). They are counted as own features because they add checks the brief does not ask for: the build fails on a vulnerable production package, or on a committed key, `.env` file or log file.
>
> <ins> **1. Two-factor login (emailed login code)** </ins>
>
> *What it is*
>
> Two-factor authentication asks for a second proof of identity on top of the password. The factors are usually something you know (a password), something you have (a phone or an email inbox) and something you are (OWASP Foundation, 2026n). In HustleHub+ the second factor is a six-digit code emailed to the account owner at every login, which proves they still control the inbox (OWASP Foundation, 2026a).
>
> *Purpose*
>
> A password on its own can be stolen through phishing, guessed, or reused from another site's data breach. With two-factor switched on, a correct password alone no longer opens the account, so a leaked password is not enough to take it over.
>
> *How it works*
>
> - Any user can switch it on or off from their profile page (`PUT /api/auth/2fa`). The current password is required, so someone using a stolen session cannot switch it off.
> - When a user with two-factor logs in with the correct password, `POST /api/auth/login` returns `twoFactorRequired: true` and **no token**, and a login code is emailed to them. The frontend then shows `LoginTwoFactorStep`.
> - The code is confirmed with `POST /api/auth/login/2fa`, which only then returns the JWT.
> - The login codes reuse the passcode protections from Part 2: generated with `crypto.randomInt`, stored only as a keyed HMAC-SHA256 hash, compared in constant time, valid for 10 minutes, single use, destroyed after 5 wrong guesses, and rate limited by `otpLimiter`. A new code is sent at most once a minute, so repeated logins cannot flood the inbox.
> - A code only counts while two-factor is still switched on, and switching it off deletes any code that is still waiting.
> - Enabling, disabling, sending a code and every failed code are logged under `SECURITY`.
>
> *Why it is a good security feature*
>
> It directly protects against the most common way accounts are taken over, a stolen or reused password. OWASP describes multi-factor authentication as one of the most effective defences against password related attacks, because the attacker also needs something only the owner has (OWASP Foundation, 2026n). It is optional, so users who want stronger protection can have it without making sign in harder for everyone, and because no token exists until the code is confirmed, there is no way to reach the API with only the password. It addresses OWASP A07, Identification and Authentication Failures (OWASP Foundation, 2021).
>
> <ins> **2. Account lockout after repeated failed logins** </ins>
>
> *What it is*
>
> Account lockout is a defence against password guessing that temporarily blocks logins to an account after a number of failed attempts (OWASP Foundation, 2026a). In HustleHub+, after **5 wrong passwords** in a row, the account is locked for **15 minutes**. While it is locked, every login attempt is refused with `429`, even with the right password. Both values can be changed with `LOCKOUT_MAX_ATTEMPTS` and `LOCKOUT_MINUTES` in `.env`.
>
> *Purpose*
>
> The rate limiter from Part 2 counts requests per IP address, so an attacker who spreads a password guessing attack over many IP addresses can avoid it. The lockout counts failures per **account**, so one account cannot be guessed at faster than 5 attempts every 15 minutes, no matter where the attempts come from (OWASP Foundation, 2026a).
>
> *How it works*
>
> - `utils/lockout.js` increases `failedLoginAttempts` on the user with an atomic `$inc` update, so attempts sent at the same time cannot slip past the limit.
> - When the limit is reached it sets `lockUntil` and resets the counter. A correct login or a password reset clears both.
> - The response says how many minutes are left and includes `retryAfterSeconds`, without revealing anything else about the account. Unknown emails still get the same `Invalid credentials.` message as before.
> - Each lockout and each login blocked by a lock is logged under `SECURITY`.
>
> *Why it is a good security feature*
>
> It closes the gap left by IP based rate limiting and makes online password guessing against a single account impractical, which addresses OWASP A07, Identification and Authentication Failures (OWASP Foundation, 2021). Because the lock ends by itself after 15 minutes, a genuine user is never locked out for good, and a password reset through the forgot password flow clears the lock straight away.
>
> <ins> **3. Token revocation on password change** </ins>
>
> *What it is*
>
> Token revocation means making a login token stop working before its normal expiry time. A JSON Web Token is self-contained, so on its own the server accepts it until it expires, and OWASP recommends a way to revoke tokens explicitly when they may be compromised (OWASP Foundation, 2026o). In HustleHub+ every user has a `passwordChangedAt` time, and any token issued before the last password change or reset is refused.
>
> *Purpose*
>
> Login tokens here last 7 days. Without revocation, a token stolen from a shared computer or a compromised browser would keep working for up to a week, even after the owner changed their password. Changing the password is what users are told to do when they suspect a problem, so it should also end every other session (OWASP Foundation, 2026a).
>
> *How it works*
>
> - Changing the password on the profile page or resetting it with an emailed code sets `passwordChangedAt` on the user.
> - `validateAuth` reads the time the token was issued (`iat`) and compares it with `passwordChangedAt`. An older token receives `401`, and the event is logged under `SECURITY` as a revoked token.
> - The device that made the change receives a fresh token in the response and stores it, so the owner stays logged in while every other device is signed out.
> - The frontend clears the session on any `401`, so a revoked device is returned to the login page on its next action.
>
> *Why it is a good security feature*
>
> It closes the main weakness of stateless tokens without a server-side session store: the check uses the user record that `validateAuth` already loads, so it adds no extra database call. It gives the owner one simple action that removes an attacker from every session, and it works together with the secure password reset (feature 4), so even someone who never knew the password but stole a token is shut out (OWASP Foundation, 2026o).
>
> <ins> **4. Secure password reset with one-time codes** </ins>
>
> *What it is*
>
> A password reset lets a user who has forgotten their password set a new one after proving they own the account's email. OWASP describes the reset flow as one of the most attacked parts of authentication and sets out how to make it safe: a random, single use, short lived token, the same response whether or not the account exists, and no change to the account until the token is confirmed (OWASP Foundation, 2026i). HustleHub+ follows this with a six-digit emailed code.
>
> *Purpose*
>
> A weak reset flow can let an attacker take over an account without ever knowing the password, for example by guessing a short code or a security question, or can reveal which email addresses are registered. The reset must be at least as strong as the login it replaces.
>
> *How it works*
>
> - `POST /api/auth/password/forgot` always answers *"If an account exists for that email address, we have sent a reset code to it."*, so the response never reveals whether an email is registered. A new code is sent at most once a minute.
> - The code is generated with `crypto.randomInt`, stored only as a keyed HMAC-SHA256 hash, compared in constant time, valid for 10 minutes, single use and destroyed after 5 wrong guesses (Node.js, 2026a). The OTP routes are also rate limited.
> - `POST /api/auth/password/reset` checks the code, applies the same password rules as registration, saves the new bcrypt hash and sets `passwordChangedAt`, which signs out every other device (feature 3). It also clears any account lockout (feature 2).
> - Reset requests and completed resets are logged and stored in the audit trail (feature 6).
>
> *Why it is a good security feature*
>
> It removes the usual shortcuts around the password: the code cannot realistically be guessed in 5 tries, it cannot be reused, it expires quickly and it is useless to anyone who reads the database because only its hash is stored. Because the response is identical for every email, the reset page cannot be used to build a list of registered accounts (OWASP Foundation, 2026i).
>
> <ins> **5. Email-verified registration** </ins>
>
> *What it is*
>
> Email verification proves that the person registering controls the email address they entered, before an account is created for it (MDN Web Docs, 2026f). In HustleHub+ registration takes two steps: `POST /api/auth/register` emails a six-digit code, and the account only exists once `POST /api/auth/register/verify` confirms it.
>
> *Purpose*
>
> Without verification, anyone could register with someone else's email address and act in their name, block the real owner from signing up, or create many fake accounts. The email address is also where password reset and two-factor codes are sent, so it must belong to the real user.
>
> *How it works*
>
> - The first step validates the username, email and password and checks that the email is not already registered. The pending registration is stored with the password already hashed with bcrypt, so the plain password is never kept, even for a moment (OWASP Foundation, 2026p).
> - No `User` document exists until the correct code is entered. The code has the same protections as the reset code: random, hashed, 10 minutes, single use, 5 attempts.
> - The role is limited to `client` or `freelancer`, so a request can never register an admin.
> - Each created account is logged and stored in the audit trail (feature 6).
>
> *Why it is a good security feature*
>
> It stops impersonation and throwaway fake accounts at the door, and it guarantees that the security codes used by features 1 and 4 reach the real owner. Hashing the password before the account even exists means a pending registration never holds a usable password (OWASP Foundation, 2026p).
>
> <ins> **6. Security audit trail (stored security events)** </ins>
>
> *What it is*
>
> An audit trail is a permanent, searchable record of security relevant actions: who did what, when, from where, and whether it worked (OWASP Foundation, 2026l). In HustleHub+ every login, lockout, registration, password change, password reset and two-factor event is saved as an `AuditEvent` record in MongoDB, in addition to the normal log lines.
>
> *Purpose*
>
> The log files rotate, live inside the container stack and are written as free text, so they are good for watching what happens now but poor for answering a question later, such as "how many failed logins has this account had this week?". A stored audit trail survives log rotation and container restarts, can be filtered by event type, and gives the evidence needed to investigate an attack or a disputed account change. This addresses OWASP A09, Security Logging and Monitoring Failures (OWASP Foundation, 2021).
>
> *How it works*
>
> - `utils/audit.js` builds and stores the events, and `models/auditEventModel.js` defines the record. The helper is called from the authentication, registration, password and two-factor controllers.
> - Only seven event types and two outcomes (`success`, `failure`) are allowed. Anything else is refused before it reaches the database. The names follow the idea of a fixed security logging vocabulary (OWASP Foundation, 2026m).
>
>   | Event type | Recorded when | Failure details recorded |
>   |---|---|---|
>   | `login` | Every login attempt | `unknown email`, `wrong password`, `account locked` |
>   | `account_lockout` | An account reaches the failed login limit | `too many failed logins` |
>   | `login_2fa` | A two-factor login code is checked | `invalid or expired code` |
>   | `two_factor_change` | Two-factor login is switched on or off | `wrong password` (success records `switched on` or `switched off`) |
>   | `register` | A new account is created after its code is confirmed | |
>   | `password_reset` | A password is reset with an emailed code | |
>   | `password_change` | A logged in user changes their password | `wrong current password` |
>
> - Each record stores only: the account ID (left empty when the email does not belong to an account), the type, the outcome, a short detail, the IP address, the browser's user agent (cut to 200 characters) and the time. The helper copies only these fields, so nothing else from the request can reach the database.
> - The detail is always a fixed phrase chosen by the code, never text typed by the user, so an attacker cannot inject fake entries or markup into the trail. Passwords, codes, tokens and email addresses are never stored.
> - A MongoDB TTL index deletes each record 90 days after it was created, so personal data such as IP addresses is not kept forever (MongoDB, 2026a). Two further indexes keep the newest first and filtered by type lookups fast.
> - Saving an event can never break a login: if the database write fails, the error is logged under `SECURITY` and the request carries on.
>
> *Why it is a good security feature*
>
> Attacks such as password guessing, credential stuffing and account takeover leave a pattern of events, and the audit trail keeps that pattern in a form that can be counted and filtered per account and per event type. Storing only fixed fields and fixed phrases means the trail itself cannot become a place to inject data or leak secrets, and the 90 day expiry keeps only what is needed, as POPIA requires (South Africa, 2013).
>
> <ins> **7. Dependency audit gate in the pipeline** </ins>
>
> *What it is*
>
> A dependency audit compares every installed package and version with a database of publicly known vulnerabilities (npm, 2026a). A gate makes the result enforceable: the **Backend tests and dependency audit** and **Frontend tests, build and dependency audit** jobs run `npm audit --omit=dev --audit-level=high`, and the pipeline fails if any production package has a known high or critical vulnerability.
>
> *Purpose*
>
> Most of the code that runs in HustleHub+ comes from third-party packages such as Express, Mongoose and React. Using components with known vulnerabilities is listed by OWASP as A06, Vulnerable and Outdated Components (OWASP Foundation, 2021). A vulnerability published in one of them would affect the app without a single line of team code changing.
>
> *How it works*
>
> - It runs on every push and pull request to `main`, after a clean `npm ci` install, so it checks exactly the versions in `package-lock.json`.
> - `--omit=dev` limits it to the packages that run in production, so a problem in a test tool does not block a release.
> - `--audit-level=high` fails the build on high and critical findings. Lower findings are still shown in the job output.
> - The **All checks passed** job, and therefore Docker Hub publishing, depends on it, so a vulnerable build is never published.
>
> *Why it is a good security feature*
>
> It turns dependency security from something remembered occasionally into a check that cannot be skipped, which is what OWASP recommends for managing vulnerable dependencies (OWASP Foundation, 2026q). It has already proved itself by catching three real advisories in `body-parser`, `qs` and `ip-address`, which were fixed (see [Static Code Analysis](#-static-code-analysis)).
>
> <ins> **8. Secrets and logs check in the pipeline** </ins>
>
> *What it is*
>
> Secrets are values such as private keys, passwords, API keys and connection strings that give access to a system. OWASP advises that they must never be stored in source code or committed to a repository (OWASP Foundation, 2026r). The first CI job, **No secrets or logs committed**, lists every tracked `*.key`, `.env` and `*.log` file and fails the pipeline if there are any.
>
> *Purpose*
>
> Once a private key, a MongoDB connection string or a log full of member details is pushed, it stays in the git history even after the file is deleted, and anyone with access to the repository can read it. `.gitignore` prevents most mistakes, but a forced add or a renamed file can still slip through.
>
> *How it works*
>
> - The job runs `git ls-files` for `*.key`, `.env`, `*/.env` and `*.log` files on every push and pull request.
> - If any are found, it prints their names and fails, and every later job, including publishing, depends on it.
> - It works alongside `.gitignore` (which stops the files being added) and `.dockerignore` (which keeps them out of the images).
>
> *Why it is a good security feature*
>
> It is a cheap, automatic safety net for a mistake that is very expensive to undo, because a leaked key or connection string has to be replaced everywhere it is used. It also enforces the module's rule that no secrets are kept in the repository, and protects the personal data in the logs (South Africa, 2013).
>
> <ins> **9. Admin audit log view** </ins>
>
> *What it is*
>
> A **Security audit trail** section at the bottom of the admin page shows the stored audit events from feature 6 in a table, newest first, 10 at a time, with an **Event type** filter and **Previous** and **Next** buttons. Each row shows when the event happened, the event in plain language (for example *Account lockout*), whether it succeeded or failed, the account's username (or *Unknown* when the email did not belong to an account), the IP address and the fixed detail phrase.
>
> *Purpose*
>
> An audit trail only helps if someone looks at it. The admin view makes the events from feature 6 visible without direct database access, so an admin can spot a run of failed logins, a lockout or an unexpected two-factor change and act on it. Reviewing security events regularly is what turns logging into monitoring (OWASP Foundation, 2026l).
>
> *How it works*
>
> - The page calls `GET /api/admin/audit-events` (`routes/adminRoutes.js` and `controllers/auditController.js`), which is protected by `validateAuth` and `validateRole("admin")`. Clients and freelancers receive `403`, and a request without a token receives `401`, following the least privilege principle (OWASP Foundation, 2026f).
> - `parseAuditQuery` in `utils/audit.js` checks every query value against a fixed rule before anything reaches the database: `page` must be a whole number from 1, `limit` a whole number from 1 to 100 (default 25), and `type` one of the seven event types from feature 6. Anything else is refused with `400`, so the query string cannot be used to send MongoDB operators or unexpected input (OWASP Foundation, 2026b).
> - The events are sorted newest first and paged with `skip` and `limit`, and the total is counted at the same time, so the page stays fast as the trail grows (Mongoose, 2026c). Only the username and role of each account are loaded, so email addresses never leave the server (Mongoose, 2026d).
> - Choosing a different event type starts again from page 1.
> - The view is read only. There is no endpoint to edit or delete audit events, so not even an admin can change the trail through the application.
> - Each time the trail is viewed, the admin's ID, the page and the filter are logged under `SECURITY`, so reading the audit trail is itself recorded (OWASP Foundation, 2026l).
>
> *Why it is a good security feature*
>
> It turns the stored events into real monitoring, which is the step OWASP A09 says is most often missing (OWASP Foundation, 2021). Keeping it admin only, read only and free of email addresses means the record of who did what cannot be viewed by ordinary users, altered after the fact, or used to collect members' contact details.
>
> <ins> **10. File signature check on profile photos** </ins>
>
> *What it is*
>
> A file signature (or "magic number") is the fixed sequence of bytes at the start of a file that identifies its real format. OWASP advises checking it, together with the size, instead of trusting the file name or the type the browser declares, because both are controlled by the user (OWASP Foundation, 2026j). Profile photos in HustleHub+ are checked this way.
>
> *Purpose*
>
> Profile photos are shown to other members. If the server trusted the declared type, an attacker could label a script, an HTML page or any other file as `image/png` and have it stored and served to other users.
>
> *How it works*
>
> - Photos are sent as data URLs. `profileValidationMiddleware.js` checks that the declared type is JPEG, PNG or WebP and that the data is within the size limit.
> - It then decodes the data and checks that the first bytes match the real signature for the declared type: `FF D8 FF` for JPEG, `89 50 4E 47 0D 0A 1A 0A` for PNG, and `RIFF` followed by `WEBP` for WebP (WHATWG, 2026). A mismatch is refused with *"The profile photo must be a valid JPEG, PNG or WebP image under the size limit."*
> - The frontend file picker only offers these three types, but the server check does not depend on it.
>
> *Why it is a good security feature*
>
> Checking the actual bytes cannot be fooled by renaming or relabelling a file, so only real images are ever stored and shown to other members. Together with the size limit, it also stops the photo field being used to store large or unexpected data (OWASP Foundation, 2026j).
>
> <ins> **11. CSP violation reporting** </ins>
>
> *What it is*
>
> A Content Security Policy tells the browser which scripts, styles and other resources a page may load, and blocks everything else (MDN Web Docs, 2026c). Violation reporting adds a reporting address, so the browser also sends a short report every time the policy blocks something (MDN Web Docs, 2026d). Both the API and the React app ask browsers to report to `POST /api/csp-report`.
>
> *Purpose*
>
> A CSP blocks a cross-site scripting attack silently: the attack fails, but nobody finds out it was attempted. Reporting makes every blocked script or resource visible, so an attack, or a policy that is accidentally breaking part of the site, is noticed (OWASP Foundation, 2026s).
>
> *How it works*
>
> - Both `report-uri` (older browsers) and `report-to` with a `Reporting-Endpoints` header (newer browsers) point to the endpoint, and it accepts both report formats.
> - Reports are untrusted input, so each value is shortened to 200 characters and control characters are removed before the violation is logged under `SECURITY` with the directive, the blocked address and the page.
> - The endpoint has its own rate limit (60 reports per 15 minutes per IP address) and always answers `204`, so it cannot be used to flood the logs or learn anything about the server.
>
> *Why it is a good security feature*
>
> It turns the CSP from a silent shield into an early warning system: blocked injection attempts appear in the log files and Better Stack, where they can be investigated. It costs nothing for normal users, because a correct page never triggers a report (OWASP Foundation, 2026s).
>
> <ins> **12. Email addresses masked in the logs** </ins>
>
> *What it is*
>
> Data masking replaces part of a value so it can still be recognised without revealing all of it. OWASP advises that personal data should be masked or removed before it is written to logs (OWASP Foundation, 2026l). In HustleHub+ every email address in a log message is masked to its **first letter and its domain**, for example `k***@gmail.com`, so it is masked in the terminal, the daily log files and Better Stack.
>
> *Purpose*
>
> Many log messages named the user by their full email address. The log files are kept for weeks and every line is also sent to Better Stack, a third party service, so full email addresses were being copied to more places than needed. A security review of the logs flags this as unnecessary personal information (OWASP Foundation, 2026l).
>
> *How it works*
>
> - `utils/maskEmail.js` keeps the first character, replaces the rest of the name with `***`, and keeps everything from the last `@` onwards, so even an address with an `@` in its name is masked correctly.
> - Every log message that mentions an email passes it through `maskEmail` first. It is used in 34 places across the authentication, registration, password reset, two-factor and account controllers and the authentication middleware.
> - A value that is not a real email address (nothing before the `@`, nothing after it, or not text at all) is hidden completely as `***`.
> - Control characters such as a line break are replaced with `?`, so an email typed with a line break cannot split a log line (log injection), and a very long domain is cut to 255 characters.
> - Passwords, hashes, tokens and codes were already never logged. The masking adds email addresses to what is kept out of the logs, and the account ID that most messages contain still identifies the exact user.
>
> *Why it is a good security feature*
>
> The logs are useful to an attacker who gets hold of them, for example as a list of valid accounts to target. Masking keeps the logs useful for monitoring while limiting the personal information they hold, in line with the OWASP advice to mask sensitive personal data in logs (OWASP Foundation, 2026l) and the POPIA requirement to protect personal information with reasonable technical measures and to process no more of it than needed (South Africa, 2013).
>
> <ins> **How the features are tested** </ins>
>
> - `backend/tests/security.test.js` checks the lockout defaults and the seconds remaining on a lock, the `ALLOWED_ORIGINS` parsing and the token claims.
> - `LoginPage.test.tsx` checks that the code step is shown and no session is stored after the password step, that the correct code logs the user in, that an incomplete code never reaches the API, that a wrong code keeps the user logged out, and that the lockout message is shown.
> - The Postman collection covers registration codes (correct and wrong), password reset, an old session rejected after a reset, an old token rejected after a password change, and the CSP header. `RegisterPage.test.tsx` and `ForgotPasswordPage.test.tsx` cover the code steps in the frontend.
> - The Playwright tests check four of the own features end to end in a real browser. `auth.spec.js` covers the account lockout (feature 2): after five wrong passwords, the sixth attempt is refused even with the right password. `accounts.spec.js` covers two-factor login (feature 1), switching it on from the profile page and checking that the right password only leads to the code step, a wrong code is refused and the right code logs in; the secure password reset (feature 4), where only the new password works after the emailed code is used; and email-verified registration (feature 5), where a wrong code is refused and no account is created. The remaining features are covered by the unit, Postman and pipeline checks in the other bullets.
> - `backend/tests/audit.test.js` (14 tests) checks the audit trail: each event holds the right fields, an event with no account still builds, unknown types and outcomes are refused, only the listed fields are copied, long values are cut short, every type the controllers use is accepted by the model, records expire after the retention period, a database failure never breaks a login, and the admin view's page, page size and type are checked and anything out of range is refused.
> - `backend/tests/maskEmail.test.js` (7 tests) checks that only the first letter and the domain are kept, the name never appears, the last `@` is used, anything that is not an email is hidden completely, a line break cannot split a log line, and a very long domain is cut short.
> - `AuditLog.test.tsx` (7 tests) checks the admin view: the loading state and plain language event names, *Unknown* for events with no account, that no email address appears anywhere on the page, paging, the type filter starting again from page 1, the empty state and the error and retry state.
> - The Postman collection has five audit trail requests: an admin lists the events and filters them by type, and an unknown type (`400`), a client (`403`) and a request without a token (`401`) are refused.
> - The pipeline checks (features 7 and 8) run on every push.

### ⚖️ Final Security Review:

> [!important]
> <ins> **Scope** </ins>
>
> This review looks at the whole of HustleHub+ as it stands at the end of Part 3: the React frontend, the Express API, the MongoDB data, the Docker containers and the pipeline. It covers the four threats named in the POE scenario (injection, cross-site scripting, authentication weaknesses and access control issues) and then the other risks that matter for a marketplace that handles credentials, payments and income data. For each threat it shows the controls that are implemented and where to find them.
>
> <ins> **Threat to protection map (summary)** </ins>
>
> The table below maps each threat to its OWASP Top 10 category (OWASP Foundation, 2021), the protections that address it, and the tests that prove those protections work. The detailed tables after it show where each control lives in the code.
>
> | Threat | OWASP Top 10 | Protections implemented | Own feature involved | Proven by |
> |---|---|---|---|---|
> | **Injection** (NoSQL operators, ReDoS, CSV formulas) | A03 Injection | Operator key removal on every request, `$eq` comparisons for request values in database queries, validation of type, length and format, ObjectId checks, field whitelisting, schema rules, escaped search text, CSV cell neutralising | | `sanitize.test.js`, `validation.test.js`, invalid input Postman tests, `validation.spec.js` |
> | **Cross-site scripting** | A03 Injection | HTML stripped on the server, input blocked and cleaned on the frontend, React escaping, `https` only links, strict CSP with no inline scripts, HTML-escaped emails | CSP violation reporting | `sanitize.test.ts`, `securityHeaders.test.ts`, CSP checks in Postman and the Docker job, `security.spec.js` |
> | **Authentication weaknesses** (guessing, stolen passwords, forged tokens, reset abuse) | A07 Identification and Authentication Failures | bcrypt hashing, password rules, email verification, signed JWTs with expiry, token revocation on password change, hashed single use codes, rate limits, generic error messages, HTTPS and HSTS | Two-factor login, account lockout, secure reset, token revocation, security audit trail | `auth.test.js`, `otp.test.js`, `security.test.js`, `LoginPage.test.tsx`, auth Postman tests, `auth.spec.js`, `accounts.spec.js` |
> | **Access control issues** (wrong role, other users' records) | A01 Broken Access Control | `validateAuth` on every protected route, role allow-lists, ownership checks in controllers, own records only in lists and the tax estimate, no self-assigned admin, booking lifecycle rules, role read from the database, admin only read only audit view | Admin audit log view | `403` and `401` Postman tests, `components.test.tsx`, `security.spec.js` |
> | **Sensitive data exposure** | A02 Cryptographic Failures | TLS 1.2 and 1.3 everywhere, HSTS, hashed passwords and codes, no stack traces in responses, email never in public profiles, secrets only in `.env`, emails masked in logs, no secrets or emails in audit records | Email masking in logs | Security header Postman tests, `ErrorBoundary` check in `PageChrome.test.tsx` |
> | **Security misconfiguration** | A05 Security Misconfiguration | Helmet headers, CSP, `X-Frame-Options`, `nosniff`, `Permissions-Policy`, CORS from `ALLOWED_ORIGINS`, Nginx version hidden, fail fast on missing secrets | | `securityHeaders.test.ts`, header checks in Postman and the Docker job |
> | **Vulnerable dependencies** | A06 Vulnerable and Outdated Components | `npm audit` gate, CodeQL, three advisories fixed | Dependency audit gate | Backend and frontend CI jobs |
> | **Secrets or personal data in the code** | A08 Software and Data Integrity Failures | `.gitignore` for keys, `.env` and logs, `.dockerignore`, secrets never in images | Secrets and logs check | CI hygiene job |
> | **Attacks going unnoticed** | A09 Security Logging and Monitoring Failures | Every request and security event logged to files and Better Stack, security events stored for 90 days and reviewed by admins, no secrets in logs | CSP violation reporting, security audit trail, admin audit log view | `npm run test:logger`, `audit.test.js`, log evidence in [Logging](#-logging) |
> | **Denial of service** | (availability) | API wide and per route rate limits, body size limits, safe regular expressions, log rotation | Account lockout (per account) | Rate limit Postman test |
> | **Cross-site request forgery and clickjacking** | A01 Broken Access Control | Token in the `Authorization` header (not a cookie), CORS limited to the frontend, `frame-ancestors 'none'` and `X-Frame-Options: DENY` | | Header Postman tests, `security.spec.js` |
>
> <ins> **1. Injection** </ins>
>
> *Threat:* an attacker sends input that changes the meaning of a database query or other command. In a MongoDB application this is mostly NoSQL operator injection, for example sending `{ "email": { "$ne": null } }` to log in as the first user, but it also includes regular expression denial of service through search and formula injection in exported CSV files (OWASP Foundation, 2026e; OWASP Foundation, 2026h).
>
> | Control | Where |
> |---|---|
> | Every key starting with `$` or containing a dot, and the `__proto__` key, is removed from the body, query and URL parameters of every request | `middleware/sanitizeMiddleware.js` |
> | Input is validated for type, length, format and allowed values before a controller runs, and IDs must be 24 character hex strings | `middleware/validationMiddleware.js`, `middleware/profileValidationMiddleware.js` |
> | Only expected fields are copied into the database, so extra keys cannot be injected (mass assignment) | `profileValidationMiddleware.js`, the controllers |
> | Mongoose schemas enforce types, lengths, ranges and enums a second time | `models/` |
> | Emails and IDs taken from a request are compared with `$eq` in the login, registration, passcode, two-factor, account and booking queries, so they can only ever match as plain values | The controllers |
> | Search text is escaped with `escapeRegex` and limited to 100 characters | `controllers/gigController.js` |
> | CSV cells are quoted and formula characters are neutralised | `frontend/src/pages/BookingsPage.tsx` |
> | Tested by | `sanitize.test.js`, `validation.test.js`, the invalid input Postman tests, `sanitize.test.ts`, `validation.spec.js` (Playwright) |
>
> <ins> **2. Cross-site scripting (XSS)** </ins>
>
> *Threat:* an attacker stores a script in a gig title, booking brief or profile, and it runs in the browser of every user who views it, where it could steal the session token (OWASP Foundation, 2026e).
>
> | Control | Where |
> |---|---|
> | HTML tags are stripped from every string on the server | `middleware/sanitizeMiddleware.js` |
> | Markup and dangerous characters are blocked while typing and cleaned again on submit, including nested tags, `javascript:` URLs, event handlers and invisible characters | `frontend/src/utils/sanitize.ts`, `patterns.ts` |
> | React escapes all rendered text, and member links are only clickable when they are safe `https` addresses | Frontend components |
> | A strict Content Security Policy only allows scripts and styles from the app itself, with no inline or `eval` code, so an injected script would be blocked even if it reached the page | `securityHeaders.ts`, `nginx.conf`, `securityMiddleware.js` |
> | Violations are reported to `/api/csp-report` and logged under `SECURITY` | `controllers/cspReportController.js` |
> | Values placed in emails are HTML-escaped | `emails/otpEmail.js` |
> | Tested by | `sanitize.test.js`, `sanitize.test.ts`, `securityHeaders.test.ts`, the CSP header checks in Postman and in the Docker pipeline job, and `security.spec.js` (Playwright), which saves markup straight into the database and checks it is shown as text and never runs, and that the pages load with no CSP violations |
>
> <ins> **3. Authentication weaknesses** </ins>
>
> *Threat:* weak or stolen passwords, password guessing, fake accounts, forged or stolen tokens, and account takeover through the password reset flow (OWASP Foundation, 2026a; OWASP Foundation, 2026i).
>
> | Control | Where |
> |---|---|
> | Passwords are hashed with bcrypt and a salt, and never stored or logged in plain text | `models/userModel.js` |
> | Passwords must be at least 8 characters with upper and lower case letters, a digit and a special character | `validationMiddleware.js`, `seedAdmin.js` |
> | Email is verified with a one-time code before an account exists | `controllers/otpController.js` |
> | JWTs are signed with a server-only secret, expire after 7 days, and are rejected if issued before the last password change | `utils/token.js`, `middleware/authMiddleware.js` |
> | One-time codes are random, hashed, single use, short lived and destroyed after 5 wrong guesses | `utils/otp.js`, `models/otpModel.js` |
> | Login, registration and code checks are rate limited per IP | `middleware/rateLimitMiddleware.js` |
> | **Own feature:** accounts lock for 15 minutes after 5 wrong passwords | `utils/lockout.js` |
> | **Own feature:** optional two-factor login with an emailed code | `controllers/twoFactorController.js` |
> | **Own feature:** every login, lockout, registration, password and two-factor event is stored as an audit record for 90 days | `utils/audit.js`, `models/auditEventModel.js` |
> | The same message is used for an unknown email and a wrong password, and forgot password always gives the same answer, so accounts cannot be discovered | `authController.js`, `otpController.js` |
> | Changing the password or switching off two-factor requires the current password | `accountController.js`, `twoFactorController.js` |
> | All traffic uses HTTPS (TLS 1.2 and 1.3 in Nginx), and HSTS stops browsers falling back to HTTP | `app.js`, `nginx.conf`, `securityMiddleware.js` |
> | Every failed login, lockout and rejected token is logged | `utils/logger.js` |
> | Tested by | `auth.test.js`, `otp.test.js`, `security.test.js`, `LoginPage.test.tsx`, `RegisterPage.test.tsx`, the auth, reset and rate limit Postman tests, and `auth.spec.js` and `accounts.spec.js` (Playwright) for lockout, two-factor login, password reset, tampered and expired tokens |
>
> <ins> **4. Access control issues** </ins>
>
> *Threat:* a user reaches a function meant for another role, or changes a record that belongs to someone else by changing an ID in the URL (insecure direct object reference) (OWASP Foundation, 2026f).
>
> | Control | Where |
> |---|---|
> | Every protected route requires a valid JWT, and access is denied by default | `validateAuth` in `authMiddleware.js` |
> | Each route has a role allow-list | `validateRole` on the routes |
> | Controllers check that the user owns the gig, booking or transaction (or is an admin) before reading or changing it, and list endpoints only return the user's own records | `gigController.js`, `bookingController.js`, `transactionController.js` |
> | The tax estimate only uses the logged in freelancer's own transactions | `transactionController.js` |
> | The admin role can never be chosen at registration | `otpController.js`, `seedAdmin.js` |
> | Booking status can only move along the allowed lifecycle, and a client can only cancel before work starts | `bookingController.js` |
> | The role is read from the database on each request, so a role change takes effect immediately | `authMiddleware.js` |
> | Every `401` and `403` is logged with the user, role and route | `authMiddleware.js` |
> | Frontend route guards hide pages from the wrong roles (for the user's convenience, the API is the real boundary) | `ProtectedRoute`, `RoleRoute` |
> | Tested by | The `403` and `401` Postman tests for gigs, bookings, transactions and the tax estimate, `components.test.tsx`, and `security.spec.js` (Playwright), which checks role restricted pages and endpoints, a role edited in the browser, another freelancer's gig, and other users' bookings and transactions |
>
> <ins> **5. Other risks** </ins>
>
> | Threat | Controls |
> |---|---|
> | **Sensitive data exposure** | HTTPS everywhere, error responses never include stack traces or internal details, public profiles never return the email, email addresses are masked in the logs (own feature 12), and secrets live in `.env` files that are excluded from git and from Docker images. |
> | **Security misconfiguration** | Helmet headers, a strict CSP, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, a `Permissions-Policy`, CORS limited to `ALLOWED_ORIGINS`, Nginx version hidden, and the server refuses to start without its required secrets. |
> | **Denial of service** | API-wide and per route rate limits, 10kb body limit (512kb only for the profile photo), safe search regular expressions, and Docker log rotation. |
> | **Clickjacking** | `frame-ancestors 'none'` and `X-Frame-Options: DENY` on both the API and the frontend. |
> | **Cross-site request forgery** | The token is sent in the `Authorization` header from `sessionStorage`, not in a cookie, so a browser does not attach it to requests from other sites, and CORS only allows the frontend's origin. |
> | **Vulnerable dependencies** | `npm audit` fails the pipeline on any high or critical vulnerability in production dependencies, and CodeQL scans the code on every push and weekly. |
> | **Secrets in the repository** | `.gitignore` excludes keys, `.env` files and logs, and the pipeline fails if one is committed. |
> | **Container compromise** | Non-root users, `no-new-privileges`, read-only certificate mounts and production-only images limit what an attacker could do inside a container. |
> | **Insufficient logging and monitoring** | Every request and every security event is logged to files and to Better Stack, security events are also stored as audit records for 90 days (own feature 6), and admins can review and filter them (own feature 9), so attacks can be noticed and investigated. |
> | **Tampering with the evidence** | Audit records hold only fixed fields and fixed phrases, and there is no endpoint to edit or delete them, so the trail cannot be forged or cleaned up through the application. |
> | **Supply chain of the published images** | Images are only pushed to Docker Hub from `main` after every check passes, with an access token kept in GitHub secrets, and each image is tagged with its commit SHA. |
>
> <ins> **Remaining risks and limitations** </ins>
>
> No system is completely secure, and these are the known limits of the current version:
>
> - The JWT is kept in `sessionStorage`, so a script that did manage to run on the page could read it. The CSP and sanitisation make this unlikely, and the token is cleared when the tab closes.
> - Tokens are valid for 7 days unless the password is changed or reset; there is no separate way to sign out every device.
> - The account lockout could be used to lock a known user out on purpose. The lock ends after 15 minutes, the per-IP limit slows the attempts, and a password reset clears it.
> - The second factor is email, so it is only as strong as the user's email account.
> - The logs and the audit trail contain IP addresses and masked email addresses, so access to the log files, the Better Stack account and the admin role must still be limited.
> - The local certificate is self-signed. A real deployment would use a certificate from a trusted certificate authority.
> - The CodeQL results are kept as a run artifact rather than in GitHub code scanning, because that feature is not available on the repository.

### 🧪 Testing:

> [!important]
> Testing happens at four levels, and all four run automatically in the [CI/CD Pipeline](#%EF%B8%8F-cicd-pipeline) on every push:
>
> | Level | Tool | Count |
> |---|---|---|
> | Backend unit tests | Node.js test runner (`node --test`) | 68 tests in 10 files |
> | API tests | Postman collection run by Newman | 58 requests with 102 tests |
> | Frontend unit tests | Vitest and React Testing Library | 134 tests in 15 files |
> | Frontend integration tests | Playwright (Chromium) against the real API and database | 32 tests in 7 files |
>
> <ins> **Backend unit testing (Node.js test runner)** </ins>
>
> The backend tests in `backend/tests/` use Node's built-in test runner, so no extra test framework is installed (Node.js, 2026b). They test the security and tax logic directly, without a database or a running server.
>
> | Test file | What it checks |
> |---|---|
> | `audit.test.js` | Audit events hold only the listed fields, unknown types and outcomes are refused, long values are cut short, the model accepts every event type and expires records after 90 days, a database failure never breaks a login, and the admin view's page, page size and type filter are checked |
> | `auth.test.js` | A JWT is signed with three parts and its claims can be read back, a token signed with the wrong secret is rejected, an expired token is rejected |
> | `otp.test.js` | Codes are six digits, the HMAC-SHA256 hash is consistent, codes are compared correctly in constant time, the 60 second resend cooldown |
> | `sanitize.test.js` | `<script>`, `<style>` and other tags are stripped, MongoDB operator keys such as `$gt` and `$ne` are removed, the middleware cleans the body, query and parameters |
> | `security.test.js` | `ALLOWED_ORIGINS` falls back to the local frontend and trims spaces and trailing slashes, the lockout defaults, the seconds left on a lock, the token holds the id and role |
> | `tax.test.js` | Each bracket base matches the SARS table, the threshold and rebate, worked examples in several brackets, zero and invalid income, the tax year dates, out of date rates, the projection (including the 30 day minimum) and the next bracket |
> | `logger.test.js` | Line breaks are removed from messages, a message containing a forged entry is printed as one line, and an error whose message has a line break stays on one line |
> | `maskEmail.test.js` | Only the first letter and the domain are kept, the name never appears, the last `@` marks the domain, anything that is not an email is hidden completely, a line break cannot split a log line, a very long domain is cut short |
> | `profileUpdate.test.js` | Only the known profile fields are copied, and only as text, true or false, or a list of text. Query operators, unknown fields and items that are not text are dropped, and the field list matches the profile model |
> | `validation.test.js` | Email format, password complexity, and the registration and login validation middleware |
>
> Run the tests from the `backend` folder:
>
> ```bash
> npm test
> ```
>
> <ins> **Backend API testing (Postman and Newman)** </ins>
>
> The Postman collection in `Postman_Testing/INSY7314.postman_collection` contains **58 requests with 102 `pm.test` assertions** on status codes and response bodies. Requests save tokens and IDs to collection variables so later requests can use them, which lets the collection walk the full flow from registration to income tracking. The collection covers:
>
> | Folder | Success cases | Failure and security cases |
> |---|---|---|
> | **Auth Requests** | Registration sends a code, confirming the code creates the account, login, get profile with a valid token, forgot password, reset with the correct code | Invalid username, email and password; wrong registration code; duplicate email; wrong password; unknown user; invalid email on login; profile with no token and with an invalid token; old session rejected after a reset |
> | **Gig Requests** | Create gig, browse all gigs, get my gigs, get one gig, owner updates gig, owner deletes gig | Client blocked from creating a gig (`403`), invalid gig input (`400`), non-owner and another freelancer blocked from updating a gig (`403`) |
> | **Booking Requests** | Create booking, admin views any booking, freelancer starts and completes work | Freelancer blocked from booking (`403`), another client blocked from viewing the booking (`403`), client blocked from cancelling started work (`403`) |
> | **Transaction Requests** | Freelancer income summary, admin platform-wide summary, freelancer tax estimate, second booking, owner cancels booking, cancelled booking's transaction is `refunded`, admin lists the audit events and filters them by type | Client blocked from the income summary (`403`), client and admin blocked from the tax estimate (`403`), tax estimate without a token (`401`), another client blocked from viewing a transaction, unknown audit event type (`400`), client blocked from the audit events (`403`), audit events without a token (`401`) |
> | **Account Requests** | Save profile with a photo, change password | `javascript:` profile link rejected, old token rejected after the password change |
> | **Security Requests** | `Content-Security-Policy` (`default-src 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and HSTS present on responses | Login blocked by the rate limiter with `429` |
>
> <ins> **Running the API tests with Newman** </ins>
>
> The recommended way is the runner script, which needs `backend/.env` (with `CONN_STRING` and `JWT_SECRET`), the certificate files from the setup steps (`cert.key`, `cert.crt` and `ca.crt`) in the project root, and the backend dependencies installed:
>
> ```bash
> cd Postman_Testing
> npm install
> npm test
> ```
>
> `run-api-tests.js` makes the run repeatable and self-contained. It:
>
> 1. Starts two throwaway copies of the API on ports `3098` and `3097`, using the `console` email provider so no real emails are sent. The second copy has an auth limit of 1, so the rate limiting test is quick and does not affect the other tests.
> 2. Seeds the extra test accounts (second client, second freelancer, admin) with random passwords, plus registration and reset codes it knows, so the OTP flows can be tested without reading an inbox.
> 3. Runs the collection with Newman's CLI reporter, pointing every request at the test server and passing the seeded values in as environment variables (Newman, 2026).
> 4. Deletes every user, gig, booking, transaction, profile and passcode it created, whether the run passed or failed, and exits with a non-zero code if any assertion failed.
>
> The collection file itself still targets `https://localhost:3000`, so individual requests can also be sent from Postman against a running backend. In the pipeline, the same runner is used against a MongoDB service container, and the Newman output is kept as the `newman-output` artifact for 90 days.
>
> <ins> **Frontend testing (Vitest and React Testing Library)** </ins>
>
> The frontend has **134 tests in 15 files**, all passing. They render components in a simulated browser (jsdom) and use `user-event` to type and click like a real user, with the API mocked so tests do not need a running backend (Vitest, 2026; Testing Library, 2026).
>
> | Test file | What it checks |
> |---|---|
> | `LoginPage.test.tsx` | Form renders, empty input is blocked without calling the API, a successful login stores the session and opens the dashboard, a rejected login shows the generic message, the two-factor code step (no session after the password step, correct code logs in, incomplete code never sent, wrong code keeps the user logged out, going back to the password form), the lockout message |
> | `RegisterPage.test.tsx` | Weak and mismatched passwords are blocked, the code is requested with the chosen role, the username is sanitised before it is sent, a duplicate email shows the server message, a confirmed code stores the session and opens the dashboard, an incomplete code never reaches the API, a wrong code clears the boxes, resend stays disabled during the cooldown, the user can go back and change the email |
> | `ForgotPasswordPage.test.tsx` | The email is validated first, a cleaned email is sent and the neutral server message shown, weak and mismatched new passwords are blocked, all six digits are required, a successful reset offers the login page, a wrong code shows the error and clears the boxes |
> | `OtpInput.test.tsx` | Six labelled digit boxes render, focus moves forward while typing, letters and symbols are ignored, a pasted code fills every box, extra pasted digits are dropped, backspace in an empty box steps back |
> | `GigEditorPage.test.tsx` | Number fields accept digits only, markup cannot be typed or pasted, invalid gigs are not submitted, only sanitised values are sent, an invalid ID in the URL is refused |
> | `GigDetailPage.test.tsx` | Booking flow: a brief is required, a past date is rejected, markup is stripped from the brief, a booking shows the transaction receipt, an invalid gig ID never reaches the API |
> | `ProfilePage.test.tsx` | Role-specific tabs, live preview, input blocking, `https`-only website links, LinkedIn link checks, username changes sent to the API and the session updated, server refusals explained, skill tags, digits-only hourly rate, image-only uploads, tampered stored data is ignored |
> | `PublicProfilePage.test.tsx` | Viewing other members, unsafe links are never made clickable, visibility setting is respected, unknown or invalid IDs are handled |
> | `components.test.tsx` | Gig card rendering and clicks, role-based route guards (anonymous users and wrong roles are redirected), nav links per role, cancelled bookings are excluded from income |
> | `TaxSummary.test.tsx` | Loading state then the figures from the API, no tax at or below the threshold, the projection, set aside amount and next bracket, the accessible threshold progress bar, tax and effective rate once past the threshold, the top bracket, the out of date rates warning (and no warning when the rates match), the disclaimer, and the error state with retry |
> | `PageChrome.test.tsx` | Page titles per route, offline banner, `ErrorBoundary` never shows the error text |
> | `sanitize.test.ts` | Script and HTML removal, nested payloads, dangerous URL schemes and event handlers, invisible characters, field sanitisers and whitelist patterns |
> | `utils.test.ts` | Landing page tax example brackets and threshold, password, email and gig validation rules, currency formatting |
> | `securityHeaders.test.ts` | Production and development CSP rules, no inline or wildcard sources, framing and plugins blocked, reports sent to the API, HSTS only in production |
> | `AuditLog.test.tsx` | The admin audit trail: loading state and plain language event names, *Unknown* for events with no account, no email address anywhere on the page, paging, the type filter starting again from page 1, the empty state, and the error and retry state |
>
> Run the tests from the `frontend` folder:
>
> ```bash
> npm test
> ```
>
> <ins> **Frontend integration testing (Playwright)** </ins>
>
> The Vitest tests above check each component on its own with the API mocked. The Playwright tests in `Integration_Testing/` check that the parts work together: they open the production build of the React app in a real Chromium browser, the app calls the real API over HTTPS, and the API reads and writes a real MongoDB database, so a test only passes if the page, the API and the data all agree (Playwright, 2026a). Because the app is served with `vite preview`, the production security headers are what gets tested. Each test is written as a series of actions followed by assertions on what the user sees (Playwright, 2026j), and elements are found by their role and label, the same way a user or a screen reader finds them (Playwright, 2026f). Each test is a full user journey with several checks, so the **32 tests in 7 files** make more than 150 checks in total.
>
> | Test file | Tests | What it checks |
> |---|---|---|
> | `accounts.spec.js` | 4 | A wrong registration code is refused and no account is created (MDN Web Docs, 2026f). A new freelancer registers with the emailed code, lands on the dashboard, and the password is saved as a bcrypt hash (OWASP Foundation, 2026a). A forgotten password is reset with the emailed code, after which the old password fails and the new one works (OWASP Foundation, 2026i). With two-factor login switched on from the profile page, the right password only leads to the code step, a wrong code is refused and the right code logs in |
> | `auth.spec.js` | 6 | Anonymous visitors are sent from `/dashboard`, `/my-gigs`, `/bookings` and `/admin` to the login page; a wrong password shows the generic `Invalid credentials.` message and no session is stored; a freelancer logs in, receives a three part JWT kept only in `sessionStorage`, logs out and cannot reopen the dashboard; the account locks after five wrong passwords, even when the sixth is correct; a token whose role was edited in the browser is refused and the user is logged out; an expired token logs the user out cleanly |
> | `gigs.spec.js` | 2 | A freelancer edits a gig's price and delivery time and both the **My gigs** list and the API show the new values; deleting a gig asks for confirmation first, and afterwards the API no longer finds it |
> | `marketplace.spec.js` | 7 | The full flow in order: a freelancer creates a gig and it appears under **My gigs**; a client searches for it, books it and gets a receipt with the transaction reference returned by the API; the client's **Bookings** page shows the booking and transaction; the freelancer sees the booking, the total income and the tax estimate; the freelancer starts and delivers the work and the client sees it as delivered and can no longer cancel it; a client cancels a second booking and the API marks its transaction as `refunded`; an admin sees the bookings from every user |
> | `security.spec.js` | 7 | A client cannot open the freelancer pages; a client cannot open the admin page, and the API answers `403` to the same client for the tax estimate, income summary and my gigs endpoints; a client who edits the stored role in the browser to `freelancer` still gets `403` from the API, because the API reads the role from the database on every request, not from the browser (OWASP Foundation, 2026f); a freelancer cannot edit or delete another freelancer's gig; other users cannot read, change or cancel a booking or transaction that is not theirs; markup saved directly in the database is shown as text and never runs (OWASP Foundation, 2026e); the React app is served with the strict production Content Security Policy, HSTS and `nosniff`, and the pages load with no CSP violations (MDN Web Docs, 2026c) |
> | `tax.spec.js` | 2 | A R300 000 booking shows R300 000 income, R40 572 estimated tax (13.5%) and R259 428 after tax on the freelancer's dashboard, matching the SARS table worked out by hand and the API's figures (South African Revenue Service, 2026); a cancelled booking is taken back out of the income and tax |
> | `validation.spec.js` | 4 | The register form explains each mistake and sends nothing to the API; the gig editor refuses out of range values and sends nothing; markup and letters cannot be typed into the gig form's text and number fields; a booking with too short a brief is not sent |
>
> <ins> **How the Playwright run works** </ins>
>
> 1. `playwright.config.js` starts the API on port `3000` (with the `console` email provider and higher rate limits) and builds and serves the React app on port `5173` with `vite preview`, then waits for both to answer (Playwright, 2026d). If either port is already in use the run stops, so the tests never attach to a development server by mistake.
> 2. `global-setup.js` creates the test accounts (freelancer, client, admin, and separate accounts for the lockout, reset and two-factor tests) and the test gigs. Every run uses a random id and a random password, so no test passwords are committed. The values reach the tests through environment variables (Playwright, 2026e).
> 3. The API only stores a keyed hash of each emailed code, so a test cannot read it. For the registration, reset and two-factor tests, `tests/db.js` waits until the API has stored the code and then replaces its hash with the hash of a code the test chose, using the API's own `hashCode` function. Everything else in those flows still goes through the browser and the API.
> 4. The tests run one at a time (`workers: 1`), because the marketplace, gig and tax flows build on themselves (Playwright, 2026g). The delivery and tax tests use a second browser context so the freelancer and the client are logged in at the same time as separate users (Playwright, 2026i). Tests are not retried, because they change accounts and data and a rerun would not start from the same state, and in the pipeline `test.only` is not allowed, so a test cannot be skipped by mistake (Playwright, 2026b). Each test has up to two minutes, so a slow runner does not cause a false failure.
> 5. After the tests, every user, gig, booking, transaction, profile and passcode the run created is deleted, whether the tests passed or failed.
> 6. A failed test keeps a screenshot, a video and a trace in the HTML report, which can be opened with `npm run report` (Playwright, 2026c). In the pipeline the report is saved as the `playwright-report` artifact for 90 days (Playwright, 2026h). Local results folders (`test-results/`, `playwright-report/`) are ignored by git.
>
> <ins> **Running the Playwright tests locally** </ins>
>
> They need the same `backend/.env` as Newman (with `CONN_STRING` and `JWT_SECRET`), `cert.key`, `cert.crt` and `ca.crt` in the project root, and the backend and frontend dependencies installed. Stop the development servers and Docker containers first, because the tests start their own on ports `3000` and `5173`.
>
> ```bash
> cd Integration_Testing
> npm install
> npx playwright install chromium
> npm test
> ```
>
> `npm run test:headed` shows the browser while the tests run, and `npm run report` opens the last HTML report.

### 📸 Part 3 Evidence:
> [!note]
> The pipeline screenshots below were taken from successful runs. See the note at the start of the [CI/CD Pipeline](#%EF%B8%8F-cicd-pipeline) section about runs after 8 November 2026.

> [!important]
> #### CI/CD pipeline run
> _Screenshot of the CI, Static analysis and CodeQL workflows passing._
> <img width="1600" height="876" alt="1 ci" src="https://github.com/user-attachments/assets/c4b89fea-73fc-441e-aa04-096f4410dd33" />
>
> #### Newman execution in the pipeline
> _Screenshot of the API tests job or the `newman-output` artifact._
> 
> <img width="1600" height="894" alt="1 API tests job  newman-output" src="https://github.com/user-attachments/assets/904fd11e-a0b1-4e5f-8f58-f7ef5b476317" />
>
> #### Playwright integration tests
> _Screenshot of the 32 passing Playwright tests (terminal or the integration test job) and the HTML report._
> 
> <img width="982" height="447" alt="unit tests intergration testing 1" src="https://github.com/user-attachments/assets/0f83f7a1-13a7-4536-b66d-d82ba4cbd84c" />
>
> <img width="1635" height="870" alt="unit tests intergration playwrite report 2 1" src="https://github.com/user-attachments/assets/2cfd9770-f12e-4493-b876-b413aa9ec96b" />
> 
> <img width="1632" height="405" alt="unit tests intergration playwrite report 2 2" src="https://github.com/user-attachments/assets/06ef4cc2-7a12-4443-9ccf-390ee2a55ab7" />
> 
> <img width="1635" height="402" alt="unit tests intergration playwrite report 2 3" src="https://github.com/user-attachments/assets/8f392184-8fb9-4a03-82aa-6ae7e4eee19f" />
> 
> <img width="1627" height="423" alt="unit tests intergration playwrite report 2 4" src="https://github.com/user-attachments/assets/30ca41c1-efcd-434b-9317-ebfac468dc28" />
> 
> #### Backend and frontend unit tests
> _`npm test` in `backend` and `frontend`. The backend screenshot was taken before the last 8 tests were added, so it shows 60 passing, and the final code has 68. The frontend has 134 passing._
> 
> <img width="650" height="455" alt="Unit tests backend" src="https://github.com/user-attachments/assets/e71bd85d-da47-47f1-96a0-16f42d348e2e" />
> 
> <img width="801" height="447" alt="Unit tests frontend" src="https://github.com/user-attachments/assets/4de2b224-f3e9-4201-8052-e30b66a9a9b1" />
> 
> #### Static analysis and CodeQL results
> _The ESLint and Prettier steps and the CodeQL run summary (taken before the final small fix, so it shows 11 alerts, and the last successful run reports 10)._
> <img width="1600" height="486" alt="2 ESLint and Prettier" src="https://github.com/user-attachments/assets/0fc77f06-82a9-4029-af25-8a799816e695" />
> 
> <img width="1600" height="889" alt="3 CodeQL run summary" src="https://github.com/user-attachments/assets/25827667-b884-4314-b00a-ae26e4ed0785" />
> 
> #### Docker containers running
> _Screenshot of `docker compose ps` with both containers healthy._
> 
> <img width="1600" height="312" alt="docker compose ps" src="https://github.com/user-attachments/assets/7d8a5073-49ca-4420-9b26-9cc6c69f4891" />
>
> #### Images published to Docker Hub
> _Screenshot of the Publish images to Docker Hub job and of the `hustlehub-backend` and `hustlehub-frontend` repositories on Docker Hub._
> 
> <img width="1600" height="799" alt="1 docker with images" src="https://github.com/user-attachments/assets/3d127391-68dc-46b2-b871-14a3b8bf8ad9" />
>
> <img width="1600" height="896" alt="docker frontend continer" src="https://github.com/user-attachments/assets/27de597f-fcaf-48f9-b3f7-83190d2e21d8" />
> 
> <img width="1600" height="896" alt="docker backend continer" src="https://github.com/user-attachments/assets/a2547754-db44-435e-9660-ab987b4fa917" />
> 
> #### Logging (local files and Better Stack)
> _Screenshots of `backend/logs` and the Better Stack live tail._
>
> <img width="1600" height="962" alt="backend Logs" src="https://github.com/user-attachments/assets/f985cc7b-3a8d-4415-b690-f6e7a3015cd3" />
>
> <img width="1600" height="760" alt="live tail" src="https://github.com/user-attachments/assets/d13eac28-0ac6-4e83-9250-ae72e1941e76" />
>
> <img width="1600" height="760" alt="live tail 2" src="https://github.com/user-attachments/assets/c26f2e9e-a74a-4298-900b-6cebfebe15ac" />
> 
> #### Tax and income dashboard
> _Screenshot of the freelancer dashboard with the tax estimate._
>
> <img width="1917" height="860" alt="Screenshot 2026-11-08 130711" src="https://github.com/user-attachments/assets/d7b5c33d-9a45-45f5-bf90-88c192436860" />
>
> #### Two-factor login and account lockout
> _Screenshots of the login code step and the lockout message._
> <img width="1917" height="862" alt="Screenshot 2026-11-08 125233" src="https://github.com/user-attachments/assets/3ad7cef1-9ca7-41c2-8e14-afd20d5b29aa" />
> 
> <img width="1917" height="860" alt="Screenshot 2026-11-08 125442" src="https://github.com/user-attachments/assets/45b74832-51c7-40f8-b6f7-45e41e4f52ae" />
> 
> #### Security audit trail (own features 6 and 9)
> _Screenshot of the admin page showing the stored security events._
> 
> <img width="1600" height="918" alt="extra feature security audit" src="https://github.com/user-attachments/assets/134eef7c-13d3-4dc8-8e2d-f38112aba925" />
> 
> #### Newman execution (local run)
> _Screenshot of `npm test` in `Postman_Testing`._
> 
> <img width="635" height="453" alt="Unit tests postman" src="https://github.com/user-attachments/assets/22e2506e-97bd-4f62-9a7b-f6242be63142" />
> 

### 🏗️ Backend Structure:

> [!important]
> <ins> **Backend Structure of HustleHub+** </ins>
>
> The backend follows a layered Express architecture, where each concern (routing, business logic, request gatekeeping, and data shape) is kept in its own folder rather than mixed together in one file (Ilic, 2025). 
>
> <ins> **Layered Express architecture separation of HustleHub+** </ins>
> 
> | Component | Purpose |
> |---|---|
> | **Routes** (`routes/`) | Declare **which URL and HTTP method** triggers what, and **what runs before it**. They primarily wire a URL to a chain of middleware and a controller function rather than containing the main business logic themselves (Express.js, 2026a). |
> | **Middleware** (`middleware/`) | Functions that run **before a request reaches its controller**. They handle cross-cutting concerns such as rejecting bad input, verifying a JWT, configuring CORS, and connecting to the database (articsledge, 2026). Middleware either calls `next()` to let the request continue or sends a response itself and stops the request (Express.js, 2026b). |
> | **Controllers** (`controllers/`) | Contain the **business logic** for a request after it has passed through middleware. They perform tasks such as checking whether a user exists, hashing/comparing a password, issuing a token, and sending the response (GeeksforGeeks, 2025). |
> | **Models** (`models/`) | Define the **shape of data stored in MongoDB** through Mongoose, including fields, data types, and validation rules. They can also contain data-related functionality, which can be used to perform operations on document data before or after database operations, such as hashing passwords before they are stored (Mongoose, 2026a). |
>

rudderz243 (2026) demonstrates how to do the below backend file structure. The frontend sits alongside it in its own `frontend/` folder, and the pipeline and Docker files sit at the root.
```
insy7314-2026-poe-kylelotter/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Tests, builds, audits, Newman, Playwright, Docker run, Docker Hub
│       ├── codeql.yml                # CodeQL security scanning (static application security testing)
│       └── static-analysis.yml       # ESLint and Prettier checks for the backend and the frontend
├── backend/                          # Root directory for backend application code
│   ├── controllers/                  # Route logic handlers
│   │   ├── accountController.js      # Changes the username, email and password of the logged-in user
│   │   ├── auditController.js        # Lists the stored audit events for admins, a page at a time (own security feature)
│   │   ├── authController.js         # Processes login (with lockout and two-factor checks) and profile requests
│   │   ├── bookingController.js      # Creates bookings, simulates payment and enforces the booking lifecycle
│   │   ├── cspReportController.js    # Receives and logs Content Security Policy violation reports
│   │   ├── gigController.js          # Gig CRUD with ownership checks and safe search
│   │   ├── otpController.js          # Email-verified registration and password reset with one-time passcodes
│   │   ├── profileController.js      # Saves and returns the public profile members choose to share
│   │   ├── transactionController.js  # Transaction lookups, the freelancer income summary and the tax estimate
│   │   └── twoFactorController.js    # Two-factor login: sends and checks login codes, switches 2FA on or off
│   ├── emails/
│   │   └── otpEmail.js               # HTML and plain-text passcode email, with all values HTML-escaped
│   ├── logs/                         # Daily log files written at runtime (ignored by git, mapped out of Docker)
│   ├── middleware/                   # Express middleware functions
│   │   ├── authMiddleware.js         # Verifies JWT tokens, rejects revoked tokens and enforces role restrictions
│   │   ├── dbMiddleware.js           # Establishes and manages the MongoDB connection
│   │   ├── loggerMiddleware.js       # Logs every HTTP request with its status, duration, IP and user
│   │   ├── profileValidationMiddleware.js # Validates account changes and profile fields, photos and links
│   │   ├── rateLimitMiddleware.js    # API-wide, auth, OTP, account, booking and CSP report rate limits
│   │   ├── sanitizeMiddleware.js     # Strips HTML and MongoDB operator keys from every request
│   │   ├── securityMiddleware.js     # Configures Helmet security headers, CSP and CORS (origins from ALLOWED_ORIGINS)
│   │   └── validationMiddleware.js   # Validates auth, OTP, two-factor, gig, booking and ID input
│   ├── models/                       # Mongoose database schemas and models
│   │   ├── auditEventModel.js        # Stored security events, removed after 90 days by a TTL index (own security feature)
│   │   ├── bookingModel.js           # Booking schema and allowed booking statuses
│   │   ├── gigModel.js               # Gig schema, allowed categories and statuses
│   │   ├── otpModel.js               # Pending passcodes (register, reset, login), removed by a TTL index
│   │   ├── profileModel.js           # Public profile details, kept separate from the user
│   │   ├── transactionModel.js       # Simulated payment record linked to a booking
│   │   └── userModel.js              # User schema, password hashing, passwordChangedAt, 2FA and lockout fields
│   ├── routes/                       # API route definitions
│   │   ├── adminRoutes.js            # Admin only routes, such as the audit trail (/api/admin)
│   │   ├── authRoutes.js             # Routes for authentication, OTP, two-factor and account changes (/api/auth)
│   │   ├── bookingRoutes.js          # Routes for bookings (/api/bookings)
│   │   ├── cspRoutes.js              # Route for CSP violation reports (/api/csp-report)
│   │   ├── gigRoutes.js              # Routes for gigs (/api/gigs)
│   │   ├── transactionRoutes.js      # Routes for transactions, income and the tax estimate (/api/transactions)
│   │   └── userRoutes.js             # Routes for member profiles (/api/users)
│   ├── scripts/
│   │   ├── seedAdmin.js              # Creates the first admin account (npm run seed:admin)
│   │   └── verifyLogger.js           # Checks the log files and the Better Stack connection (npm run test:logger)
│   ├── services/
│   │   └── emailService.js           # Sends email through the Brevo API (or the console in tests)
│   ├── tests/                        # Backend unit tests (Node.js test runner, npm test)
│   │   ├── audit.test.js             # Audit event fields, limits, retention and failure handling
│   │   ├── auth.test.js              # JWT signing, tampering and expiry
│   │   ├── otp.test.js               # Passcode generation, hashing, comparison and resend cooldown
│   │   ├── sanitize.test.js          # HTML stripping and MongoDB operator removal
│   │   ├── security.test.js          # ALLOWED_ORIGINS parsing, lockout helpers and token claims
│   │   ├── maskEmail.test.js         # Email masking, line breaks and long domains
│   │   ├── tax.test.js               # SARS brackets, rebate, threshold, tax year and insights
│   │   └── validation.test.js        # Email, password and registration/login validation middleware
│   ├── utils/
│   │   ├── audit.js                  # Builds and stores security audit events and checks the admin view's query (own security feature)
│   │   ├── lockout.js                # Account lockout after repeated failed logins (own security feature)
│   │   ├── maskEmail.js              # Masks email addresses in log messages, such as k***@gmail.com (own security feature)
│   │   ├── logger.js                 # Terminal, daily file and Better Stack cloud logging
│   │   ├── otp.js                    # Generates, hashes and compares one-time passcodes
│   │   ├── tax.js                    # SARS tax table, tax year and tax estimate with insights
│   │   ├── textChecks.js             # Plain-text, digit and control-character checks
│   │   └── token.js                  # Signs the JWT with the user id and role
│   ├── .dockerignore                 # Keeps node_modules, logs and .env files out of the image
│   ├── .env                          # Local environment variables (ignored by git)
│   ├── .env.example                  # Template listing the environment variables
│   ├── .gitignore                    # Specifies untracked files to ignore
│   ├── .prettierignore               # Files Prettier skips
│   ├── .prettierrc.json              # Prettier formatting rules
│   ├── Dockerfile                    # Backend image (Node.js 24 Alpine, non-root user, port 3000)
│   ├── app.js                        # Express HTTPS server setup and entry point
│   ├── eslint.config.js              # ESLint rules for the backend
│   ├── package-lock.json             # Locked package dependency versions
│   └── package.json                  # Backend dependencies and run scripts
├── frontend/                         # React (TypeScript + Vite) client application
│   ├── src/
│   │   ├── components/               # Reusable UI, route guards, charts, tax summary, error boundary
│   │   ├── hooks/                    # Data hooks (ledger, profile, API state)
│   │   ├── models/                   # TypeScript types for users, gigs, bookings and profiles
│   │   ├── pages/                    # One component per route, plus page tests
│   │   ├── services/                 # API clients and session storage
│   │   ├── test/                     # Vitest setup and test helpers
│   │   ├── utils/                    # Sanitisation, validation, tax example, formatting
│   │   ├── App.tsx                   # Routes and role-based route groups
│   │   ├── config.ts                 # API address (VITE_API_URL, with a local default)
│   │   └── main.tsx                  # React entry point
│   ├── .dockerignore                 # Keeps node_modules, dist and .env files out of the image
│   ├── .prettierrc.json              # Prettier formatting rules
│   ├── Dockerfile                    # Two stage image: Vite build, then unprivileged Nginx on port 5173
│   ├── eslint.config.js              # ESLint rules for the frontend
│   ├── nginx.conf                    # Nginx HTTPS server and security headers (template filled at start)
│   ├── securityHeaders.ts            # CSP and security headers for the dev server and preview
│   ├── securityHeaders.test.ts       # Tests for the security header policy
│   ├── vite.config.ts                # HTTPS dev server and preview configuration
│   ├── vitest.config.ts              # Test runner configuration (jsdom)
│   └── package.json                  # Frontend dependencies and run scripts
├── .gitignore                        # Repo-wide ignore rules (.env, node_modules, *.key, logs)
├── cert.crt                          # SSL certificate for local HTTPS
├── cert.key                          # SSL private key for local HTTPS (ignored by git)
├── ca.crt                            # Certificate authority file
├── ca.key                            # Certificate authority private key (ignored by git)
├── docker-compose.yml                # Runs the backend and frontend containers on a bridge network
├── Integration_Testing/              # Playwright frontend integration tests (real browser, API and database)
│   ├── tests/
│   │   ├── accounts.spec.js          # Registration code, password reset and two-factor login
│   │   ├── auth.spec.js              # Protected pages, login, logout, lockout, tampered and expired tokens
│   │   ├── gigs.spec.js              # Editing and deleting a gig
│   │   ├── marketplace.spec.js       # Gig, booking, delivery, cancellation, refund, income and admin flow
│   │   ├── security.spec.js          # Role checks, ownership checks, stored markup and the CSP
│   │   ├── tax.spec.js               # SARS tax figures on the freelancer dashboard
│   │   ├── validation.spec.js        # Form validation in the browser
│   │   ├── db.js                     # Database helpers (swaps in known code hashes, cleans up)
│   │   └── helpers.js                # Login and API helpers shared by the tests
│   ├── global-setup.js               # Creates the test accounts and gigs, then removes all test data
│   ├── playwright.config.js          # Starts the API and the React app, Chromium, reports and timeouts
│   └── package.json                  # Playwright dependency and the npm test scripts
└── Postman_Testing/                  # Postman collection and Newman runner
    ├── INSY7314.postman_collection   # 58 requests covering auth, OTP, gigs, bookings, transactions, tax, audit trail, profiles and security
    ├── package.json                  # Newman dependency and the npm test script
    └── run-api-tests.js              # Starts throwaway API servers, seeds test data, runs Newman and cleans up
```

> [!important]
> 🗃️
> <ins> **File Breakdown:** </ins>
>
> - **`app.js`**: application entry point. Loads environment variables and fails fast with a clear error if `CONN_STRING` or `JWT_SECRET` is missing, registers the HTTP request logger first so every request is logged, applies the security middleware (Helmet and CORS), runs the API-wide rate limiter before any body is parsed, limits JSON bodies to 10kb (with a single 512kb exception for the profile photo route), runs the global sanitiser, mounts the auth, gig, booking, transaction, user profile and CSP report routes plus a `GET /api/health` check, registers a catch-all `404` handler and a centralised error-handling middleware, loads the local SSL certificate/key/CA files, connects to the database via `dbMiddleware.js`, and only then starts the HTTPS server, so the API never accepts requests before the database connection is confirmed. It also logs uncaught exceptions, unhandled promise rejections and shutdown signals (`SIGINT`, `SIGTERM`) through the logger.
> - **`controllers/authController.js`**: logs users in with a generic "Invalid credentials" message for both unknown emails and wrong passwords, refuses every attempt on a locked account with `429`, counts wrong passwords towards the lockout, hands accounts with two-factor switched on to `twoFactorController.js` instead of issuing a token, issues JWTs through the shared `generateToken()` helper in `utils/token.js`, and returns the authenticated user's own profile.
> - **`controllers/twoFactorController.js`**: `sendLoginChallenge` emails a login code once the password is correct (no more than once a minute), `verifyLoginCode` confirms the code and only then returns the JWT, and `setTwoFactor` switches two-factor login on or off after checking the current password.
> - **`controllers/otpController.js`**: the two passcode flows. `startRegistration` checks the email is free, hashes the password straight away, stores the pending sign-up with a hashed code and emails the code; `verifyRegistration` checks the code and only then creates the user and returns a JWT; `resendRegistrationCode` enforces a 60-second cooldown; `forgotPassword` always gives the same answer; `resetPassword` checks the code, saves the new password and sets `passwordChangedAt`.
> - **`controllers/accountController.js`**: `updateAccount` changes the username and email (rejecting an email that belongs to someone else), and `changePassword` requires the current password, refuses to reuse it, sets `passwordChangedAt` and returns a fresh token for the current device.
> - **`controllers/profileController.js`**: `saveMyProfile` upserts only the validated profile fields for the logged-in user, and `getPublicProfile` returns a whitelist of shareable fields plus server-computed stats (completed bookings, member since), never the email, and nothing at all when the profile is hidden.
> - **`controllers/gigController.js`**: creates gigs owned by the logged-in freelancer, returns only `active` gigs to the public marketplace with optional category, price, freelancer and keyword filters, returns a freelancer's own gigs, and only lets the owner or an admin update or delete a gig.
> - **`controllers/bookingController.js`**: creates a booking for an active gig (blocking a user from booking their own gig), records a simulated `Transaction` with a unique reference, returns each user only the bookings they are part of, and enforces a fixed booking lifecycle so a status can only move forward along allowed steps. Cancelling a booking marks its transaction as `refunded`.
> - **`controllers/transactionController.js`**: returns the transactions a user is part of, checks ownership before returning a single transaction, builds the freelancer income summary from completed transactions only, and builds the tax estimate (`getTaxEstimate`) from the freelancer's completed transactions inside the current SARS tax year.
> - **`controllers/cspReportController.js`**: accepts CSP violation reports in both the older `report-uri` format and the newer Reporting API format, trims and cleans each value, logs the violation, and always replies `204`.
> - **`middleware/authMiddleware.js`**: verifies JWTs on protected routes (`validateAuth`), rejects any token issued before the user's last password change, and enforces role-based access control (`validateRole`). Both are now attached to the gig, booking, transaction, account and profile routes.
> - **`middleware/dbMiddleware.js`**: sets up and manages the MongoDB connection using Mongoose; exits the process if the initial connection fails, and logs (without crashing) any `error`, `disconnected`, or `reconnected` events on the connection afterwards, such as a network blip or the cluster restarting mid-session.
> - **`middleware/rateLimitMiddleware.js`**: builds six limiters with `express-rate-limit` that return a `429` JSON response and a `Retry-After` header when exceeded. Most limits can be overridden from `.env`.
> - **`middleware/profileValidationMiddleware.js`**: validates username and email changes, password changes and every profile field. Only known fields that pass are kept, photos must be genuine JPEG, PNG or WebP images, and links must be `https`.
> - **`middleware/sanitizeMiddleware.js`**: cleans the body, query string and URL parameters of every request, and provides `escapeRegex` so search text is matched literally.
> - **`middleware/securityMiddleware.js`**: configures Helmet with a strict API Content Security Policy, HSTS, `X-Frame-Options`, a no-referrer policy and a `Reporting-Endpoints` header, and configures CORS so only the origins listed in the `ALLOWED_ORIGINS` environment variable (comma separated, defaulting to `https://localhost:5173`) can call the API.
> - **`middleware/validationMiddleware.js`**: validates and normalises input for registration and login, and now also for passcode confirmation (exactly six digits), password reset, gig creation and updates, booking creation, booking status changes, and MongoDB IDs in the URL.
> - **`models/userModel.js`**: the Mongoose `User` schema (`username`, `email`, `password`, `role`, `passwordChangedAt`, and the Part 3 `twoFactorEnabled`, `failedLoginAttempts` and `lockUntil` fields), including the `pre('save')` password-hashing hook and the `matchPassword` comparison method. The hook skips hashing when a sign-up confirmed by passcode already holds a bcrypt hash.
> - **`models/otpModel.js`**: one pending passcode per email and purpose (`register`, `reset` or `login`), holding the code hash, attempt count, expiry and, for sign-ups, the username, already-hashed password and role. A TTL index deletes expired records automatically (MongoDB, 2026a).
> - **`models/profileModel.js`**: the public profile, linked one-to-one to a user and kept separate so the photo is not loaded on every login.
> - **`emails/otpEmail.js`** and **`services/emailService.js`**: build the passcode email (escaping every value placed into the HTML) and send it through the Brevo API (Brevo, 2026). A `console` provider prints emails to the terminal for automated tests and refuses to run in production.
> - **`utils/logger.js`**: the central logger. Each entry is printed in colour to the terminal, appended to a daily `logs/YYYY-MM-DD-combined.log` file (and `YYYY-MM-DD-error.log` for errors) and sent to Better Stack over HTTPS. See [Logging](#-logging).
> - **`middleware/loggerMiddleware.js`**: logs every HTTP request once the response is sent, with the method, URL, status code, duration, client IP and, when logged in, the username.
> - **`utils/tax.js`**: holds the SARS individuals' tax table, works out the tax year a date falls in, calculates the tax after the primary rebate and builds the insights. See [Tax and Income Dashboard](#-tax-and-income-dashboard).
> - **`utils/lockout.js`**: counts wrong passwords per account with an atomic update and sets `lockUntil` when the limit is reached. See [Own Security Features](#%EF%B8%8F-own-security-features).
> - **`utils/audit.js`**: builds a security event from a fixed list of fields and event types and stores it as an `AuditEvent`, without ever breaking the request if the write fails. See [Own Security Features](#%EF%B8%8F-own-security-features).
> - **`utils/otp.js`**: generates codes with `crypto.randomInt`, stores them as an HMAC-SHA256 hash keyed with `OTP_SECRET`, and compares them with `crypto.timingSafeEqual` (Node.js, 2026a).
> - **`scripts/verifyLogger.js`**: writes sample entries, checks that the combined and error log files exist and contain the right lines, and, when a Better Stack token is set, checks that Better Stack accepts a test entry. Run with `npm run test:logger`.
> - **`scripts/seedAdmin.js`**: creates the first admin from `ADMIN_USERNAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`, refusing weak passwords and refusing to promote an existing non-admin account.
> - **`models/gigModel.js`**, **`models/bookingModel.js`**, **`models/transactionModel.js`**: schemas with length, range, enum and required rules that repeat the middleware checks at the database boundary. Each booking and transaction stores references to both the client and the freelancer, which is how income is associated with the correct freelancer.
> - **`routes/*.js`**: wire each URL to its rate limiter, `validateAuth`, `validateRole`, validation middleware and controller, in that order.
> - **`.env`** (not committed to version control): holds `CONN_STRING`, `JWT_SECRET`, the Brevo email settings, the admin seed details, the Better Stack token and host, and the optional `OTP_SECRET`, `NODE_EXTRA_CA_CERTS`, `ALLOWED_ORIGINS`, `PORT`, lockout and rate limit overrides. `.env.example` lists the keys with empty values. `PORT` and `ACCOUNT_RATE_LIMIT_MAX` are optional and are not in the template; add them to `backend/.env` only to change the port or the account limit.
> - **`cert.crt`, `cert.key`, `ca.crt`, `ca.key`**: the locally generated SSL certificate and certificate authority files used to serve both the API and the React app over HTTPS. Docker Compose mounts `cert.crt`, `cert.key` and `ca.crt` read-only into the backend container, and `cert.crt` and `cert.key` read-only into the frontend container. `ca.key` is only used to sign the certificate and is never mounted into a container.
> - **`Dockerfile`s and `docker-compose.yml`**: described in [Dockerisation](#-dockerisation).
> - **`eslint.config.js`, `.prettierrc.json`**: the lint and formatting rules used by the static analysis workflow, described in [Static Code Analysis](#-static-code-analysis).

> [!important]
> <ins> **Frontend Structure:** </ins>
>
> | Area | Purpose |
> |---|---|
> | **`pages/`** | One component per route: `LandingPage`, `ExploreGigsPage`, `LoginPage`, `RegisterPage` (with the code step), `ForgotPasswordPage`, `DashboardPage`, `BrowsePage`, `GigDetailPage` (booking flow), `BookingsPage` and `FreelancerBookingsPage`, `MyGigsPage`, `GigEditorPage`, `AdminPage`, `ProfilePage` and `PublicProfilePage`. |
> | **`components/`** | Shared UI such as the nav bar, gig cards, the `LineChart` and `Donut` charts, the `TaxSummary` income and tax estimate, the `OtpInput` six-digit code boxes, `RegisterVerifyStep`, `LoginTwoFactorStep`, `PasswordField` and `AvatarCropper`, plus the security components `ProtectedRoute`, `GuestRoute`, `RoleRoute` and `ErrorBoundary`. |
> | **`services/`** | `api.ts` (auth, OTP and account calls) and `marketApi.ts` (gigs, bookings, transactions and profiles) send every request to the API address in `config.ts` (the `VITE_API_URL` build variable, defaulting to `https://localhost:3000/api`), attach the JWT as a Bearer token, and turn server errors into safe messages. `session.ts` stores the token in `sessionStorage` and swaps in the fresh token after a password change. `profileStore.ts` keeps a cleaned copy of the user's own profile on the device and re-validates it every time it is read. |
> | **`utils/`** | `sanitize.ts` and `patterns.ts` clean and whitelist input, `validation.ts` and `gigValidation.ts` mirror the backend rules, and `tax.ts` holds a copy of the SARS table used only for the worked example on the public landing page. The dashboard figures always come from the API so there is one source of truth. |
>
> `App.tsx` groups the routes by role. `/login`, `/register` and `/forgot-password` are guest-only, `/dashboard`, `/profile` and `/u/:id` are open to any logged-in user, `/explore` and `/gigs/:id` for clients and admins, `/bookings` for clients and freelancers, `/my-gigs` for freelancers, and `/admin` for admins. Every logged-in page sits behind `ProtectedRoute`.

> [!important]
> <ins> **API Endpoints:** </ins>
>
> **Auth Routes** `(/api/auth)`:
> 
> | Method and path | Access | Description |
> |---|---|---|
> | `POST /api/auth/register` | Public | Step one of registration. Validates the username, email, password and optional role, hashes the password and emails a six-digit code. No account exists yet. Only `client` and `freelancer` can be self-assigned; anything else (including `admin`) falls back to `client`. Returns `429` if a code was sent less than 60 seconds ago. Rate limited by `authLimiter`. |
> | `POST /api/auth/register/verify` | Public | Step two. Confirms the email and code, creates the account and returns the user's details plus a JWT (`201`). Rate limited by `otpLimiter`. |
> | `POST /api/auth/register/resend` | Public | Sends a new code for a pending sign-up after the 60-second cooldown. Rate limited by `otpLimiter`. |
> | `POST /api/auth/login` | Public | Verifies the email and password and returns the user's details plus a JWT. Returns `429` while the account is locked. If the user has two-factor switched on, it emails a login code and returns `twoFactorRequired: true` instead of a token. Rate limited by `authLimiter`. |
> | `POST /api/auth/login/2fa` | Public | Second step of a two-factor login. Confirms the email and the six-digit code and returns the user's details plus a JWT. Rate limited by `otpLimiter`. |
> | `POST /api/auth/password/forgot` | Public | Emails a reset code if the account exists. Always returns the same `200` message. Rate limited by `authLimiter`. |
> | `POST /api/auth/password/reset` | Public | Confirms the email, code and new password, saves the password and retires every older token. The user then logs in again. Rate limited by `otpLimiter`. |
> | `GET /api/auth/profile` | Any logged-in user | Returns the authenticated user's own `_id`, `username`, `email` and `role`, as attached to `req.user` by `validateAuth`. |
> | `PUT /api/auth/profile` | Any logged-in user | Changes the user's username and email. Rate limited by `accountLimiter`. |
> | `PUT /api/auth/password` | Any logged-in user | Changes the password after checking the current one, and returns a fresh token for this device. Rate limited by `accountLimiter`. |
> | `PUT /api/auth/2fa` | Any logged-in user | Switches two-factor login on or off after checking the current password. Rate limited by `accountLimiter`. |
>
> **User Profile Routes** `(/api/users)`:
>
> | Method and path | Access | Description |
> |---|---|---|
> | `PUT /api/users/me/profile` | Any logged-in user | Saves the validated profile fields the user chose to share. Accepts a body of up to 512kb for the photo. Rate limited by `accountLimiter`. |
> | `GET /api/users/:id/profile` | Any logged-in user | Returns another member's username, role and shared profile, or `profile: null` when it is hidden. Never returns the email. |
>
> **Gig Routes** `(/api/gigs)`:
>
> | Method and path | Access | Description |
> |---|---|---|
> | `GET /api/gigs` | Public | Lists active gigs. Optional `search`, `category`, `minPrice`, `maxPrice` and `freelancer` filters. |
> | `GET /api/gigs/my-gigs` | Freelancer, Admin | Lists every gig owned by the logged-in user, including paused and draft gigs. |
> | `GET /api/gigs/:id` | Public | Returns one gig. The ID must be a valid 24-character ObjectId. |
> | `POST /api/gigs` | Freelancer, Admin | Creates a gig owned by the logged-in user. |
> | `PUT /api/gigs/:id` | Owner, Admin | Updates any provided fields of a gig. Returns `403` for anyone who does not own it. |
> | `DELETE /api/gigs/:id` | Owner, Admin | Deletes a gig. Returns `403` for anyone who does not own it. |
>
> **Booking Routes** `(/api/bookings)`:
>
> | Method and path | Access | Description |
> |---|---|---|
> | `GET /api/bookings` | Any logged-in user | Clients get bookings they made, freelancers get bookings for their gigs, admins get all bookings. |
> | `GET /api/bookings/:id` | Client, Freelancer or Admin on that booking | Returns one booking and its transaction. |
> | `POST /api/bookings` | Client, Admin | Books an active gig, confirms it instantly and creates a transaction. Rate limited by `bookingLimiter`. |
> | `PATCH /api/bookings/:id/status` | Parties to the booking, Admin | Moves the booking to the next allowed status. Clients may only cancel. |
> | `DELETE /api/bookings/:id` | Client owner, Admin | Cancels the booking and refunds its transaction. |
>
> **Transaction Routes** `(/api/transactions)`:
>
> | Method and path | Access | Description |
> |---|---|---|
> | `GET /api/transactions` | Any logged-in user | Returns the transactions the user is part of (all transactions for admins). |
> | `GET /api/transactions/income-summary` | Freelancer, Admin | Total income, number of transactions and the list of completed transactions in ZAR. |
> | `GET /api/transactions/tax-estimate` | Freelancer | Estimated income tax and insights for the current SARS tax year, worked out from the freelancer's own completed transactions in that year. |
> | `GET /api/transactions/:id` | Client, Freelancer or Admin on that transaction | Returns one transaction. |
>
> **Other Routes:**
>
> - `POST /api/csp-report`: Public, receives CSP violation reports from browsers. Rate limited by `cspReportLimiter`.
> - `GET /api/health`: Public health check used to confirm the API is running.
>
> <ins> **Request flow:** </ins>
>
> Every request first passes through the HTTP request logger (which writes one log line when the response is sent), then Helmet (security headers) and CORS, then the API-wide rate limiter (so floods are rejected before any body is read), then the JSON body parser (bodies over 10kb are rejected), then `sanitizeMiddleware.js`, which strips HTML and MongoDB operator keys from the body, query and URL parameters. The matching route then runs its own chain in a fixed order: a stricter rate limiter where one applies (login, registration, passcode checks, password reset, account changes and booking creation), `validateAuth` to verify the JWT, reject it if it predates the last password change, and attach the user to `req.user`, `validateRole` to check the user's role against the route's allow-list, and the validation middleware for that route. Only then does the controller run, and for any single gig, booking or transaction it also checks that the user owns the resource (or is an admin) before reading or changing it. A missing or invalid token is rejected with a `401`, the wrong role or a resource the user does not own with a `403`, invalid input with a `400`, an illegal booking status change with a `409`, and too many requests with a `429`, all before any data is changed. Any request that doesn't match a defined route falls through to `app.js`'s catch-all `404` handler, and any error not already handled inside a controller's own try/catch is caught by `app.js`'s centralised error-handling middleware and turned into a generic response rather than leaking a stack trace to the client.

### 🖼️ Part 2 Evidence:
> [!important]
> #### Newman execution
> <img width="685" height="516" alt="image" src="https://github.com/user-attachments/assets/f2098f17-9645-4a84-81b7-e16f8f54a1a4" />
>
> #### Frontend test results
> <img width="672" height="334" alt="image" src="https://github.com/user-attachments/assets/a355c7a1-ee94-450c-88f9-1def46d56b91" />
>

### ✅ Screenshots of API responses (Part 1):
> [!important]
> #### 1. Invalid Username on Registration Failure
><img width="1917" height="1015" alt="1  Invalid Username on Registration Failure" src="https://github.com/user-attachments/assets/fe77e454-acae-4d2e-85d4-962f34905ab4" />
>
>#### 2. Registration Success
><img width="1917" height="1015" alt="2  Registration Success" src="https://github.com/user-attachments/assets/bda879ef-323f-4e4d-b312-3b76dd372a35" />
>
>#### 3. Invalid Email on Registration Failure
><img width="1917" height="1017" alt="3  Invalid Email on Registration Failure" src="https://github.com/user-attachments/assets/7ac0dc37-f309-4bf2-b0d6-b328207b577c" />
>
>#### 4. Invalid Password on Registration Failure
><img width="1917" height="1016" alt="4  Invalid Password on Registration Failure" src="https://github.com/user-attachments/assets/e086daa0-a12f-4a28-ae51-60cb00dd1f70" />
>
>#### 5. Duplicate Email Failure
><img width="1917" height="1020" alt="5  Duplicate Email Failure" src="https://github.com/user-attachments/assets/8d7536e5-5970-45cf-8537-204e6258fd65" />
>
>#### 6. Login Success
><img width="1917" height="1015" alt="6  Login Success" src="https://github.com/user-attachments/assets/5efa2ef6-a78b-41cd-a19f-139e8d7d02df" />
>
>#### 7. Incorrect Password on Login Failure
><img width="1917" height="1016" alt="7  Incorrect Password on Login Failure" src="https://github.com/user-attachments/assets/956761ab-e888-47f6-a90f-f400ff4ecfea" />
>
>#### 8. User Doesn't Exist Failure
><img width="1917" height="1015" alt="8  User doesn&#39;t exist Failure" src="https://github.com/user-attachments/assets/0361b461-0ae4-4538-8065-d94b198de8d5" />
>
>#### 9. Incorrect Email on Login Failure
><img width="1917" height="1018" alt="9  Incorrect Email on Login Failure" src="https://github.com/user-attachments/assets/cdc502c0-414a-4176-a068-18f58a51382b" />
>
>#### 10. Get Profile Success (Valid Token)
><img width="1917" height="1018" alt="10  Get Profile success (Valid Token)" src="https://github.com/user-attachments/assets/a53fdea2-347b-4a65-841e-519bfc4c7017" />
>
>#### 11. Get Profile Failure (No Token)
><img width="1917" height="1017" alt="11  Get Profile Failure (No Token)" src="https://github.com/user-attachments/assets/c9de71ed-d9e7-4133-ada6-a88ea7b536b6" />
>
>#### 12. Get Profile Failure (Invalid Token)
><img width="1917" height="1020" alt="12  Get Profile Failure (Invalid Token)" src="https://github.com/user-attachments/assets/6a485212-9a12-48da-ab94-eb722bec67e7" />
>

### 📝 Changelog:
> [!important]
> <ins> **Part 3: DevSecOps, Monitoring and Finalisation (18 October to 7 November 2026)** </ins>
>
> - Added the SARS based tax estimate (`utils/tax.js`), the `GET /api/transactions/tax-estimate` endpoint and the `TaxSummary` dashboard section with insights.
> - Added the logger (`utils/logger.js`), the HTTP logging middleware, daily log files and Better Stack cloud logging, and logging across every controller and middleware.
> - Added backend and frontend Dockerfiles, `.dockerignore` files, the Nginx configuration and `docker-compose.yml` with a bridge network, a log volume and health checks.
> - Moved the allowed CORS origins to the `ALLOWED_ORIGINS` environment variable and the frontend API address to `VITE_API_URL`.
> - Added the GitHub Actions workflows: CI (hygiene check, tests, build, audits, Newman, Playwright, Docker run and Docker Hub publishing), static analysis (ESLint and Prettier) and CodeQL.
> - Added ESLint and Prettier checks for both apps, run by the static analysis workflow, and fixed what they found (unused values, shared token signing in `utils/token.js`, formatting).
> - Fixed the `npm audit` findings, required Node.js 24 and stopped tracking runtime logs in git.
> - Added the **Publish images to Docker Hub** job, which pushes the backend and frontend images after every CI job passes on `main`.
> - Fixed 17 of the 26 CodeQL alerts (`fix/static-analysis-findings` and `fix/codeql-remaining-alerts`, pull requests #43 and #44): `$eq` comparisons in the flagged database queries, a profile update built from known fields only, certificate checking in the Newman runner and line break removal in the logger, with new tests. The last successful run reports 10 alerts.
> - Added the security audit trail (`feature/security-audit-log`, pull request #42): the `AuditEvent` model with a 90 day expiry, the audit helper, and recording in login, lockout, registration, password change, password reset and two-factor login.
> - Added the admin audit log view in the same pull request: the admin only `GET /api/admin/audit-events` endpoint with checked paging and type filter, the **Security audit trail** section on the admin page, its tests and five Postman requests.
> - Masked email addresses in every log message to the first letter and the domain (`utils/maskEmail.js`, used in 34 places), with its tests.
> - Added 68 backend unit tests, extended the Postman collection to 58 requests and 102 tests, and the frontend tests to 134.
> - Added 32 Playwright frontend integration tests in 7 files (`Integration_Testing/`) that run the React app against the real API and database, with a new CI job that keeps the HTML report as an artifact, and excluded the local Playwright results from git.
> - Added two-factor login and account lockout as own security features, and documented all twelve own security features (including those first built in Part 2) in the README, ranked from strongest to weakest.
> - Rewrote the README for Part 3, with Docker setup instructions, an evaluation walkthrough and new sections for the tax dashboard, pipeline, static analysis (results, issues and fixes), logging (purpose, fields and evidence), own security features, the final security review with a threat to protection map, Playwright testing and this changelog.
>
> <ins> **Part 2: Secure Stack (23 September to 11 October 2026)** </ins>
>
> - Added the `Gig`, `Booking` and `Transaction` models, controllers and routes, with simulated payments and income tracking per freelancer.
> - Built the React (TypeScript and Vite) frontend over HTTPS with landing, browsing, login, registration, dashboards, gig management, booking, booking history, admin and profile pages.
> - Enforced RBAC with `validateRole` on the marketplace routes and ownership checks in the controllers.
> - Added global sanitisation on the backend and frontend.
> - Added email verified registration, forgot and reset password with one-time codes sent through Brevo.
> - Added account settings, password change and token revocation with `passwordChangedAt`.
> - Added member profiles with validated photos and links, and the admin seed script.
> - Added rate limiting, Helmet security headers, a Content Security Policy for the API and the React app, and CSP violation reporting.
> - Added safe handling of malformed and oversized request bodies.
> - Expanded the Postman collection with a Newman runner and added the first frontend tests.
>
> <ins> **Part 1: Secure Foundations (27 August to 6 September 2026)** </ins>
>
> - Set up the Node.js and Express backend with routes, controllers, middleware and models.
> - Added registration and login with bcrypt password hashing and JWT authentication.
> - Added the protected profile route, JWT validation and the role-based access control foundations.
> - Served the API over HTTPS with a locally generated certificate.
> - Added input validation, fail-fast startup checks, 404 and central error handling, and MongoDB connection event logging.
> - Created the Postman collection, the architecture diagram and the first README.

### 👥 Team Contributions:
> [!important]
> <ins> **Who Did What (Part 3)** </ins>
>
> | Team Member | Main Contributions | Areas |
> | ----------- | ----------- | ----------- |
> | **Max Daniels** | Built the logger utility with coloured terminal output, daily combined and error log files and Better Stack cloud logging; replaced console logging with contextual logs across the controllers and middleware; added the HTTP request logging middleware, the process-level crash and shutdown handlers and the `verifyLogger.js` check script; created the backend and frontend Dockerfiles, `.dockerignore` files, `nginx.conf` and `docker-compose.yml` (bridge network, health checks, log volume, certificates and security settings) and fixed the Docker setup; added the backend unit tests for JWTs, passcodes, sanitisation and validation, recorded the Part 3 demonstration video. | Logging and monitoring, Docker, backend unit testing, demonstration video |
> | **Kyle Lotter** | Built the SARS tax estimate: the tax table and calculations in `utils/tax.js`, the `GET /api/transactions/tax-estimate` endpoint, the `TaxSummary` dashboard card with insights, and the tax tests on the backend and frontend; added the tax estimate requests to the Postman collection; created the CI workflow (hygiene check, tests, builds, audits, Newman and Docker run); fixed the npm audit findings, required Node 24 and stopped tracking the runtime logs; added the Docker Hub publishing job; built the security audit trail (the `AuditEvent` model, `utils/audit.js` and the recording in the login, lockout, registration, password and two-factor flows), the admin audit log view and the email masking in the logs, with their tests; fixed the CodeQL findings for NoSQL injection, the profile save, the sanitisers, disabled certificate checks and log injection (pull requests #43 and #44), recorded the Part 3 demonstration video. | Tax and income dashboard, CI/CD pipeline, Docker Hub publishing, dependency security, security audit trail, CodeQL fixes, demonstration video |
> | **Megan Britnor** | Built the Playwright frontend integration tests in `Integration_Testing/` (32 tests in 7 files covering registration, password reset, two-factor login, lockout, tokens, gigs, the marketplace flow, security controls, the tax dashboard and form validation) with their setup, helpers and configuration; added the `integration-tests` CI job; rewrote the README for Part 3 and updated the references; recorded the Part 3 demonstration video. | Frontend integration testing (Playwright), documentation, referencing, demonstration video |
> | **Maxine Palm** | Built the two own security features, two-factor login (backend challenge and verification, login code step, profile toggle) and account lockout, with their tests; made the CORS origins (`ALLOWED_ORIGINS`) and the frontend API and CSP origins configurable for Docker; added the ESLint and Prettier configuration; created the CodeQL and static analysis workflows and saved the CodeQL results as workflow artifacts, recorded the Part 3 demonstration video and edited video. | Own security features, static analysis, configuration, demonstration video |
>
> <ins> **Who Did What (Part 2)** </ins>
>
> | Team Member | Main Contributions | Areas |
> | ----------- | ----------- | ----------- |
> | **Max Daniels** | Created the gig schema, gig input validation and gig CRUD controller and routes; created the booking and transaction models, booking validation, the booking controller with simulated transaction creation, the transaction controller with the income summary, and their routes; initialised the React frontend and added the health check; expanded the Postman collection with auth and gig tests for Newman. | Marketplace backend, bookings and transactions, React setup, Postman and Newman testing |
> | **Kyle Lotter** | Added Helmet security headers, the global sanitisation middleware and rate limiting; hardened API input handling (JSON size limit, safe search, query filters); enforced the booking lifecycle and refunds on cancellation; added the CSP violation reporting endpoint; added the shared frontend security headers and CSP to the Vite config, with tests. | API security, sanitisation, rate limiting, security headers and CSP |
> | **Megan Britnor** | Built the frontend login and registration flows and the branded auth layout; built the public landing page, explore gigs page and login prompt for visitors; built the `DatePicker`, `GigCarousel` and `ScrollToTop` components; updated the validation messages; updated the README for Part 2. | Frontend auth and public pages, UI components, documentation |
> | **Maxine Palm** | Built the marketplace dashboards, role-based route guards, charts and tax summary; hardened frontend sanitisation and validation with tests; built the app layout and UI kit; built the editable profile and public profile pages with tests; added the error boundary, page titles and offline banner. | Frontend dashboards, RBAC in the UI, frontend sanitisation, profiles, frontend testing |
>
> <ins> **Who Did What (Part 1)** </ins>
>
> | Team Member | Main Contributions | Areas |
> | ----------- | ----------- | ----------- |
> | **Max Daniels** | Initialised the repository and backend folder structure; set up the `userModel.js` schema; implemented the core authentication system (registration/login), role-based access control, and the local HTTPS server (`cert`/`ca` certificates, `app.js`); built out `authMiddleware.js`, `validationMiddleware.js`, `securityMiddleware.js`, and `dbMiddleware.js`; built the Postman collection;. | Backend architecture, authentication, HTTPS, RBAC foundations |
> | **Kyle Lotter** | Added the authenticated profile route and handler; enforced restrictions on self-assigned roles at registration; added global 404/error-handling middleware; added MongoDB connection event logging; validated required environment variables at startup; configured `.env.example` and `package.json`; built the Postman collection; designed the system architecture diagram. | Backend hardening, error handling, logging, Postman testing, architecture diagram, repo maintenance |
> | **Megan Britnor** | Authored and progressively expanded the README: project introduction, system explanation, user roles, backend architecture, and security documentation (password hashing and Fail-Fast Startup, Safe Error Handling & Connection Monitoring). | Documentation, security write-ups (password hashing, RBAC) |
> | **Maxine Palm** | Extended the README with the Harvard reference list, added the Token-Based Authentication, Input Validation, and HTTPS documentation sections, and added the demonstration video along with the API response screenshots. | Documentation, referencing, security write-ups (JWT, validation, HTTPS), demo video, API response screenshots |
>

### 📃 Reference List:
> [!important]
> - articsledge, 2026. *What Is Middleware? A Complete Guide for 2026*. [online] Available at <<https://www.articsledge.com/post/middleware>> [Accessed 01 August 2026].
> - Auth0, 2026. *JSON Web Tokens*. [online] Available at <<https://auth0.com/docs/secure/tokens/json-web-tokens>> [Accessed 01 August 2026].
> - Batra, Y., 2025. *Why You Should Never Store Passwords in Plaintext*. [online] Available at <<https://medium.com/@yashbatra11111/why-you-should-never-store-passwords-in-plaintext-7a571f84be9d>> [Accessed 01 August 2026].
> - Better Stack, 2026. *Telemetry HTTP REST API Documentation*. [online] Available at <<https://betterstack.com/docs/logs/http-rest-api/>> [Accessed 18 October 2026].
> - Brevo, 2026. *Send a transactional email*. [online] Available at <<https://developers.brevo.com/docs/send-a-transactional-email>> [Accessed 10 October 2026].
> - Dennis, 2024. *How to Hash Passwords with bcrypt in Node.js*. [online] Available at <<https://www.freecodecamp.org/news/how-to-hash-passwords-with-bcrypt-in-nodejs/>> [Accessed 01 August 2026].
> - Docker, 2026a. *docker compose up*. [online] Available at <<https://docs.docker.com/reference/cli/docker/compose/up/>> [Accessed 06 November 2026].
> - Docker, 2026b. *Docker Build GitHub Actions*. [online] Available at <<https://docs.docker.com/build/ci/github-actions/>> [Accessed 07 November 2026].
> - Docker, 2026c. *Networking in Compose*. [online] Available at <<https://docs.docker.com/compose/how-tos/networking/>> [Accessed 07 November 2026].
> - Docker, 2026d. *nginx: Docker Official Image*. [online] Available at <<https://hub.docker.com/_/nginx>> [Accessed 07 November 2026].
> - Docker, 2026e. *Personal access tokens*. [online] Available at <<https://docs.docker.com/security/access-tokens/personal-access-tokens/>> [Accessed 07 November 2026].
> - Draw.io, 2026. *Flowchart Maker and Online Diagram Software*. Version 24.4.7. [app] Available at <<https://app.diagrams.net/>> [Accessed 02 September 2026].
> - ESLint, 2026. *Getting Started with ESLint*. [online] Available at <<https://eslint.org/docs/latest/use/getting-started>> [Accessed 07 November 2026].
> - express-rate-limit, 2026. *Configuration*. [online] Available at <<https://express-rate-limit.mintlify.app/reference/configuration>> [Accessed 08 October 2026].
> - Express.js, 2026a. *Routing*. [online] Available at <<https://expressjs.com/en/5x/guide/routing/>> [Accessed 01 August 2026].
> - Express.js, 2026b. *Using middleware*. [online] Available at <<https://expressjs.com/en/5x/guide/using-middleware/>> [Accessed 01 August 2026].
> - Express.js, 2026c. *Error Handling*. [online] Available at <<https://expressjs.com/en/5x/guide/error-handling/>> [Accessed 01 August 2026].
> - Express.js, 2026d. *Express 5.x API reference: Request*. [online] Available at <<https://expressjs.com/en/5x/api/request/>> [Accessed 08 October 2026].
> - GeeksforGeeks, 2025. *Controllers in ExpressJS*. [online] Available at <<https://www.geeksforgeeks.org/web-tech/controllers-in-expressjs/>> [Accessed 01 August 2026].
> - GitHub, 2026a. *About code scanning with CodeQL*. [online] Available at <<https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql>> [Accessed 20 October 2026].
> - GitHub, 2026b. *Workflow syntax for GitHub Actions*. [online] Available at <<https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax>> [Accessed 06 November 2026].
> - GitHub, 2026c. *Using secrets in GitHub Actions*. [online] Available at <<https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets>> [Accessed 07 November 2026].
> - GitHub, 2026d. *Database query built from user-controlled sources*. [online] Available at <<https://codeql.github.com/codeql-query-help/javascript/js-sql-injection/>> [Accessed 07 November 2026].
> - GitHub, 2026e. *Disabling certificate validation*. [online] Available at <<https://codeql.github.com/codeql-query-help/javascript/js-disabling-certificate-validation/>> [Accessed 07 November 2026].
> - GitHub, 2026f. *Log injection*. [online] Available at <<https://codeql.github.com/codeql-query-help/javascript/js-log-injection/>> [Accessed 07 November 2026].
> - GitHub, 2026g. *Remote property injection*. [online] Available at <<https://codeql.github.com/codeql-query-help/javascript/js-remote-property-injection/>> [Accessed 07 November 2026].
> - GitHub, 2026h. *Incomplete multi-character sanitization*. [online] Available at <<https://codeql.github.com/codeql-query-help/javascript/js-incomplete-multi-character-sanitization/>> [Accessed 07 November 2026].
> - GitHub, 2026i. *User-controlled bypass of security check*. [online] Available at <<https://codeql.github.com/codeql-query-help/javascript/js-user-controlled-bypass/>> [Accessed 07 November 2026].
> - GitHub, 2026j. *Network data written to file*. [online] Available at <<https://codeql.github.com/codeql-query-help/javascript/js-http-to-file-access/>> [Accessed 07 November 2026].
> - GitHub, 2026k. *Clear text storage of sensitive information*. [online] Available at <<https://codeql.github.com/codeql-query-help/javascript/js-clear-text-storage-of-sensitive-data/>> [Accessed 07 November 2026].
> - GitHub, 2026l. *Communicating with Docker service containers*. [online] Available at <<https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers>> [Accessed 06 November 2026].
> - GitHub, 2026m. *Creating PostgreSQL service containers*. [online] Available at <<https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers>> [Accessed 06 November 2026].
> - GitHub, 2026n. *Evaluate expressions in workflows and actions*. [online] Available at <<https://docs.github.com/en/actions/reference/workflows-and-actions/expressions>> [Accessed 06 November 2026].
> - GitHub, 2026o. *actions/checkout*. [online] Available at <<https://github.com/actions/checkout>> [Accessed 06 November 2026].
> - GitHub, 2026p. *actions/setup-node*. [online] Available at <<https://github.com/actions/setup-node>> [Accessed 06 November 2026].
> - GitHub, 2026q. *actions/upload-artifact*. [online] Available at <<https://github.com/actions/upload-artifact>> [Accessed 06 November 2026].
> - GitHub, 2026r. *CodeQL action: analyze inputs*. [online] Available at <<https://github.com/github/codeql-action/blob/v4/analyze/action.yml>> [Accessed 07 November 2026].
> - Helmet, 2026. *Helmet.js*. [online] Available at <<https://helmetjs.github.io/>> [Accessed 08 October 2026].
> - Ilic, B., 2025. *NodeJS Best Practices: Modular vs Layered Approach for Small, Medium and Large Apps Introduction*. [online] Available at <<https://medium.com/@branimir.ilic93/express-js-best-practices-modular-vs-layered-approach-for-medium-and-large-appsintroduction-626e61cc908d>> [Accessed 01 August 2026].
> - JWT.io, 2026. *JSON Web Tokens*. [online] Available at <<https://jwt.io/>> [Accessed 01 August 2026].
> - MDN Web Docs, 2026a. *HTTPS*. [online] Available at <<https://developer.mozilla.org/en-US/docs/Glossary/HTTPS>> [Accessed 01 August 2026].
> - MDN Web Docs, 2026b. *Transport Layer Security (TLS)*. [online] Available at <<https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Transport_Layer_Security>> [Accessed 01 August 2026].
> - MDN Web Docs, 2026c. *Content Security Policy (CSP)*. [online] Available at <<https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP>> [Accessed 08 October 2026].
> - MDN Web Docs, 2026d. *Reporting-Endpoints header*. [online] Available at <<https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Reporting-Endpoints>> [Accessed 08 October 2026].
> - MDN Web Docs, 2026e. *URL*. [online] Available at <<https://developer.mozilla.org/en-US/docs/Web/API/URL>> [Accessed 10 October 2026].
> - MDN Web Docs, 2026f. *One-time passwords (OTP)*. [online] Available at <<https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/OTP>> [Accessed 10 October 2026].
> - MDN Web Docs, 2026g. *Object.prototype.__proto__*. [online] Available at <<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/proto>> [Accessed 07 November 2026].
> - MDN Web Docs, 2026h. *RegExp.escape()*. [online] Available at <<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape>> [Accessed 10 October 2026].
> - MDN Web Docs, 2026i. *URLSearchParams*. [online] Available at <<https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams>> [Accessed 07 November 2026].
> - MDN Web Docs, 2026j. *Date.prototype.toLocaleString()*. [online] Available at <<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString>> [Accessed 07 November 2026].
> - MongoDB, 2026a. *Expire Data from Collections by Setting TTL*. [online] Available at <<https://www.mongodb.com/docs/manual/core/index-ttl/>> [Accessed 10 October 2026].
> - MongoDB, 2026b. *ping (database command)*. [online] Available at <<https://www.mongodb.com/docs/manual/reference/command/ping/>> [Accessed 06 November 2026].
> - Mongoose, 2026a. *Schemas*. [online] Available at <<https://mongoosejs.com/docs/guide.html>> [Accessed 01 August 2026].
> - Mongoose, 2026b. *Connections: Connection Events*. [online] Available at <<https://mongoosejs.com/docs/connections.html#connection-events>> [Accessed 01 August 2026].
> - Mongoose, 2026c. *Queries*. [online] Available at <<https://mongoosejs.com/docs/queries.html>> [Accessed 07 November 2026].
> - Mongoose, 2026d. *Query Population*. [online] Available at <<https://mongoosejs.com/docs/populate.html>> [Accessed 07 November 2026].
> - Mongoose, 2026e. *Faster Mongoose Queries With Lean*. [online] Available at <<https://mongoosejs.com/docs/tutorials/lean.html>> [Accessed 07 November 2026].
> - Newman, 2026. *Newman: the command line collection runner for Postman*. [online] Available at <<https://github.com/postmanlabs/newman/blob/develop/README.md>> [Accessed 10 October 2026].
> - Node.js, 2026a. *Crypto*. [online] Available at <<https://nodejs.org/api/crypto.html>> [Accessed 11 October 2026].
> - Node.js, 2026b. *Test runner*. [online] Available at <<https://nodejs.org/api/test.html>> [Accessed 07 November 2026].
> - Node.js, 2026c. *HTTPS: https.request(options[, callback])*. [online] Available at <<https://nodejs.org/api/https.html>> [Accessed 07 November 2026].
> - Node.js, 2026d. *TLS (SSL): tls.createSecureContext([options])*. [online] Available at <<https://nodejs.org/api/tls.html>> [Accessed 07 November 2026].
> - npm, 2026a. *npm-audit*. [online] Available at <<https://docs.npmjs.com/cli/v11/commands/npm-audit>> [Accessed 06 November 2026].
> - npm, 2026b. *npm-ci*. [online] Available at <<https://docs.npmjs.com/cli/v11/commands/npm-ci>> [Accessed 06 November 2026].
> - OpenSSL, 2026. *openssl-req*. [online] Available at <<https://docs.openssl.org/3.0/man1/openssl-req/>> [Accessed 06 November 2026].
> - OWASP Foundation, 2021. *OWASP Top 10:2021*. [online] Available at <<https://owasp.org/Top10/>> [Accessed 07 November 2026].
> - OWASP Foundation, 2026a. *Authentication Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>> [Accessed 01 August 2026].
> - OWASP Foundation, 2026b. *Input Validation Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html>> [Accessed 01 August 2026].
> - OWASP Foundation, 2026c. *Node.js Security Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html>> [Accessed 01 August 2026].
> - OWASP Foundation, 2026d. *REST Security Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html>> [Accessed 01 August 2026].
> - OWASP Foundation, 2026e. *Cross Site Scripting Prevention Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>> [Accessed 08 October 2026].
> - OWASP Foundation, 2026f. *Authorization Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html>> [Accessed 08 October 2026].
> - OWASP Foundation, 2026g. *CSV Injection*. [online] Available at <<https://owasp.org/www-community/attacks/CSV_Injection>> [Accessed 08 October 2026].
> - OWASP Foundation, 2026h. *Regular expression Denial of Service: ReDoS*. [online] Available at <<https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS>> [Accessed 08 October 2026].
> - OWASP Foundation, 2026i. *Forgot Password Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html>> [Accessed 10 October 2026].
> - OWASP Foundation, 2026j. *File Upload Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>> [Accessed 10 October 2026].
> - OWASP Foundation, 2026k. *Improper Error Handling*. [online] Available at <<https://owasp.org/www-community/Improper_Error_Handling>> [Accessed 01 August 2026].
> - OWASP Foundation, 2026l. *Logging Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>> [Accessed 18 October 2026].
> - OWASP Foundation, 2026m. *Logging Vocabulary Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html>> [Accessed 07 November 2026].
> - OWASP Foundation, 2026n. *Multifactor Authentication Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html>> [Accessed 07 November 2026].
> - OWASP Foundation, 2026o. *JSON Web Token for Java Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html>> [Accessed 07 November 2026].
> - OWASP Foundation, 2026p. *Password Storage Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>> [Accessed 07 November 2026].
> - OWASP Foundation, 2026q. *Vulnerable Dependency Management Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html>> [Accessed 07 November 2026].
> - OWASP Foundation, 2026r. *Secrets Management Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html>> [Accessed 07 November 2026].
> - OWASP Foundation, 2026s. *Content Security Policy Cheat Sheet*. [online] Available at <<https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html>> [Accessed 07 November 2026].
> - Playwright, 2026a. *Installation*. [online] Available at <<https://playwright.dev/docs/intro>> [Accessed 07 November 2026].
> - Playwright, 2026b. *Test configuration*. [online] Available at <<https://playwright.dev/docs/test-configuration>> [Accessed 07 November 2026].
> - Playwright, 2026c. *Trace viewer*. [online] Available at <<https://playwright.dev/docs/trace-viewer>> [Accessed 07 November 2026].
> - Playwright, 2026d. *Web server*. [online] Available at <<https://playwright.dev/docs/test-webserver>> [Accessed 07 November 2026].
> - Playwright, 2026e. *Global setup and teardown*. [online] Available at <<https://playwright.dev/docs/test-global-setup-teardown>> [Accessed 07 November 2026].
> - Playwright, 2026f. *Locators*. [online] Available at <<https://playwright.dev/docs/locators>> [Accessed 07 November 2026].
> - Playwright, 2026g. *Parallelism*. [online] Available at <<https://playwright.dev/docs/test-parallel>> [Accessed 07 November 2026].
> - Playwright, 2026h. *Continuous Integration*. [online] Available at <<https://playwright.dev/docs/ci>> [Accessed 07 November 2026].
> - Playwright, 2026i. *Isolation*. [online] Available at <<https://playwright.dev/docs/browser-contexts>> [Accessed 07 November 2026].
> - Playwright, 2026j. *Writing tests*. [online] Available at <<https://playwright.dev/docs/writing-tests>> [Accessed 07 November 2026].
> - Playwright, 2026k. *Navigations*. [online] Available at <<https://playwright.dev/docs/navigations>> [Accessed 07 November 2026].
> - Prettier, 2026. *What is Prettier?*. [online] Available at <<https://prettier.io/docs/>> [Accessed 07 November 2026].
> - React Bits, 2026. *Spotlight Card*. [online] Available at <<https://reactbits.dev/components/spotlight-card>> [Accessed 11 October 2026].
> - React, 2026. *useCallback*. [online] Available at <<https://react.dev/reference/react/useCallback>> [Accessed 07 November 2026].
> - rudderz243, 2026. *insy7314-library*. [online] Available at <<https://github.com/rudderz243/insy7314-library>> [Accessed 01 August 2026].
> - South Africa, 2013. *Protection of Personal Information Act 4 of 2013*. [online] Available at <<https://www.gov.za/documents/protection-personal-information-act>> [Accessed 07 November 2026].
> - South African Revenue Service, 2026. *Rates of tax for individuals*. [online] Available at <<https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/>> [Accessed 06 November 2026].
> - Testing Library, 2026a. *React Testing Library*. [online] Available at <<https://testing-library.com/docs/react-testing-library/intro/>> [Accessed 08 October 2026].
> - Testing Library, 2026b. *Querying Within Elements*. [online] Available at <<https://testing-library.com/docs/dom-testing-library/api-within/>> [Accessed 07 November 2026].
> - Testing Library, 2026c. *Utility APIs*. [online] Available at <<https://testing-library.com/docs/user-event/utility/>> [Accessed 07 November 2026].
> - The Independent Institute of Education (IIE), 2026. *APPLICATION DEVELOPMENT SECURITY [INSY7314 Module Manual]*. The Independent Institute of Education: Unpublished.
> - Vitest, 2026. *Getting Started*. [online] Available at <<https://vitest.dev/guide/>> [Accessed 08 October 2026].
> - WHATWG, 2026. *MIME Sniffing Standard*. [online] Available at <<https://mimesniff.spec.whatwg.org/#matching-an-image-type-pattern>> [Accessed 07 November 2026].

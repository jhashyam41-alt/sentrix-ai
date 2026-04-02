# Sentrix AI (AMLGuard) — Product Requirements Document

## Original Problem Statement
Build a production-ready, multi-tenant AML/KYC SaaS platform for financial institutions with premium dark theme, multi-role auth, customer onboarding, due diligence, risk scoring, screening, case management, audit logs, reports, and admin billing.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Lucide Icons
- **Backend**: FastAPI (Python), PyJWT, PyOTP
- **Database**: MongoDB (Motor async driver)
- **Theme**: #080c12 background, #0d1117 cards, #2563eb primary accent, DM Sans font

## What's Been Implemented

### Auth & Multi-Tenant (Complete)
- Email/Password registration & login
- 2FA (TOTP) setup and verification
- Role-based access: Super Admin, Compliance Officer, Analyst, Read-Only
- Default admin seeding (shyam@sentrixai.com / Sentrix@2024)
- JWT cookie-based auth with refresh tokens

### Dashboard (Complete)
- Stats: Total customers, pending reviews, high-risk, open cases
- Recent customers list
- Open cases summary

### Customer Onboarding (Complete)
- Individual & Corporate customer forms
- Document upload (PDF, images, 10MB max)
- Customer detail page with full profile

### Screening (Complete — MOCKED)
- PEP Screening with tier classification (Tier 1-3, RCA)
- Adverse Media Screening with hit review & relevance marking
- Sanctions Screening (bulk screening endpoint)
- Auto risk score calculation
- Auto CDD tier assignment based on risk score
- **Note**: All screening uses mock data. Replace with real providers in production.

### CDD/EDD Management (Complete)
- Auto-tiered CDD (SDD / Standard CDD / EDD) based on risk score
- CDD status workflow (not_started → in_progress → complete)
- EDD checklist with 6 required sign-offs
- CDD expiry dates based on risk level (1-3 years)
- Expiring reviews endpoint with email alerts

### Case Management (Complete) — Implemented Apr 2026
- Auto-case creation on PEP/Sanctions match detection
- Cases list with status/priority filters
- Case detail page with full management UI
- Internal notes (append-only)
- Case escalation with reason
- SAR filing with reference number
- Case closure with disposition and notes
- Status & priority updates

### Audit Log (Complete) — Implemented Apr 2026
- Immutable append-only audit trail of ALL system actions
- Logged fields: timestamp, user name, role, action, module, record ID, IP address
- No edit/delete endpoints (verified immutable)
- Searchable by: action type, user, module, date range
- Dynamic filter dropdowns populated from backend
- CSV export with all fields
- PDF export (reportlab) with formatted table
- Pagination (50 per page)
- Dark theme UI matching platform design

## Credentials
- Admin: shyam@sentrixai.com / Sentrix@2024
- Admin: admin@amlguard.com / AMLGuard2026!

## Prioritized Backlog

### P1 — Next
- Reporting Module (`/reports`) — stats, charts, PDF/CSV report generation
- Admin Settings & Stripe Billing (`/settings/billing`) — tenant config, subscriptions

### P2 — Future
- In-App Notification Bell + SendGrid email integration
- Public self-service onboarding portal (`/onboarding/:token`)
- Replace mocked screening with real providers (Refinitiv, ComplyAdvantage, Dow Jones)
- Refactor large components (CustomerDetailPage.js → sub-components)

## Mocked Services
- `screening_service.py` — Returns simulated PEP/Sanctions/Adverse Media results
- `email_service.py` — Logs emails to console instead of sending

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
- Email/Password registration & login, 2FA (TOTP)
- Roles: Super Admin, Compliance Officer, Analyst, Read-Only
- Default admin: shyam@sentrixai.com / Sentrix@2024

### Dashboard, Customer Onboarding, Screening, CDD/EDD, Case Management, Audit Log (All Complete)
*See CHANGELOG.md for implementation dates*

## Code Architecture (Post-Refactoring — Apr 2026)

### Backend Services
- `server.py` — FastAPI routes, auth, business logic
- `services/screening_service.py` — Mock PEP/Sanctions/Adverse Media screening
- `services/email_service.py` — Mock email logging
- `services/pdf_service.py` — PDF generation for audit reports
- `services/risk_service.py` — Risk scoring helpers (calculate_risk_level, calculate_pep_points)
- `services/storage_service.py` — File storage

### Frontend Components (Refactored)
- `pages/CustomerDetailPage.js` (378 lines) → uses:
  - `components/customers/PEPScreeningCard.js`
  - `components/customers/AdverseMediaCard.js`
  - `components/customers/CDDManagementCard.js`
  - `components/customers/RelatedCasesCard.js`
- `pages/CaseDetailPage.js` (395 lines) → uses:
  - `components/cases/CaseNotes.js`
  - `components/cases/CaseActions.js`
- `pages/AuditLogPage.js` (152 lines) → uses:
  - `components/audit/AuditLogFilters.js`
  - `components/audit/AuditLogTable.js`

## Prioritized Backlog

### P1 — Next
- Reporting Module (`/reports`) — stats, charts, PDF/CSV generation
- Admin Settings & Stripe Billing (`/settings/billing`)

### P2 — Future
- In-App Notification Bell + SendGrid email integration
- Public self-service onboarding portal (`/onboarding/:token`)
- Replace mocked screening with real providers (Refinitiv, ComplyAdvantage, Dow Jones)

## Mocked Services
- `screening_service.py` — Returns simulated PEP/Sanctions/Adverse Media results
- `email_service.py` — Logs emails to console instead of sending

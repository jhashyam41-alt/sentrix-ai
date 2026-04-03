# AMLGuard — Product Requirements Document

## Problem Statement
Build a production-ready, multi-tenant AML/KYC SaaS platform for financial institutions. Premium dark theme, role-based access, customer onboarding, due diligence workflows, risk scoring, screening, case management, audit logs, reports, and admin/billing.

## Architecture
- **Frontend**: React, Tailwind CSS, Shadcn UI, DM Sans font, custom dark theme (#080c12 bg)
- **Backend**: FastAPI, PyOTP (2FA), PyJWT, Motor (MongoDB async)
- **Database**: MongoDB
- **Auth**: JWT + 2FA (TOTP), role-based (super_admin, compliance_officer, analyst, read_only_auditor)
- **Shared deps**: `/app/backend/shared/deps.py` — centralised db, auth, audit

## Completed Features

### Phase 1 — Core Platform (DONE)
- Multi-tenant auth (login, register, 2FA, logout)
- Role-based access control (4 roles)
- Customer onboarding (individual + corporate)
- Risk scoring engine
- PEP, Sanctions, Adverse Media screening (mock)
- Case management (create, notes, escalate, SAR, close)
- Immutable audit logs with PDF/CSV export
- CDD management (SDD/Standard/EDD)

### Phase 2 — KYC/AML Integration (DONE - Mock Mode)
- Signzy KYC: PAN, Aadhaar, Passport, Voter ID, DL (mock)
- OpenSanctions: Individual, batch, FATF country detection (mock)
- Public API v1 with API key auth + rate limiting
- Enhanced Dashboard with KYC/AML metrics

### Phase 3 — Code Quality Refactoring (DONE)
- Eliminated circular imports (shared/deps.py)
- Extracted services (dashboard_service.py, risk_service.py)
- Split large components into sub-components
- Replaced console.error → env-aware logger

### Phase 4 — Full Screening Page (DONE)
- "New Screening" modal: Full Name, DOB, Nationality dropdown (36 countries), ID Type (PAN/Aadhaar/Passport/Voter ID/DL), ID Number, 4 check toggles (KYC, Sanctions, PEP, Adverse Media)
- Animated progress panel: 5 steps with green checkmarks (600ms stagger)
- Final result card: SVG risk score circle (0-100, color-coded), risk level badge, check breakdown (pass/fail), matched entities, "Create Investigation Case" button for MEDIUM+
- Screening history table: Name, ID Type, Score, Risk Level badges, Checks, Date, Status, View/Rescreen actions
- 30 seeded demo records with realistic Indian names
- Filters: All/LOW/MEDIUM/HIGH/CRITICAL + search by name
- Pagination (15 per page)
- Backend: GET /api/screenings (paginated, filterable), POST /api/screenings/run, GET /api/screenings/{id}

## Pending Features

### P1 — Reporting Module
- /reports page with PDF/CSV exports for compliance reports

### P1 — Admin Settings & Stripe Billing
- /settings/billing with Stripe subscription management

### P2 — Notifications
- In-app notification bell, SendGrid email alerts, Webhooks

### P2 — Public Portal
- Self-service customer onboarding portal (/onboarding/:token)

## Test Credentials
- Primary: shyam@sentrixai.com / Sentrix@2024 (super_admin)
- Secondary: admin@amlguard.com / AMLGuard2026! (super_admin)

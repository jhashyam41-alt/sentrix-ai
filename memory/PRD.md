# AMLGuard — Product Requirements Document

## Problem Statement
Build a production-ready, multi-tenant AML/KYC SaaS platform for financial institutions. Premium dark theme, role-based access, customer onboarding, due diligence workflows, risk scoring, screening, case management, audit logs, reports, and admin/billing.

## Architecture
- **Frontend**: React, Tailwind CSS, Shadcn UI, DM Sans font, custom dark theme (#080c12 bg)
- **Backend**: FastAPI, PyOTP (2FA), PyJWT, Motor (MongoDB async)
- **Database**: MongoDB
- **Auth**: JWT + 2FA (TOTP), role-based (super_admin, compliance_officer, analyst, read_only_auditor)
- **Shared deps**: `/app/backend/shared/deps.py` — centralised db, auth, audit. Routes import from here (no circular imports)

## Completed Features

### Phase 1 — Core Platform (DONE)
- Multi-tenant auth (login, register, 2FA setup/verify, logout)
- Role-based access control (4 roles)
- Customer onboarding (individual + corporate)
- Risk scoring engine
- PEP, Sanctions, Adverse Media screening (mock)
- Case management (create, notes, escalate, SAR, close)
- Immutable audit logs with PDF/CSV export
- CDD management (SDD/Standard/EDD, expiry tracking, EDD checklists)
- File uploads (10MB max, PDF/JPG/PNG)

### Phase 2 — KYC/AML Integration (DONE - Mock Mode)
- Signzy KYC: PAN, Aadhaar, Passport, Voter ID, DL verification (mock)
- OpenSanctions: Individual, batch screening, FATF country detection (mock)
- KYC Routes, Public API v1, API Key Management
- Enhanced Dashboard: Risk distribution, screening alerts, KYC stats, CDD breakdown, integration status, API usage
- Screening Hub: Individual + batch
- Customer KYC Card: 5 document types with verify + history

### Phase 3 — Code Quality Refactoring (DONE)
- Eliminated circular imports (shared/deps.py)
- Extracted dashboard stats → dashboard_service.py
- Extracted risk scoring → risk_service.py (incl. calculate_v1_risk_score)
- Split KYCVerificationCard → KYCDocForm + KYCResultDisplay
- Split ScreeningHubPage → IndividualScreeningForm + ScreeningResultCard
- Replaced 27 console.error calls → env-aware logger utility
- Fixed nested ternaries in CDDManagementCard
- Removed hardcoded test secrets
- Fixed `is True` comparison anti-pattern

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

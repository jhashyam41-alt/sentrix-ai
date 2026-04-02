# AMLGuard — Product Requirements Document

## Problem Statement
Build a production-ready, multi-tenant AML/KYC SaaS platform for financial institutions. Premium dark theme, role-based access, customer onboarding, due diligence workflows, risk scoring, screening, case management, audit logs, reports, and admin/billing.

## Architecture
- **Frontend**: React, Tailwind CSS, Shadcn UI, DM Sans font, custom dark theme (#080c12 bg)
- **Backend**: FastAPI, PyOTP (2FA), PyJWT, Motor (MongoDB async)
- **Database**: MongoDB (collections: users, customers, cases, case_notes, case_comments, audit_logs, tenants, files, kyc_verifications, api_keys, api_call_logs, v1_screenings, risk_scores, pep_screenings, adverse_media_screenings)
- **Auth**: JWT + 2FA (TOTP), role-based (super_admin, compliance_officer, analyst, read_only_auditor)

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
- **Signzy KYC Service**: PAN, Aadhaar, Passport, Voter ID, Driving License verification (mock with 80% success rate)
- **OpenSanctions Service**: Individual screening, batch screening (mock with 30% match rate), FATF high-risk country detection
- **KYC Routes**: /api/kyc/verify-pan, verify-aadhaar, verify-passport, verify-voter-id, verify-driving-license, verifications/{customerId}, status
- **Public API v1**: /api/v1/screen (unified), /api/v1/screening/individual, /api/v1/screening/batch, /api/v1/risk/score (API key auth + rate limiting)
- **API Key Management**: Create, list, revoke API keys, usage stats, integration status
- **Quick Screening**: /api/screening/run-quick (authenticated, no customer required)
- **Enhanced Dashboard**: Risk distribution, screening alerts, KYC & due diligence stats, CDD breakdown, integration status, API usage metrics
- **Screening Hub**: Individual + batch screening with integration status
- **Customer KYC Card**: 5 document types, verify UI, history

## Pending Features

### P1 — Reporting Module
- /reports page with PDF/CSV exports for compliance reports
- Configurable report templates

### P1 — Admin Settings & Stripe Billing
- /settings/billing with Stripe subscription management
- Tenant settings configuration

### P2 — Notifications
- In-app notification bell
- SendGrid email alerts
- Webhooks (retry logic, HMAC-SHA256)

### P2 — Public Portal
- Self-service customer onboarding portal (/onboarding/:token)

## Key API Endpoints
- Auth: POST /api/auth/login, /register, /logout, /2fa/setup/initiate, /2fa/setup/confirm, /2fa/verify
- Customers: GET/POST /api/customers, GET/PUT /api/customers/{id}
- Cases: GET/POST /api/cases, GET/PUT /api/cases/{id}, POST /{id}/notes, /escalate, /sar, /close
- Audit: GET /api/audit-logs, /filters, /export/csv, /export/pdf
- CDD: POST /api/cdd/{id}/update-status, /edd-checklist, GET /api/cdd/expiring-reviews
- Screening: POST /api/screening/run/{id}, /pep/{id}, /adverse-media/{id}, /run-quick
- KYC: POST /api/kyc/verify-{type}, GET /api/kyc/verifications/{id}, /status
- API Keys: GET/POST /api/api-keys, PUT /{id}/revoke, GET /usage, /integration-status
- Public API: POST /api/v1/screen, /screening/individual, /screening/batch, /risk/score

## Test Credentials
- Primary: shyam@sentrixai.com / Sentrix@2024 (super_admin)
- Secondary: admin@amlguard.com / AMLGuard2026! (super_admin)

# AMLGuard — Product Requirements Document

## Problem Statement
Build a production-ready, multi-tenant AML/KYC SaaS platform for financial institutions.

## Architecture
- **Frontend**: React, Tailwind CSS, Shadcn UI, DM Sans font, dark theme (#080c12)
- **Backend**: FastAPI, PyOTP (2FA), PyJWT, Motor (MongoDB async)
- **Database**: MongoDB (customers, screening_records, customer_timeline, customer_notes, cases, audit_logs, users, tenants, api_keys, kyc_verifications)
- **Auth**: JWT + 2FA (TOTP), 4 roles

## Completed Features

### Phase 1 — Core Platform (DONE)
- Multi-tenant auth, RBAC, customer onboarding, risk scoring, case management, audit logs, CDD management

### Phase 2 — KYC/AML Integration (DONE - Mock Mode)
- Signzy KYC (PAN/Aadhaar/Passport/Voter ID/DL), OpenSanctions screening, Public API v1, API Keys, Enhanced Dashboard

### Phase 3 — Code Quality (DONE)
- Eliminated circular imports, extracted services, split components, env-aware logger

### Phase 4 — Screening Page (DONE)
- New Screening modal with animated 5-step progress, SVG risk circle, result card with breakdown, 30 seeded records, history table with filters/pagination

### Phase 5 — Customers Pages (DONE)
- **Customers List**: Table with Name, ID Type, KYC Status (Verified/Pending/Failed icons), Risk Level badge, Last Screened, CDD Tier (SDD/Standard/EDD), View button. Search + Filters (Risk Level, KYC Status, Country). Pagination.
- **Customer Detail**: Header (avatar, name, risk score circle, KYC/PEP/Sanctions badges, personal info). Vertical Activity Timeline with colored icons (PEP Match/Case Opened in red). Documents section with status. Screening History. Risk Score Breakdown with visual bars (KYC/Sanctions/PEP/Adverse Media/Country/Occupation). Internal Notes (add + view).
- **25 Seeded Demo Customers**: Realistic Indian names, 3 PEP matches (Rajendra Prasad Yadav - MLA Bihar, Smt. Laxmi Devi Sharma - Cabinet Minister Rajasthan, Balakrishnan Nair Pillai - Former Secretary Min of Finance). Mixed risk levels, KYC statuses, CDD tiers. Timeline events, documents, and notes seeded.

## Pending Features
- P1: Reporting Module (`/reports`) with PDF/CSV exports
- P1: Admin Settings & Stripe Billing (`/settings/billing`)
- P2: Webhooks, In-App Notifications, SendGrid, Public onboarding portal

## Test Credentials
- Primary: shyam@sentrixai.com / Sentrix@2024 (super_admin)

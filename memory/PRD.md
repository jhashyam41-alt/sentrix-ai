# AMLGuard — Product Requirements Document

## Problem Statement
Build a production-ready, multi-tenant AML/KYC SaaS platform for financial institutions.

## Architecture
- **Frontend**: React, Tailwind CSS, Shadcn UI, DM Sans font, dark theme (#080c12)
- **Backend**: FastAPI, PyOTP (2FA), PyJWT, Motor (MongoDB async)
- **Database**: MongoDB (customers, screening_records, customer_timeline, customer_notes, cases, case_notes, case_comments, audit_logs, users, tenants, api_keys, kyc_verifications)
- **Auth**: JWT + 2FA (TOTP), 4 roles
- **DnD**: @dnd-kit/core for Kanban drag-and-drop

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
- **Customers List**: Table with Name, ID Type, KYC Status, Risk Level, Last Screened, CDD Tier, View button. Search + Filters. Pagination.
- **Customer Detail**: Header, Activity Timeline, Documents, Screening History, Risk Score Breakdown, Internal Notes.
- **25 Seeded Demo Customers**: Realistic Indian names, 3 PEP matches, mixed risk levels.

### Phase 6 — Cases Kanban Board (DONE - Feb 2026)
- **Kanban Board** (`/cases`): 4-column drag-and-drop board using @dnd-kit/core
  - New Alerts (open), Under Investigation (in_progress), Escalated (escalated), Resolved (closed)
- **Stats Bar**: Total Cases, Open Alerts, Escalated, SAR Filed counts
- **Case Cards**: Case ID, customer name, case type icon (PEP/Sanctions/Adverse Media/Suspicious Txn), priority badges, SAR badge, assigned user
- **Urgency Indicators**: Red dot (>7 days), Yellow (3-7 days), Green (<3 days)
- **Case Detail Slide-Out Panel**: Description, risk score/level, created/due dates, assignment dropdown (3 demo team members), Generate SAR Report button, activity log with comments
- **Resolution Modal**: When dragging to Resolved, prompts for resolution type (True Match SAR Filed, True Match Risk Accepted, False Positive, Duplicate) — logged in audit trail
- **SAR Report Generation**: Mock SAR with pre-filled customer data, screening results, risk score, narrative
- **8 Seeded Demo Cases**: Linked to existing customers, mixed statuses/priorities/ages
- **3 Demo Team Members**: Priya Sharma (Compliance Officer), Rahul Verma (Senior Analyst), Anita Desai (MLRO)

## API Endpoints (Cases)
- GET /api/cases — List all cases
- GET /api/cases/stats — Stats by status, SAR count
- GET /api/cases/{id} — Case detail with comments
- PATCH /api/cases/{id}/status — Quick status update (Kanban DnD)
- POST /api/cases/{id}/resolve — Resolve with resolution type
- PUT /api/cases/{id}/assign — Assign to team member
- POST /api/cases/{id}/generate-sar — Generate mock SAR report
- GET /api/cases/{id}/notes — Activity log
- POST /api/cases/{id}/notes — Add comment
- GET /api/team-members — Demo team members

## Pending Features
- P1: Reporting Module (`/reports`) with PDF/CSV exports
- P1: Admin Settings & Stripe Billing (`/settings/billing`)
- P2: Webhooks notification system (retry logic, HMAC-SHA256 signatures)
- P2: In-App Notifications Bell + SendGrid emails
- P2: Public self-service onboarding portal (`/onboarding/:token`)

## Test Credentials
- Primary: shyam@sentrixai.com / Sentrix@2024 (super_admin)

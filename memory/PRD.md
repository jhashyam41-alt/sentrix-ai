# AMLGuard — Product Requirements Document

## Problem Statement
Build a production-ready, multi-tenant AML/KYC SaaS platform for financial institutions.

## Architecture
- **Frontend**: React, Tailwind CSS, Shadcn UI, DM Sans font, dark theme (#080c12)
- **Backend**: FastAPI, PyOTP (2FA), PyJWT, Motor (MongoDB async)
- **Database**: MongoDB
- **Auth**: JWT + 2FA (TOTP), 4 roles (Super Admin, Compliance Officer, Analyst, Read-Only)
- **DnD**: @dnd-kit/core for Kanban drag-and-drop

## Completed Features

### Phase 1 — Core Platform (DONE)
- Multi-tenant auth, RBAC, customer onboarding, risk scoring, case management, audit logs, CDD management

### Phase 2 — KYC/AML Integration (DONE - MOCKED)
- Signzy KYC (PAN/Aadhaar/Passport/Voter ID/DL), OpenSanctions screening, Public API v1, API Keys, Enhanced Dashboard

### Phase 3 — Code Quality (DONE)
- Eliminated circular imports, extracted services, split components, env-aware logger

### Phase 4 — Screening Page (DONE)
- New Screening modal with animated 5-step progress, SVG risk circle, result card with breakdown, 30 seeded records

### Phase 5 — Customers Pages (DONE)
- Customers List with search + filters, Customer Detail with timeline/docs/risk breakdown, 25 seeded demo customers

### Phase 6 — Cases Kanban Board (DONE - Feb 2026)
- 4-column Kanban board with @dnd-kit drag-and-drop (New Alerts, Under Investigation, Escalated, Resolved)
- Stats bar, urgency dots (red/yellow/green), resolution modal (4 types), SAR report generation
- Assignment dropdown (3 demo team members), activity log with comments, 8 seeded demo cases

### Phase 7 — Audit Logs Redesign (DONE - Feb 2026)
- **Stats bar**: Events Today, Active Users, Screenings Today, Cases Resolved
- **Colored action labels**: Screening Run (blue), Case Created (yellow), Case Resolved (green), API Key Generated (purple), Customer Added (teal), Settings Changed (gray), Login (gray), SAR Filed (red)
- **Expandable rows**: Click any row to see full details JSON (key-value pairs)
- **Export CSV**: Downloads filtered audit log as CSV file
- **Filters**: Action Type, User, Module, Date Range + Clear All
- **Pagination**: 50 per page
- **100 seeded demo audit log entries** spanning 30 days with varied action types, users, IPs

## Key API Endpoints
### Cases
- GET /api/cases, GET /api/cases/stats, GET /api/cases/{id}
- PATCH /api/cases/{id}/status, POST /api/cases/{id}/resolve
- PUT /api/cases/{id}/assign, POST /api/cases/{id}/generate-sar
- GET /api/cases/{id}/notes, POST /api/cases/{id}/notes
- GET /api/team-members

### Audit Logs
- GET /api/audit-logs, GET /api/audit-logs/stats, GET /api/audit-logs/filters
- GET /api/audit-logs/export/csv, GET /api/audit-logs/export/pdf

### Auth, Customers, Screening, API Keys, Dashboard (existing)

## Pending Features
- P1: Reporting Module (`/reports`) with PDF/CSV exports
- P1: Admin Settings & Stripe Billing (`/settings/billing`)
- P2: Webhooks notification system (retry logic, HMAC-SHA256)
- P2: In-App Notifications Bell + SendGrid emails
- P2: Public self-service onboarding portal (`/onboarding/:token`)

## Test Credentials
- Primary: shyam@sentrixai.com / Sentrix@2024 (super_admin)

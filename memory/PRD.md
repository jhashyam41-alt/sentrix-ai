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
- Signzy KYC, OpenSanctions screening, Public API v1, API Keys, Enhanced Dashboard

### Phase 3 — Code Quality (DONE)
- Eliminated circular imports, extracted services, split components, env-aware logger

### Phase 4 — Screening Page (DONE)
- Animated 5-step progress, SVG risk circle, result breakdown, 30 seeded records

### Phase 5 — Customers Pages (DONE)
- Customers List + Customer Detail with timeline/docs/risk breakdown, 25 seeded demo customers

### Phase 6 — Cases Kanban Board (DONE)
- 4-column DnD Kanban, urgency dots, resolution modal, SAR generation, team assignment, 8 seeded cases

### Phase 7 — Audit Logs Redesign (DONE)
- Stats bar, colored action labels (8 types), expandable rows, CSV export, 5 filters, 100 seeded entries

### Phase 8 — Settings Page (DONE - Feb 2026)
- **6-Tab Settings Page** at `/settings`:
  - **General**: Company name, logo upload, timezone (12 options), currency (6 options), Save
  - **Risk Scoring**: 5 weighted sliders (KYC 0-40, Sanctions 0-40, PEP 0-30, Adverse Media 0-20, Country Risk 0-15) + live Score Preview panel showing Low/Medium/High sample profiles
  - **Integrations**: 3 provider cards (Signzy, OpenSanctions, Sanction Scanner) with API key input, Test Connection button, status indicators (Connected/Demo/Disconnected), enable/disable toggle
  - **Notifications**: 4 email alert toggles (High-Risk Screening, Case Escalated, Daily Summary, API Usage Threshold) with animated switches
  - **Team Members**: Full CRUD table (Name, Email, Role badges, Status badges, Edit/Remove), Invite Member form with role selection
  - **Compliance Rules**: 3 automation toggles (Auto-create case, Auto-escalate, Block onboarding) + Re-screen interval selector (30/60/90 days)
- **Backend**: 11 endpoints for settings CRUD, team management, integration testing
- **Seed Data**: Default settings, 3 demo team members (Priya Sharma, Rahul Verma, Anita Desai)

## Key API Endpoints

### Settings
- GET /api/settings — All settings
- PUT /api/settings/general — Update company/timezone/currency
- PUT /api/settings/risk-scoring — Update risk weights
- PUT /api/settings/integrations/{provider} — Update integration config
- POST /api/settings/integrations/{provider}/test — Test connection
- PUT /api/settings/notifications — Update notification toggles
- PUT /api/settings/compliance-rules — Update compliance rules
- GET /api/settings/team — List team members
- POST /api/settings/team/invite — Invite new member
- PUT /api/settings/team/{id}/role — Update member role
- DELETE /api/settings/team/{id} — Remove member

### Cases, Audit Logs, Customers, Screening, API Keys, Dashboard (existing)

## Pending Features
- P1: Reporting Module (`/reports`) with PDF/CSV exports
- P2: Stripe Billing integration (`/settings/billing`)
- P2: Webhooks notification system (retry logic, HMAC-SHA256)
- P2: In-App Notifications Bell + SendGrid emails
- P2: Public self-service onboarding portal (`/onboarding/:token`)

## Test Credentials
- Primary: shyam@sentrixai.com / Sentrix@2024 (super_admin)

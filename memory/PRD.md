# AMLGuard — Product Requirements Document

## Problem Statement
Build a production-ready, multi-tenant AML/KYC SaaS platform for financial institutions.

## Architecture
- **Frontend**: React, Tailwind CSS, Shadcn UI, Recharts, @dnd-kit/core, DM Sans font, dark theme (#080c12)
- **Backend**: FastAPI, PyOTP (2FA), PyJWT, Motor (MongoDB async)
- **Database**: MongoDB
- **Auth**: JWT + 2FA (TOTP), 4 roles

## Completed Features

### Phase 1-5 — Core Platform + Customers + Screening (DONE)
### Phase 6 — Cases Kanban Board (DONE)
### Phase 7 — Audit Logs Redesign (DONE)
### Phase 8 — Settings Page (DONE)

### Phase 9 — Premium Dashboard (DONE - Feb 2026)
- Count-up animations, sparkline mini-charts, animated donut chart, India heat map, Integration Status cards
- **Quick Screen bar** at top: "Enter name or ID to screen instantly..." → navigates to /screening?q=
- **Last Updated timestamp** + Refresh button next to title
- **Live Activity Feed**: 15 diverse entries (KYC Verified, PEP Match Found, High Risk Alert, Case Resolved, SAR Filed, Customer Onboarded, Case Assigned, Case Status Changed, New Case Opened, Logged In) — each with distinct icon colors (green/red/orange/teal/gray)
- `seed_recent_activity()`: 15 seconds-based entries refreshed on every startup for always-fresh feed

## Pending Features
- P1: Reporting Module (`/reports`) with PDF/CSV exports
- P2: Stripe Billing integration (`/settings/billing`)
- P2: Webhooks notification system
- P2: In-App Notifications Bell + SendGrid emails
- P2: Public self-service onboarding portal

## Test Credentials
- Primary: shyam@sentrixai.com / Sentrix@2024 (super_admin)

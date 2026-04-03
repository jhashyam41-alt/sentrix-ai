# AMLGuard — Product Requirements Document

## Problem Statement
Build a production-ready, multi-tenant AML/KYC SaaS platform for financial institutions.

## Architecture
- **Frontend**: React, Tailwind CSS, Shadcn UI, Recharts, @dnd-kit/core, DM Sans font, dark theme (#080c12)
- **Backend**: FastAPI, PyOTP (2FA), PyJWT, Motor (MongoDB async)
- **Database**: MongoDB
- **Auth**: JWT + 2FA (TOTP), 4 roles (Super Admin, Compliance Officer, Analyst, Read-Only)

## Completed Features

### Phase 1-5 — Core Platform + Customers + Screening (DONE)
- Auth, RBAC, Customer CRUD, Risk Scoring, CDD/EDD, Signzy KYC (MOCKED), OpenSanctions (MOCKED)
- Screening Hub with animated progress, Customers Hub with detailed profiles, 25+30 seeded records

### Phase 6 — Cases Kanban Board (DONE)
- 4-column DnD Kanban, urgency dots, resolution modal (4 types), SAR generation, team assignment, 8 seeded cases

### Phase 7 — Audit Logs Redesign (DONE)
- Stats bar, 8 colored action labels, expandable detail rows, CSV export, 5 filters, 100 seeded entries

### Phase 8 — Settings Page (DONE)
- 6-tab settings: General, Risk Scoring (5 sliders + preview), Integrations (3 providers), Notifications (4 toggles), Team Members (CRUD + invite), Compliance Rules (3 toggles + re-screen interval)

### Phase 9 — Premium Dashboard Enhancement (DONE - Feb 2026)
- **Count-Up Animations**: All stat card numbers animate from 0 to value using easeOutCubic via requestAnimationFrame
- **Sparkline Mini-Charts**: 7-day trend lines (recharts LineChart) on each stat card — customers, screenings, risk, cases
- **Animated Donut Chart**: Risk Distribution replaced with recharts PieChart (inner/outer radius donut) — Low/Medium/High/Unacceptable segments with center total
- **India Heat Map**: SVG-based visualization with 10 city dots (Delhi, Mumbai, Bangalore, etc.) — dot size/color reflects screening volume, pulsing CSS animation, grid background
- **Live Activity Feed**: Last 15 events from audit_logs with action-type icons, user names, relative timestamps ("2 min ago")
- **Integration Status Cards**: Signzy, OpenSanctions, News API — all Demo Mode (yellow badge) with Connect buttons linking to /settings
- **API Usage Stats**: Total Calls + Active Keys
- **Backend**: 3 new endpoints — `/dashboard/stats`, `/dashboard/trends` (7-day aggregation), `/dashboard/activity-feed`

## Key Collections
- users, customers, screening_records, cases, case_notes, audit_logs, settings, api_keys, kyc_verifications, customer_timeline, customer_notes

## Pending Features
- P1: Reporting Module (`/reports`) with PDF/CSV exports
- P2: Stripe Billing integration (`/settings/billing`)
- P2: Webhooks notification system (retry logic, HMAC-SHA256)
- P2: In-App Notifications Bell + SendGrid emails
- P2: Public self-service onboarding portal (`/onboarding/:token`)

## Test Credentials
- Primary: shyam@sentrixai.com / Sentrix@2024 (super_admin)

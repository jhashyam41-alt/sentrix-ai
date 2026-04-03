# Rudrik — Product Requirements Document

## Problem Statement
Build a production-ready, multi-tenant AML/KYC SaaS platform for financial institutions.

## Brand
- **Name**: Rudrik
- **Tagline**: Compliance Intelligence
- **Logo**: Trishul-inspired SVG mark (3-pronged weapon + lightning bolt) in accent blue (#2563eb)
- **Copyright**: © 2026 Rudrik Technologies Private Limited
- **Emails**: team@rudrik.io / admin@rudrik.io
- **API Base URL**: https://api.rudrik.io/v1

## Architecture
- **Frontend**: React, Tailwind CSS, Shadcn UI, Recharts, @dnd-kit/core, DM Sans font, dark theme (#080c12)
- **Backend**: FastAPI, PyOTP (2FA), PyJWT, Motor (MongoDB async)
- **Database**: MongoDB
- **Auth**: JWT + 2FA (TOTP), 4 roles

## Completed Features
- Phase 1-5: Core Platform, Customers, Screening (MOCKED Signzy/OpenSanctions)
- Phase 6: Cases Kanban Board (DnD, Resolution Modal, SAR Generation)
- Phase 7: Audit Logs (Colored labels, expandable rows, CSV export, 100 entries)
- Phase 8: Settings (6 tabs: General, Risk Scoring, Integrations, Notifications, Team, Compliance)
- Phase 9: Premium Dashboard (Count-up, Sparklines, Donut, India Map, Activity Feed, Quick Screen)
- Phase 10: Full Rebrand (AMLGuard → Rudrik) — All UI, backend, meta tags, emails, SAR reports

## Pending Features
- P1: Reporting Module (`/reports`) with PDF/CSV exports
- P2: Stripe Billing integration (`/settings/billing`)
- P2: Webhooks notification system
- P2: In-App Notifications Bell + SendGrid emails
- P2: Public self-service onboarding portal

## Test Credentials
- Primary: shyam@sentrixai.com / Sentrix@2024 (super_admin)

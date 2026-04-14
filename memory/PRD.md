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
- Phase 11: Code Quality P0 Fixes (Feb 2026)
  - Replaced hashlib.md5 → hashlib.sha256 in 3 files (opensanctions_service.py, server.py x2)
  - Centralized test credentials via conftest.py (removed hardcoded secrets from 9 test files)
  - Added type hints to shared/deps.py and all test file headers
  - Added useMemo optimizations to CDDManagementCard.js and TeamTab.js
  - Fixed activity feed NoneType bug (details field could be None)
  - Verified logger.js already silences console in production
- Phase 12: Logo & Website Integration (Feb 2026)
  - Integrated custom Rudra Flame Shield SVG logo (trishul + fire + shield)
  - Logo replaces inline SVG on Sidebar, Login, and Register pages
  - Sidebar logo + footer link to https://rudrik.io
  - Login/Register logos link to https://rudrik.io
- Phase 13: Sanctions.io API Integration (Apr 2026)
  - New `services/sanctions_io_service.py` with live + demo modes
  - API key management: save/validate/remove per-tenant via `/api/settings/sanctions-api-key`
  - Screening status endpoint: `/api/settings/screening-status` (live vs demo)
  - Updated screening endpoints to use Sanctions.io (75+ lists, 1M+ PEP, adverse media, criminal)
  - Enhanced result card with match type badges, list source, country, provider badge
  - Gear icon → modal for API key input (saved to localStorage + backend)
  - Live/Demo mode badges (green/yellow), toast notifications on API error
  - Frontend passes api_key in request body, backend accepts as override
  - Cookie security fix: auto-detect production → secure=True, samesite=none
  - Idempotent admin seed script (migration-safe)
- Phase 14: DigiLocker Verification (Apr 2026)
  - New `services/digilocker_service.py` — Aadhaar XML + PAN card verification (demo + live)
  - Endpoints: POST /api/customers/{id}/verify/aadhaar, POST /api/customers/{id}/verify/pan, GET /api/customers/{id}/verifications
  - DigiLocker API key management via /api/settings/digilocker-api-key
  - DigiLockerCard component on customer detail page with Aadhaar + PAN input/verify
  - Green "VERIFIED" badge on customer name when both Aadhaar + PAN verified
  - Yellow "PARTIALLY VERIFIED" badge when only one verified
  - Timeline events created for each verification
  - Overall kyc_status auto-updates to "verified" when both pass
- Phase 15: FATF Country Risk Flagging (Apr 2026)
  - New `services/fatf_service.py` — Black List (KP, IR, MM) + Grey List (25 countries) classification
  - Endpoints: GET /api/fatf/lists, GET /api/fatf/check/{code}, POST /api/customers/{id}/refresh-country-risk
  - Auto-flag on customer creation: nationality checked against FATF lists
  - Black list: auto EDD, +25 risk pts, risk_level=high
  - Grey list: +10 risk pts, risk_level=medium
  - Lazy enrichment on GET /api/customers/{id} for existing customers
  - Customer detail: FATF badge (red/amber), warning banner with description, +risk pts
  - Customer list: BL/GL mini badges next to names
- Phase 16: SLA Monitoring & Compliance (Apr 2026)
  - Backend: GET /api/sla-metrics (mock deterministic data), GET /api/sla-breaches (mock alerts), PUT /api/sla-breaches/{id}/acknowledge, PUT /api/settings/sla
  - SLA config seeded with RBI defaults: screening < 2hrs, case resolution < 168hrs (7 days), STR < 7 days, EDD < 7 working days, SAR < 24hrs
  - Migration auto-injects sla_config into existing settings docs on startup
  - Dashboard: SLA Compliance Monitor widget (3 metric cards + donut chart + weekly trend bars)
  - Donut uses deep crimson (#8B0000), flame orange (#FF6B35), gold (#FFD700)
  - Sidebar: SLA Breach Bell with unacknowledged count badge, upward dropdown with 5 severity-labeled alerts + Ack buttons
  - Settings: SLA Targets tab with 5 configurable fields, "RBI Compliance Defaults" one-click template, auto-escalation toggle
  - Screening table: SLA status column (ON TIME/AT RISK/BREACHED) computed dynamically from elapsed time vs target
  - All SLA metrics and breach alerts use MOCK demo data (no cron jobs)
- Phase 17: Bulk Screening (Apr 2026)
  - Backend: POST /api/screenings/bulk/upload (CSV parse), POST /api/screenings/bulk/{batch_id}/run (screen all), GET /api/screenings/bulk/{batch_id}/download (Excel), GET /api/screenings/bulk/csv-template, GET /api/screenings/bulk/history
  - CSV template with 3 Indian example rows: Rajesh Kumar Sharma, Ananya Textiles Pvt Ltd, Deepak Malhotra
  - Tab switcher (Individual / Bulk Upload) on Screening Hub
  - Upload dropzone with file validation, preview table, "Screen All" button with progress bar
  - Results table: Name, Match (YES/NO), Risk Score, Match Type (Sanction/PEP/Adverse Media), SLA Status
  - Excel download: Sheet 1 "Summary" (branded, stats), Sheet 2 "Detailed Results" (color-coded, auto-formatted)
  - Batch history: last 10 batches with date, file, entities, matches, status, download link
  - Uses configured screening mode (live/demo) and existing Sanctions.io integration

## Pending Features
- P1: Reporting Module (`/reports`) with PDF/CSV exports
- P1: Refactor/Split `server.py` (>3600 lines) into route modules
- P1: Component Splitting (CaseDetailPage.js 396L, RegisterPage.js 358L, CaseDetailPanel.js 322L)
- P2: Stripe Billing integration (`/settings/billing`)
- P2: Webhooks notification system
- P2: In-App Notifications Bell + SendGrid emails
- P2: Public self-service onboarding portal

## Test Credentials
- Primary: shyam@rudrik.io / Assword@0231 (super_admin)
- Default: admin@rudrik.io / Admin123!@# (super_admin)

## Known Items
- Settings company_name in DB may show "AMLGuard Demo" if not reset (seed only runs if no existing settings doc)
- Signzy KYC and OpenSanctions screening are MOCKED
- 8/211 backend tests fail due to endpoints not yet implemented (PEP, adverse-media, bulk screening)

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
  - Demo mode banner + status indicator (green=live, yellow=demo)
  - Cookie security fix: auto-detect production → secure=True, samesite=none
  - Idempotent admin seed script (migration-safe)

## Pending Features
- P1: Reporting Module (`/reports`) with PDF/CSV exports
- P1: Component Splitting (CaseDetailPage.js 396L, RegisterPage.js 358L, CaseDetailPanel.js 322L)
- P1: Backend refactoring (extract seed functions to services/seed_service.py)
- P2: Stripe Billing integration (`/settings/billing`)
- P2: Webhooks notification system
- P2: In-App Notifications Bell + SendGrid emails
- P2: Public self-service onboarding portal

## Test Credentials
- Primary: shyam@rudrik.io / MySecure@2026! (super_admin)
- Default: admin@rudrik.io / Admin123!@# (super_admin)

## Known Items
- Settings company_name in DB may show "AMLGuard Demo" if not reset (seed only runs if no existing settings doc)
- Signzy KYC and OpenSanctions screening are MOCKED
- 8/211 backend tests fail due to endpoints not yet implemented (PEP, adverse-media, bulk screening)

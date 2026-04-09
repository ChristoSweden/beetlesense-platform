# BeetleSense — Feasibility Assessment

## Current Build Status

Based on codebase analysis (April 2026):

- **Pages built**: 100+ across owner, pilot, admin, inspector, and public routes
- **Infrastructure**: Supabase (Auth + DB + Storage + Realtime), PostHog, Sentry, Stripe, MapLibre, i18next (Swedish/English)
- **Analytics**: PostHog fully wired with pre-defined event catalog
- **Error handling**: 60+ structured error codes across 12 modules
- **Design system**: Comprehensive DESIGN.md, CSS custom properties, no design debt
- **Roles implemented**: Forest owner, pilot (drone operator), admin, inspector

## Remaining Build Complexity: **Low–Medium**

The core platform is built. Remaining work is primarily:
- Connecting live data sources (Sentinel Hub API, Lantmäteriet live API, EFI data feeds)
- AI companion fine-tuning on Swedish forestry knowledge
- Drone mission pipeline (already scaffolded)
- Payment/billing flow completion (Stripe scaffolded)
- Content for 20–30 pages that are likely scaffold-only

## Top 3 Risks

### Risk 1: External API reliability (HIGH impact)
BeetleSense depends on Sentinel Hub, Lantmäteriet, and potentially EFI data feeds. If these go down or change their APIs, several core features break. Mitigation: build fallback states for every external dependency (already done via error code system — MAP-004, PARCEL-002, PARCEL-005).

### Risk 2: Swedish regulatory requirements (MEDIUM impact)
Handling Swedish fastighets-ID data, GDPR for EU forest owners, and potential requirements around certified forestry advice (rådgivning) could create legal friction. Mitigation: the EUDR compliance and regulatory radar pages suggest awareness of this — maintain legal review as features ship.

### Risk 3: User adoption in a conservative industry (MEDIUM impact)
Swedish forest owners skew older and are slow technology adopters. The AI companion and satellite features may be perceived as complex. Mitigation: the onboarding flow, demo mode, and bilingual (Swedish/English) support are strong starts — lean into Swedish-language UX and field guide content.

## Go/No-Go Score: **9/10**

**Reasoning**: The platform is technically advanced, well-architected, and already differentiated. The EFI grant alignment creates an institutional tailwind that competitors lack. The main risk is go-to-market (reaching Swedish forest owners) rather than technical feasibility. The 9 rather than 10 reflects the dependency on external data sources that are not yet live in production.

import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F5F7F4] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#1B5E20] hover:text-[#145016] transition-colors mb-8"
        >
          ← Back to BeetleSense
        </Link>

        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm px-8 py-10 sm:px-12 sm:py-14">
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#1B2E1B] mb-2"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm text-[#6B7280] mb-10">Last updated: April 2026</p>

          <Section title="Controller">
            <p>
              BeetleSense AB (in formation). Contact:{' '}
              <a href="mailto:privacy@beetlesense.ai" className="text-[#1B5E20] underline underline-offset-2">
                privacy@beetlesense.ai
              </a>
            </p>
          </Section>

          <Section title="What we collect">
            <ul className="list-disc list-inside space-y-2 text-[#374151]">
              <li>
                <strong>Account data:</strong> email, name, organisation name
              </li>
              <li>
                <strong>Forest data:</strong> parcel boundaries, survey responses, beetle observation records,
                satellite analysis results — stored in Supabase (Frankfurt, EU)
              </li>
              <li>
                <strong>Property identifiers:</strong> fastighets-ID (Swedish property registration numbers) — used
                to fetch boundary data only, not shared with third parties
              </li>
              <li>
                <strong>Analytics:</strong> with your consent, anonymised usage events sent to PostHog (EU
                endpoint)
              </li>
              <li>
                <strong>Error reports:</strong> with your consent, crash reports sent to Sentry (EU region)
              </li>
            </ul>
          </Section>

          <Section title="Legal basis (GDPR)">
            <ul className="list-disc list-inside space-y-2 text-[#374151]">
              <li>
                <strong>Contract performance (Art. 6(1)(b)):</strong> account and forest monitoring data
              </li>
              <li>
                <strong>Consent (Art. 6(1)(a)):</strong> analytics and error tracking
              </li>
              <li>
                <strong>Legitimate interest (Art. 6(1)(f)):</strong> security logging
              </li>
            </ul>
          </Section>

          <Section title="EFI ForestWard Observatory">
            <p className="text-[#374151]">
              If you opt in to the EFI data contribution programme, anonymised and aggregated beetle risk data (no
              personal identifiers, no property numbers, no owner names) is shared with the European Forest
              Institute. You can withdraw this consent at any time in{' '}
              <strong>Settings → EFI Contribution</strong>.
            </p>
          </Section>

          <Section title="Third parties">
            <ul className="list-disc list-inside space-y-2 text-[#374151]">
              <li>
                <strong>Supabase</strong> (database, auth) — EU Frankfurt region — DPA in place
              </li>
              <li>
                <strong>PostHog</strong> (analytics) — EU endpoint — consent required
              </li>
              <li>
                <strong>Sentry</strong> (error tracking) — EU region — consent required
              </li>
              <li>
                <strong>Stripe</strong> (payments) — standard DPA
              </li>
              <li>
                <strong>Sentinel Hub / Copernicus</strong> (satellite data) — EU-operated
              </li>
            </ul>
          </Section>

          <Section title="Your rights">
            <ul className="list-disc list-inside space-y-2 text-[#374151]">
              <li>
                <strong>Access, correction, deletion:</strong> Settings → Delete Account, or email{' '}
                <a href="mailto:privacy@beetlesense.ai" className="text-[#1B5E20] underline underline-offset-2">
                  privacy@beetlesense.ai
                </a>
              </li>
              <li>
                <strong>Portability:</strong> export your parcel data and survey history from Settings
              </li>
              <li>
                <strong>Withdraw analytics consent:</strong> Settings → Privacy
              </li>
              <li>
                <strong>EFI contribution opt-out:</strong> Settings → EFI Contribution
              </li>
            </ul>
          </Section>

          <Section title="Retention">
            <ul className="list-disc list-inside space-y-2 text-[#374151]">
              <li>Account data: until account deletion</li>
              <li>
                Forest monitoring data: until account deletion (backups cleared within 30 days)
              </li>
              <li>Anonymised analytics: 12 months</li>
            </ul>
          </Section>

          <Section title="Contact" last>
            <p>
              <a href="mailto:privacy@beetlesense.ai" className="text-[#1B5E20] underline underline-offset-2">
                privacy@beetlesense.ai
              </a>
            </p>
          </Section>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mt-8">
          <Link to="/terms" className="hover:text-[#1B5E20] transition-colors">
            Terms of Service
          </Link>{' '}
          ·{' '}
          <a href="mailto:privacy@beetlesense.ai" className="hover:text-[#1B5E20] transition-colors">
            privacy@beetlesense.ai
          </a>
        </p>
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}

function Section({ title, children, last = false }: SectionProps) {
  return (
    <section className={last ? '' : 'mb-8'}>
      <h2
        className="text-xl font-semibold text-[#1B2E1B] mb-3"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {title}
      </h2>
      <div className="text-[#374151] leading-relaxed text-sm sm:text-base">{children}</div>
      {!last && <hr className="mt-8 border-[#E5E7EB]" />}
    </section>
  );
}

import { Link } from 'react-router-dom';

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-[#6B7280] mb-10">Last updated: April 2026</p>

          <Section title="Acceptance">
            <p>By using BeetleSense you agree to these terms and our{' '}
              <Link to="/privacy" className="text-[#1B5E20] underline underline-offset-2">Privacy Policy</Link>.
            </p>
          </Section>

          <Section title="Service description">
            <p>
              BeetleSense provides AI-powered forest health monitoring, bark beetle risk forecasting, and satellite
              analysis tools for Swedish forest owners and certified forestry inspectors.
            </p>
          </Section>

          <Section title="Important limitation">
            <p className="bg-[#FEF9C3] border border-[#FDE047] rounded p-4 text-[#713F12] text-sm">
              BeetleSense forecasts and satellite analyses are <strong>decision-support tools only</strong>. They
              do not replace certified forestry inspections, Skogsstyrelsen requirements, or professional advice.
              Always verify with a licensed forestry consultant before making management decisions.
            </p>
          </Section>

          <Section title="Accounts and organisations">
            <ul className="list-disc list-inside space-y-2 text-[#374151]">
              <li>One account per individual</li>
              <li>Organisation accounts require a valid company registration number</li>
              <li>
                Certified inspector accounts require a valid certification number (verified manually)
              </li>
            </ul>
          </Section>

          <Section title="Data ownership">
            <p>
              You own your forest data. We process it to provide the service. You can export or delete it at any
              time.
            </p>
          </Section>

          <Section title="Subscription and billing">
            <ul className="list-disc list-inside space-y-2 text-[#374151]">
              <li>
                <strong>Free tier:</strong> up to 1 parcel, basic risk score
              </li>
              <li>
                <strong>Pro tier:</strong> unlimited parcels, satellite history, AI companion, alerts
              </li>
              <li>
                <strong>Enterprise:</strong>{' '}
                <a href="mailto:hello@beetlesense.ai" className="text-[#1B5E20] underline underline-offset-2">
                  contact hello@beetlesense.ai
                </a>
              </li>
              <li>Subscriptions renew monthly. Cancel any time in Settings → Billing.</li>
              <li>Refunds: pro-rated refund within 14 days of subscription start.</li>
            </ul>
          </Section>

          <Section title="Acceptable use">
            <p>
              You may not: scrape data, resell BeetleSense outputs without a licence, submit false property data,
              or attempt to access other users' data.
            </p>
          </Section>

          <Section title="Liability">
            <p>
              We are not liable for forestry management decisions made using our forecasts. Maximum liability is
              limited to fees paid in the last 12 months.
            </p>
          </Section>

          <Section title="Governing law">
            <p>Sweden. Stockholm District Court for disputes.</p>
          </Section>

          <Section title="Contact" last>
            <p>
              <a href="mailto:hello@beetlesense.ai" className="text-[#1B5E20] underline underline-offset-2">
                hello@beetlesense.ai
              </a>
            </p>
          </Section>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mt-8">
          <Link to="/privacy" className="hover:text-[#1B5E20] transition-colors">
            Privacy Policy
          </Link>{' '}
          ·{' '}
          <a href="mailto:hello@beetlesense.ai" className="hover:text-[#1B5E20] transition-colors">
            hello@beetlesense.ai
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

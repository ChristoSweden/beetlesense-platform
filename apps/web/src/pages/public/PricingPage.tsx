

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Pricing tiers
  const tiers = [
    {
      name: 'Gratis',
      subtitle: 'Börja kostnadsfritt',
      price: '0',
      currency: 'kr',
      period: '/mån',
      description: '1 skifte upp till 10 ha, grundläggande satellitövervakning, månadsrapporter',
      cta: 'Kom igång',
      ctaUrl: '/signup',
      highlighted: false,
      features: [
        { name: '1 skifte (max 10 ha)', included: true },
        { name: 'Grundläggande satellitövervakning', included: true },
        { name: 'Månadsrapporter', included: true },
        { name: 'Skogshälsopoäng', included: true },
        { name: 'AI barkborredetektion', included: false },
        { name: 'Drönaruppladdning', included: false },
        { name: 'SMS/e-postvarningar', included: false },
        { name: 'Veckovisa satellitscans', included: false },
        { name: 'Virkesmarknadsintelligens', included: false },
        { name: 'API-åtkomst', included: false },
        { name: 'Fleranvändarstöd', included: false },
        { name: 'Dedikerad support', included: false },
      ],
    },
    {
      name: 'Pro',
      subtitle: 'Mest populär',
      price: '249',
      currency: 'kr',
      period: '/mån',
      description: 'Obegränsade skiften, veckovisa scans, AI-detektion, drönaruppladdning, varningar',
      cta: 'Börja gratis prövning',
      ctaUrl: '/signup',
      highlighted: true,
      features: [
        { name: 'Obegränsade skiften', included: true },
        { name: 'Veckovisa satellitscans', included: true },
        { name: 'AI barkborredetektion', included: true },
        { name: 'Drönaruppladdning & analys', included: true },
        { name: 'SMS/e-postvarningar', included: true },
        { name: 'Virkesmarknadsintelligens', included: true },
        { name: 'Fältläge (offline)', included: true },
        { name: 'Prioriterad support', included: true },
        { name: 'API-åtkomst', included: false },
        { name: 'Fleranvändarstöd & SSO', included: false },
        { name: 'SLU/Skogsstyrelsen-data', included: false },
        { name: 'Anpassade rapporter', included: false },
      ],
    },
    {
      name: 'Företag',
      subtitle: 'För stora operationer',
      price: '1 499',
      currency: 'kr',
      period: '/mån',
      description: 'Allt i Pro + API, fleranvändarstöd, SLU/Skogsstyrelsen-data, prioriterad support',
      cta: 'Kontakta försäljning',
      ctaUrl: 'mailto:info@beetlesense.ai?subject=Enterprise%20Plan',
      highlighted: false,
      features: [
        { name: 'Allt i Pro', included: true },
        { name: 'API-åtkomst & integrationer', included: true },
        { name: 'Fleranvändarstöd & SSO', included: true },
        { name: 'SLU/Skogsstyrelsen-dataintegration', included: true },
        { name: 'Anpassade rapporter', included: true },
        { name: 'Dedikerad kundansvarig', included: true },
        { name: 'SLA & prioriterad support', included: true },
        { name: 'Dataexport & compliance', included: true },
        { name: '', included: false },
        { name: '', included: false },
        { name: '', included: false },
        { name: '', included: false },
      ],
    },
  ];

  // FAQ items
  const faqItems = [
    {
      question: 'Kan jag byta plan när som helst?',
      answer:
        'Ja, du kan uppgradera eller nedgradera din plan när som helst. Ändringar träder i kraft omedelbar och vi justerar din fakturering proportionellt.',
    },
    {
      question: 'Vad är "Trädröntgen"?',
      answer:
        'Trädröntgen är vår avancerade AI-scanning-tjänst som analyserar hundratusentals träd med högt ultrahöga satellitupplösning. Vi kan analysera upp till 14 200 träd per scan och ger dig detaljerade rapporter om barkborreangrepp.',
    },
    {
      question: 'Erbjuder ni rabatt för årsavtal?',
      answer:
        'Ja! Årsavtal erbjuds med upp till 20% rabatt jämfört med månatliga planer. Kontakta vårt försäljningsteam för detaljer.',
    },
    {
      question: 'Vad ingår i API-åtkomst?',
      answer:
        'API-åtkomst på Enterprise-planen ger dig fullständig integration med dina egna system. Du får dokumentation, webhook-stöd och dedikerad teknisk support.',
    },
    {
      question: 'Hur fungerar den kostnadsfria prövningen?',
      answer:
        'Du kan registrera dig kostnadsfritt och utforska BeetleSense med en skogtomt under 14 dagar. Ingen kreditkort krävs för att börja.',
    },
    {
      question: 'Vilken support får jag?',
      answer:
        'Gratis-användare får e-postsupport under kontorstid. Pro-användare får prioriterad e-postsupport och webinarer. Enterprise-kunder får dedikerad accountmanager.',
    },
  ];

  // Feature comparison table
  const allFeatures = [
    'Skogtomter',
    'Satellitövervakning',
    'AI-analys',
    'Hälsovärde',
    'Marknadsintelligens',
    'Tidig varning',
    'Fältläge',
    'API-åtkomst',
    'SSO',
    'Dedikerad support',
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Navigation */}
      <nav className="border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-[var(--green)] hover:text-[var(--green-light)]">
            BeetleSense
          </Link>
          <div className="space-x-6">
            <Link to="/" className="text-sm text-[var(--text)]/60 hover:text-[var(--text)] transition">
              Hem
            </Link>
            <Link to="/demo" className="text-sm text-[var(--text)]/60 hover:text-[var(--text)] transition">
              Demo
            </Link>
            <Link
              to="/signup"
              className="text-sm bg-[var(--green)] px-4 py-2 rounded hover:bg-[var(--green-light)] transition"
            >
              Registrera
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Enkla, transparenta <span className="text-[var(--green)]">priser</span>
        </h1>
        <p className="text-lg text-[var(--text)]/60 mb-8 max-w-2xl mx-auto">
          Välj den plan som passar din skog. Alla planer inkluderar grundläggande AI-analys och satellitövervakning.
        </p>

        {/* Annual/Monthly Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <span className={`text-sm ${!isAnnual ? 'text-[var(--text)]' : 'text-[var(--text)]/40'}`}>Månadlig</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-8 w-14 items-center rounded-full bg-[var(--border)] hover:bg-[var(--border)] transition"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                isAnnual ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${isAnnual ? 'text-[var(--text)]' : 'text-[var(--text)]/40'}`}>Årlig</span>
          {isAnnual && (
            <span className="ml-4 inline-block bg-[var(--green)] text-white text-xs font-semibold px-3 py-1 rounded">
              Spara 20%
            </span>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`relative rounded-lg transition-all duration-300 ${
                tier.highlighted
                  ? 'ring-2 ring-[var(--green)] bg-[var(--bg2)] scale-105'
                  : 'bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--border)]'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-[var(--green)] text-white text-xs font-bold px-4 py-1 rounded-full">
                    {tier.subtitle}
                  </span>
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <p className="text-[var(--text)]/60 text-sm mb-6">{tier.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.currency && <span className="text-lg text-[var(--text)]/60">{tier.currency}</span>}
                  </div>
                  <p className="text-[var(--text)]/40 text-sm mt-2">{tier.period}</p>
                </div>

                {/* CTA Button */}
                {tier.ctaUrl.startsWith('mailto:') ? (
                  <a
                    href={tier.ctaUrl}
                    className={`block w-full py-3 px-4 rounded font-semibold text-center transition mb-8 ${
                      tier.highlighted
                        ? 'bg-[var(--green)] text-white hover:bg-[var(--green-light)]'
                        : 'bg-[var(--bg2)] text-[var(--text)] hover:bg-[var(--border)]'
                    }`}
                  >
                    {tier.cta}
                  </a>
                ) : (
                  <Link
                    to={tier.ctaUrl}
                    className={`block w-full py-3 px-4 rounded font-semibold text-center transition mb-8 ${
                      tier.highlighted
                        ? 'bg-[var(--green)] text-white hover:bg-[var(--green-light)]'
                        : 'bg-[var(--bg2)] text-[var(--text)] hover:bg-[var(--border)]'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                )}

                {/* Features */}
                <div className="space-y-4">
                  {tier.features.filter(f => f.name).map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-[var(--text)]/40 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? 'text-[var(--text)] text-sm' : 'text-[var(--text)]/40 text-sm'}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Savings Comparison */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[var(--bg2)] rounded-lg p-8 border border-[var(--border)]">
          <h2 className="text-2xl font-bold mb-8 text-center">Sparar du pengar med BeetleSense?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Manual Inspection */}
            <div className="bg-[var(--bg2)] rounded-lg p-6 border border-[var(--border)]">
              <h3 className="text-lg font-semibold mb-4 text-[var(--text)]/60">Manuell inspektion</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text)]/60">Kostnad per inspektion</span>
                  <span className="font-semibold">48 000 kr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text)]/60">Tid för resultat</span>
                  <span className="font-semibold">22 dagar</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text)]/60">Decimaltal område</span>
                  <span className="font-semibold">Begränsat</span>
                </div>
              </div>
            </div>

            {/* BeetleSense */}
            <div className="bg-[var(--bg2)] rounded-lg p-6 border border-[var(--green)]">
              <h3 className="text-lg font-semibold mb-4 text-[var(--green)]">BeetleSense AI</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text)]/60">Kostnad per scan</span>
                  <span className="font-semibold">4 900 kr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text)]/60">Tid för resultat</span>
                  <span className="font-semibold">30 minuter</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text)]/60">Täckning</span>
                  <span className="font-semibold">Obegränsat</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Stats */}
          <div className="mt-8 pt-8 border-t border-[var(--border)]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-[var(--green)]">90%</p>
                <p className="text-sm text-[var(--text)]/60">Kostnadsbesparingar</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[var(--green)]">43.6x</p>
                <p className="text-sm text-[var(--text)]/60">Snabbare resultat</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[var(--green)]">∞</p>
                <p className="text-sm text-[var(--text)]/60">Större täckning</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trädröntgen Upsell Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[var(--bg2)] rounded-lg p-8 border border-[var(--green)]">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Trädröntgen</h2>
              <p className="text-[var(--text)] mb-6">
                Vår avancerade AI-scanning-tjänst som analyserar titusental träd på en gång. Få detaljerade rapporter
                om barkborreangrepp, trädkvalitet och risköversikter direkt från satellitdata.
              </p>
              <p className="text-2xl font-semibold mb-6">14 200 träd analyserade</p>
              <Link
                to="/signup"
                className="inline-block bg-[var(--bg)] text-[var(--text)] px-6 py-3 rounded font-semibold hover:bg-[var(--border)] transition"
              >
                Boka din scan idag
              </Link>
            </div>
            <div className="bg-[var(--bg2)] rounded-lg p-6 border border-[var(--border)]">
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span>Antal träd som analyseras</span>
                  <span className="font-semibold">14 200</span>
                </div>
                <div className="border-t border-[var(--border)] pt-4">
                  <div className="flex justify-between">
                    <span>Skanningstid</span>
                    <span className="font-semibold">1–2 veckor</span>
                  </div>
                </div>
                <div className="border-t border-[var(--border)] pt-4">
                  <div className="flex justify-between">
                    <span>Rapporteringsformat</span>
                    <span className="font-semibold">PDF + Digital karta</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold mb-12 text-center">Jämför alla funktioner</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-4 px-4 font-semibold text-[var(--text)]/60">Funktion</th>
                <th className="text-center py-4 px-4 font-semibold text-[var(--text)]/60">Gratis</th>
                <th className="text-center py-4 px-4 font-semibold text-[var(--text)]/60">Pro</th>
                <th className="text-center py-4 px-4 font-semibold text-[var(--text)]/60">Företag</th>
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((feature, idx) => (
                <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--bg2)] transition">
                  <td className="py-4 px-4 text-[var(--text)]/60">{feature}</td>
                  <td className="py-4 px-4 text-center">
                    {tiers[0].features.find((f) => f.name.toLowerCase().includes(feature.toLowerCase()))?.included ? (
                      <Check className="w-5 h-5 text-[var(--green)] mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-[var(--text)]/40 mx-auto" />
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {tiers[1].features.find((f) => f.name.toLowerCase().includes(feature.toLowerCase()))?.included ? (
                      <Check className="w-5 h-5 text-[var(--green)] mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-[var(--text)]/40 mx-auto" />
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {tiers[2].features.find((f) => f.name.toLowerCase().includes(feature.toLowerCase()))?.included ? (
                      <Check className="w-5 h-5 text-[var(--green)] mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-[var(--text)]/40 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold mb-12 text-center">Vanliga frågor</h2>
        <div className="space-y-4">
          {faqItems.map((item, idx) => (
            <div key={idx} className="border border-[var(--border)] rounded-lg hover:border-[var(--border)] transition">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 hover:bg-[var(--bg2)] transition"
              >
                <span className="text-left font-semibold text-[var(--text)]">{item.question}</span>
                {expandedFaq === idx ? (
                  <ChevronUp className="w-5 h-5 text-[var(--green)] flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[var(--text)]/40 flex-shrink-0" />
                )}
              </button>
              {expandedFaq === idx && (
                <div className="px-6 pb-6 border-t border-[var(--border)] text-[var(--text)]/60">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold mb-6">Redo att komma igång?</h2>
        <p className="text-lg text-[var(--text)]/60 mb-8 max-w-2xl mx-auto">
          Börja kostnadsfritt idag. Ingen kreditkort krävs. Du kan uppgradera eller avsluta när som helst.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/signup"
            className="px-8 py-3 bg-[var(--green)] text-white rounded font-semibold hover:bg-[var(--green-light)] transition"
          >
            Börja din kostnadsfria prövning
          </Link>
          <Link
            to="/demo"
            className="px-8 py-3 border border-[var(--border)] text-[var(--text)] rounded font-semibold hover:border-[var(--green)] transition"
          >
            Se en demo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">BeetleSense</h4>
              <p className="text-sm text-[var(--text)]/60">AI-driven forest intelligence för svenska skogsägare.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/" className="text-[var(--text)]/60 hover:text-[var(--text)] transition">
                    Hem
                  </Link>
                </li>
                <li>
                  <Link to="/demo" className="text-[var(--text)]/60 hover:text-[var(--text)] transition">
                    Demo
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-[var(--text)]/60 hover:text-[var(--text)] transition">
                    Prissättning
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Företag</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/" className="text-[var(--text)]/60 hover:text-[var(--text)] transition">
                    Om oss
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-[var(--text)]/60 hover:text-[var(--text)] transition">
                    Blogg
                  </Link>
                </li>
                <li>
                  <a href="mailto:info@beetlesense.ai" className="text-[var(--text)]/60 hover:text-[var(--text)] transition">
                    Kontakt
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Juridisk</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/privacy" className="text-[var(--text)]/60 hover:text-[var(--text)] transition">
                    Integritet
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-[var(--text)]/60 hover:text-[var(--text)] transition">
                    Villkor
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[var(--border)] pt-8 text-center text-sm text-[var(--text)]/40">
            <p>&copy; 2026 BeetleSense AB. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
      period: 'för alltid',
      description: 'Perfekt för att utforska BeetleSense',
      cta: 'Kom igång',
      ctaUrl: '/signup',
      highlighted: false,
      features: [
        { name: '1 skogtomt', included: true },
        { name: 'Satellitövervakning', included: true },
        { name: 'Grundläggande AI-analys', included: true },
        { name: 'Hälsovärde för skog', included: true },
        { name: 'Obegränsade skogtomter', included: false },
        { name: 'Fullständig AI-motor', included: false },
        { name: 'Marknadsintelligens', included: false },
        { name: 'Tidig varning', included: false },
        { name: 'Fältläge', included: false },
        { name: 'API-åtkomst', included: false },
        { name: 'SSO-integration', included: false },
        { name: 'Dedikerad support', included: false },
      ],
    },
    {
      name: 'Pro',
      subtitle: 'Mest populär',
      price: '299',
      currency: 'kr',
      period: '/mån',
      description: 'För skogsägare som vill maximera avkastning',
      cta: 'Börja gratis prövning',
      ctaUrl: 'https://buy.stripe.com/8x24gA3wZ4ph7ZQ5UwbEA0t',
      highlighted: true,
      features: [
        { name: '1 skogtomt', included: true },
        { name: 'Satellitövervakning', included: true },
        { name: 'Grundläggande AI-analys', included: true },
        { name: 'Hälsovärde för skog', included: true },
        { name: 'Obegränsade skogtomter', included: true },
        { name: 'Fullständig AI-motor', included: true },
        { name: 'Marknadsintelligens', included: true },
        { name: 'Tidig varning', included: true },
        { name: 'Fältläge', included: true },
        { name: 'API-åtkomst', included: false },
        { name: 'SSO-integration', included: false },
        { name: 'Dedikerad support', included: false },
      ],
    },
    {
      name: 'Företag',
      subtitle: 'För stora operationer',
      price: 'Anpassad',
      currency: '',
      period: 'prissättning',
      description: 'Skräddarsydd för dina affärsbehov',
      cta: 'Kontakta försäljning',
      ctaUrl: '/contact',
      highlighted: false,
      features: [
        { name: '1 skogtomt', included: true },
        { name: 'Satellitövervakning', included: true },
        { name: 'Grundläggande AI-analys', included: true },
        { name: 'Hälsovärde för skog', included: true },
        { name: 'Obegränsade skogtomter', included: true },
        { name: 'Fullständig AI-motor', included: true },
        { name: 'Marknadsintelligens', included: true },
        { name: 'Tidig varning', included: true },
        { name: 'Fältläge', included: true },
        { name: 'API-åtkomst', included: true },
        { name: 'SSO-integration', included: true },
        { name: 'Dedikerad support', included: true },
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
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-[#1B5E20] hover:text-[#2d7a2a]">
            BeetleSense
          </Link>
          <div className="space-x-6">
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition">
              Hem
            </Link>
            <Link href="/demo" className="text-sm text-gray-400 hover:text-white transition">
              Demo
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-[#1B5E20] px-4 py-2 rounded hover:bg-[#2d7a2a] transition"
            >
              Registrera
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Enkla, transparenta <span className="text-[#1B5E20]">priser</span>
        </h1>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
          Välj den plan som passar din skog. Alla planer inkluderar grundläggande AI-analys och satellitövervakning.
        </p>

        {/* Annual/Monthly Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <span className={`text-sm ${!isAnnual ? 'text-white' : 'text-gray-500'}`}>Månadlig</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-700 hover:bg-gray-600 transition"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                isAnnual ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${isAnnual ? 'text-white' : 'text-gray-500'}`}>Årlig</span>
          {isAnnual && (
            <span className="ml-4 inline-block bg-[#1B5E20] text-white text-xs font-semibold px-3 py-1 rounded">
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
                  ? 'ring-2 ring-[#1B5E20] bg-gray-900 scale-105'
                  : 'bg-gray-900 border border-gray-800 hover:border-gray-700'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-[#1B5E20] text-white text-xs font-bold px-4 py-1 rounded-full">
                    {tier.subtitle}
                  </span>
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <p className="text-gray-400 text-sm mb-6">{tier.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.currency && <span className="text-lg text-gray-400">{tier.currency}</span>}
                  </div>
                  <p className="text-gray-500 text-sm mt-2">{tier.period}</p>
                </div>

                {/* CTA Button */}
                <Link
                  href={tier.ctaUrl}
                  className={`block w-full py-3 px-4 rounded font-semibold text-center transition mb-8 ${
                    tier.highlighted
                      ? 'bg-[#1B5E20] text-white hover:bg-[#2d7a2a]'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {tier.cta}
                </Link>

                {/* Features */}
                <div className="space-y-4">
                  {tier.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-[#1B5E20] flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? 'text-gray-200 text-sm' : 'text-gray-500 text-sm'}>
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
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-8 text-center">Sparar du pengar med BeetleSense?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Manual Inspection */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-300">Manuell inspektion</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Kostnad per inspektion</span>
                  <span className="font-semibold">48 000 kr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tid för resultat</span>
                  <span className="font-semibold">22 dagar</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Decimaltal område</span>
                  <span className="font-semibold">Begränsat</span>
                </div>
              </div>
            </div>

            {/* BeetleSense */}
            <div className="bg-gray-900 rounded-lg p-6 border border-[#1B5E20]">
              <h3 className="text-lg font-semibold mb-4 text-[#1B5E20]">BeetleSense AI</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Kostnad per scan</span>
                  <span className="font-semibold">4 900 kr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tid för resultat</span>
                  <span className="font-semibold">30 minuter</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Täckning</span>
                  <span className="font-semibold">Obegränsat</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Stats */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-[#1B5E20]">90%</p>
                <p className="text-sm text-gray-400">Kostnadsbesparingar</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#1B5E20]">43.6x</p>
                <p className="text-sm text-gray-400">Snabbare resultat</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#1B5E20]">â</p>
                <p className="text-sm text-gray-400">Större täckning</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trädröntgen Upsell Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-br from-[#1B5E20] to-[#0d3611] rounded-lg p-8 border border-[#2d7a2a]">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Trädröntgen</h2>
              <p className="text-gray-100 mb-6">
                Vår avancerade AI-scanning-tjänst som analyserar titusental träd på en gång. Få detaljerade rapporter
                om barkborreangrepp, trädkvalitet och risköversikter direkt från satellitdata.
              </p>
              <p className="text-2xl font-semibold mb-6">14 200 träd analyserade</p>
              <Link
                href="/book-scan"
                className="inline-block bg-white text-[#1B5E20] px-6 py-3 rounded font-semibold hover:bg-gray-100 transition"
              >
                Boka din scan idag
              </Link>
            </div>
            <div className="bg-black bg-opacity-30 rounded-lg p-6 border border-[#2d7a2a]">
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span>Antal träd som analyseras</span>
                  <span className="font-semibold">14 200</span>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between">
                    <span>Skanningstid</span>
                    <span className="font-semibold">1–2 veckor</span>
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-4">
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
              <tr className="border-b border-gray-800">
                <th className="text-left py-4 px-4 font-semibold text-gray-400">Funktion</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-400">Gratis</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-400">Pro</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-400">Företag</th>
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((feature, idx) => (
                <tr key={idx} className="border-b border-gray-800 hover:bg-gray-900 transition">
                  <td className="py-4 px-4 text-gray-300">{feature}</td>
                  <td className="py-4 px-4 text-center">
                    {tiers[0].features.find((f) => f.name.toLowerCase().includes(feature.toLowerCase()))?.included ? (
                      <Check className="w-5 h-5 text-[#1B5E20] mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {tiers[1].features.find((f) => f.name.toLowerCase().includes(feature.toLowerCase()))?.included ? (
                      <Check className="w-5 h-5 text-[#1B5E20] mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {tiers[2].features.find((f) => f.name.toLowerCase().includes(feature.toLowerCase()))?.included ? (
                      <Check className="w-5 h-5 text-[#1B5E20] mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-gray-600 mx-auto" />
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
            <div key={idx} className="border border-gray-800 rounded-lg hover:border-gray-700 transition">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-900 transition"
              >
                <span className="text-left font-semibold text-gray-100">{item.question}</span>
                {expandedFaq === idx ? (
                  <ChevronUp className="w-5 h-5 text-[#1B5E20] flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                )}
              </button>
              {expandedFaq === idx && (
                <div className="px-6 pb-6 border-t border-gray-800 text-gray-400">
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
        <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
          Börja kostnadsfritt idag. Ingen kreditkort krävs. Du kan uppgradera eller avsluta när som helst.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3 bg-[#1B5E20] text-white rounded font-semibold hover:bg-[#2d7a2a] transition"
          >
            Börja din kostnadsfria prövning
          </Link>
          <Link
            href="/demo"
            className="px-8 py-3 border border-gray-700 text-white rounded font-semibold hover:border-gray-500 transition"
          >
            Se en demo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">BeetleSense</h4>
              <p className="text-sm text-gray-400">AI-driven forest intelligence för svenska skogsägare.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="text-gray-400 hover:text-white transition">
                    Hem
                  </Link>
                </li>
                <li>
                  <Link href="/demo" className="text-gray-400 hover:text-white transition">
                    Demo
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-gray-400 hover:text-white transition">
                    Prissättning
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Företag</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-white transition">
                    Om oss
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-gray-400 hover:text-white transition">
                    Blogg
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-white transition">
                    Kontakt
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Juridisk</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="text-gray-400 hover:text-white transition">
                    Integritet
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-400 hover:text-white transition">
                    Villkor
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2026 BeetleSense AB. Alla rättigheter förbehållna.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;

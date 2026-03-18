/**
 * HedgingEducation — Educational component explaining hedging concepts
 * in simple Swedish with forest-specific examples and analogies.
 */

import { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Lock,
  Shield,
  Layers,
  Lightbulb,
  HelpCircle,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Behover jag leverera virket om jag tecknar ett terminskontrakt?',
    answer: 'Ja, ett terminskontrakt ar en overenskommelse om att leverera en viss volym till ett visst pris vid en bestamt tidpunkt. Om du inte kan leverera kan du stanga kontraktet i fortid, men det kan innebara en kostnad.',
  },
  {
    question: 'Vad hander om jag inte avverkar?',
    answer: 'Om du har en prisforsakring och inte avverkar forlorar du premien men har ingen leveransskyldighet. For terminskontrakt bor du stanga positionen i god tid om planerna andras.',
  },
  {
    question: 'Hur mycket kostar det?',
    answer: 'Terminskontrakt har en avgift pa 1-2% av kontraktsvardet. Prisforsakringar kostar typiskt 3-8% av det forsakrade vardet beroende pa hur lang skyddsperioden ar och hur nara golvet ar spotpriset.',
  },
  {
    question: 'Kan jag teckna flera hedgar for samma volym?',
    answer: 'Ja, men var forsiktig sa du inte overhedgar. Om du hedgar mer volym an du planerar att avverka tar du en spekulativ position. Vart system varnar dig om din hedgekvot overstiger 100%.',
  },
  {
    question: 'Nar ar det bra att hedga?',
    answer: 'Generellt ar det en bra tid att hedga nar priserna ar historiskt hoga och du har en planerad avverkning inom 6-18 manader. Om du ar nojd med dagens pris — las det.',
  },
  {
    question: 'Nar bor jag INTE hedga?',
    answer: 'Om du inte planerar avverkning pa lang tid (5+ ar) och marknaden trender uppat kan det vara battre att vanta. Hedging kostar pengar, sa hedga bara nar du har en reell exponering att skydda.',
  },
];

export function HedgingEducation() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="space-y-5">
      {/* Main explanation */}
      <div className="rounded-xl border border-[var(--green)]/20 p-5" style={{ background: 'rgba(74,222,128,0.03)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Vad ar hedging?</h3>
            <p className="text-sm text-[var(--text2)]">
              Hedging innebar att du skyddar dig mot prisrisker. Precis som bonden saljer sin skord
              i forvag for att garantera ett pris, kan du som skogsagare sakra ditt virkespris innan
              du avverkar.
            </p>
          </div>
        </div>

        {/* Analogy */}
        <div className="p-4 rounded-lg border border-[var(--border)] mb-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} className="text-amber-400" />
            <p className="text-xs font-semibold text-[var(--text)]">Tankeexempel</p>
          </div>
          <p className="text-xs text-[var(--text2)]">
            Du planerar att avverka 500 m³ grantimmer i hosten. Dagens pris ar 720 SEK/m³ —
            det ar ett bra pris historiskt sett. Men du oroar dig for att priset sjunker till hosten.
            Med hedging kan du lasa in 720 SEK redan nu och sova gott pa natterna.
          </p>
        </div>

        {/* Types overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock size={14} className="text-blue-400" />
              <p className="text-xs font-semibold text-[var(--text)]">Terminskontrakt</p>
            </div>
            <p className="text-[10px] text-[var(--text3)]">
              Las in ett fast pris for leverans vid en bestamt tidpunkt. Du vet exakt vad du far —
              men gar miste om eventuell uppgang.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-purple-400" />
              <p className="text-xs font-semibold text-[var(--text)]">Prisforsakring</p>
            </div>
            <p className="text-[10px] text-[var(--text3)]">
              Betala en premie for att garantera ett minimipris. Om priserna stannar hoga behaller du
              hela uppsidan — forsakringen kostar bara premien.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Layers size={14} className="text-emerald-400" />
              <p className="text-xs font-semibold text-[var(--text)]">Collar-strategi</p>
            </div>
            <p className="text-[10px] text-[var(--text3)]">
              Kombinera ett prisgolv (skydd nedat) med ett pristak (begransad uppsida). Premien
              kan bli nastan noll. Bra for den som vill ha trygghet utan stor kostnad.
            </p>
          </div>
        </div>
      </div>

      {/* When to hedge / when not to */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--green)]/20 p-4" style={{ background: 'rgba(74,222,128,0.03)' }}>
          <p className="text-xs font-semibold text-[var(--green)] mb-2">Bra tid att hedga</p>
          <ul className="space-y-1.5">
            {[
              'Priserna ar historiskt hoga',
              'Du har planerad avverkning inom 6-18 mån',
              'Du har stor ohedgad exponering',
              'Prisvolatiliteten ar hog',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-[var(--green)] mt-0.5">+</span>
                <span className="text-xs text-[var(--text2)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-amber-500/20 p-4" style={{ background: 'rgba(251,191,36,0.03)' }}>
          <p className="text-xs font-semibold text-amber-400 mb-2">Avvakta med hedging</p>
          <ul className="space-y-1.5">
            {[
              'Lang tid till avverkning (5+ ar)',
              'Priserna ar pa historiskt laga nivaer',
              'Stigande marknadstrend',
              'Liten exponering (liten volym)',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">-</span>
                <span className="text-xs text-[var(--text2)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={14} className="text-[var(--text3)]" />
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            Vanliga fragor
          </h3>
        </div>

        <div className="space-y-2">
          {(showMore ? FAQ_ITEMS : FAQ_ITEMS.slice(0, 3)).map((faq, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[var(--border)]"
              style={{ background: 'var(--bg2)' }}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <p className="text-xs font-medium text-[var(--text)] pr-4">{faq.question}</p>
                {expandedFaq === idx ? (
                  <ChevronUp size={14} className="text-[var(--text3)] flex-shrink-0" />
                ) : (
                  <ChevronDown size={14} className="text-[var(--text3)] flex-shrink-0" />
                )}
              </button>
              {expandedFaq === idx && (
                <div className="px-3 pb-3 pt-0">
                  <p className="text-xs text-[var(--text2)] leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {FAQ_ITEMS.length > 3 && (
          <button
            onClick={() => setShowMore(!showMore)}
            className="mt-2 text-xs text-[var(--green)] hover:text-[var(--green2)] transition-colors"
          >
            {showMore ? 'Visa farre fragor' : `Visa alla ${FAQ_ITEMS.length} fragor`}
          </button>
        )}
      </div>

      {/* Wall Street comparison */}
      <div className="rounded-lg border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <p className="text-xs font-semibold text-[var(--text)] mb-2">
          Finansverktyg for skogsagare — aentligen
        </p>
        <p className="text-xs text-[var(--text3)] leading-relaxed">
          Storbonder och ravarufonder har hedgat priser i decennier. Europeiska skogsagare har
          aldrig haft tillgang till samma verktyg — tills nu. BeetleSense gor det lika enkelt att
          skydda ditt virkespris som att teckna en hemforsakring.
        </p>
      </div>
    </div>
  );
}

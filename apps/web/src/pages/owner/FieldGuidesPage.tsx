import { useState, useRef, useCallback } from 'react';
import {
  Bug,
  TreePine,
  Trees,
  Leaf,
  Ruler,
  Shovel,
  ShieldAlert,
  Cloud,
  ArrowLeft,
  Printer,
  Eye,
  ChevronRight,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

// ─── Types ───

interface FieldGuide {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  pages: number;
  difficulty: 'Nybörjare' | 'Medel' | 'Avancerad';
  color: string;
}

type ActiveGuide = string | null;

// ─── Guide catalog data ───

const GUIDES: FieldGuide[] = [
  {
    id: 'bark-beetle',
    icon: <Bug size={24} />,
    title: 'Granbarkborre — Identifiering',
    subtitle: 'Livscykel, gnagmönster, borrmjöl, tecken på angrepp',
    pages: 12,
    difficulty: 'Nybörjare',
    color: '#ef4444',
  },
  {
    id: 'tree-diseases',
    icon: <TreePine size={24} />,
    title: 'Trädsjukdomar i Sverige',
    subtitle: 'Rotröta, honungsskivling, barrskottsjuka, blånad',
    pages: 10,
    difficulty: 'Medel',
    color: '#f59e0b',
  },
  {
    id: 'conifers',
    icon: <Trees size={24} />,
    title: 'Artbestämning — Barrträd',
    subtitle: 'Gran, Tall, Lärk, Douglasgran — bark, barr, kottar',
    pages: 8,
    difficulty: 'Nybörjare',
    color: '#22c55e',
  },
  {
    id: 'broadleaf',
    icon: <Leaf size={24} />,
    title: 'Artbestämning — Lövträd',
    subtitle: 'Björk, Ek, Bok, Ask, Asp, Al — blad, bark, form',
    pages: 10,
    difficulty: 'Nybörjare',
    color: '#10b981',
  },
  {
    id: 'measurement',
    icon: <Ruler size={24} />,
    title: 'Fältmätning',
    subtitle: 'Diameter, höjd, ålder, volymberäkning',
    pages: 8,
    difficulty: 'Medel',
    color: '#3b82f6',
  },
  {
    id: 'regeneration',
    icon: <Shovel size={24} />,
    title: 'Markberedning & Föryngring',
    subtitle: 'Scarifiering, planteringsguide, fröträdsställning',
    pages: 6,
    difficulty: 'Avancerad',
    color: '#8b5cf6',
  },
  {
    id: 'emergency',
    icon: <ShieldAlert size={24} />,
    title: 'Nödprotokoll',
    subtitle: 'Stormskador, brand, barkborreutbrott — åtgärder',
    pages: 6,
    difficulty: 'Medel',
    color: '#dc2626',
  },
  {
    id: 'weather',
    icon: <Cloud size={24} />,
    title: 'Vädertecken',
    subtitle: 'Molntyper, frostindikatorer, vindmönster',
    pages: 4,
    difficulty: 'Nybörjare',
    color: '#06b6d4',
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  'Nybörjare': '#4ade80',
  Medel: '#fbbf24',
  Avancerad: '#f97316',
};

// ─── Bark Beetle Guide (fully detailed) ───

function BarkBeetleGuide() {
  return (
    <div className="guide-content space-y-10">
      {/* Section 1 — Overview */}
      <section>
        <h2
          className="text-2xl font-serif font-bold mb-4 pb-2"
          style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}
        >
          1. Översikt
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Granbarkborren (<em>Ips typographus</em>) är den mest destruktiva
          skadeinsekten i svenska granskogar. Tidig identifiering är avgörande
          för att begränsa skador. Denna guide hjälper dig att känna igen tecken
          på angrepp, förstå insektens livscykel, och vidta rätt åtgärder.
        </p>
        <div
          className="p-4 rounded-lg"
          style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" style={{ color: '#dc2626' }} />
            <p className="text-sm text-red-800">
              <strong>Rapporteringsplikt:</strong> Vid misstanke om omfattande angrepp
              (&gt;5 m&sup3; angripen ved), kontakta Skogsstyrelsen omgående.
              Telefon: 036-35 93 00.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 — Swedish Species */}
      <section>
        <h2
          className="text-2xl font-serif font-bold mb-4 pb-2"
          style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}
        >
          2. Svenska arter
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ips typographus */}
          <div
            className="p-4 rounded-lg"
            style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
          >
            <h3 className="font-bold text-lg mb-2" style={{ color: '#1a3a1a' }}>
              Stor granbarkborre
            </h3>
            <p className="text-sm text-gray-500 italic mb-3">Ips typographus</p>
            {/* CSS beetle diagram */}
            <div className="flex justify-center mb-3">
              <div className="relative" style={{ width: 80, height: 40 }}>
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 20,
                    height: 18,
                    background: '#4a2c0a',
                    top: 11,
                    left: 0,
                  }}
                />
                <div
                  className="absolute rounded-[50%]"
                  style={{
                    width: 50,
                    height: 36,
                    background: '#6b3a10',
                    top: 2,
                    left: 16,
                    border: '1px solid #4a2c0a',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    width: 14,
                    height: 2,
                    background: '#4a2c0a',
                    top: 5,
                    left: 4,
                    transform: 'rotate(-30deg)',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    width: 14,
                    height: 2,
                    background: '#4a2c0a',
                    top: 33,
                    left: 4,
                    transform: 'rotate(30deg)',
                  }}
                />
              </div>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 font-medium text-gray-600">Storlek</td>
                  <td className="py-1.5 text-gray-800">4,2–5,5 mm</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 font-medium text-gray-600">Färg</td>
                  <td className="py-1.5 text-gray-800">Mörkbrun till svart</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 font-medium text-gray-600">Värdträd</td>
                  <td className="py-1.5 text-gray-800">Gran (Picea abies)</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium text-gray-600">Gångmönster</td>
                  <td className="py-1.5 text-gray-800">Lodräta modergångar med sidogångar</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pityogenes chalcographus */}
          <div
            className="p-4 rounded-lg"
            style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}
          >
            <h3 className="font-bold text-lg mb-2" style={{ color: '#1a3a1a' }}>
              Sextandad barkborre
            </h3>
            <p className="text-sm text-gray-500 italic mb-3">Pityogenes chalcographus</p>
            <div className="flex justify-center mb-3">
              <div className="relative" style={{ width: 60, height: 30 }}>
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 14,
                    height: 12,
                    background: '#5a3510',
                    top: 9,
                    left: 0,
                  }}
                />
                <div
                  className="absolute rounded-[50%]"
                  style={{
                    width: 38,
                    height: 26,
                    background: '#7a4a1a',
                    top: 2,
                    left: 12,
                    border: '1px solid #5a3510',
                  }}
                />
              </div>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 font-medium text-gray-600">Storlek</td>
                  <td className="py-1.5 text-gray-800">2,0–2,5 mm</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 font-medium text-gray-600">Färg</td>
                  <td className="py-1.5 text-gray-800">Rödbrun</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 font-medium text-gray-600">Värdträd</td>
                  <td className="py-1.5 text-gray-800">Gran, främst klenare stammar</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium text-gray-600">Gångmönster</td>
                  <td className="py-1.5 text-gray-800">Stjärnformade modergångar (6 armar)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3 — Life Cycle */}
      <section>
        <h2
          className="text-2xl font-serif font-bold mb-4 pb-2"
          style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}
        >
          3. Livscykel
        </h2>
        <p className="text-gray-700 mb-6 leading-relaxed">
          Utvecklingen från ägg till vuxen insekt tar 6–10 veckor beroende på
          temperatur. Vid varma somrar kan två generationer utvecklas samma år
          (dubbelgeneration).
        </p>

        {/* CSS life cycle diagram */}
        <div
          className="p-6 rounded-lg mb-6"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <div className="flex items-center justify-between flex-wrap gap-y-4">
            {[
              {
                stage: 'Ägg',
                time: '1–2 veckor',
                desc: 'Vita, 0,8 mm, i fickor längs modergång',
                symbol: (
                  <div
                    className="mx-auto rounded-full"
                    style={{ width: 16, height: 20, background: '#fef9c3', border: '2px solid #ca8a04' }}
                  />
                ),
              },
              {
                stage: 'Larv',
                time: '3–4 veckor',
                desc: 'Vit, böjd, huvudkapsel brun, gnager sidogångar',
                symbol: (
                  <div className="mx-auto" style={{ position: 'relative', width: 30, height: 20 }}>
                    <div
                      style={{
                        width: 28,
                        height: 14,
                        background: '#fef9c3',
                        borderRadius: '50%',
                        border: '2px solid #ca8a04',
                        position: 'absolute',
                        top: 3,
                      }}
                    />
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        background: '#92400e',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: 6,
                        left: 0,
                      }}
                    />
                  </div>
                ),
              },
              {
                stage: 'Puppa',
                time: '1–2 veckor',
                desc: 'Vit, i puppkammare vid gångens ände',
                symbol: (
                  <div
                    className="mx-auto"
                    style={{
                      width: 18,
                      height: 24,
                      background: '#fde68a',
                      borderRadius: '40% 40% 50% 50%',
                      border: '2px solid #b45309',
                    }}
                  />
                ),
              },
              {
                stage: 'Vuxen',
                time: 'Livslängd 1–2 år',
                desc: 'Mörkbrun, 4–5 mm, flyger vid &gt;18°C',
                symbol: (
                  <div
                    className="mx-auto rounded-[40%]"
                    style={{
                      width: 22,
                      height: 28,
                      background: '#5c2d0a',
                      border: '2px solid #3b1906',
                    }}
                  />
                ),
              },
            ].map((item, i) => (
              <div key={item.stage} className="flex items-center gap-2">
                <div className="text-center" style={{ minWidth: 120 }}>
                  <div className="mb-2 flex justify-center" style={{ height: 32 }}>
                    {item.symbol}
                  </div>
                  <div className="font-bold text-sm" style={{ color: '#1a3a1a' }}>
                    {item.stage}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.time}</div>
                  <div className="text-xs text-gray-600 mt-1 max-w-[130px] mx-auto leading-tight">
                    {item.desc}
                  </div>
                </div>
                {i < 3 && (
                  <ChevronRight size={20} className="text-green-600 shrink-0 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Identification Signs */}
      <section>
        <h2
          className="text-2xl font-serif font-bold mb-4 pb-2"
          style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}
        >
          4. Identifieringstecken
        </h2>
        <div className="space-y-3">
          {[
            {
              sign: 'Borrmjöl (frass)',
              description:
                'Brunt, fint sågspån vid stambasen och i barkspringor. Tydligast vid torrväder. Tidig indikator.',
              urgency: 'high',
            },
            {
              sign: 'Kådflöde',
              description:
                'Vitaktiga kådtubor 1–3 mm på stammen. Trädets försvar — indikerar aktivt angrepp.',
              urgency: 'high',
            },
            {
              sign: 'Barklossning',
              description:
                'Bark släpper vid tryck. Under barken syns gångsystem. Senare stadie av angrepp.',
              urgency: 'medium',
            },
            {
              sign: 'Kronan gulnar',
              description:
                'Barren skiftar från grönt till gulbrunt, börjar i toppen. Trädet är redan dött.',
              urgency: 'low',
            },
            {
              sign: 'Hackspettaktivitet',
              description:
                'Hackspettskador i barken — fåglarna söker larver. Indikerar pågående angrepp.',
              urgency: 'medium',
            },
            {
              sign: 'Ingångshål',
              description:
                'Runda hål (1–2 mm) i barken, ofta med borrmjöl runtom. Bekräftar angrepp.',
              urgency: 'high',
            },
          ].map((item) => (
            <div
              key={item.sign}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
            >
              <div
                className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                style={{
                  background:
                    item.urgency === 'high'
                      ? '#ef4444'
                      : item.urgency === 'medium'
                        ? '#f59e0b'
                        : '#9ca3af',
                }}
              />
              <div>
                <div className="font-medium text-gray-900">{item.sign}</div>
                <div className="text-sm text-gray-600 mt-0.5">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#ef4444' }} />
            Tidigt tecken / hög prioritet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f59e0b' }} />
            Pågående angrepp
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#9ca3af' }} />
            Sent stadie
          </span>
        </div>
      </section>

      {/* Section 5 — Monthly Activity Calendar */}
      <section>
        <h2
          className="text-2xl font-serif font-bold mb-4 pb-2"
          style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}
        >
          5. Aktivitetskalender
        </h2>
        <p className="text-gray-700 mb-4 text-sm leading-relaxed">
          Barkborrens aktivitet styrs av temperatur. Svärming startar vid
          dagtemperaturer &gt;18°C (vanligen april–maj i Götaland).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th
                  className="text-left py-2 px-2 font-medium text-gray-600"
                  style={{ borderBottom: '2px solid #16a34a' }}
                >
                  Månad
                </th>
                <th
                  className="text-left py-2 px-2 font-medium text-gray-600"
                  style={{ borderBottom: '2px solid #16a34a' }}
                >
                  Aktivitet
                </th>
                <th
                  className="text-left py-2 px-2 font-medium text-gray-600"
                  style={{ borderBottom: '2px solid #16a34a' }}
                >
                  Risk
                </th>
                <th
                  className="text-left py-2 px-2 font-medium text-gray-600"
                  style={{ borderBottom: '2px solid #16a34a' }}
                >
                  Åtgärd
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { month: 'Jan–Mar', activity: 'Övervintring under bark/förna', risk: 'low', action: 'Avverka vindfällen, transportera bort virke' },
                { month: 'April', activity: 'Första svärming vid &gt;18°C', risk: 'medium', action: 'Sätt ut fällfångst, inspektera riskbestånd' },
                { month: 'Maj', activity: 'Huvudsvärming, äggläggning', risk: 'high', action: 'Intensiv övervakning, fäll angripna träd' },
                { month: 'Juni', activity: 'Larvutveckling, förpuppning', risk: 'high', action: 'Bark borttaget virke inom 3 veckor' },
                { month: 'Juli', activity: 'Ny generation kläcks, ev. andra svärming', risk: 'high', action: 'Sök nya angrepp, rapportera till Skogsstyrelsen' },
                { month: 'Aug', activity: 'Dubbelgeneration möjlig (syd-Sverige)', risk: 'high', action: 'Fortsatt övervakning, upparbetning' },
                { month: 'Sep', activity: 'Sista svärmning, tillväxtmatning', risk: 'medium', action: 'Inventera skador, planera vinteråtgärder' },
                { month: 'Okt–Dec', activity: 'Dvala under bark', risk: 'low', action: 'Slutavverka angripet virke, sanera' },
              ].map((row) => (
                <tr key={row.month} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td className="py-2 px-2 font-medium text-gray-900 whitespace-nowrap">
                    {row.month}
                  </td>
                  <td className="py-2 px-2 text-gray-700">{row.activity}</td>
                  <td className="py-2 px-2">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background:
                          row.risk === 'high'
                            ? '#fef2f2'
                            : row.risk === 'medium'
                              ? '#fffbeb'
                              : '#f0fdf4',
                        color:
                          row.risk === 'high'
                            ? '#dc2626'
                            : row.risk === 'medium'
                              ? '#d97706'
                              : '#16a34a',
                      }}
                    >
                      {row.risk === 'high' ? 'Hög' : row.risk === 'medium' ? 'Medel' : 'Låg'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-700">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 6 — Risk Assessment Checklist */}
      <section>
        <h2
          className="text-2xl font-serif font-bold mb-4 pb-2"
          style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}
        >
          6. Riskbedömning — Checklista
        </h2>
        <p className="text-gray-700 mb-4 text-sm leading-relaxed">
          Gå igenom nedanstående punkter vid fältbesök. Ju fler &quot;ja&quot;,
          desto högre risk för barkborreangrepp i beståndet.
        </p>
        <div className="space-y-2">
          {[
            'Finns det vindfällen eller stormskadade granar inom 500 m?',
            'Ligger oupphugget granvirke (&gt;3 m³) i eller vid skogen?',
            'Är granarna &gt;60 år och &gt;20 m höga?',
            'Är beståndet monotont (&gt;80% gran)?',
            'Har det varit torrt och varmt (&gt;20°C) i &gt;2 veckor?',
            'Finns synligt borrmjöl vid stambasen på någon gran?',
            'Syns kådflöde (vita klumpar) på stammar?',
            'Har kronor börjat gulna i toppen?',
            'Har hackspettar bearbetat barken?',
            'Har det rapporterats angrepp i närområdet de senaste 2 åren?',
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 py-2 px-3 rounded"
              style={{ background: i % 2 === 0 ? '#f9fafb' : 'transparent' }}
            >
              <div
                className="w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center"
                style={{ borderColor: '#9ca3af' }}
              >
                <span className="text-xs text-gray-400">{i + 1}</span>
              </div>
              <span className="text-sm text-gray-800">{item}</span>
            </div>
          ))}
        </div>
        <div
          className="mt-4 p-4 rounded-lg"
          style={{ background: '#fefce8', border: '1px solid #fef08a' }}
        >
          <p className="text-sm text-yellow-800">
            <strong>Tolkning:</strong> 0–2 ja = Låg risk &bull; 3–5 ja = Medel risk,
            intensifiera övervakning &bull; 6+ ja = Hög risk, vidta omedelbara
            åtgärder och kontakta Skogsstyrelsen.
          </p>
        </div>
      </section>

      {/* Section 7 — Action Protocol / Decision Flowchart */}
      <section>
        <h2
          className="text-2xl font-serif font-bold mb-4 pb-2"
          style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}
        >
          7. Åtgärdsprotokoll
        </h2>

        {/* CSS-only flowchart */}
        <div className="flex flex-col items-center gap-0">
          {/* Start */}
          <FlowBox color="#16a34a" bg="#f0fdf4">
            Misstänkt angrepp upptäckt
          </FlowBox>
          <FlowArrow />

          <FlowDiamond>Borrmjöl eller kådflöde synligt?</FlowDiamond>
          <div className="flex w-full max-w-xl">
            <div className="flex-1 flex flex-col items-center">
              <div className="text-xs font-medium text-green-700 mb-1">JA</div>
              <FlowArrow />
              <FlowBox color="#dc2626" bg="#fef2f2">
                Bekräftat angrepp — Fäll trädet inom 3 veckor
              </FlowBox>
              <FlowArrow />
              <FlowDiamond>Mer än 5 m&sup3; angripen ved?</FlowDiamond>
              <div className="flex w-full">
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-xs font-medium text-green-700 mb-1">JA</div>
                  <FlowArrow />
                  <FlowBox color="#dc2626" bg="#fef2f2">
                    Rapportera till Skogsstyrelsen
                  </FlowBox>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-xs font-medium text-gray-500 mb-1">NEJ</div>
                  <FlowArrow />
                  <FlowBox color="#f59e0b" bg="#fffbeb">
                    Upparbeta och transportera bort virke
                  </FlowBox>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="text-xs font-medium text-gray-500 mb-1">NEJ</div>
              <FlowArrow />
              <FlowBox color="#3b82f6" bg="#eff6ff">
                Övervaka — återbesök inom 2 veckor
              </FlowBox>
              <FlowArrow />
              <FlowBox color="#6b7280" bg="#f9fafb">
                Dokumentera med foto &amp; GPS-position
              </FlowBox>
            </div>
          </div>
        </div>

        <div
          className="mt-6 p-4 rounded-lg"
          style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
        >
          <h4 className="font-bold text-sm text-blue-900 mb-2">Viktiga kontakter</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>Skogsstyrelsen: 036-35 93 00 | skogsstyrelsen.se</p>
            <p>SOS Alarm (brand): 112</p>
            <p>BeetleSense.ai: support@beetlesense.ai</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Flowchart helper components ───

function FlowBox({
  children,
  color,
  bg,
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="px-4 py-3 rounded-lg text-center text-sm font-medium max-w-xs"
      style={{ background: bg, border: `2px solid ${color}`, color }}
    >
      {children}
    </div>
  );
}

function FlowDiamond({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 px-4 py-3 text-center text-sm max-w-xs">
      <div
        className="px-4 py-3 rounded-lg font-medium"
        style={{
          background: '#fefce8',
          border: '2px solid #ca8a04',
          color: '#854d0e',
          transform: 'rotate(0deg)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex flex-col items-center" style={{ height: 24 }}>
      <div style={{ width: 2, height: 16, background: '#9ca3af' }} />
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '6px solid #9ca3af',
        }}
      />
    </div>
  );
}

// ─── Placeholder guides (condensed) ───

function TreeDiseasesGuide() {
  return (
    <div className="guide-content space-y-8">
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          1. Rotröta (<em>Heterobasidion</em>)
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Den ekonomiskt mest betydelsefulla trädsjukdomen i Sverige. Svampen angriper
          rötter och stamved hos gran och tall, orsakar röta som sprider sig mellan
          träd via rotkontakt.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h4 className="font-bold text-sm mb-2" style={{ color: '#1a3a1a' }}>Identifiering</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Rödaktigt missfärgad ved i stubbar</li>
              <li>Fruktkroppar under rotben (bruna ovansida, vita porer)</li>
              <li>Minskad tillväxt, gles krona</li>
              <li>Harts-/kådflöde vid rothalsen</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h4 className="font-bold text-sm mb-2" style={{ color: '#1a3a1a' }}>Åtgärder</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Stubbbehandling med pergamentsvamp (Rotstop)</li>
              <li>Avverka sommartid (juni–september)</li>
              <li>Byt trädslag vid föryngring</li>
              <li>Undvik gallring vid hög fuktighet</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          2. Honungsskivling (<em>Armillaria</em>)
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Parasitisk svamp som bildar mörka rhizomorfer (&quot;skolissor&quot;) under
          barken och i marken. Angriper försvagade träd av alla arter.
        </p>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr><th className="text-left py-2 px-2 font-medium text-gray-600" style={{ borderBottom: '2px solid #16a34a' }}>Tecken</th><th className="text-left py-2 px-2 font-medium text-gray-600" style={{ borderBottom: '2px solid #16a34a' }}>Beskrivning</th></tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}><td className="py-2 px-2 text-gray-900">Rhizomorfer</td><td className="py-2 px-2 text-gray-700">Svarta, snörliknande strängar under bark och i jord</td></tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}><td className="py-2 px-2 text-gray-900">Vit myceliumfilt</td><td className="py-2 px-2 text-gray-700">Vitt svamplager mellan bark och ved, stark svamplukt</td></tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}><td className="py-2 px-2 text-gray-900">Fruktkroppar</td><td className="py-2 px-2 text-gray-700">Honungsfärgade hattar i klasar vid stambasen, höst</td></tr>
            <tr><td className="py-2 px-2 text-gray-900">Kronförändring</td><td className="py-2 px-2 text-gray-700">Gradvis glesare krona, småblad, dieback</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          3. Barrskottsjuka (<em>Gremmeniella</em>)
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Svampsjukdom som dödar barr och skott, främst på tall i norra Sverige.
          Sprids via sporer under fuktiga förhållanden höst–vår.
        </p>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
          <li>Barren gulnar/bruns från basen, dör och faller av</li>
          <li>Döda skott med kådflöde, &quot;flaggor&quot; av död bark</li>
          <li>Svarta fruktkroppar (pyknider) på döda barr och skott</li>
          <li>Svårast i täta, fuktiga planteringar på höjdlägen</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          4. Blånad
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Missfärgning orsakad av blånadssvampar som sprids via barkborrar. Påverkar
          inte vedens hållfasthet men sänker virkesvärdet avsevärt.
        </p>
        <div className="p-4 rounded-lg" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <p className="text-sm text-blue-800">
            <strong>OBS:</strong> Blånad indikerar ofta att barkborrar redan angripit
            trädet. Kontrollera alltid för borrgnag om blånad upptäcks i stående skog.
          </p>
        </div>
      </section>
    </div>
  );
}

function ConifersGuide() {
  const species = [
    {
      name: 'Gran (Picea abies)',
      bark: 'Rödgrå till gråbrun, fjällig. Tunnar med åldern.',
      needles: 'Fyrkantiga, 1–2,5 cm, spetsiga, sitter enskilt runt kvisten.',
      cones: 'Hängande, 10–16 cm, cylindriska, ljusbruna.',
      habitat: 'Hela Sverige. Trivs i fuktiga, näringsrika marker.',
    },
    {
      name: 'Tall (Pinus sylvestris)',
      bark: 'Nedtill gråbrun, grovt fårad. Upptill orangeröd, tunn, fjällig.',
      needles: 'Parade (2 st), 3–7 cm, blågröna, vrider sig.',
      cones: 'Äggformade, 3–6 cm, gråbruna, sitter 1–3 år.',
      habitat: 'Hela Sverige. Klarar torra, magra marker.',
    },
    {
      name: 'Lärk (Larix decidua/kaempferi)',
      bark: 'Gråbrun, djupt fårad. Rosa-röd innerbarK.',
      needles: 'Mjuka, 2–4 cm, ljusgröna, i knippen om 20–40. Fälls på hösten.',
      cones: 'Upprätta, 2–4 cm, runda, med utstickande fjäll.',
      habitat: 'Planterad, främst södra/mellersta Sverige.',
    },
    {
      name: 'Douglasgran (Pseudotsuga menziesii)',
      bark: 'Slät och grågrön ung, djupt fårad och mörkbrun gammal.',
      needles: 'Platta, 2–3 cm, mjuka, sitter i spiral. Luktar citrus vid krossning.',
      cones: 'Hängande, 5–10 cm, med tydliga tretungade täckfjäll.',
      habitat: 'Planterad, mildare delar av södra Sverige.',
    },
  ];

  return (
    <div className="guide-content space-y-8">
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          Barrträd i Sverige — Artbestämning
        </h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          Denna guide täcker de fyra vanligaste barrträdslagen i svensk skogsbruk.
          Fokus ligger på fältidentifiering med bark, barr och kottkaraktärer.
        </p>
      </section>
      {species.map((sp) => (
        <section key={sp.name}>
          <h3 className="text-xl font-serif font-bold mb-3" style={{ color: '#1a3a1a' }}>{sp.name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Bark</div>
              <div className="text-sm text-gray-800">{sp.bark}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Barr</div>
              <div className="text-sm text-gray-800">{sp.needles}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Kottar</div>
              <div className="text-sm text-gray-800">{sp.cones}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Ståndort</div>
              <div className="text-sm text-gray-800">{sp.habitat}</div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function BroadleafGuide() {
  const species = [
    { name: 'Björk (Betula pendula/pubescens)', leaf: 'Triangulära till rombiska, dubbelsågade, 3–7 cm.', bark: 'Vit med svarta fåror (vårtbjörk) eller gråvit, slät (glasbjörk).' },
    { name: 'Ek (Quercus robur/petraea)', leaf: 'Flikiga, rundade lober, 7–12 cm, nästan oskaftade (skogsek) eller med skaft (bergek).', bark: 'Djupt fårad, gråbrun, mycket tjock på äldre träd.' },
    { name: 'Bok (Fagus sylvatica)', leaf: 'Elliptiska, hela, vågig kant, sidenaktiga, 5–10 cm.', bark: 'Slät, silvergrå, förblir slät även på gamla träd.' },
    { name: 'Ask (Fraxinus excelsior)', leaf: 'Sammansatta, 7–13 småblad, motsatta, sågade, 20–35 cm totalt.', bark: 'Grå, nätmönstrad (ruter) på äldre stammar.' },
    { name: 'Asp (Populus tremula)', leaf: 'Runda till rundade, trubbigt tandade, 3–8 cm. Darrar i vinden (platt bladskaft).', bark: 'Gröngrå och slät ung, mörkgrå och fårad gammal.' },
    { name: 'Al (Alnus glutinosa/incana)', leaf: 'Omvänt äggrunda (klibbal) eller spetsiga (gråal), 4–10 cm.', bark: 'Mörkt purpurbrun med lenticeller (klibbal) eller grå, slät (gråal).' },
  ];

  return (
    <div className="guide-content space-y-6">
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          Lövträd i Sverige — Artbestämning
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Identifieringsguide för de sex vanligaste lövträdslagen i svenskt skogsbruk.
        </p>
      </section>
      {species.map((sp) => (
        <div key={sp.name} className="p-4 rounded-lg" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <h3 className="font-bold text-lg mb-2" style={{ color: '#1a3a1a' }}>{sp.name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><span className="font-medium text-gray-600">Blad: </span><span className="text-gray-800">{sp.leaf}</span></div>
            <div><span className="font-medium text-gray-600">Bark: </span><span className="text-gray-800">{sp.bark}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MeasurementGuide() {
  return (
    <div className="guide-content space-y-8">
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          1. Diameter i Brösthöjd (DBH)
        </h2>
        <p className="text-gray-700 leading-relaxed mb-3">Mäts 1,3 m ovan mark med klave eller måttband.</p>
        <div className="p-4 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <p className="text-sm text-gray-700"><strong>Formel (måttband):</strong> Diameter = Omkrets / &pi; (3,14159)</p>
          <p className="text-sm text-gray-700 mt-2"><strong>Tips:</strong> Mät vinkelrätt mot stammens lutning. På sluttning, mät från uppförssidan.</p>
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          2. Höjdmätning
        </h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          Använd höjdmätare (Suunto, Vertex) eller tumstock-metoden.
        </p>
        <div className="p-4 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <h4 className="font-bold text-sm mb-2" style={{ color: '#1a3a1a' }}>Tumstock-metoden</h4>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Håll en tumstock/pinne (=arm-längd) lodrätt på armlängds avstånd</li>
            <li>Gå till avstånd där pinnen täcker trädets höjd</li>
            <li>Mät avståndet till trädet — det är ungefär lika med höjden</li>
          </ol>
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          3. Åldersbestämning
        </h2>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
          <li><strong>Tillväxtborr:</strong> Borra i brösthöjd, räkna årsringar. Lägg till 5–15 år beroende på art.</li>
          <li><strong>Kvistvarv (gran):</strong> Räkna kvistvarv och lägg till 3–5 år.</li>
          <li><strong>Stubbålder:</strong> Räkna årsringar på stubbe vid avverkning.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          4. Volymberäkning
        </h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          Enskilt träd: V = f &times; G &times; H, där f = formtal (~0,45 gran, ~0,42 tall),
          G = grundyta, H = höjd.
        </p>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="text-left py-2 px-2 font-medium text-gray-600" style={{ borderBottom: '2px solid #16a34a' }}>DBH (cm)</th>
              <th className="text-left py-2 px-2 font-medium text-gray-600" style={{ borderBottom: '2px solid #16a34a' }}>Höjd (m)</th>
              <th className="text-left py-2 px-2 font-medium text-gray-600" style={{ borderBottom: '2px solid #16a34a' }}>Vol gran (m&sup3;)</th>
              <th className="text-left py-2 px-2 font-medium text-gray-600" style={{ borderBottom: '2px solid #16a34a' }}>Vol tall (m&sup3;)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['20', '18', '0,25', '0,24'],
              ['25', '20', '0,44', '0,41'],
              ['30', '22', '0,70', '0,65'],
              ['35', '24', '1,03', '0,96'],
              ['40', '26', '1,47', '1,37'],
            ].map((row) => (
              <tr key={row[0]} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {row.map((cell, i) => (
                  <td key={i} className="py-2 px-2 text-gray-800">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function RegenerationGuide() {
  return (
    <div className="guide-content space-y-8">
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          1. Markberedningsmetoder
        </h2>
        <div className="space-y-3">
          {[
            { method: 'Harvning', desc: 'Roterande tallrikar skapar fläckar. Vanligast i Sverige. Passar de flesta marker.', best: 'Frisk–fuktig mark, gran & tall.' },
            { method: 'Högläggning', desc: 'Grävmaskin vänder upp jordflak bredvid gropen. Bra dränering.', best: 'Fuktiga, finkorniga marker.' },
            { method: 'Inversmarkberedning', desc: 'Jordklocka vänds upp-och-ner, planta sätts i mineraljord.', best: 'Alla marktyper, minimerar klimatpåverkan.' },
            { method: 'Fläckmarkberedning', desc: 'Grävmaskin frilägger mineraljord i fläckar, 1×1 m.', best: 'Känsliga marker, naturvårdshänsyn.' },
          ].map((m) => (
            <div key={m.method} className="p-4 rounded-lg" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h4 className="font-bold text-sm mb-1" style={{ color: '#1a3a1a' }}>{m.method}</h4>
              <p className="text-sm text-gray-700">{m.desc}</p>
              <p className="text-xs text-gray-500 mt-1"><strong>Bäst för:</strong> {m.best}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          2. Planteringsguide
        </h2>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="text-left py-2 px-2 font-medium text-gray-600" style={{ borderBottom: '2px solid #16a34a' }}>Trädslag</th>
              <th className="text-left py-2 px-2 font-medium text-gray-600" style={{ borderBottom: '2px solid #16a34a' }}>Plantor/ha</th>
              <th className="text-left py-2 px-2 font-medium text-gray-600" style={{ borderBottom: '2px solid #16a34a' }}>Förband</th>
              <th className="text-left py-2 px-2 font-medium text-gray-600" style={{ borderBottom: '2px solid #16a34a' }}>Planteringstid</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Gran', '2 200–2 500', '2,0 × 2,0 m', 'Vår (maj–juni)'],
              ['Tall', '2 000–2 500', '2,0 × 2,2 m', 'Vår eller höst'],
              ['Björk', '1 500–2 000', '2,5 × 2,5 m', 'Vår (april–maj)'],
              ['Lärk', '1 200–1 600', '2,5 × 3,0 m', 'Vår (april–maj)'],
            ].map((row) => (
              <tr key={row[0]} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {row.map((cell, i) => (
                  <td key={i} className="py-2 px-2 text-gray-800">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function EmergencyGuide() {
  return (
    <div className="guide-content space-y-8">
      {[
        {
          title: '1. Stormskador',
          color: '#dc2626',
          steps: [
            'Dokumentera skador med foto och GPS-position',
            'Anmäl till försäkringsbolag inom 6 månader',
            'Prioritera upparbetning av vindfällen (barkborrerisk)',
            'Gran: upparbeta inom 3 veckor maj–aug, annars barkborreangrepp',
            'Kontakta entreprenör — efterfrågan är hög efter storm',
            'Anmäl avverkning till Skogsstyrelsen om &gt;0,5 ha',
          ],
        },
        {
          title: '2. Skogsbrand',
          color: '#f59e0b',
          steps: [
            'Ring 112 omedelbart — din säkerhet först',
            'Evakuera området, stäng av maskiner',
            'Meddela grannar och markägare',
            'Dokumentera brandområde när säkert',
            'Kontakta försäkringsbolag',
            'Planera föryngring — brand kan gynna tallföryngring',
          ],
        },
        {
          title: '3. Barkborreutbrott',
          color: '#ef4444',
          steps: [
            'Identifiera angreppets omfattning (antal träd, volym)',
            'Fäll angripna träd med larver/puppor under barken',
            'Transportera bort virke från skogen (&gt;500 m)',
            'Alternativ: barka virke på plats om transport ej möjlig',
            'Rapportera till Skogsstyrelsen vid &gt;5 m³ angripen ved',
            'Övervaka kringliggande bestånd intensivt i 2 år',
          ],
        },
      ].map((section) => (
        <section key={section.title}>
          <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: `2px solid ${section.color}` }}>
            {section.title}
          </h2>
          <div className="space-y-2">
            {section.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 py-2 px-3 rounded" style={{ background: i % 2 === 0 ? '#f9fafb' : 'transparent' }}>
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: section.color }}>
                  {i + 1}
                </div>
                <span className="text-sm text-gray-800">{step}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function WeatherGuide() {
  return (
    <div className="guide-content space-y-8">
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          1. Molntyper — Vad de varnar om
        </h2>
        <div className="space-y-3">
          {[
            { cloud: 'Cumulonimbus', sv: 'Åskmoln', sign: 'Stort, amboltformat. Varnar för: åska, hagel, kraftig vind. Avbryt fältarbete.' },
            { cloud: 'Nimbostratus', sv: 'Regnmoln', sign: 'Grått, jämnt. Ihållande regn i timmar. Undvik avverkning — halkrsk.' },
            { cloud: 'Cirrus', sv: 'Fjädermoln', sign: 'Tunna slingor på hög höjd. Väderändring inom 24–48 timmar.' },
            { cloud: 'Lenticularis', sv: 'Linsmoln', sign: 'Linformade vid berg. Starka vindar på höjd — risk för vindskador.' },
          ].map((c) => (
            <div key={c.cloud} className="p-3 rounded-lg" style={{ border: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <div className="font-bold text-sm" style={{ color: '#1a3a1a' }}>{c.cloud} <span className="font-normal text-gray-500">({c.sv})</span></div>
              <div className="text-sm text-gray-700 mt-1">{c.sign}</div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          2. Frostindikatorer
        </h2>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
          <li>Klar himmel + svag vind + hög luftfuktighet = hög frostrisk nattetid</li>
          <li>Dagg tidigt på kvällen: temperaturfall pågår</li>
          <li>Köldgropar: sänkor, myrkanter, nordsidor har tidigare frost</li>
          <li>Vårfrost (april–maj) skadar nyplanterade plantor — skydda med hylsor</li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4 pb-2" style={{ color: '#1a3a1a', borderBottom: '2px solid #16a34a' }}>
          3. Vindmönster för skogsbruk
        </h2>
        <div className="p-4 rounded-lg" style={{ background: '#fefce8', border: '1px solid #fef08a' }}>
          <p className="text-sm text-yellow-800 mb-2"><strong>Stormrisk (&gt;25 m/s):</strong></p>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>SW-vindar dominerar stormarna i Sverige</li>
            <li>Högriskperiod: oktober–mars</li>
            <li>Nyligen gallrade bestånd extra utsatta i 3–5 år</li>
            <li>Kanter mot hyggen — vindexponeringens svagaste punkt</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

// ─── Guide content router ───

const GUIDE_COMPONENTS: Record<string, React.FC> = {
  'bark-beetle': BarkBeetleGuide,
  'tree-diseases': TreeDiseasesGuide,
  conifers: ConifersGuide,
  broadleaf: BroadleafGuide,
  measurement: MeasurementGuide,
  regeneration: RegenerationGuide,
  emergency: EmergencyGuide,
  weather: WeatherGuide,
};

// ─── Print styles (injected once) ───

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  .guide-print-area, .guide-print-area * { visibility: visible !important; }
  .guide-print-area {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    padding: 20mm !important;
    background: white !important;
  }
  .guide-print-area .no-print { display: none !important; }
  .guide-print-area h2 { page-break-after: avoid; }
  .guide-print-area section { page-break-inside: avoid; }
  .guide-print-area table { page-break-inside: avoid; }
  @page { size: A4; margin: 15mm; }
}
`;

// ─── Main Page Component ───

export default function FieldGuidesPage() {
  const [activeGuide, setActiveGuide] = useState<ActiveGuide>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const guide = GUIDES.find((g) => g.id === activeGuide);
  const GuideContent = activeGuide ? GUIDE_COMPONENTS[activeGuide] : null;

  // ─── Guide Viewer ───
  if (guide && GuideContent) {
    return (
      <>
        <style>{PRINT_STYLES}</style>
        <div className="flex h-full flex-col overflow-hidden" style={{ background: '#030d05' }}>
          {/* Toolbar */}
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0 no-print"
            style={{ background: '#071a0a', borderBottom: '1px solid #16a34a33' }}
          >
            <button
              onClick={() => setActiveGuide(null)}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: '#4ade80' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#86efac')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#4ade80')}
            >
              <ArrowLeft size={16} />
              Tillbaka till guider
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{guide.pages} sidor</span>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#16a34a', color: 'white' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#15803d')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#16a34a')}
              >
                <Printer size={14} />
                Skriv ut
              </button>
            </div>
          </div>

          {/* Printable content area */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#f5f5f4' }}>
            <div
              ref={printRef}
              className="guide-print-area max-w-3xl mx-auto my-6 rounded-xl shadow-lg"
              style={{ background: 'white', padding: '2.5rem' }}
            >
              {/* BeetleSense header */}
              <div
                className="flex items-center gap-3 pb-4 mb-6"
                style={{ borderBottom: '3px solid #16a34a' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: '#16a34a' }}
                >
                  <Bug size={20} color="white" />
                </div>
                <div>
                  <div className="text-xs font-medium tracking-wider uppercase" style={{ color: '#16a34a' }}>
                    BeetleSense.ai — Fältguide
                  </div>
                  <h1 className="text-2xl font-serif font-bold" style={{ color: '#1a3a1a' }}>
                    {guide.title}
                  </h1>
                </div>
              </div>

              {/* Guide body */}
              <GuideContent />

              {/* Footer */}
              <div
                className="mt-10 pt-4 flex items-center justify-between text-xs text-gray-400"
                style={{ borderTop: '1px solid #e5e7eb' }}
              >
                <span>beetlesense.ai</span>
                <span>Version 1.0 — Mars 2026</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Guide Catalog ───
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto" style={{ background: '#030d05' }}>
        <div className="max-w-4xl mx-auto p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#4ade8015', color: '#4ade80' }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold" style={{ color: '#e2e8f0' }}>
                Fältguider
              </h1>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                Utskrivbara guider for faltarbete i skogen
              </p>
            </div>
          </div>

          <p className="text-sm mt-3 mb-6" style={{ color: '#94a3b8' }}>
            Ladda ner och skriv ut faltguider att ta med i skogen. Anpassade for A4-utskrift
            med tydliga tabeller, checklistor och identifieringshjalp.
          </p>

          {/* Guide grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GUIDES.map((g) => (
              <div
                key={g.id}
                className="rounded-xl p-4 transition-all duration-200"
                style={{
                  background: '#071a0a',
                  border: '1px solid #16a34a22',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#16a34a66';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#16a34a22';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Icon + meta */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${g.color}18`, color: g.color }}
                  >
                    {g.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm leading-tight" style={{ color: '#e2e8f0' }}>
                      {g.title}
                    </h3>
                    <p className="text-xs mt-1 leading-snug" style={{ color: '#94a3b8' }}>
                      {g.subtitle}
                    </p>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs" style={{ color: '#64748b' }}>
                    {g.pages} sidor
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: `${DIFFICULTY_COLORS[g.difficulty]}18`,
                      color: DIFFICULTY_COLORS[g.difficulty],
                    }}
                  >
                    {g.difficulty}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveGuide(g.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: '#16a34a22', color: '#4ade80' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#16a34a33')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#16a34a22')}
                  >
                    <Eye size={13} />
                    Visa
                  </button>
                  <button
                    onClick={() => {
                      setActiveGuide(g.id);
                      setTimeout(() => window.print(), 500);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: '#16a34a22', color: '#4ade80' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#16a34a33')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#16a34a22')}
                  >
                    <Printer size={13} />
                    Skriv ut
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div
            className="mt-8 p-4 rounded-xl text-center"
            style={{ background: '#071a0a', border: '1px solid #16a34a22' }}
          >
            <p className="text-xs" style={{ color: '#64748b' }}>
              Alla guider ar anpassade for A4-utskrift. Anvand webbläsarens utskriftsfunktion
              (Ctrl+P) eller klicka &quot;Skriv ut&quot; pa respektive guide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

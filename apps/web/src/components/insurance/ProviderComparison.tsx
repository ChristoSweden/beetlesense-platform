import {
  ArrowRight,
  Trophy,
  TrendingDown,
} from 'lucide-react';
import type { InsuranceProvider, InsurancePolicy } from '@/hooks/useInsurance';

interface Props {
  providers: InsuranceProvider[];
  currentPolicy: InsurancePolicy;
  potentialSavings: number;
}

export function ProviderComparison({ providers, currentPolicy, potentialSavings }: Props) {
  const currentProviderId = currentPolicy.provider.id;
  const totalHa = currentPolicy.totalHectares;

  // Find cheapest
  const cheapestId = providers.reduce((best, p) =>
    p.premiumPerHaMin < (providers.find((pp) => pp.id === best)?.premiumPerHaMin ?? Infinity) ? p.id : best,
    providers[0].id,
  );

  return (
    <div className="space-y-5">
      {/* Savings banner */}
      {potentialSavings > 0 && (
        <div className="rounded-xl border border-[var(--green)]/20 p-4" style={{ background: 'var(--green)' + '08' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 flex items-center justify-center">
              <TrendingDown size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--green)]">
                Spara upp till {potentialSavings.toLocaleString('sv-SE')} SEK/&aring;r
              </p>
              <p className="text-xs text-[var(--text3)]">
                Baserat p&aring; {totalHa} ha och l&auml;gsta premien bland j&auml;mf&ouml;rda bolag
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparison table — responsive cards on mobile, table on desktop */}
      <div className="hidden lg:block rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
                <th className="text-left p-3 text-[var(--text3)] font-medium">F&ouml;rs&auml;kringsbolag</th>
                <th className="text-left p-3 text-[var(--text3)] font-medium">Premie/ha/&aring;r</th>
                <th className="text-left p-3 text-[var(--text3)] font-medium">Stormskydd</th>
                <th className="text-left p-3 text-[var(--text3)] font-medium">Barkborreskydd</th>
                <th className="text-left p-3 text-[var(--text3)] font-medium">Brand</th>
                <th className="text-left p-3 text-[var(--text3)] font-medium">Max utbetalning</th>
                <th className="text-left p-3 text-[var(--text3)] font-medium">Sj&auml;lvrisk</th>
                <th className="text-left p-3 text-[var(--text3)] font-medium">Extra</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => {
                const isCurrent = p.id === currentProviderId;
                const isCheapest = p.id === cheapestId;
                const annualCost = p.premiumPerHaMin * totalHa;
                const savings = Math.round(currentPolicy.annualPremium - annualCost);

                return (
                  <tr
                    key={p.id}
                    className={`border-b border-[var(--border)] last:border-0 ${
                      isCurrent ? 'bg-[var(--green)]/5' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{p.logo}</span>
                        <div>
                          <p className="font-medium text-[var(--text)]">{p.name}</p>
                          {isCurrent && (
                            <span className="text-[9px] text-[var(--green)] bg-[var(--green)]/10 px-1.5 py-0.5 rounded">
                              Nuvarande
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[var(--text)]">
                          {p.premiumPerHaMin}–{p.premiumPerHaMax} SEK
                        </span>
                        {isCheapest && (
                          <Trophy size={12} className="text-amber-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-[var(--text2)]">{p.stormCoverage}</td>
                    <td className="p-3 text-[var(--text2)]">{p.beetleCoverage}</td>
                    <td className="p-3 text-[var(--text2)]">{p.fireCoverage}</td>
                    <td className="p-3 font-mono text-[var(--text)]">{p.maxPayout}</td>
                    <td className="p-3 font-mono text-[var(--text)]">{p.deductible}</td>
                    <td className="p-3 text-[var(--text2)]">{p.extras}</td>
                    <td className="p-3">
                      {!isCurrent && (
                        <div className="text-right">
                          {savings > 0 && (
                            <p className="text-[10px] text-[var(--green)] mb-1">
                              Spara ~{savings.toLocaleString('sv-SE')} SEK/&aring;r
                            </p>
                          )}
                          <a
                            href={p.contactUrl}
                            className="inline-flex items-center gap-1 text-[10px] text-[var(--green)] hover:underline"
                          >
                            Byt f&ouml;rs&auml;kring <ArrowRight size={10} />
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {providers.map((p) => {
          const isCurrent = p.id === currentProviderId;
          const isCheapest = p.id === cheapestId;
          const annualCost = p.premiumPerHaMin * totalHa;
          const savings = Math.round(currentPolicy.annualPremium - annualCost);

          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 ${
                isCurrent ? 'border-[var(--green)]/30' : 'border-[var(--border)]'
              }`}
              style={{ background: isCurrent ? 'var(--green)' + '08' : 'var(--bg2)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.logo}</span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text)]">{p.name}</p>
                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <span className="text-[9px] text-[var(--green)] bg-[var(--green)]/10 px-1.5 py-0.5 rounded">
                          Nuvarande
                        </span>
                      )}
                      {isCheapest && (
                        <span className="flex items-center gap-0.5 text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          <Trophy size={9} /> L&auml;gst pris
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">
                    {p.premiumPerHaMin}–{p.premiumPerHaMax}
                  </p>
                  <p className="text-[10px] text-[var(--text3)]">SEK/ha/&aring;r</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: 'Storm', value: p.stormCoverage },
                  { label: 'Barkborre', value: p.beetleCoverage },
                  { label: 'Brand', value: p.fireCoverage },
                  { label: 'Max utbetalning', value: p.maxPayout },
                  { label: 'Sj&auml;lvrisk', value: p.deductible },
                  { label: 'Extra', value: p.extras },
                ].map((row) => (
                  <div key={row.label} className="p-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
                    <p className="text-[9px] text-[var(--text3)]" dangerouslySetInnerHTML={{ __html: row.label }} />
                    <p className="text-[10px] text-[var(--text)]">{row.value}</p>
                  </div>
                ))}
              </div>

              {!isCurrent && (
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                  {savings > 0 && (
                    <p className="text-[10px] text-[var(--green)]">
                      Spara ~{savings.toLocaleString('sv-SE')} SEK/&aring;r
                    </p>
                  )}
                  <a
                    href={p.contactUrl}
                    className="flex items-center gap-1 text-xs text-[var(--green)] hover:underline ml-auto"
                  >
                    Byt f&ouml;rs&auml;kring <ArrowRight size={12} />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-blue-500/20 p-4" style={{ background: 'rgba(59,130,246,0.05)' }}>
        <p className="text-xs text-blue-400">
          Priserna &auml;r ungef&auml;rliga och baseras p&aring; genomsnittliga premier f&ouml;r svensk skogsf&ouml;rs&auml;kring.
          Faktiskt pris beror p&aring; skogens beskaffenhet, riskprofil och avtalslängd. Kontakta respektive bolag för exakt offert.
        </p>
      </div>
    </div>
  );
}

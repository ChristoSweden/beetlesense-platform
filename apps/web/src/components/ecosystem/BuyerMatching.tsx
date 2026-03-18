import { useState } from 'react';
import {
  Users,
  Mail,
  Building2,
  Tractor,
  Landmark,
  Waves,
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileText,
} from 'lucide-react';
import type { EcosystemBuyer, BuyerType } from '@/hooks/useEcosystemServices';

const BUYER_TYPE_CONFIG: Record<BuyerType, { label: string; icon: React.ReactNode; color: string }> = {
  kommun: { label: 'Kommun', icon: <Landmark size={14} />, color: '#818cf8' },
  vattenbolag: { label: 'Vattenbolag', icon: <Waves size={14} />, color: '#38bdf8' },
  jordbrukare: { label: 'Jordbrukare', icon: <Tractor size={14} />, color: '#f59e0b' },
  trafikverket: { label: 'Trafikverket', icon: <MapPin size={14} />, color: '#a3a3a3' },
  länsstyrelse: { label: 'Länsstyrelse', icon: <Building2 size={14} />, color: '#a78bfa' },
  turismbolag: { label: 'Turismbolag', icon: <Users size={14} />, color: '#fb923c' },
  energibolag: { label: 'Energibolag', icon: <Building2 size={14} />, color: '#fbbf24' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  matched: { label: 'Matchad', icon: <Users size={12} />, color: '#38bdf8' },
  contacted: { label: 'Kontaktad', icon: <Mail size={12} />, color: '#fbbf24' },
  negotiating: { label: 'Förhandlar', icon: <MessageSquare size={12} />, color: '#fb923c' },
  contracted: { label: 'Avtalad', icon: <FileText size={12} />, color: '#4ade80' },
};

interface BuyerMatchingProps {
  buyers: EcosystemBuyer[];
}

export function BuyerMatching({ buyers }: BuyerMatchingProps) {
  const [expandedBuyer, setExpandedBuyer] = useState<string | null>(null);
  const [sentInquiries, setSentInquiries] = useState<Set<string>>(new Set());

  const handleSendInquiry = (buyerId: string) => {
    setSentInquiries(prev => new Set(prev).add(buyerId));
  };

  // Group buyers by type
  const byType = buyers.reduce<Record<string, EcosystemBuyer[]>>((acc, b) => {
    const key = b.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  const totalPotential = buyers.reduce((s, b) => s + b.potentialContractSEK, 0);

  return (
    <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <Users size={16} className="text-[var(--green)]" />
            Koparmatchning
          </h3>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            Organisationer som betalar for ekosystemtjanster
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold font-mono text-[var(--green)]">
            {totalPotential.toLocaleString('sv-SE')}
          </p>
          <p className="text-[10px] text-[var(--text3)]">SEK potentiellt arsvarde</p>
        </div>
      </div>

      {/* Buyers grouped by type */}
      <div className="space-y-3">
        {Object.entries(byType).map(([type, typeBuyers]) => {
          const config = BUYER_TYPE_CONFIG[type as BuyerType];
          const typeTotal = typeBuyers.reduce((s, b) => s + b.potentialContractSEK, 0);

          return (
            <div key={type}>
              {/* Type header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ background: `${config.color}15`, color: config.color }}
                >
                  {config.icon}
                </div>
                <span className="text-xs font-medium text-[var(--text)]">{config.label}</span>
                <span className="text-[10px] text-[var(--text3)] ml-auto">
                  {typeTotal.toLocaleString('sv-SE')} SEK
                </span>
              </div>

              {/* Individual buyers */}
              <div className="space-y-2 ml-8">
                {typeBuyers.map(buyer => {
                  const isExpanded = expandedBuyer === buyer.id;
                  const status = STATUS_CONFIG[buyer.status];
                  const inquirySent = sentInquiries.has(buyer.id);

                  return (
                    <div
                      key={buyer.id}
                      className="rounded-lg border border-[var(--border)] overflow-hidden"
                      style={{ background: 'var(--bg)' }}
                    >
                      {/* Buyer header */}
                      <button
                        onClick={() => setExpandedBuyer(isExpanded ? null : buyer.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg3)] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[var(--text)]">{buyer.name}</span>
                          <div
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px]"
                            style={{ background: `${status.color}15`, color: status.color }}
                          >
                            {status.icon}
                            <span>{status.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[var(--text2)]">
                            {buyer.potentialContractSEK.toLocaleString('sv-SE')} SEK
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={14} className="text-[var(--text3)]" />
                          ) : (
                            <ChevronDown size={14} className="text-[var(--text3)]" />
                          )}
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-[var(--border)]">
                          <div className="grid grid-cols-2 gap-3 pt-3 mb-3">
                            <div>
                              <p className="text-[10px] text-[var(--text3)]">Avtalstyp</p>
                              <p className="text-xs text-[var(--text)]">
                                {buyer.contractType === 'annual' ? 'Arsavtal' : 'Flerarigt avtal'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-[var(--text3)]">Kontakt</p>
                              <a
                                href={`mailto:${buyer.contactEmail}`}
                                className="text-xs text-[var(--green)] hover:underline flex items-center gap-1"
                              >
                                <Mail size={10} />
                                {buyer.contactEmail}
                              </a>
                            </div>
                            <div>
                              <p className="text-[10px] text-[var(--text3)]">Potentiellt vardet</p>
                              <p className="text-xs font-mono font-semibold text-[var(--green)]">
                                {buyer.potentialContractSEK.toLocaleString('sv-SE')} SEK/ar
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-[var(--text3)]">Status</p>
                              <div className="flex items-center gap-1" style={{ color: status.color }}>
                                {status.icon}
                                <span className="text-xs">{status.label}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            {inquirySent || buyer.status === 'contracted' ? (
                              <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--green)] bg-[var(--green)]/10 border border-[var(--green)]/20">
                                <CheckCircle2 size={14} />
                                {buyer.status === 'contracted' ? 'Avtal signerat' : 'Forfragan skickad'}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSendInquiry(buyer.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--green)] text-[#030d05] hover:bg-[var(--green)]/90 transition-colors"
                              >
                                <Send size={14} />
                                Skicka forfragan
                              </button>
                            )}
                            <a
                              href={`mailto:${buyer.contactEmail}`}
                              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {buyers.length === 0 && (
        <div className="text-center py-8">
          <Clock size={24} className="mx-auto text-[var(--text3)] mb-2" />
          <p className="text-xs text-[var(--text3)]">Inga kopare matchade annu</p>
        </div>
      )}
    </div>
  );
}

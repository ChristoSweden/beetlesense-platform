/**
 * ProvenancePage — EUDR Timber Provenance / Digital Passport hub
 * Route: /owner/provenance
 *
 * Satellite-verified chain of custody from standing tree to end product.
 * Mandatory under EU Deforestation Regulation (EUDR).
 */

import { useState } from 'react';
import {
  Shield,
  QrCode,
  TreePine,
  ArrowLeft,
  FileText,
  Link as LinkIcon,
  FileCheck,
  Fingerprint,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProvenance } from '@/hooks/useProvenance';
import { useBlockchain } from '@/hooks/useBlockchain';
import { BatchList } from '@/components/provenance/BatchList';
import { TimberPassport } from '@/components/provenance/TimberPassport';
import { EUDRCompliance } from '@/components/provenance/EUDRCompliance';
import { BlockchainVerifier } from '@/components/provenance/BlockchainVerifier';
import { SmartContractPanel } from '@/components/provenance/SmartContractPanel';
import { ProvenanceNFT } from '@/components/provenance/ProvenanceNFT';

type TabId = 'batches' | 'compliance' | 'qr' | 'blockchain' | 'contracts' | 'nft';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'batches', label: 'Timmerpartier', icon: <TreePine size={14} /> },
  { id: 'compliance', label: 'EUDR Compliance', icon: <Shield size={14} /> },
  { id: 'blockchain', label: 'Blockchain', icon: <LinkIcon size={14} /> },
  { id: 'contracts', label: 'Smart Contracts', icon: <FileCheck size={14} /> },
  { id: 'nft', label: 'NFT', icon: <Fingerprint size={14} /> },
  { id: 'qr', label: 'QR', icon: <QrCode size={14} /> },
];

export default function ProvenancePage() {
  const {
    batches,
    selectedBatch: _selectedBatch,
    selectBatch: _selectBatch,
    getChecklist,
    getDueDiligence,
    getQRData,
    totalVolume,
    complianceRate,
    statusFilter,
    setStatusFilter,
    speciesFilter,
    setSpeciesFilter,
    isLoading,
  } = useProvenance();

  const blockchain = useBlockchain();
  const [activeTab, setActiveTab] = useState<TabId>('batches');
  const [passportBatchId, setPassportBatchId] = useState<string | null>(null);
  const [blockchainBatchId, setBlockchainBatchId] = useState<string | null>(null);

  const passportBatch = passportBatchId ? batches.find((b) => b.id === passportBatchId) ?? null : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/owner/dashboard"
          className="inline-flex items-center gap-1 text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors mb-3"
        >
          <ArrowLeft size={13} />
          Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-serif font-bold text-[var(--text)] flex items-center gap-2">
              <Shield size={22} className="text-[var(--green)]" />
              Timmer Provenance
            </h1>
            <p className="text-xs text-[var(--text3)] mt-1">
              Digitala timmerpass med satellitverifierad spårbarhetskedja — EUDR-compliant
            </p>
          </div>
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            style={{
              borderColor: complianceRate === 100 ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)',
              background: complianceRate === 100 ? 'rgba(74,222,128,0.05)' : 'rgba(251,191,36,0.05)',
            }}
          >
            <Shield size={14} style={{ color: complianceRate === 100 ? '#4ade80' : '#fbbf24' }} />
            <span
              className="text-sm font-mono font-bold"
              style={{ color: complianceRate === 100 ? '#4ade80' : '#fbbf24' }}
            >
              {complianceRate}%
            </span>
            <span className="text-[10px] text-[var(--text3)]">compliance</span>
          </div>
        </div>
      </div>

      {/* EUDR banner */}
      <div
        className="rounded-xl border border-[var(--green)]/20 p-4 mb-6 flex items-start gap-3"
        style={{ background: 'rgba(74,222,128,0.03)' }}
      >
        <FileText size={18} className="text-[var(--green)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-[var(--text)]">
            EU Deforestation Regulation (EUDR) — obligatoriskt fr.o.m. 2025
          </p>
          <p className="text-[11px] text-[var(--text3)] mt-1">
            Alla virkespartier som placeras på EU-marknaden måste kunna spåras tillbaka till
            ursprungsmark med satellitverifiering. BeetleSense genererar automatiskt digitala
            timmerpass, spårbarhetskedjor och due diligence-utlåtanden för samtliga partier.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[var(--border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.id
                ? 'border-[var(--green)] text-[var(--green)]'
                : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'batches' && (
        <BatchList
          batches={batches}
          totalVolume={totalVolume}
          complianceRate={complianceRate}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          speciesFilter={speciesFilter}
          onSpeciesFilterChange={setSpeciesFilter}
          onSelectBatch={(id) => setPassportBatchId(id)}
        />
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {batches.map((batch) => (
            <div key={batch.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono font-bold text-[var(--green)]">{batch.id}</span>
                <span className="text-xs text-[var(--text3)]">
                  {batch.volume_m3} m³ {batch.species_sv.toLowerCase()} — {batch.parcelName}
                </span>
              </div>
              <EUDRCompliance
                batch={batch}
                checklist={getChecklist(batch)}
                dueDiligence={getDueDiligence(batch)}
              />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'qr' && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--text3)] mb-2">
            QR-koder för samtliga timmerpartier. Skanna med valfri QR-läsare för att verifiera
            ursprung och spårbarhetskedja.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {batches.map((batch) => {
              const _qr = getQRData(batch);
              const sc = {
                standing: { color: '#94a3b8', label: 'Planerad' },
                harvested: { color: '#fbbf24', label: 'Avverkad' },
                in_transport: { color: '#60a5fa', label: 'Transport' },
                at_mill: { color: '#4ade80', label: 'Levererad' },
              }[batch.status];

              return (
                <button
                  key={batch.id}
                  onClick={() => setPassportBatchId(batch.id)}
                  className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--green)]/30 transition-colors text-center group"
                  style={{ background: 'var(--bg)' }}
                >
                  {/* Mini QR SVG */}
                  <div className="mx-auto mb-2 w-[90px] h-[90px] rounded-lg bg-white flex items-center justify-center">
                    <QrCode size={48} className="text-gray-800" />
                  </div>
                  <p className="text-[10px] font-mono font-bold text-[var(--green)] group-hover:text-[var(--text)]">
                    {batch.id}
                  </p>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5">
                    {batch.volume_m3} m³ {batch.species_sv.toLowerCase()}
                  </p>
                  <span
                    className="inline-block text-[9px] mt-1 px-1.5 py-0.5 rounded-full"
                    style={{ color: sc.color, background: `${sc.color}20` }}
                  >
                    {sc.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Blockchain tab — select batch then show verifier */}
      {activeTab === 'blockchain' && (
        <div className="space-y-4">
          {!blockchainBatchId ? (
            <>
              <p className="text-xs text-[var(--text3)] mb-2">
                Välj ett timmerparti för att visa eller skapa blockchain-verifiering.
              </p>
              <div className="grid gap-2">
                {batches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setBlockchainBatchId(b.id); blockchain.reset(); }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--green)]/30 transition-colors text-left"
                    style={{ background: 'var(--bg)' }}
                  >
                    <TreePine size={16} className="text-[var(--green)]" />
                    <div>
                      <span className="text-xs font-mono font-bold text-[var(--green)]">{b.id}</span>
                      <span className="text-xs text-[var(--text3)] ml-2">
                        {b.volume_m3} m³ {b.species_sv.toLowerCase()} — {b.parcelName}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setBlockchainBatchId(null)}
                className="text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Alla partier
              </button>
              <BlockchainVerifier
                batch={batches.find((b) => b.id === blockchainBatchId)!}
                blockchain={blockchain}
              />
            </>
          )}
        </div>
      )}

      {/* Smart Contracts tab */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          {!blockchainBatchId ? (
            <>
              <p className="text-xs text-[var(--text3)] mb-2">
                Välj ett timmerparti för att visa smart contracts.
              </p>
              <div className="grid gap-2">
                {batches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setBlockchainBatchId(b.id); blockchain.reset(); }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--green)]/30 transition-colors text-left"
                    style={{ background: 'var(--bg)' }}
                  >
                    <FileCheck size={16} className="text-[var(--green)]" />
                    <div>
                      <span className="text-xs font-mono font-bold text-[var(--green)]">{b.id}</span>
                      <span className="text-xs text-[var(--text3)] ml-2">
                        {b.volume_m3} m³ {b.species_sv.toLowerCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setBlockchainBatchId(null)}
                className="text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Alla partier
              </button>
              <SmartContractPanel
                batch={batches.find((b) => b.id === blockchainBatchId)!}
                blockchain={blockchain}
              />
            </>
          )}
        </div>
      )}

      {/* NFT tab */}
      {activeTab === 'nft' && (
        <div className="space-y-4">
          {!blockchainBatchId ? (
            <>
              <p className="text-xs text-[var(--text3)] mb-2">
                Välj ett timmerparti för att visa eller skapa Provenance NFT.
              </p>
              <div className="grid gap-2">
                {batches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setBlockchainBatchId(b.id); blockchain.reset(); }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--green)]/30 transition-colors text-left"
                    style={{ background: 'var(--bg)' }}
                  >
                    <Fingerprint size={16} className="text-[var(--green)]" />
                    <div>
                      <span className="text-xs font-mono font-bold text-[var(--green)]">{b.id}</span>
                      <span className="text-xs text-[var(--text3)] ml-2">
                        {b.volume_m3} m³ {b.species_sv.toLowerCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setBlockchainBatchId(null)}
                className="text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Alla partier
              </button>
              <ProvenanceNFT
                batch={batches.find((b) => b.id === blockchainBatchId)!}
                blockchain={blockchain}
              />
            </>
          )}
        </div>
      )}

      {/* Timber Passport modal */}
      {passportBatch && (
        <TimberPassport
          batch={passportBatch}
          qrData={getQRData(passportBatch)}
          onClose={() => setPassportBatchId(null)}
        />
      )}
    </div>
  );
}

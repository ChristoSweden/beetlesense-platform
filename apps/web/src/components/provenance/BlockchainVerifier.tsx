/**
 * BlockchainVerifier — Blockchain verification status and chain event timeline
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  Link,
  Hash,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Clock,
  Blocks,
  Network,
  Coins,
  Fingerprint,
  ArrowRight,
  Lock,
} from 'lucide-react';
import type { TimberBatch } from '@/hooks/useProvenance';
import type { UseBlockchainReturn } from '@/hooks/useBlockchain';

interface BlockchainVerifierProps {
  batch: TimberBatch;
  blockchain: UseBlockchainReturn;
}

function truncateHash(hash: string, startLen = 6, endLen = 4): string {
  if (hash.length <= startLen + endLen + 2) return hash;
  return `${hash.slice(0, startLen)}...${hash.slice(-endLen)}`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  anchored: { label: 'Anchored', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  custody_transfer: { label: 'Custody Transfer', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  verification: { label: 'Verification', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  compliance_update: { label: 'Compliance', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  nft_minted: { label: 'NFT Minted', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
  payment_released: { label: 'Payment', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
};

export function BlockchainVerifier({ batch, blockchain }: BlockchainVerifierProps) {
  const {
    receipt,
    verification,
    history,
    isAnchoring,
    isVerifying,
    isLoadingHistory,
    anchorBatch,
    verifyBatch,
    loadHistory,
  } = blockchain;

  const [showFullHash, setShowFullHash] = useState(false);

  useEffect(() => {
    loadHistory(batch.id);
  }, [batch.id, loadHistory]);

  const handleAnchor = async () => {
    const result = await anchorBatch(batch);
    if (result) {
      await verifyBatch(result.txHash);
      await loadHistory(batch.id);
    }
  };

  const handleVerify = async () => {
    if (receipt) {
      await verifyBatch(receipt.txHash);
    }
  };

  return (
    <div className="space-y-5">
      {/* Network Status Bar */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'rgba(4,28,8,0.8)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Network size={18} className="text-[#4ade80]" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4ade80] animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text)]">Polygon PoS</p>
              <p className="text-[10px] text-[var(--text3)]">Chain ID: 137 &middot; Mainnet</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-[var(--text3)]">Gas Price</p>
              <p className="text-xs font-mono text-[var(--text)]">~30 Gwei</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text3)]">Block</p>
              <p className="text-xs font-mono text-[var(--text)]">#67,234,891</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Status Card */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          borderColor: verification?.verified ? 'rgba(74,222,128,0.3)' : receipt ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.15)',
          background: verification?.verified ? 'rgba(74,222,128,0.03)' : 'rgba(4,28,8,0.8)',
        }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {verification?.verified ? (
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#4ade80]/15 flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-[#4ade80]" />
                  </div>
                  <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-[#4ade80]/40 animate-ping" style={{ animationDuration: '2s' }} />
                </div>
              ) : isAnchoring || isVerifying ? (
                <div className="w-12 h-12 rounded-full bg-[#fbbf24]/15 flex items-center justify-center">
                  <Loader2 size={24} className="text-[#fbbf24] animate-spin" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 flex items-center justify-center">
                  <Shield size={24} className="text-[var(--text3)]" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {verification?.verified
                    ? 'Blockchain Verified'
                    : isAnchoring
                      ? 'Anchoring to Polygon...'
                      : isVerifying
                        ? 'Verifying on-chain...'
                        : receipt
                          ? 'Anchored — Awaiting Verification'
                          : 'Not Anchored'}
                </h3>
                <p className="text-[11px] text-[var(--text3)] mt-0.5">
                  {verification?.verified
                    ? 'Data integrity confirmed on Polygon PoS'
                    : isAnchoring
                      ? 'Creating SHA-256 hash and submitting transaction...'
                      : 'Anchor this provenance record to the blockchain'}
                </p>
              </div>
            </div>
          </div>

          {/* Receipt Details */}
          {receipt && (
            <div className="space-y-3">
              {/* Transaction Hash */}
              <div
                className="rounded-lg border border-[var(--border)] p-3 cursor-pointer hover:border-[var(--green)]/30 transition-colors"
                style={{ background: 'var(--bg)' }}
                onClick={() => setShowFullHash(!showFullHash)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Hash size={12} className="text-[var(--green)]" />
                  <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Transaction Hash</span>
                </div>
                <p className="font-mono text-xs text-[var(--green)] break-all">
                  {showFullHash ? receipt.txHash : truncateHash(receipt.txHash, 10, 8)}
                </p>
              </div>

              {/* Data Hash Visualization */}
              <div
                className="rounded-lg border border-[var(--border)] p-3"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint size={12} className="text-[var(--green)]" />
                  <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">SHA-256 Data Hash</span>
                  {verification?.dataIntegrity && (
                    <span className="inline-flex items-center gap-1 text-[9px] text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded-full ml-auto">
                      <Lock size={8} />
                      Integrity OK
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-[#4ade80] bg-[#4ade80]/5 rounded-md p-2 break-all leading-relaxed tracking-wide">
                  {receipt.dataHash}
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <DetailBox
                  icon={<Blocks size={12} />}
                  label="Block"
                  value={`#${receipt.blockNumber.toLocaleString()}`}
                />
                <DetailBox
                  icon={<Clock size={12} />}
                  label="Timestamp"
                  value={formatTimestamp(receipt.timestamp)}
                />
                <DetailBox
                  icon={<Coins size={12} />}
                  label="Gas Cost"
                  value={receipt.gasCostUsd}
                />
                <DetailBox
                  icon={<CheckCircle2 size={12} />}
                  label="Confirmations"
                  value={String(receipt.confirmations)}
                />
              </div>

              {/* Gas details */}
              <div
                className="rounded-lg border border-[var(--border)] p-3 flex items-center justify-between"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] text-[var(--text3)]">Gas Used</p>
                    <p className="text-xs font-mono text-[var(--text)]">{receipt.gasUsed.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text3)]">Gas Price</p>
                    <p className="text-xs font-mono text-[var(--text)]">{receipt.gasPrice}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text3)]">Cost (MATIC)</p>
                    <p className="text-xs font-mono text-[var(--text)]">{receipt.gasCostMatic}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#4ade80] bg-[#4ade80]/10 px-2 py-1 rounded-full">
                  <Coins size={10} />
                  Ultra-low cost
                </div>
              </div>

              {/* Explorer link */}
              {verification && (
                <a
                  href={verification.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--green)] hover:text-[var(--text)] transition-colors"
                >
                  <ExternalLink size={12} />
                  View on PolygonScan
                </a>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!receipt && (
            <button
              onClick={handleAnchor}
              disabled={isAnchoring}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-[#030d05] bg-[#4ade80] hover:bg-[#22c55e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAnchoring ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Anchoring to Polygon...
                </>
              ) : (
                <>
                  <Link size={16} />
                  Anchor to Blockchain
                </>
              )}
            </button>
          )}

          {receipt && !verification && (
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-[#030d05] bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Verify On-Chain
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Chain Event Timeline */}
      <div
        className="rounded-xl border border-[var(--border)] overflow-hidden"
        style={{ background: 'rgba(4,28,8,0.8)' }}
      >
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Blocks size={14} className="text-[var(--green)]" />
            <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
              On-Chain Event History
            </h4>
          </div>
          <span className="text-[10px] text-[var(--text3)]">
            {history.length} events
          </span>
        </div>

        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-[var(--green)] animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <Blocks size={24} className="text-[var(--text3)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text3)]">No on-chain events yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {history.map((event, i) => {
              const config = EVENT_TYPE_CONFIG[event.eventType] ?? {
                label: event.eventType,
                color: '#94a3b8',
                bg: 'rgba(148,163,184,0.15)',
              };
              return (
                <div key={event.id} className="px-4 py-3 hover:bg-[var(--green)]/[0.02] transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Block indicator */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold"
                        style={{ background: config.bg, color: config.color }}
                      >
                        {i + 1}
                      </div>
                      {i < history.length - 1 && (
                        <div className="w-0.5 h-4 mt-1" style={{ background: config.color, opacity: 0.2 }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ color: config.color, background: config.bg }}
                        >
                          {config.label}
                        </span>
                        <span className="text-[10px] text-[var(--text3)] font-mono">
                          Block #{event.blockNumber.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text)] mt-1">{event.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-[var(--text3)] font-mono">
                          {truncateHash(event.txHash, 8, 6)}
                        </span>
                        <span className="text-[10px] text-[var(--text3)]">
                          {formatTimestamp(event.timestamp)}
                        </span>
                        <span className="text-[10px] text-[var(--text3)]">
                          Gas: {event.gasUsed.toLocaleString()}
                        </span>
                      </div>

                      {/* From -> To */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-mono text-[var(--text3)] bg-[var(--bg)] px-1.5 py-0.5 rounded">
                          {truncateHash(event.from, 6, 4)}
                        </span>
                        <ArrowRight size={10} className="text-[var(--text3)]" />
                        <span className="text-[9px] font-mono text-[var(--text3)] bg-[var(--bg)] px-1.5 py-0.5 rounded">
                          {truncateHash(event.to, 6, 4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="rounded-lg border border-[var(--border)] p-2.5"
      style={{ background: 'var(--bg)' }}
    >
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[var(--green)]">{icon}</span>
        <span className="text-[10px] text-[var(--text3)]">{label}</span>
      </div>
      <p className="text-xs font-mono font-medium text-[var(--text)]">{value}</p>
    </div>
  );
}

/**
 * SmartContractPanel — Active smart contracts for a timber batch
 */

import { useState, useEffect } from 'react';
import {
  FileCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Hash,
  ExternalLink,
  Shield,
  Truck,
  Factory,
  Wallet,
  TreePine,
  AlertTriangle,
} from 'lucide-react';
import type { TimberBatch } from '@/hooks/useProvenance';
import type { UseBlockchainReturn } from '@/hooks/useBlockchain';
import type { ContractCondition, ContractExecution } from '@/services/blockchainService';

interface SmartContractPanelProps {
  batch: TimberBatch;
  blockchain: UseBlockchainReturn;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  deployed: { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', label: 'Active' },
  pending: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', label: 'Pending' },
  executed: { color: '#4ade80', bg: 'rgba(74,222,128,0.15)', label: 'Executed' },
  expired: { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', label: 'Expired' },
};

const EXEC_STATUS: Record<string, { color: string; icon: React.ReactNode }> = {
  success: { color: '#4ade80', icon: <CheckCircle2 size={12} /> },
  pending: { color: '#fbbf24', icon: <Loader2 size={12} className="animate-spin" /> },
  failed: { color: '#f87171', icon: <AlertTriangle size={12} /> },
};

const FLOW_STEPS = [
  { icon: <TreePine size={16} />, label: 'Skog' },
  { icon: <Truck size={16} />, label: 'Transport' },
  { icon: <Factory size={16} />, label: 'Sågverk' },
  { icon: <Wallet size={16} />, label: 'Betalning' },
];

function truncateHash(hash: string, s = 6, e = 4): string {
  if (hash.length <= s + e + 2) return hash;
  return `${hash.slice(0, s)}...${hash.slice(-e)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function SmartContractPanel({ batch, blockchain }: SmartContractPanelProps) {
  const { contracts, isLoadingContracts, loadContracts } = blockchain;
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  useEffect(() => {
    loadContracts(batch.id);
  }, [batch.id, loadContracts]);

  if (isLoadingContracts) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-[var(--green)] animate-spin" />
      </div>
    );
  }

  // Compute flow progress based on first contract's conditions
  const primaryContract = contracts[0];
  const flowProgress = primaryContract
    ? primaryContract.conditions.filter((c) => c.met).length / primaryContract.conditions.length
    : 0;

  return (
    <div className="space-y-5">
      {/* Visual Flow: Forest → Transport → Mill → Payment */}
      <div
        className="rounded-xl border border-[var(--border)] p-5 backdrop-blur-sm"
        style={{ background: 'rgba(4,28,8,0.8)' }}
      >
        <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-4 flex items-center gap-2">
          <ArrowRight size={14} className="text-[var(--green)]" />
          Smart Contract Payment Flow
        </h4>
        <div className="flex items-center justify-between relative">
          {/* Progress bar behind */}
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-[var(--border)]" />
          <div
            className="absolute top-5 left-8 h-0.5 bg-[var(--green)] transition-all duration-1000"
            style={{ width: `${flowProgress * (100 - 12)}%` }}
          />

          {FLOW_STEPS.map((step, i) => {
            const reached = flowProgress >= (i + 1) / FLOW_STEPS.length;
            const active = Math.floor(flowProgress * FLOW_STEPS.length) === i;
            return (
              <div key={step.label} className="flex flex-col items-center z-10 relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    reached
                      ? 'bg-[#4ade80]/20 text-[#4ade80]'
                      : active
                        ? 'bg-[#fbbf24]/20 text-[#fbbf24] animate-pulse'
                        : 'bg-[var(--bg)] text-[var(--text3)] border border-[var(--border)]'
                  }`}
                >
                  {step.icon}
                </div>
                <span
                  className={`text-[10px] mt-1.5 font-medium ${
                    reached ? 'text-[#4ade80]' : active ? 'text-[#fbbf24]' : 'text-[var(--text3)]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contract Cards */}
      {contracts.map((contract) => {
        const isExpanded = expandedContract === contract.address;
        const sc = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.pending;
        const metConditions = contract.conditions.filter((c) => c.met).length;

        return (
          <div
            key={contract.address}
            className="rounded-xl border border-[var(--border)] overflow-hidden transition-all"
            style={{ background: 'rgba(4,28,8,0.8)' }}
          >
            {/* Contract Header */}
            <button
              onClick={() => setExpandedContract(isExpanded ? null : contract.address)}
              className="w-full px-4 py-4 flex items-start justify-between hover:bg-[var(--green)]/[0.02] transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: sc.bg }}
                >
                  <FileCheck size={18} style={{ color: sc.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-[var(--text)]">{contract.name}</h4>
                    <span
                      className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                      style={{ color: sc.color, background: sc.bg }}
                    >
                      {sc.label}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-[var(--text3)] mt-0.5">
                    {truncateHash(contract.address, 8, 6)}
                  </p>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5">
                    Deployed {formatDate(contract.deployedAt)} · {metConditions}/{contract.conditions.length} conditions met
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {contract.totalValue !== '0' && (
                  <p className="text-sm font-mono font-bold text-[var(--green)]">
                    {contract.totalValue} {contract.currency}
                  </p>
                )}
                <p className="text-[10px] text-[var(--text3)]">
                  {isExpanded ? 'Collapse' : 'Expand'}
                </p>
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-[var(--border)]">
                {/* Conditions */}
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <h5 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Shield size={11} className="text-[var(--green)]" />
                    Contract Conditions
                  </h5>
                  <div className="space-y-2">
                    {contract.conditions.map((cond: ContractCondition) => (
                      <div
                        key={cond.id}
                        className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3"
                        style={{ background: 'var(--bg)' }}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {cond.met ? (
                            <CheckCircle2 size={14} className="text-[#4ade80]" />
                          ) : (
                            <Clock size={14} className="text-[#fbbf24]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--text)]">{cond.description}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-mono text-[var(--text3)]">
                              Trigger: {cond.trigger}
                            </span>
                            {cond.metAt && (
                              <span className="text-[9px] text-[var(--text3)]">
                                Met: {formatDate(cond.metAt)}
                              </span>
                            )}
                            {cond.paymentAmount !== '0' && (
                              <span className="text-[9px] font-mono text-[var(--green)]">
                                → {cond.paymentAmount} {cond.currency}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Execution History */}
                <div className="px-4 py-3">
                  <h5 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Hash size={11} className="text-[var(--green)]" />
                    Execution History
                  </h5>
                  <div className="space-y-1.5">
                    {contract.executionHistory.map((exec: ContractExecution) => {
                      const es = EXEC_STATUS[exec.status] ?? EXEC_STATUS.pending;
                      return (
                        <div
                          key={exec.id}
                          className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--green)]/[0.02] transition-colors"
                        >
                          <div className="flex-shrink-0 mt-0.5" style={{ color: es.color }}>
                            {es.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[var(--text)]">{exec.action}</p>
                            <p className="text-[10px] text-[var(--text3)] mt-0.5">{exec.details}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] font-mono text-[var(--text3)]">
                                {truncateHash(exec.txHash, 8, 6)}
                              </span>
                              <span className="text-[9px] text-[var(--text3)]">
                                {formatDate(exec.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explorer Link */}
                <div className="px-4 pb-3">
                  <a
                    href={`https://polygonscan.com/address/${contract.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--green)] hover:text-[var(--text)] transition-colors"
                  >
                    <ExternalLink size={12} />
                    View Contract on PolygonScan
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {contracts.length === 0 && (
        <div className="text-center py-12">
          <FileCheck size={28} className="text-[var(--text3)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text3)]">Inga smart contracts ännu</p>
          <p className="text-[11px] text-[var(--text3)] mt-1">
            Anchor this batch to blockchain first to deploy smart contracts
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * ProvenanceNFT — Digital provenance certificate as NFT
 */

import { useState, useEffect } from 'react';
import {
  Fingerprint,
  ExternalLink,
  Loader2,
  QrCode,
  TreePine,
  MapPin,
  Calendar,
  Package,
  Shield,
  ArrowRight,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import type { TimberBatch } from '@/hooks/useProvenance';
import type { UseBlockchainReturn } from '@/hooks/useBlockchain';

interface ProvenanceNFTProps {
  batch: TimberBatch;
  blockchain: UseBlockchainReturn;
}

function truncateHash(hash: string, s = 6, e = 4): string {
  if (hash.length <= s + e + 2) return hash;
  return `${hash.slice(0, s)}...${hash.slice(-e)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ProvenanceNFT({ batch, blockchain }: ProvenanceNFTProps) {
  const { nftData, isMintingNFT, mintNFT } = blockchain;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!nftData) {
      mintNFT(batch);
    }
  }, [batch, nftData, mintNFT]);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isMintingNFT || !nftData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="text-[var(--green)] animate-spin" />
          <p className="text-xs text-[var(--text3)]">Minting Provenance NFT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* NFT Card */}
      <div
        className="rounded-2xl border border-[var(--green)]/30 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(4,28,8,0.95) 0%, rgba(10,40,15,0.95) 50%, rgba(4,28,8,0.95) 100%)',
        }}
      >
        {/* Card Header — Forest gradient */}
        <div
          className="relative h-32 flex items-end p-4"
          style={{
            background: 'linear-gradient(180deg, rgba(74,222,128,0.15) 0%, rgba(74,222,128,0.03) 100%)',
          }}
        >
          {/* Decorative grid pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(rgba(74,222,128,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.3) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          <div className="relative z-10 flex items-end justify-between w-full">
            <div>
              <p className="text-[9px] font-mono text-[var(--green)] uppercase tracking-widest">BeetleSense Provenance NFT</p>
              <h3 className="text-lg font-serif font-bold text-[var(--text)] mt-0.5">
                {nftData.species} — {nftData.origin}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text3)]">Token ID</p>
              <p className="text-sm font-mono font-bold text-[var(--green)]">#{nftData.tokenId}</p>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-4">
          {/* Attributes grid */}
          <div className="grid grid-cols-2 gap-3">
            <AttributeCard
              icon={<TreePine size={13} />}
              label="Species"
              value={nftData.species}
            />
            <AttributeCard
              icon={<Package size={13} />}
              label="Volume"
              value={`${nftData.volume_m3} m³`}
            />
            <AttributeCard
              icon={<MapPin size={13} />}
              label="Origin"
              value={`${nftData.originCoords.lat.toFixed(4)}°N, ${nftData.originCoords.lng.toFixed(4)}°E`}
            />
            <AttributeCard
              icon={<Calendar size={13} />}
              label="Harvest Date"
              value={formatDate(nftData.harvestDate)}
            />
          </div>

          {/* Certifications */}
          {nftData.certifications.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Shield size={12} className="text-[var(--green)]" />
              {nftData.certifications.map((cert) => (
                <span
                  key={cert}
                  className="text-[9px] font-mono text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full"
                >
                  {cert}
                </span>
              ))}
            </div>
          )}

          {/* QR Code Placeholder */}
          <div className="flex justify-center">
            <div
              className="w-24 h-24 rounded-xl border border-[var(--green)]/20 flex items-center justify-center"
              style={{ background: 'rgba(74,222,128,0.03)' }}
            >
              <QrCode size={48} className="text-[var(--green)]/50" />
            </div>
          </div>
          <p className="text-[10px] text-[var(--text3)] text-center">
            Scan to verify provenance on-chain
          </p>
        </div>
      </div>

      {/* NFT Metadata */}
      <div
        className="rounded-xl border border-[var(--border)] overflow-hidden"
        style={{ background: 'rgba(4,28,8,0.8)' }}
      >
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider flex items-center gap-2">
            <Fingerprint size={14} className="text-[var(--green)]" />
            NFT Metadata
          </h4>
        </div>
        <div className="divide-y divide-[var(--border)]">
          <MetadataRow
            label="Contract Address"
            value={nftData.contractAddress}
            displayValue={truncateHash(nftData.contractAddress, 8, 6)}
            onCopy={() => handleCopy(nftData.contractAddress, 'contract')}
            copied={copiedField === 'contract'}
          />
          <MetadataRow
            label="Token ID"
            value={nftData.tokenId}
            displayValue={`#${nftData.tokenId}`}
            onCopy={() => handleCopy(nftData.tokenId, 'token')}
            copied={copiedField === 'token'}
          />
          <MetadataRow
            label="Owner"
            value={nftData.owner}
            displayValue={truncateHash(nftData.owner, 8, 6)}
            onCopy={() => handleCopy(nftData.owner, 'owner')}
            copied={copiedField === 'owner'}
          />
          <MetadataRow
            label="IPFS Hash"
            value={nftData.ipfsHash}
            displayValue={truncateHash(nftData.ipfsHash, 12, 6)}
            onCopy={() => handleCopy(nftData.ipfsHash, 'ipfs')}
            copied={copiedField === 'ipfs'}
          />
          <MetadataRow
            label="Metadata URI"
            value={nftData.metadataUri}
            displayValue={nftData.metadataUri}
            onCopy={() => handleCopy(nftData.metadataUri, 'uri')}
            copied={copiedField === 'uri'}
          />
          <MetadataRow
            label="Mint Transaction"
            value={nftData.mintTxHash}
            displayValue={truncateHash(nftData.mintTxHash, 10, 8)}
            onCopy={() => handleCopy(nftData.mintTxHash, 'mint')}
            copied={copiedField === 'mint'}
          />
          <MetadataRow
            label="Minted At"
            value={nftData.mintedAt}
            displayValue={formatDate(nftData.mintedAt)}
          />
        </div>
      </div>

      {/* Transfer History */}
      <div
        className="rounded-xl border border-[var(--border)] overflow-hidden"
        style={{ background: 'rgba(4,28,8,0.8)' }}
      >
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider flex items-center gap-2">
            <ArrowRight size={14} className="text-[var(--green)]" />
            Transfer History
          </h4>
          <span className="text-[10px] text-[var(--text3)]">{nftData.transfers.length} transfers</span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {nftData.transfers.map((transfer, i) => {
            const isMint = transfer.from === '0x0000000000000000000000000000000000000000';
            return (
              <div key={i} className="px-4 py-3 hover:bg-[var(--green)]/[0.02] transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${
                      isMint
                        ? 'text-[#a78bfa] bg-[#a78bfa]/15'
                        : 'text-[#60a5fa] bg-[#60a5fa]/15'
                    }`}
                  >
                    {isMint ? 'Mint' : 'Transfer'}
                  </span>
                  <span className="text-[10px] text-[var(--text3)]">{formatDate(transfer.timestamp)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg)] px-1.5 py-0.5 rounded">
                    {isMint ? 'Null Address' : truncateHash(transfer.from, 6, 4)}
                  </span>
                  <ArrowRight size={10} className="text-[var(--text3)]" />
                  <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg)] px-1.5 py-0.5 rounded">
                    {truncateHash(transfer.to, 6, 4)}
                  </span>
                </div>
                <p className="text-[9px] font-mono text-[var(--text3)] mt-1">
                  TX: {truncateHash(transfer.txHash, 8, 6)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mint/View Button */}
      <a
        href={`https://opensea.io/assets/matic/${nftData.contractAddress}/${nftData.tokenId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-[var(--text)] border border-[var(--green)]/30 hover:border-[var(--green)]/60 hover:bg-[var(--green)]/5 transition-all"
      >
        <ExternalLink size={16} className="text-[var(--green)]" />
        View NFT on OpenSea
      </a>
    </div>
  );
}

function AttributeCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="rounded-lg border border-[var(--border)] p-2.5"
      style={{ background: 'var(--bg)' }}
    >
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[var(--green)]">{icon}</span>
        <span className="text-[10px] text-[var(--text3)]">{label}</span>
      </div>
      <p className="text-xs font-medium text-[var(--text)] truncate">{value}</p>
    </div>
  );
}

function MetadataRow({
  label,
  displayValue,
  value: _value,
  onCopy,
  copied,
}: {
  label: string;
  displayValue: string;
  value?: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between hover:bg-[var(--green)]/[0.02] transition-colors">
      <span className="text-[10px] text-[var(--text3)]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-[var(--text)] truncate max-w-[200px]">{displayValue}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="text-[var(--text3)] hover:text-[var(--green)] transition-colors p-0.5"
          >
            {copied ? <CheckCircle2 size={12} className="text-[var(--green)]" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

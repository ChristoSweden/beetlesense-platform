/**
 * useBlockchain — Hook managing blockchain anchoring state for timber provenance
 */

import { useState, useCallback } from 'react';
import type { TimberBatch } from '@/hooks/useProvenance';
import {
  anchorToBlockchain,
  verifyOnChain,
  getTransactionHistory,
  getSmartContracts,
  getNFTData,
  type BlockchainReceipt,
  type VerificationResult,
  type ChainEvent,
  type SmartContract,
  type ProvenanceNFTData,
  type TimberProvenanceRecord,
} from '@/services/blockchainService';

export interface UseBlockchainReturn {
  // State
  receipt: BlockchainReceipt | null;
  verification: VerificationResult | null;
  history: ChainEvent[];
  contracts: SmartContract[];
  nftData: ProvenanceNFTData | null;

  // Loading states
  isAnchoring: boolean;
  isVerifying: boolean;
  isLoadingHistory: boolean;
  isLoadingContracts: boolean;
  isMintingNFT: boolean;

  // Errors
  anchorError: string | null;
  verifyError: string | null;

  // Actions
  anchorBatch: (batch: TimberBatch) => Promise<BlockchainReceipt | null>;
  verifyBatch: (txHash: string) => Promise<VerificationResult | null>;
  loadHistory: (batchId: string) => Promise<void>;
  loadContracts: (batchId: string) => Promise<void>;
  mintNFT: (batch: TimberBatch) => Promise<ProvenanceNFTData | null>;
  reset: () => void;
}

function batchToRecord(batch: TimberBatch): TimberProvenanceRecord {
  const completedSteps = batch.custodyChain.filter((s) => s.status === 'completed' && s.timestamp && s.operator && s.gps);
  return {
    batchId: batch.id,
    species: batch.species,
    volume_m3: batch.volume_m3,
    origin: {
      lat: batch.custodyChain[0]?.gps?.lat ?? 57.19,
      lng: batch.custodyChain[0]?.gps?.lng ?? 14.04,
    },
    parcelName: batch.parcelName,
    harvestDate: batch.createdAt,
    destinationMill: batch.destinationMill,
    fsc_coc: batch.fsc_coc,
    pefc_coc: batch.pefc_coc,
    custodySteps: completedSteps.map((s) => ({
      stepId: s.id,
      timestamp: s.timestamp!,
      operator: s.operator!,
      gps: s.gps!,
    })),
    eudrCompliance: batch.eudrCompliance,
    deforestationFree: batch.satelliteVerification.deforestationFree,
  };
}

export function useBlockchain(): UseBlockchainReturn {
  const [receipt, setReceipt] = useState<BlockchainReceipt | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [history, setHistory] = useState<ChainEvent[]>([]);
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [nftData, setNftData] = useState<ProvenanceNFTData | null>(null);

  const [isAnchoring, setIsAnchoring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [isMintingNFT, setIsMintingNFT] = useState(false);

  const [anchorError, setAnchorError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const anchorBatch = useCallback(async (batch: TimberBatch): Promise<BlockchainReceipt | null> => {
    setIsAnchoring(true);
    setAnchorError(null);
    try {
      const record = batchToRecord(batch);
      const result = await anchorToBlockchain(record);
      setReceipt(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to anchor to blockchain';
      setAnchorError(msg);
      return null;
    } finally {
      setIsAnchoring(false);
    }
  }, []);

  const verifyBatch = useCallback(async (txHash: string): Promise<VerificationResult | null> => {
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const result = await verifyOnChain(txHash);
      setVerification(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setVerifyError(msg);
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const loadHistory = useCallback(async (batchId: string): Promise<void> => {
    setIsLoadingHistory(true);
    try {
      const events = await getTransactionHistory(batchId);
      setHistory(events);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const loadContracts = useCallback(async (batchId: string): Promise<void> => {
    setIsLoadingContracts(true);
    try {
      const result = await getSmartContracts(batchId);
      setContracts(result);
    } finally {
      setIsLoadingContracts(false);
    }
  }, []);

  const mintNFT = useCallback(async (batch: TimberBatch): Promise<ProvenanceNFTData | null> => {
    setIsMintingNFT(true);
    try {
      const coords = batch.custodyChain[0]?.gps ?? { lat: 57.19, lng: 14.04 };
      const certs = [batch.fsc_coc, batch.pefc_coc].filter(Boolean);
      const result = await getNFTData(
        batch.id,
        batch.species,
        batch.volume_m3,
        batch.parcelName,
        coords,
        batch.createdAt,
        certs,
      );
      setNftData(result);
      return result;
    } finally {
      setIsMintingNFT(false);
    }
  }, []);

  const reset = useCallback(() => {
    setReceipt(null);
    setVerification(null);
    setHistory([]);
    setContracts([]);
    setNftData(null);
    setAnchorError(null);
    setVerifyError(null);
  }, []);

  return {
    receipt,
    verification,
    history,
    contracts,
    nftData,
    isAnchoring,
    isVerifying,
    isLoadingHistory,
    isLoadingContracts,
    isMintingNFT,
    anchorError,
    verifyError,
    anchorBatch,
    verifyBatch,
    loadHistory,
    loadContracts,
    mintNFT,
    reset,
  };
}

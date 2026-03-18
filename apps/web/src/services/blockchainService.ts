/**
 * blockchainService.ts — Blockchain anchoring for timber provenance
 *
 * Simulates anchoring provenance records to Polygon PoS.
 * Structured so real web3 libraries (ethers.js / viem) can replace the mock layer.
 */

// ─── Types ───

export interface TimberProvenanceRecord {
  batchId: string;
  species: string;
  volume_m3: number;
  origin: { lat: number; lng: number };
  parcelName: string;
  harvestDate: string;
  destinationMill: string;
  fsc_coc: string;
  pefc_coc: string;
  custodySteps: {
    stepId: string;
    timestamp: string;
    operator: string;
    gps: { lat: number; lng: number };
  }[];
  eudrCompliance: number;
  deforestationFree: boolean;
}

export interface BlockchainReceipt {
  txHash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  network: string;
  chainId: number;
  from: string;
  to: string;
  gasUsed: number;
  gasPrice: string;
  gasCostMatic: string;
  gasCostUsd: string;
  dataHash: string;
  confirmations: number;
  status: 'confirmed' | 'pending' | 'failed';
}

export interface VerificationResult {
  verified: boolean;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  dataHash: string;
  dataIntegrity: boolean;
  network: string;
  explorerUrl: string;
  contractAddress: string;
  anchoredBy: string;
  anchoredAt: string;
}

export interface ChainEvent {
  id: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  eventType: 'anchored' | 'custody_transfer' | 'verification' | 'compliance_update' | 'nft_minted' | 'payment_released';
  description: string;
  from: string;
  to: string;
  dataHash: string;
  gasUsed: number;
  status: 'confirmed' | 'pending';
}

export interface SmartContract {
  address: string;
  name: string;
  status: 'deployed' | 'pending' | 'executed' | 'expired';
  deployedAt: string;
  batchId: string;
  conditions: ContractCondition[];
  executionHistory: ContractExecution[];
  totalValue: string;
  currency: string;
}

export interface ContractCondition {
  id: string;
  description: string;
  trigger: string;
  met: boolean;
  metAt: string | null;
  paymentAmount: string;
  currency: string;
}

export interface ContractExecution {
  id: string;
  action: string;
  timestamp: string;
  txHash: string;
  status: 'success' | 'pending' | 'failed';
  details: string;
}

export interface ProvenanceNFTData {
  tokenId: string;
  contractAddress: string;
  owner: string;
  metadataUri: string;
  ipfsHash: string;
  mintedAt: string;
  mintTxHash: string;
  batchId: string;
  species: string;
  volume_m3: number;
  origin: string;
  originCoords: { lat: number; lng: number };
  harvestDate: string;
  certifications: string[];
  transfers: NFTTransfer[];
}

export interface NFTTransfer {
  from: string;
  to: string;
  timestamp: string;
  txHash: string;
}

// ─── Helpers ───

function randomHex(bytes: number): string {
  const hex = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < bytes * 2; i++) {
    result += hex[Math.floor(Math.random() * 16)];
  }
  return result;
}

function deterministicHex(input: string, bytes: number): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = '0123456789abcdef';
  let result = '0x';
  let seed = Math.abs(hash);
  for (let i = 0; i < bytes * 2; i++) {
    seed = (seed * 16807 + 7) % 2147483647;
    result += hex[seed % 16];
  }
  return result;
}

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(buffer));
  return '0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const POLYGON_CONTRACT_ADDRESS = '0x7a3B46E2C80D4f39d69A8284EB5C3E2f9C2cF1D9';
const POLYGON_CHAIN_ID = 137;
const BEETLESENSE_WALLET = '0x4B1eA3c9D8fE2A5b7C6d3E8f1A2B4c5D6e7F8a9';
const POLYGON_EXPLORER = 'https://polygonscan.com';

// ─── Service ───

export async function anchorToBlockchain(data: TimberProvenanceRecord): Promise<BlockchainReceipt> {
  // Simulate network latency
  await delay(1200 + Math.random() * 800);

  const jsonPayload = JSON.stringify(data);
  const dataHash = await sha256(jsonPayload);
  const txHash = randomHex(32);
  const blockHash = randomHex(32);
  const blockNumber = 67_234_891 + Math.floor(Math.random() * 1000);
  const gasUsed = 47_832 + Math.floor(Math.random() * 12000);
  const gasPriceGwei = 25 + Math.floor(Math.random() * 15);
  const gasCostMatic = ((gasUsed * gasPriceGwei) / 1e9).toFixed(6);
  const gasCostUsd = (parseFloat(gasCostMatic) * 0.52).toFixed(4);

  return {
    txHash,
    blockNumber,
    blockHash,
    timestamp: Date.now(),
    network: 'Polygon PoS',
    chainId: POLYGON_CHAIN_ID,
    from: BEETLESENSE_WALLET,
    to: POLYGON_CONTRACT_ADDRESS,
    gasUsed,
    gasPrice: `${gasPriceGwei} Gwei`,
    gasCostMatic: `${gasCostMatic} MATIC`,
    gasCostUsd: `$${gasCostUsd}`,
    dataHash,
    confirmations: 12,
    status: 'confirmed',
  };
}

export async function verifyOnChain(txHash: string): Promise<VerificationResult> {
  await delay(800 + Math.random() * 600);

  const blockNumber = 67_234_891 + Math.floor(Math.random() * 1000);
  const dataHash = deterministicHex(txHash, 32);

  return {
    verified: true,
    txHash,
    blockNumber,
    timestamp: Date.now() - 86400000 * Math.floor(Math.random() * 7),
    dataHash,
    dataIntegrity: true,
    network: 'Polygon PoS',
    explorerUrl: `${POLYGON_EXPLORER}/tx/${txHash}`,
    contractAddress: POLYGON_CONTRACT_ADDRESS,
    anchoredBy: BEETLESENSE_WALLET,
    anchoredAt: new Date(Date.now() - 86400000 * Math.floor(Math.random() * 7)).toISOString(),
  };
}

export async function getTransactionHistory(batchId: string): Promise<ChainEvent[]> {
  await delay(600 + Math.random() * 400);

  const baseTime = Date.now() - 86400000 * 14;
  const events: ChainEvent[] = [
    {
      id: `evt-${batchId}-001`,
      txHash: deterministicHex(`${batchId}-anchor`, 32),
      blockNumber: 67_230_102,
      timestamp: baseTime,
      eventType: 'anchored',
      description: `Provenance record anchored for batch ${batchId}`,
      from: BEETLESENSE_WALLET,
      to: POLYGON_CONTRACT_ADDRESS,
      dataHash: deterministicHex(`${batchId}-data-0`, 32),
      gasUsed: 48_221,
      status: 'confirmed',
    },
    {
      id: `evt-${batchId}-002`,
      txHash: deterministicHex(`${batchId}-custody1`, 32),
      blockNumber: 67_231_445,
      timestamp: baseTime + 86400000 * 2,
      eventType: 'custody_transfer',
      description: 'Custody transferred: Forest to Harvester (Skogstjanst AB)',
      from: BEETLESENSE_WALLET,
      to: deterministicHex('skogstjanst', 20),
      dataHash: deterministicHex(`${batchId}-data-1`, 32),
      gasUsed: 52_103,
      status: 'confirmed',
    },
    {
      id: `evt-${batchId}-003`,
      txHash: deterministicHex(`${batchId}-custody2`, 32),
      blockNumber: 67_232_018,
      timestamp: baseTime + 86400000 * 4,
      eventType: 'custody_transfer',
      description: 'Custody transferred: Harvester to Transport (Vastra Transport AB)',
      from: deterministicHex('skogstjanst', 20),
      to: deterministicHex('vastra-transport', 20),
      dataHash: deterministicHex(`${batchId}-data-2`, 32),
      gasUsed: 51_887,
      status: 'confirmed',
    },
    {
      id: `evt-${batchId}-004`,
      txHash: deterministicHex(`${batchId}-verify`, 32),
      blockNumber: 67_232_890,
      timestamp: baseTime + 86400000 * 6,
      eventType: 'verification',
      description: 'Satellite verification confirmed: deforestation-free',
      from: BEETLESENSE_WALLET,
      to: POLYGON_CONTRACT_ADDRESS,
      dataHash: deterministicHex(`${batchId}-data-3`, 32),
      gasUsed: 38_441,
      status: 'confirmed',
    },
    {
      id: `evt-${batchId}-005`,
      txHash: deterministicHex(`${batchId}-compliance`, 32),
      blockNumber: 67_233_502,
      timestamp: baseTime + 86400000 * 8,
      eventType: 'compliance_update',
      description: 'EUDR compliance status updated: 100% compliant',
      from: BEETLESENSE_WALLET,
      to: POLYGON_CONTRACT_ADDRESS,
      dataHash: deterministicHex(`${batchId}-data-4`, 32),
      gasUsed: 34_220,
      status: 'confirmed',
    },
    {
      id: `evt-${batchId}-006`,
      txHash: deterministicHex(`${batchId}-custody3`, 32),
      blockNumber: 67_234_112,
      timestamp: baseTime + 86400000 * 10,
      eventType: 'custody_transfer',
      description: 'Custody transferred: Transport to Mill (Vida Alvesta)',
      from: deterministicHex('vastra-transport', 20),
      to: deterministicHex('vida-alvesta', 20),
      dataHash: deterministicHex(`${batchId}-data-5`, 32),
      gasUsed: 53_009,
      status: 'confirmed',
    },
    {
      id: `evt-${batchId}-007`,
      txHash: deterministicHex(`${batchId}-payment`, 32),
      blockNumber: 67_234_556,
      timestamp: baseTime + 86400000 * 11,
      eventType: 'payment_released',
      description: 'Smart contract: payment released to forest owner upon delivery verification',
      from: POLYGON_CONTRACT_ADDRESS,
      to: BEETLESENSE_WALLET,
      dataHash: deterministicHex(`${batchId}-data-6`, 32),
      gasUsed: 62_145,
      status: 'confirmed',
    },
    {
      id: `evt-${batchId}-008`,
      txHash: deterministicHex(`${batchId}-nft`, 32),
      blockNumber: 67_234_891,
      timestamp: baseTime + 86400000 * 12,
      eventType: 'nft_minted',
      description: `Provenance NFT minted for batch ${batchId}`,
      from: POLYGON_CONTRACT_ADDRESS,
      to: BEETLESENSE_WALLET,
      dataHash: deterministicHex(`${batchId}-data-7`, 32),
      gasUsed: 89_334,
      status: 'confirmed',
    },
  ];

  return events;
}

export async function getSmartContracts(batchId: string): Promise<SmartContract[]> {
  await delay(500 + Math.random() * 300);

  return [
    {
      address: deterministicHex(`${batchId}-sc-timber`, 20),
      name: 'TimberCustodyEscrow',
      status: 'executed',
      deployedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      batchId,
      conditions: [
        {
          id: 'cond-1',
          description: 'Harvest completed and verified by satellite imagery',
          trigger: 'SATELLITE_VERIFICATION',
          met: true,
          metAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          paymentAmount: '0',
          currency: 'SEK',
        },
        {
          id: 'cond-2',
          description: 'Chain of custody documentation complete for all handoff points',
          trigger: 'CUSTODY_CHAIN_COMPLETE',
          met: true,
          metAt: new Date(Date.now() - 86400000 * 6).toISOString(),
          paymentAmount: '0',
          currency: 'SEK',
        },
        {
          id: 'cond-3',
          description: 'Timber received and measured at destination mill',
          trigger: 'MILL_RECEPTION_CONFIRMED',
          met: true,
          metAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          paymentAmount: '189,750',
          currency: 'SEK',
        },
        {
          id: 'cond-4',
          description: 'Quality grading completed by VMF (independent measurement)',
          trigger: 'QUALITY_GRADING_VERIFIED',
          met: true,
          metAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          paymentAmount: '12,250',
          currency: 'SEK',
        },
      ],
      executionHistory: [
        {
          id: 'exec-1',
          action: 'Contract deployed',
          timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
          txHash: deterministicHex(`${batchId}-deploy`, 32),
          status: 'success',
          details: 'TimberCustodyEscrow deployed to Polygon PoS',
        },
        {
          id: 'exec-2',
          action: 'Satellite verification registered',
          timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
          txHash: deterministicHex(`${batchId}-sat-verify`, 32),
          status: 'success',
          details: 'Sentinel-2 deforestation-free confirmation anchored',
        },
        {
          id: 'exec-3',
          action: 'Custody chain finalized',
          timestamp: new Date(Date.now() - 86400000 * 6).toISOString(),
          txHash: deterministicHex(`${batchId}-custody-final`, 32),
          status: 'success',
          details: 'All 6 custody handoff points verified and signed',
        },
        {
          id: 'exec-4',
          action: 'Payment released: 189,750 SEK',
          timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
          txHash: deterministicHex(`${batchId}-payment-1`, 32),
          status: 'success',
          details: 'Auto-payment triggered by mill reception confirmation',
        },
        {
          id: 'exec-5',
          action: 'Quality bonus released: 12,250 SEK',
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          txHash: deterministicHex(`${batchId}-payment-2`, 32),
          status: 'success',
          details: 'Klass 1 quality premium released after VMF grading',
        },
      ],
      totalValue: '202,000',
      currency: 'SEK',
    },
    {
      address: deterministicHex(`${batchId}-sc-eudr`, 20),
      name: 'EUDRComplianceOracle',
      status: 'deployed',
      deployedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      batchId,
      conditions: [
        {
          id: 'eudr-1',
          description: 'Geolocation of harvest area verified',
          trigger: 'GEOLOCATION_VERIFIED',
          met: true,
          metAt: new Date(Date.now() - 86400000 * 13).toISOString(),
          paymentAmount: '0',
          currency: 'SEK',
        },
        {
          id: 'eudr-2',
          description: 'No deforestation after Dec 2020 cutoff date',
          trigger: 'DEFORESTATION_CHECK',
          met: true,
          metAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          paymentAmount: '0',
          currency: 'SEK',
        },
        {
          id: 'eudr-3',
          description: 'Due diligence statement generated and signed',
          trigger: 'DDS_SIGNED',
          met: true,
          metAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          paymentAmount: '0',
          currency: 'SEK',
        },
        {
          id: 'eudr-4',
          description: 'Compliance report submitted to EU Information System',
          trigger: 'EU_SUBMISSION',
          met: false,
          metAt: null,
          paymentAmount: '0',
          currency: 'SEK',
        },
      ],
      executionHistory: [
        {
          id: 'eudr-exec-1',
          action: 'Oracle contract deployed',
          timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
          txHash: deterministicHex(`${batchId}-eudr-deploy`, 32),
          status: 'success',
          details: 'EUDRComplianceOracle deployed with batch metadata',
        },
        {
          id: 'eudr-exec-2',
          action: 'Geolocation anchored',
          timestamp: new Date(Date.now() - 86400000 * 13).toISOString(),
          txHash: deterministicHex(`${batchId}-eudr-geo`, 32),
          status: 'success',
          details: 'SWEREF99 TM coordinates + polygon boundary stored on-chain',
        },
        {
          id: 'eudr-exec-3',
          action: 'Satellite proof anchored',
          timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
          txHash: deterministicHex(`${batchId}-eudr-sat`, 32),
          status: 'success',
          details: 'Sentinel-2 before/after imagery hash anchored',
        },
      ],
      totalValue: '0',
      currency: 'SEK',
    },
  ];
}

export async function getNFTData(batchId: string, species: string, volume: number, parcelName: string, coords: { lat: number; lng: number }, harvestDate: string, certifications: string[]): Promise<ProvenanceNFTData> {
  await delay(400 + Math.random() * 300);

  const tokenId = String(10_000 + Math.abs(batchId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 90_000));

  return {
    tokenId,
    contractAddress: '0x9C2eB5a7F3bD4c8E1A6f2D7B8c9E0F1a2B3c4D5',
    owner: BEETLESENSE_WALLET,
    metadataUri: `https://metadata.beetlesense.ai/nft/${tokenId}`,
    ipfsHash: `ipfs://Qm${deterministicHex(batchId + '-ipfs', 22).slice(2)}`,
    mintedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    mintTxHash: deterministicHex(`${batchId}-mint`, 32),
    batchId,
    species,
    volume_m3: volume,
    origin: parcelName,
    originCoords: coords,
    harvestDate,
    certifications,
    transfers: [
      {
        from: '0x0000000000000000000000000000000000000000',
        to: BEETLESENSE_WALLET,
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        txHash: deterministicHex(`${batchId}-mint`, 32),
      },
      {
        from: BEETLESENSE_WALLET,
        to: deterministicHex('vida-alvesta', 20),
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        txHash: deterministicHex(`${batchId}-transfer-1`, 32),
      },
    ],
  };
}

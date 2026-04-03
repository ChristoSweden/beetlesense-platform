/**
 * Companion RAG Service
 *
 * Wraps the RAG knowledge retrieval service with confidence scoring
 * and citation formatting for the AI companion chat interface.
 *
 * Every response includes a mandatory Swedish-language disclaimer
 * as required by the EFI ForestWard Observatory grant.
 */

import {
  queryKnowledgeBase,
  getSourceCount,
  type RankedResult,
  type StoreType,
} from './ragService';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Citation {
  id: number;
  title: string;
  authors: string;
  year: number;
  journal: string;
  excerpt: string;
  sourceType: 'research' | 'regulatory' | 'your_data';
  doi?: string;
  confidence: number;
}

export interface ParcelContext {
  parcelId?: string;
  parcelName?: string;
  species?: string;
  areaHa?: number;
  municipality?: string;
}

export interface CompanionResponse {
  answer: string;
  confidence: number;
  citations: Citation[];
  disclaimer: string;
  sourceCount: { total: number; research: number; regulatory: number; userSpecific: number };
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Mandatory Swedish disclaimer — required by EFI grant terms */
const DISCLAIMER = 'Denna rekommendation kräver verifiering av kvalificerad skoglig rådgivare';

/** Map RAG store types to display types */
function mapStoreType(storeType: StoreType): 'research' | 'regulatory' | 'your_data' {
  switch (storeType) {
    case 'RESEARCH': return 'research';
    case 'REGULATORY': return 'regulatory';
    case 'USER_SPECIFIC': return 'your_data';
  }
}

// ─── Response Generation ──────────────────────────────────────────────────

/**
 * Generate a contextual answer based on RAG results and parcel context.
 */
function generateAnswer(
  question: string,
  results: RankedResult[],
  context?: ParcelContext,
): { answer: string; confidence: number } {
  if (results.length === 0) {
    return {
      answer: 'Jag hittade inga relevanta källor för din fråga i kunskapsbasen. Prova att omformulera frågan eller kontakta Skogsstyrelsen direkt.',
      confidence: 0.2,
    };
  }

  const topResult = results[0];
  const topConfidence = topResult.confidence;

  // Build answer from top results
  const snippets = results.slice(0, 3).map((r, i) => {
    const citRef = `[${i + 1}]`;
    return `${r.source.contentSnippet} ${citRef}`;
  });

  let answer = snippets.join('\n\n');

  // Add parcel context if available
  if (context?.parcelName) {
    answer = `Baserat på analys av skifte "${context.parcelName}"${context.municipality ? ` i ${context.municipality}` : ''}:\n\n${answer}`;
  }

  // Overall confidence: weighted average of top 3 results
  const avgConfidence = results.slice(0, 3).reduce((sum, r) => sum + r.confidence, 0) / Math.min(3, results.length);

  return {
    answer,
    confidence: Math.round(Math.max(topConfidence, avgConfidence) * 100) / 100,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Ask the companion a question with RAG-enhanced responses.
 *
 * @param question — user's question in Swedish or English
 * @param parcelContext — optional parcel context for location-specific answers
 * @returns CompanionResponse with citations and confidence score
 */
export function askCompanion(
  question: string,
  parcelContext?: ParcelContext,
): CompanionResponse {
  // Query knowledge base across all stores
  const results = queryKnowledgeBase(question, { maxResults: 5 });

  // Generate contextual answer
  const { answer, confidence } = generateAnswer(question, results, parcelContext);

  // Format citations
  const citations: Citation[] = results.slice(0, 5).map((r, i) => ({
    id: i + 1,
    title: r.source.title,
    authors: r.source.authors,
    year: r.source.year,
    journal: r.source.journal,
    excerpt: r.source.contentSnippet,
    sourceType: mapStoreType(r.storeOrigin),
    doi: r.source.doi,
    confidence: r.confidence,
  }));

  return {
    answer,
    confidence,
    citations,
    disclaimer: DISCLAIMER,
    sourceCount: getSourceCount(),
  };
}

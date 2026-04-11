/**
 * ParcelWikiPage — full-page LLM wiki browser for a forest parcel.
 *
 * Implements the Karpathy LLM Wiki pattern for BeetleSense:
 * - The AI maintains a structured wiki for each parcel
 * - Pages are compiled from surveys, alerts, and high-confidence companion answers
 * - The wiki compounds over time — each ingest makes it richer
 * - The companion reads the wiki first before running RAG
 *
 * Route: /owner/parcel/:parcelId/wiki
 */

import { useParams } from 'react-router-dom';
import { BookOpen, Info } from 'lucide-react';
import { WikiViewer } from '@/components/wiki/WikiViewer';
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

export default function ParcelWikiPage() {
  const { parcelId } = useParams<{ parcelId: string }>();
  const [parcelName, setParcelName] = useState<string>('');

  useEffect(() => {
    if (!parcelId) return;
    if (isDemo() || !isSupabaseConfigured) {
      setParcelName('Björkskogen');
      return;
    }
    supabase
      .from('parcels')
      .select('name')
      .eq('id', parcelId)
      .single()
      .then(({ data }) => {
        if (data?.name) setParcelName(data.name);
      });
  }, [parcelId]);

  const effectiveParcelId = parcelId ?? (isDemo() ? 'demo' : '');

  if (!effectiveParcelId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--text3)]">No parcel selected.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={18} className="text-[var(--green)]" />
          <h1 className="text-xl font-bold text-[var(--text)]">
            {parcelName ? `${parcelName} — Forest Wiki` : 'Forest Wiki'}
          </h1>
        </div>
        <p className="text-sm text-[var(--text2)] ml-7">
          AI-compiled knowledge base for this parcel. Updated automatically after each survey.
        </p>

        {/* Explainer banner */}
        <div className="mt-3 ml-7 flex items-start gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-800 max-w-2xl">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            <strong>How this works:</strong> Instead of re-deriving answers from raw data on every question,
            BeetleSense AI compiles your surveys, alerts, and high-confidence answers into this persistent wiki.
            Your AI companion reads the wiki first — so it already knows your forest's history before you ask.
            Based on <a href="https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Karpathy's LLM Wiki pattern</a>.
          </span>
        </div>
      </div>

      {/* Wiki viewer */}
      <WikiViewer parcelId={effectiveParcelId} parcelName={parcelName} />
    </div>
  );
}

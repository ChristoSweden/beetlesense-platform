import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  Save,
  FileDown,
  Loader2,
  ChevronDown,
  Trees,
  Bug,
  BarChart3,
  AlertTriangle,
  Bold,
  Italic,
  List,
  Check,
} from 'lucide-react';

// ─── Types ───

interface Client {
  id: string;
  owner_name: string;
}

interface Parcel {
  id: string;
  name: string;
}

interface Survey {
  id: string;
  title: string;
  completed_at: string;
  analysis_results: AnalysisResults | null;
}

interface AnalysisResults {
  tree_count?: number;
  species_breakdown?: Record<string, number>;
  beetle_risk_level?: string;
  ndvi_mean?: number;
  ndvi_trend?: string;
  timber_volume_m3?: number;
  damage_areas?: { type: string; area_ha: number; severity: string }[];
}

interface ReportSection {
  id: string;
  title: string;
  icon: typeof Trees;
  content: string;
}

// ─── Component ───

export function ValuationReportBuilder() {
  const { profile } = useAuthStore();

  // Selection state
  const [clients, setClients] = useState<Client[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedParcel, setSelectedParcel] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [_survey, setSurvey] = useState<Survey | null>(null);

  // Report state
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Auto-save timer
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load clients
  useEffect(() => {
    if (!profile) return;
    supabase
      .from('inspector_clients')
      .select('id, owner_name')
      .eq('inspector_id', profile.id)
      .then(({ data }) => {
        if (data) setClients(data as Client[]);
      });
  }, [profile]);

  // Load parcels when client selected
  useEffect(() => {
    if (!selectedClient) {
      setParcels([]);
      return;
    }
    supabase
      .from('parcels')
      .select('id, name')
      .eq('owner_id', selectedClient)
      .then(({ data }) => {
        if (data) setParcels(data as Parcel[]);
      });
  }, [selectedClient]);

  // Load surveys when parcel selected
  useEffect(() => {
    if (!selectedParcel) {
      setSurveys([]);
      return;
    }
    supabase
      .from('surveys')
      .select('id, title, completed_at, analysis_results')
      .eq('parcel_id', selectedParcel)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSurveys(data as Survey[]);
      });
  }, [selectedParcel]);

  // Build sections when survey selected
  useEffect(() => {
    if (!selectedSurvey) {
      setSurvey(null);
      setSections([]);
      return;
    }
    const s = surveys.find((sv) => sv.id === selectedSurvey) ?? null;
    setSurvey(s);

    if (s) {
      const ar = s.analysis_results ?? {};
      setSections(buildSectionsFromAnalysis(ar));
    }
  }, [selectedSurvey, surveys]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (sections.length === 0 || !draftId) return;

    autoSaveRef.current = setInterval(() => {
      saveDraft();
    }, 30000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [sections, draftId]);

  const saveDraft = useCallback(async () => {
    if (!profile || sections.length === 0) return;
    setSaving(true);

    const payload = {
      inspector_id: profile.id,
      client_id: selectedClient,
      parcel_id: selectedParcel,
      survey_id: selectedSurvey,
      sections: sections.map((s) => ({ id: s.id, title: s.title, content: s.content })),
      status: 'draft',
      updated_at: new Date().toISOString(),
    };

    if (draftId) {
      await supabase.from('valuation_reports').update(payload).eq('id', draftId);
    } else {
      const { data } = await supabase
        .from('valuation_reports')
        .insert(payload)
        .select('id')
        .single();
      if (data) setDraftId(data.id);
    }

    setLastSaved(new Date());
    setSaving(false);
  }, [profile, sections, selectedClient, selectedParcel, selectedSurvey, draftId]);

  const handleGeneratePDF = async () => {
    await saveDraft();
    setGenerating(true);

    try {
      const { error } = await supabase.functions.invoke('generate-report-pdf', {
        body: { report_id: draftId, type: 'valuation' },
      });
      if (error) throw error;
      // Report generation is async; the user will be notified when done
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const updateSectionContent = (sectionId: string, content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, content } : s)),
    );
  };

  const isReady = selectedClient && selectedParcel && selectedSurvey;

  return (
    <div className="space-y-5">
      {/* ─── Selection Row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
            Client
          </span>
          <select
            value={selectedClient}
            onChange={(e) => {
              setSelectedClient(e.target.value);
              setSelectedParcel('');
              setSelectedSurvey('');
            }}
            className="input-field text-xs"
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.owner_name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
            Parcel
          </span>
          <select
            value={selectedParcel}
            onChange={(e) => {
              setSelectedParcel(e.target.value);
              setSelectedSurvey('');
            }}
            disabled={!selectedClient}
            className="input-field text-xs disabled:opacity-40"
          >
            <option value="">Select parcel...</option>
            {parcels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
            Survey
          </span>
          <select
            value={selectedSurvey}
            onChange={(e) => setSelectedSurvey(e.target.value)}
            disabled={!selectedParcel}
            className="input-field text-xs disabled:opacity-40"
          >
            <option value="">Select survey...</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({new Date(s.completed_at).toLocaleDateString('sv-SE')})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ─── Report Sections ─── */}
      {isReady && sections.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-serif font-bold text-[var(--text)]">Report Sections</h3>
              {lastSaved && (
                <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
                  <Check size={10} className="text-[var(--green)]" />
                  Saved {lastSaved.toLocaleTimeString('sv-SE')}
                </span>
              )}
              {saving && (
                <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  Saving...
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveDraft}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
              >
                <Save size={12} />
                Save Draft
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={generating}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <FileDown size={12} />
                )}
                {generating ? 'Generating...' : 'Generate PDF'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <ReportSectionEditor
                key={section.id}
                section={section}
                onChange={(content) => updateSectionContent(section.id, content)}
              />
            ))}
          </div>
        </>
      )}

      {isReady && sections.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
          <FileText size={24} className="mx-auto text-[var(--text3)] mb-2" />
          <p className="text-sm text-[var(--text2)]">
            No analysis data available for this survey yet.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Section Editor ───

function ReportSectionEditor({
  section,
  onChange,
}: {
  section: ReportSection;
  onChange: (content: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const Icon = section.icon;

  const execCommand = (cmd: string) => {
    document.execCommand(cmd, false);
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg3)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[var(--green)]" />
          <span className="text-xs font-semibold text-[var(--text)]">{section.title}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-[var(--text3)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)]">
          {/* Mini Toolbar */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--bg3)]">
            <button
              onClick={() => execCommand('bold')}
              className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
              title="Bold"
            >
              <Bold size={12} />
            </button>
            <button
              onClick={() => execCommand('italic')}
              className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
              title="Italic"
            >
              <Italic size={12} />
            </button>
            <button
              onClick={() => execCommand('insertUnorderedList')}
              className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
              title="Bullet List"
            >
              <List size={12} />
            </button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: section.content }}
            className="p-4 min-h-[120px] text-xs text-[var(--text)] leading-relaxed outline-none prose prose-invert prose-xs max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_b]:text-[var(--green2)] [&_strong]:text-[var(--green2)]"
          />
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───

function buildSectionsFromAnalysis(ar: AnalysisResults): ReportSection[] {
  const sections: ReportSection[] = [];

  // Forest Inventory
  const speciesHtml = ar.species_breakdown
    ? Object.entries(ar.species_breakdown)
        .map(([species, pct]) => `<li>${species}: <strong>${pct}%</strong></li>`)
        .join('')
    : '<li>No species data available</li>';

  sections.push({
    id: 'inventory',
    title: 'Forest Inventory Summary',
    icon: Trees,
    content: `
      <p><strong>Total Tree Count:</strong> ${ar.tree_count?.toLocaleString('sv-SE') ?? 'N/A'}</p>
      <p><strong>Species Breakdown:</strong></p>
      <ul>${speciesHtml}</ul>
    `.trim(),
  });

  // Health Assessment
  sections.push({
    id: 'health',
    title: 'Health Assessment',
    icon: Bug,
    content: `
      <p><strong>Bark Beetle Risk Level:</strong> ${ar.beetle_risk_level ?? 'N/A'}</p>
      <p><strong>Mean NDVI:</strong> ${ar.ndvi_mean?.toFixed(2) ?? 'N/A'}</p>
      <p><strong>NDVI Trend:</strong> ${ar.ndvi_trend ?? 'N/A'}</p>
    `.trim(),
  });

  // Timber Volume
  sections.push({
    id: 'timber',
    title: 'Timber Volume Estimates',
    icon: BarChart3,
    content: `
      <p><strong>Estimated Timber Volume:</strong> ${ar.timber_volume_m3?.toLocaleString('sv-SE') ?? 'N/A'} m&sup3;</p>
      <p>This estimate is based on drone-measured canopy height models and species classification from multispectral analysis.</p>
    `.trim(),
  });

  // Damage Assessment
  const damageHtml = ar.damage_areas?.length
    ? ar.damage_areas
        .map(
          (d) =>
            `<li><strong>${d.type}</strong>: ${d.area_ha} ha (severity: ${d.severity})</li>`,
        )
        .join('')
    : '<li>No significant damage detected</li>';

  sections.push({
    id: 'damage',
    title: 'Damage Assessment',
    icon: AlertTriangle,
    content: `
      <p><strong>Detected Damage Areas:</strong></p>
      <ul>${damageHtml}</ul>
    `.trim(),
  });

  return sections;
}

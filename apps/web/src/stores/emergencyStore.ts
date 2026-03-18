import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

// ─── Types ───

export type IssueType =
  | 'beetle_damage'
  | 'storm_damage'
  | 'wild_boar'
  | 'fire_smoke'
  | 'fungus_disease'
  | 'unknown';

export type Severity = 'mild' | 'moderate' | 'severe';

export type EmergencyStep = 'select_issue' | 'take_photo' | 'ai_diagnosis' | 'action_plan';

export type ReportStatus = 'open' | 'inspector_contacted' | 'resolved';

export interface EmergencyPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  gps: { latitude: number; longitude: number; accuracy: number } | null;
}

export interface EmergencyDiagnosis {
  title: string;
  titleSv: string;
  scientificName: string;
  description: string;
  descriptionSv: string;
  confidence: number;
  severity: Severity;
}

export interface EmergencyAction {
  id: string;
  priority: 'immediate' | 'within_7_days' | 'within_30_days';
  text: string;
  textSv: string;
  completed: boolean;
}

export interface EmergencyReport {
  id: string;
  issueType: IssueType;
  photos: EmergencyPhoto[];
  diagnosis: EmergencyDiagnosis | null;
  actions: EmergencyAction[];
  status: ReportStatus;
  createdAt: number;
  updatedAt: number;
  gps: { latitude: number; longitude: number } | null;
  savedToSupabase: boolean;
}

// ─── AI Diagnosis Mock ───
// In production this would call the companion-chat edge function with the photo

const DIAGNOSIS_MAP: Record<IssueType, { diagnosis: EmergencyDiagnosis; actions: EmergencyAction[] }> = {
  beetle_damage: {
    diagnosis: {
      title: 'Bark Beetle Exit Holes — likely Ips typographus',
      titleSv: 'Barkborrens utgangshål — troligen Ips typographus',
      scientificName: 'Ips typographus',
      description: 'The photo shows characteristic exit holes and frass patterns consistent with European spruce bark beetle (Ips typographus). The gallery patterns beneath the bark indicate an active infestation that has likely been present for 2–4 weeks.',
      descriptionSv: 'Bilden visar karaktäristiska utgångshål och borrmjölsmönster som överensstämmer med granbarkborre (Ips typographus). Gångmönstren under barken indikerar ett aktivt angrepp som troligen pågått i 2–4 veckor.',
      confidence: 0.87,
      severity: 'severe',
    },
    actions: [
      {
        id: 'a1',
        priority: 'immediate',
        text: 'Mark affected trees. Do not leave infested wood in the forest.',
        textSv: 'Markera angripna träd. Lämna inte angripet virke i skogen.',
        completed: false,
      },
      {
        id: 'a2',
        priority: 'within_7_days',
        text: 'Contact a certified inspector for professional assessment.',
        textSv: 'Kontakta en certifierad inspektör för professionell bedömning.',
        completed: false,
      },
      {
        id: 'a3',
        priority: 'within_7_days',
        text: 'Remove and debark infested trees to prevent spread.',
        textSv: 'Avverka och barka angripna träd för att förhindra spridning.',
        completed: false,
      },
      {
        id: 'a4',
        priority: 'within_30_days',
        text: 'File a damage report with Skogsstyrelsen.',
        textSv: 'Lämna en skadeanmälan till Skogsstyrelsen.',
        completed: false,
      },
    ],
  },
  storm_damage: {
    diagnosis: {
      title: 'Storm Damage — Windthrown Trees',
      titleSv: 'Stormskada — Vindfällda träd',
      scientificName: '',
      description: 'The image shows characteristic storm damage with uprooted and snapped trees. Windthrown spruce are high-priority targets for bark beetle colonization — removal within 3 weeks is critical during swarming season.',
      descriptionSv: 'Bilden visar karaktäristisk stormskada med uppryckta och avbrutna träd. Vindfälld gran är högrisk för barkborreangrepp — bortforsling inom 3 veckor är kritiskt under svärmningssäsongen.',
      confidence: 0.92,
      severity: 'moderate',
    },
    actions: [
      {
        id: 'a1',
        priority: 'immediate',
        text: 'Stay clear of damaged area — risk of further tree falls.',
        textSv: 'Undvik skadat område — risk för ytterligare trädfall.',
        completed: false,
      },
      {
        id: 'a2',
        priority: 'within_7_days',
        text: 'Arrange salvage harvesting of windthrown timber.',
        textSv: 'Ordna upparbetning av stormfällt virke.',
        completed: false,
      },
      {
        id: 'a3',
        priority: 'within_7_days',
        text: 'Contact your insurance company for damage assessment.',
        textSv: 'Kontakta ditt försäkringsbolag för skadebedömning.',
        completed: false,
      },
      {
        id: 'a4',
        priority: 'within_30_days',
        text: 'Monitor remaining trees for bark beetle secondary attacks.',
        textSv: 'Övervaka kvarvarande träd för sekundära barkborreangrepp.',
        completed: false,
      },
    ],
  },
  wild_boar: {
    diagnosis: {
      title: 'Wild Boar Damage — Ground Rooting',
      titleSv: 'Vildsvinsskada — Bökskada',
      scientificName: 'Sus scrofa',
      description: 'The disturbed ground patterns are consistent with wild boar rooting. This can damage young seedlings, expose roots, and disrupt regeneration areas.',
      descriptionSv: 'De störda markmönstren överensstämmer med vildsvins bökande. Detta kan skada unga plantor, blotta rötter och störa föryngringsytor.',
      confidence: 0.84,
      severity: 'mild',
    },
    actions: [
      {
        id: 'a1',
        priority: 'immediate',
        text: 'Document the extent of damage with photos and GPS coordinates.',
        textSv: 'Dokumentera skadans omfattning med foton och GPS-koordinater.',
        completed: false,
      },
      {
        id: 'a2',
        priority: 'within_7_days',
        text: 'Contact local hunting team about increased wild boar activity.',
        textSv: 'Kontakta lokalt jaktlag om ökad vildsvinaktivitet.',
        completed: false,
      },
      {
        id: 'a3',
        priority: 'within_30_days',
        text: 'Consider protective fencing for regeneration areas.',
        textSv: 'Överväg stängsling av föryngringsytor.',
        completed: false,
      },
    ],
  },
  fire_smoke: {
    diagnosis: {
      title: 'Fire / Smoke Detected',
      titleSv: 'Eld / Rök Upptäckt',
      scientificName: '',
      description: 'If you see active fire or smoke in the forest, call emergency services immediately. Do not attempt to extinguish large fires yourself.',
      descriptionSv: 'Om du ser aktiv eld eller rök i skogen, ring räddningstjänsten omedelbart. Försök inte släcka stora bränder själv.',
      confidence: 0.95,
      severity: 'severe',
    },
    actions: [
      {
        id: 'a1',
        priority: 'immediate',
        text: 'CALL 112 immediately if fire is active. Move to safety.',
        textSv: 'RING 112 omedelbart om elden är aktiv. Ta dig till säkerhet.',
        completed: false,
      },
      {
        id: 'a2',
        priority: 'immediate',
        text: 'Note wind direction and ensure you have an escape route.',
        textSv: 'Notera vindriktning och säkerställ att du har en flyktväg.',
        completed: false,
      },
      {
        id: 'a3',
        priority: 'within_7_days',
        text: 'Contact insurance company and document damage after fire is extinguished.',
        textSv: 'Kontakta försäkringsbolag och dokumentera skador efter att elden är släckt.',
        completed: false,
      },
    ],
  },
  fungus_disease: {
    diagnosis: {
      title: 'Fungal Infection — Possible Root Rot (Heterobasidion)',
      titleSv: 'Svampinfektion — Möjlig Rotröta (Heterobasidion)',
      scientificName: 'Heterobasidion annosum',
      description: 'The symptoms suggest a fungal infection, potentially Heterobasidion root rot. This is one of the most economically damaging diseases in Nordic conifer forests, causing decay of roots and lower trunk.',
      descriptionSv: 'Symptomen tyder på en svampinfektion, möjligen Heterobasidion rotröta. Detta är en av de mest ekonomiskt skadliga sjukdomarna i nordiska barrskogarna, som orsakar röta i rötter och nedre stammen.',
      confidence: 0.72,
      severity: 'moderate',
    },
    actions: [
      {
        id: 'a1',
        priority: 'immediate',
        text: 'Do not harvest during warm periods — spores spread on fresh stumps.',
        textSv: 'Avverka inte under varma perioder — sporer sprids på färska stubbar.',
        completed: false,
      },
      {
        id: 'a2',
        priority: 'within_7_days',
        text: 'Request a professional inspection to confirm diagnosis.',
        textSv: 'Begär en professionell inspektion för att bekräfta diagnosen.',
        completed: false,
      },
      {
        id: 'a3',
        priority: 'within_30_days',
        text: 'Consider stump treatment with Rotstop when harvesting.',
        textSv: 'Överväg stubbbehandling med Rotstop vid avverkning.',
        completed: false,
      },
    ],
  },
  unknown: {
    diagnosis: {
      title: 'Unidentified Forest Damage',
      titleSv: 'Oidentifierad Skogsskada',
      scientificName: '',
      description: 'The AI could not make a confident identification from the available information. A professional inspector can provide a definitive assessment.',
      descriptionSv: 'AI:n kunde inte göra en säker identifiering utifrån tillgänglig information. En professionell inspektör kan ge en definitiv bedömning.',
      confidence: 0.35,
      severity: 'moderate',
    },
    actions: [
      {
        id: 'a1',
        priority: 'immediate',
        text: 'Take additional photos from multiple angles and distances.',
        textSv: 'Ta ytterligare foton från flera vinklar och avstånd.',
        completed: false,
      },
      {
        id: 'a2',
        priority: 'within_7_days',
        text: 'Contact a certified inspector for professional assessment.',
        textSv: 'Kontakta en certifierad inspektör för professionell bedömning.',
        completed: false,
      },
      {
        id: 'a3',
        priority: 'within_30_days',
        text: 'Monitor the area for changes and document progression.',
        textSv: 'Övervaka området för förändringar och dokumentera utvecklingen.',
        completed: false,
      },
    ],
  },
};

function generateId(): string {
  return `em_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Store ───

interface EmergencyState {
  // Flow state
  isOpen: boolean;
  currentStep: EmergencyStep;
  selectedIssue: IssueType | null;
  photos: EmergencyPhoto[];
  diagnosis: EmergencyDiagnosis | null;
  actions: EmergencyAction[];
  isAnalyzing: boolean;

  // Saved reports
  reports: EmergencyReport[];

  // Actions
  openEmergency: () => void;
  closeEmergency: () => void;
  selectIssue: (issue: IssueType) => void;
  addPhoto: (photo: EmergencyPhoto) => void;
  removePhoto: (id: string) => void;
  goToStep: (step: EmergencyStep) => void;
  runDiagnosis: () => Promise<void>;
  toggleAction: (actionId: string) => void;
  saveReport: () => Promise<EmergencyReport>;
  updateReportStatus: (reportId: string, status: ReportStatus) => void;
  deleteReport: (reportId: string) => void;
  resetFlow: () => void;
}

export const useEmergencyStore = create<EmergencyState>()(
  persist(
    (set, get) => ({
      // ── Flow state ──
      isOpen: false,
      currentStep: 'select_issue',
      selectedIssue: null,
      photos: [],
      diagnosis: null,
      actions: [],
      isAnalyzing: false,

      // ── Saved reports ──
      reports: [],

      // ── Actions ──
      openEmergency: () =>
        set({
          isOpen: true,
          currentStep: 'select_issue',
          selectedIssue: null,
          photos: [],
          diagnosis: null,
          actions: [],
          isAnalyzing: false,
        }),

      closeEmergency: () => set({ isOpen: false }),

      selectIssue: (issue) =>
        set({ selectedIssue: issue, currentStep: 'take_photo' }),

      addPhoto: (photo) =>
        set((state) => ({ photos: [...state.photos, photo] })),

      removePhoto: (id) =>
        set((state) => ({
          photos: state.photos.filter((p) => p.id !== id),
        })),

      goToStep: (step) => set({ currentStep: step }),

      runDiagnosis: async () => {
        const { selectedIssue } = get();
        if (!selectedIssue) return;

        set({ isAnalyzing: true, currentStep: 'ai_diagnosis' });

        // Simulate AI analysis delay (in production, calls edge function)
        await new Promise((resolve) => setTimeout(resolve, 2500));

        const mapping = DIAGNOSIS_MAP[selectedIssue];
        set({
          diagnosis: mapping.diagnosis,
          actions: mapping.actions,
          isAnalyzing: false,
        });
      },

      toggleAction: (actionId) =>
        set((state) => ({
          actions: state.actions.map((a) =>
            a.id === actionId ? { ...a, completed: !a.completed } : a,
          ),
        })),

      saveReport: async () => {
        const { selectedIssue, photos, diagnosis, actions } = get();
        const gps = photos[0]?.gps ?? null;

        const report: EmergencyReport = {
          id: generateId(),
          issueType: selectedIssue!,
          photos,
          diagnosis,
          actions,
          status: 'open',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          gps,
          savedToSupabase: false,
        };

        // Save to local state immediately
        set((state) => ({
          reports: [report, ...state.reports],
          isOpen: false,
          currentStep: 'select_issue',
          selectedIssue: null,
          photos: [],
          diagnosis: null,
          actions: [],
        }));

        // Attempt to save to Supabase in background
        try {
          const { error } = await supabase.from('emergency_reports').insert({
            id: report.id,
            issue_type: report.issueType,
            diagnosis_title: report.diagnosis?.title,
            diagnosis_scientific_name: report.diagnosis?.scientificName,
            severity: report.diagnosis?.severity,
            confidence: report.diagnosis?.confidence,
            status: report.status,
            gps_latitude: report.gps?.latitude,
            gps_longitude: report.gps?.longitude,
            photo_count: report.photos.length,
            actions: report.actions,
            created_at: new Date(report.createdAt).toISOString(),
          });

          if (!error) {
            set((state) => ({
              reports: state.reports.map((r) =>
                r.id === report.id ? { ...r, savedToSupabase: true } : r,
              ),
            }));
          }
        } catch {
          // Offline — will sync later
        }

        return report;
      },

      updateReportStatus: (reportId, status) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === reportId ? { ...r, status, updatedAt: Date.now() } : r,
          ),
        })),

      deleteReport: (reportId) =>
        set((state) => ({
          reports: state.reports.filter((r) => r.id !== reportId),
        })),

      resetFlow: () =>
        set({
          isOpen: false,
          currentStep: 'select_issue',
          selectedIssue: null,
          photos: [],
          diagnosis: null,
          actions: [],
          isAnalyzing: false,
        }),
    }),
    {
      name: 'beetlesense-emergency',
      partialize: (state) => ({
        reports: state.reports,
      }),
    },
  ),
);

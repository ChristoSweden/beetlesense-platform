import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Mic,
  Square,
  MapPin,
  Camera,
  Mountain,
  Droplets,
  Bird,
  Landmark,
  Wrench,
  AlertTriangle,
  Heart,
} from 'lucide-react';
import { KnowledgeTemplates } from './KnowledgeTemplates';
import {
  CATEGORY_CONFIG,
  IMPORTANCE_CONFIG,
  SEASON_CONFIG,
  type KnowledgeCategory,
  type Importance,
  type Season,
  type KnowledgeNote,
} from '@/hooks/useKnowledgeCapture';
import { useAuthStore } from '@/stores/authStore';

const CATEGORY_ICONS: Record<KnowledgeCategory, React.ReactNode> = {
  terrain: <Mountain size={16} />,
  water: <Droplets size={16} />,
  wildlife: <Bird size={16} />,
  history: <Landmark size={16} />,
  operations: <Wrench size={16} />,
  warnings: <AlertTriangle size={16} />,
  traditions: <Heart size={16} />,
};

const ALL_CATEGORIES: KnowledgeCategory[] = [
  'terrain',
  'water',
  'wildlife',
  'history',
  'operations',
  'warnings',
  'traditions',
];

const ALL_IMPORTANCE: Importance[] = ['critical', 'important', 'nice-to-know'];
const ALL_SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter', 'all'];

interface RecordNoteProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Omit<KnowledgeNote, 'id' | 'createdAt' | 'synced'>) => Promise<unknown>;
  getCurrentLocation: () => Promise<{ lat: number; lng: number }>;
}

export function RecordNote({ isOpen, onClose, onSave, getCurrentLocation }: RecordNoteProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { profile } = useAuthStore();

  const [text, setText] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('terrain');
  const [importance, setImportance] = useState<Importance>('important');
  const [season, setSeason] = useState<Season>('all');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [recordedBy, setRecordedBy] = useState(profile?.full_name ?? '');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Auto-locate on open
  useEffect(() => {
    if (isOpen && lat === null) {
      handleLocate();
    }

  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };

  }, []);

  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      const pos = await getCurrentLocation();
      setLat(pos.lat);
      setLng(pos.lng);
    } catch {
      // fallback to demo coords
      setLat(57.7827);
      setLng(14.1618);
    }
    setLocating(false);
  }, [getCurrentLocation]);

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgba(3, 13, 5, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4ade80';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      drawWaveform();
    } catch {
      // mic not available
    }
  }, [drawWaveform]);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTemplateSelect = useCallback((templateText: string, templateCategory: string) => {
    setText(templateText);
    setCategory(templateCategory as KnowledgeCategory);
    setShowTemplates(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!text.trim() && !audioBlob) return;
    setSaving(true);
    try {
      await onSave({
        text: text.trim(),
        category,
        importance,
        season,
        lat: lat ?? 57.7827,
        lng: lng ?? 14.1618,
        recordedBy: recordedBy || 'Anonymous',
        audioBlob: audioBlob ?? undefined,
        audioUrl: audioUrl ?? undefined,
      });
      // Reset
      setText('');
      setAudioBlob(null);
      setAudioUrl(null);
      setCategory('terrain');
      setImportance('important');
      setSeason('all');
      setShowTemplates(true);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [text, audioBlob, audioUrl, category, importance, season, lat, lng, recordedBy, onSave, onClose]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border)] shadow-2xl"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <h2 className="text-base font-serif font-bold text-[var(--text)]">
            {t('knowledge.recordTitle')}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={18} className="text-[var(--text3)]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Voice recording */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 block">
              {t('knowledge.voiceRecording')}
            </label>
            {isRecording && (
              <div className="mb-2">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={60}
                  className="w-full h-[60px] rounded-lg border border-[var(--border)] bg-[var(--bg)]"
                />
                <p className="text-center text-xs text-red-400 font-mono mt-1 animate-pulse">
                  {t('knowledge.recording')} {formatTime(recordingTime)}
                </p>
              </div>
            )}
            {audioUrl && !isRecording && (
              <div className="mb-2">
                <audio controls src={audioUrl} className="w-full h-8" />
              </div>
            )}
            <div className="flex gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-xs font-medium"
                >
                  <Mic size={14} />
                  {t('knowledge.startRecording')}
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors text-xs font-medium animate-pulse"
                >
                  <Square size={14} />
                  {t('knowledge.stopRecording')}
                </button>
              )}
            </div>
          </div>

          {/* Text input */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 block">
              {t('knowledge.textNote')}
            </label>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setShowTemplates(false); }}
              placeholder={t('knowledge.textPlaceholder')}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] p-3 resize-none focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
            />
          </div>

          {/* Templates */}
          {showTemplates && !text && (
            <KnowledgeTemplates onSelect={handleTemplateSelect} />
          )}

          {/* Category */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 block">
              {t('knowledge.category')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const isActive = category === cat;
                const label = lang === 'sv' ? cfg.labelSv : cfg.labelEn;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isActive
                        ? 'border-current'
                        : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                    }`}
                    style={isActive ? { color: cfg.color, background: cfg.colorBg } : undefined}
                  >
                    {CATEGORY_ICONS[cat]}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Importance */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 block">
              {t('knowledge.importance')}
            </label>
            <div className="flex gap-1.5">
              {ALL_IMPORTANCE.map((imp) => {
                const cfg = IMPORTANCE_CONFIG[imp];
                const isActive = importance === imp;
                const label = lang === 'sv' ? cfg.labelSv : cfg.labelEn;
                return (
                  <button
                    key={imp}
                    onClick={() => setImportance(imp)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isActive
                        ? 'border-current'
                        : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                    }`}
                    style={isActive ? { color: cfg.color, background: `${cfg.color}15` } : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Season */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 block">
              {t('knowledge.season')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SEASONS.map((s) => {
                const cfg = SEASON_CONFIG[s];
                const isActive = season === s;
                const label = lang === 'sv' ? cfg.labelSv : cfg.labelEn;
                return (
                  <button
                    key={s}
                    onClick={() => setSeason(s)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isActive
                        ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                        : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 block">
              {t('knowledge.location')}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLocate}
                disabled={locating}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
              >
                <MapPin size={14} className={locating ? 'animate-pulse text-[var(--green)]' : ''} />
                {locating ? t('knowledge.locating') : t('knowledge.getLocation')}
              </button>
              {lat !== null && lng !== null && (
                <span className="text-[10px] font-mono text-[var(--text3)]">
                  {lat.toFixed(4)}, {lng.toFixed(4)}
                </span>
              )}
            </div>
          </div>

          {/* Recorded by */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 block">
              {t('knowledge.recordedBy')}
            </label>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              placeholder={t('knowledge.namePlaceholder')}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] px-3 py-2 focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
            />
          </div>

          {/* Photo */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 block">
              {t('knowledge.photo')}
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text3)] hover:border-[var(--border2)] hover:text-[var(--text2)] transition-colors cursor-pointer">
              <Camera size={14} />
              {t('knowledge.addPhoto')}
              <input type="file" accept="image/*" capture="environment" className="hidden" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!text.trim() && !audioBlob)}
            className="px-5 py-2 rounded-lg bg-[var(--green)] text-forest-950 text-xs font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? t('common.loading') : t('knowledge.saveNote')}
          </button>
        </div>
      </div>
    </div>
  );
}

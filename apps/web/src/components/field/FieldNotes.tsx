import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  MapPin,
  Mic,
  MicOff,
  Tag,
  Clock,
  Trash2,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  useFieldModeStore,
  type FieldNote,
  type FieldNoteTag,
  type FieldGps,
} from '@/stores/fieldModeStore';

// ─── Tag definitions ───

const NOTE_TAGS: { id: FieldNoteTag; labelKey: string; color: string }[] = [
  { id: 'beetle_damage', labelKey: 'field.notes.tags.beetleDamage', color: '#ef4444' },
  { id: 'storm_damage', labelKey: 'field.notes.tags.stormDamage', color: '#fbbf24' },
  { id: 'wildlife_sighting', labelKey: 'field.notes.tags.wildlifeSighting', color: '#4ade80' },
  { id: 'boundary_issue', labelKey: 'field.notes.tags.boundaryIssue', color: '#3b82f6' },
  { id: 'other', labelKey: 'field.notes.tags.other', color: '#a3c9a8' },
];

// ─── Component ───

export function FieldNotes() {
  const { t } = useTranslation();
  const { fieldNotes, addNote, removeNote } = useFieldModeStore();
  const [showComposer, setShowComposer] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedTags, setSelectedTags] = useState<FieldNoteTag[]>([]);
  const [gps, setGps] = useState<FieldGps | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<unknown>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
        }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Check voice support
  useEffect(() => {
    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) setVoiceSupported(false);
  }, []);

  // Toggle tag
  const toggleTag = useCallback((tag: FieldNoteTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  // Save note
  const saveNote = useCallback(() => {
    if (!noteText.trim() && selectedTags.length === 0) return;

    const note: FieldNote = {
      id: `fn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: noteText.trim(),
      tags: selectedTags.length > 0 ? selectedTags : ['other'],
      gps,
      timestamp: Date.now(),
      synced: false,
    };

    addNote(note);
    setNoteText('');
    setSelectedTags([]);
    setShowComposer(false);
  }, [noteText, selectedTags, gps, addNote]);

  // Voice input
  const startVoice = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang === 'sv' ? 'sv-SE' : 'en-US';

    let finalText = noteText;

    recognition.onresult = (event: { results: SpeechRecognitionResultList; resultIndex: number }) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setNoteText(finalText + interim);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setNoteText(finalText);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [noteText]);

  const stopVoice = useCallback(() => {
    const recognition = recognitionRef.current as { stop?: () => void } | null;
    recognition?.stop?.();
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

  // Format timestamp
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const syncedCount = fieldNotes.filter((n) => n.synced).length;
  const pendingCount = fieldNotes.length - syncedCount;

  return (
    <div className="h-full flex flex-col bg-[#020a03]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div>
          <h2 className="text-base font-bold text-white">{t('field.notes.title')}</h2>
          <p className="text-[10px] text-[var(--text3)]">
            {fieldNotes.length} {t('field.notes.total')} &middot;{' '}
            {pendingCount} {t('field.pendingUpload')}
          </p>
        </div>
        <button
          onClick={() => {
            setShowComposer(true);
            setTimeout(() => textareaRef.current?.focus(), 100);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--green)] text-forest-900 font-bold text-sm min-h-[44px] active:brightness-90 transition-all"
        >
          <Plus size={18} />
          {t('field.notes.addNote')}
        </button>
      </div>

      {/* Composer overlay */}
      {showComposer && (
        <div className="border-b border-[var(--border)] bg-[#0f2212] px-4 py-3 space-y-3">
          {/* Text area */}
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t('field.notes.placeholder')}
            className="w-full h-24 px-3 py-2.5 rounded-xl bg-[#030d05] border border-[var(--border)] text-sm text-white placeholder-[var(--text3)] resize-none focus:outline-none focus:border-[var(--green)]/40"
          />

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {NOTE_TAGS.map((tag) => {
              const active = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
                    active
                      ? 'border-2'
                      : 'border border-[var(--border)] bg-[var(--bg3)] text-[var(--text2)]'
                  }`}
                  style={
                    active
                      ? {
                          borderColor: tag.color,
                          background: `${tag.color}20`,
                          color: tag.color,
                        }
                      : undefined
                  }
                >
                  <Tag size={12} />
                  {t(tag.labelKey)}
                </button>
              );
            })}
          </div>

          {/* GPS pin + voice + actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* GPS indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#030d05] border border-[var(--border)]">
                <MapPin size={12} className={gps ? 'text-[var(--green)]' : 'text-[var(--text3)]'} />
                <span className="text-[10px] font-mono text-[var(--text2)]">
                  {gps
                    ? `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`
                    : 'GPS ---'}
                </span>
              </div>

              {/* Voice input */}
              {voiceSupported && (
                <button
                  onClick={isRecording ? stopVoice : startVoice}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isRecording
                      ? 'bg-[var(--red)]/20 text-[var(--red)] animate-pulse'
                      : 'bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)]'
                  }`}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
            </div>

            {/* Save / Cancel */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowComposer(false);
                  setNoteText('');
                  setSelectedTags([]);
                }}
                className="px-3 py-2 rounded-xl text-xs text-[var(--text3)] hover:text-[var(--text2)] min-h-[40px]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={saveNote}
                disabled={!noteText.trim() && selectedTags.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--green)] text-forest-900 font-bold text-xs min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed active:brightness-90 transition-all"
              >
                <Check size={14} />
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {fieldNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-16 h-16 rounded-full bg-[var(--bg3)] flex items-center justify-center">
              <ChevronDown size={24} className="text-[var(--text3)]" />
            </div>
            <p className="text-sm text-[var(--text3)]">{t('field.notes.empty')}</p>
          </div>
        ) : (
          [...fieldNotes].reverse().map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-[var(--border)] bg-[#0f2212] p-3"
            >
              {/* Tags row */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {note.tags.map((tagId) => {
                  const tagDef = NOTE_TAGS.find((t) => t.id === tagId);
                  return (
                    <span
                      key={tagId}
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        background: `${tagDef?.color ?? '#666'}20`,
                        color: tagDef?.color ?? '#999',
                      }}
                    >
                      {tagDef ? t(tagDef.labelKey) : tagId}
                    </span>
                  );
                })}
              </div>

              {/* Note text */}
              {note.text && (
                <p className="text-sm text-white leading-relaxed mb-2">
                  {note.text}
                </p>
              )}

              {/* Meta row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatTime(note.timestamp)}
                  </span>
                  {note.gps && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {note.gps.latitude.toFixed(4)}, {note.gps.longitude.toFixed(4)}
                    </span>
                  )}
                  <span
                    className={`flex items-center gap-1 ${
                      note.synced ? 'text-[var(--green)]' : 'text-[var(--amber)]'
                    }`}
                  >
                    {note.synced ? (
                      <>
                        <Check size={10} /> Synced
                      </>
                    ) : (
                      'Pending'
                    )}
                  </span>
                </div>
                <button
                  onClick={() => removeNote(note.id)}
                  className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

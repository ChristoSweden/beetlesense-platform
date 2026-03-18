import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Axe,
  Sprout,
  CloudLightning,
  Route,
  MapPin,
  Eye,
  Heart,
  Upload,
  Mic,
  MicOff,
  MapPinned,
} from 'lucide-react';
import {
  type ArchiveEvent,
  type ArchiveEventType,
  EVENT_TYPE_COLORS,
} from '@/hooks/useForestArchive';

const EVENT_TYPE_OPTIONS: { type: ArchiveEventType; icon: React.ReactNode }[] = [
  { type: 'harvest', icon: <Axe size={18} /> },
  { type: 'planting', icon: <Sprout size={18} /> },
  { type: 'storm_damage', icon: <CloudLightning size={18} /> },
  { type: 'road_built', icon: <Route size={18} /> },
  { type: 'boundary_change', icon: <MapPin size={18} /> },
  { type: 'observation', icon: <Eye size={18} /> },
  { type: 'family_note', icon: <Heart size={18} /> },
];

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (event: Omit<ArchiveEvent, 'id' | 'createdAt'>) => Promise<void>;
  stands: string[];
}

export function AddEventModal({ isOpen, onClose, onAdd, stands }: AddEventModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<ArchiveEventType>('observation');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [stand, setStand] = useState('');
  const [parcel, setParcel] = useState('');
  const [recordedBy, setRecordedBy] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const resetForm = useCallback(() => {
    setType('observation');
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setStand('');
    setParcel('');
    setRecordedBy('');
    setPhotoPreview(null);
    setLat('');
    setLng('');
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePhotoChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handlePhotoChange(e.dataTransfer.files);
  };

  const handleDetectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude.toFixed(6));
          setLng(pos.coords.longitude.toFixed(6));
        },
        () => {
          // Silently fail
        },
      );
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Voice note is a placeholder — would integrate MediaRecorder API
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setIsSaving(true);
    try {
      await onAdd({
        type,
        title: title.trim(),
        description: description.trim(),
        date,
        stand: stand.trim() || undefined,
        parcel: parcel.trim() || undefined,
        recordedBy: recordedBy.trim() || 'Unknown',
        photoUrl: photoPreview ?? undefined,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
      });
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)]"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <h2 className="text-base font-serif font-bold text-[var(--text)]">
            {t('archive.addEvent')}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} className="text-[var(--text3)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Event type selector */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-2">
              {t('archive.eventType')}
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {EVENT_TYPE_OPTIONS.map((opt) => {
                const color = EVENT_TYPE_COLORS[opt.type];
                const isSelected = type === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setType(opt.type)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-2'
                        : 'border-[var(--border)] hover:border-[var(--border2)]'
                    }`}
                    style={
                      isSelected
                        ? { borderColor: color, background: `${color}10` }
                        : {}
                    }
                  >
                    <span style={{ color: isSelected ? color : 'var(--text3)' }}>
                      {opt.icon}
                    </span>
                    <span
                      className="text-[9px] font-mono leading-tight text-center"
                      style={{ color: isSelected ? color : 'var(--text3)' }}
                    >
                      {t(`archive.types.${opt.type}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('archive.date')}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min="1900-01-01"
              max="2099-12-31"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('archive.title')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('archive.titlePlaceholder')}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('archive.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('archive.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)] resize-none"
            />
          </div>

          {/* Stand / Parcel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                {t('archive.stand')}
              </label>
              <input
                type="text"
                value={stand}
                onChange={(e) => setStand(e.target.value)}
                placeholder="Avd. 1"
                list="stand-list"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
              />
              <datalist id="stand-list">
                {stands.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                {t('archive.parcel')}
              </label>
              <input
                type="text"
                value={parcel}
                onChange={(e) => setParcel(e.target.value)}
                placeholder="Norra skiftet"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
              />
            </div>
          </div>

          {/* Recorded by */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('archive.recordedBy')}
            </label>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              placeholder={t('archive.recordedByPlaceholder')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('archive.photo')}
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--border2)]'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Upload size={20} className="text-[var(--text3)]" />
                  <span className="text-xs text-[var(--text3)]">
                    {t('archive.dropPhoto')}
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoChange(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          {/* Voice note */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('archive.voiceNote')}
            </label>
            <button
              type="button"
              onClick={toggleRecording}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${
                isRecording
                  ? 'border-red-500/40 bg-red-500/10 text-red-400'
                  : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--border2)]'
              }`}
            >
              {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
              {isRecording ? t('archive.stopRecording') : t('archive.startRecording')}
            </button>
          </div>

          {/* GPS location */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('archive.location')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="56.8800"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
              />
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="14.7800"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
              />
              <button
                type="button"
                onClick={handleDetectLocation}
                className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
                title={t('archive.detectLocation')}
              >
                <MapPinned size={16} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="flex-1 py-2.5 rounded-lg bg-[var(--green)] text-sm font-semibold text-forest-950 hover:bg-[var(--green2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t('common.loading') : t('archive.saveEvent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

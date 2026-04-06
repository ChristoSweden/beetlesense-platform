import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Star,
  MapPin,
  Clock,
  Wrench,
  TreePine,
  Plane,
  Shovel,
  Bug,
  Truck,
  CalendarDays,
  FileText,
  Paperclip,
  Send,
  CheckCircle2,
  Copy,
} from 'lucide-react';

/* ═══ Types ═══ */

type ServiceType = 'drone_survey' | 'harvesting' | 'planting' | 'road_maintenance' | 'pest_treatment';

interface Contractor {
  id: string;
  name: string;
  rating: number;
  completedJobs: number;
  distance: string;
  priceRange: string;
  available: boolean;
  services: ServiceType[];
  avatar: string;
}

interface DemoParcel {
  id: string;
  name: string;
  areaHa: number;
}

/* ═══ Demo Data ═══ */

const DEMO_PARCELS: DemoParcel[] = [
  { id: 'p1', name: 'Norra Skogen', areaHa: 42.5 },
  { id: 'p2', name: 'Eklunden', areaHa: 18.3 },
  { id: 'p3', name: 'Storbacken', areaHa: 67.1 },
];

const SERVICE_OPTIONS: { key: ServiceType; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'drone_survey', label: 'Drone Survey', icon: <Plane size={18} />, description: 'Aerial mapping and health assessment' },
  { key: 'harvesting', label: 'Harvesting', icon: <TreePine size={18} />, description: 'Timber felling and extraction' },
  { key: 'planting', label: 'Planting', icon: <Shovel size={18} />, description: 'Seedling planting and reforestation' },
  { key: 'road_maintenance', label: 'Road Maintenance', icon: <Truck size={18} />, description: 'Forest road repair and upkeep' },
  { key: 'pest_treatment', label: 'Pest Treatment', icon: <Bug size={18} />, description: 'Bark beetle and pest control' },
];

const DEMO_CONTRACTORS: Contractor[] = [
  { id: 'c1', name: 'Nordic Drone AB', rating: 4.9, completedJobs: 142, distance: '12 km', priceRange: '3 500–5 000 SEK', available: true, services: ['drone_survey'], avatar: 'ND' },
  { id: 'c2', name: 'Skogsmaskin Syd', rating: 4.7, completedJobs: 98, distance: '25 km', priceRange: '18 000–35 000 SEK', available: true, services: ['harvesting', 'road_maintenance'], avatar: 'SS' },
  { id: 'c3', name: 'GreenForest Planting', rating: 4.6, completedJobs: 67, distance: '38 km', priceRange: '8 000–15 000 SEK', available: true, services: ['planting'], avatar: 'GF' },
  { id: 'c4', name: 'Skogsvakten AB', rating: 4.8, completedJobs: 203, distance: '18 km', priceRange: '5 000–12 000 SEK', available: false, services: ['pest_treatment', 'drone_survey'], avatar: 'SV' },
  { id: 'c5', name: 'Värmland Skog & Mark', rating: 4.5, completedJobs: 45, distance: '42 km', priceRange: '12 000–28 000 SEK', available: true, services: ['harvesting', 'planting', 'road_maintenance'], avatar: 'VÖ' },
];

function generateRefCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CB-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ═══ Step Indicator ═══ */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              i < current
                ? 'bg-[var(--green)] text-white'
                : i === current
                  ? 'bg-[var(--green)]/15 text-[var(--green)] border-2 border-[var(--green)]'
                  : 'bg-[var(--bg3)] text-[var(--text3)]'
            }`}
          >
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-6 h-0.5 ${i < current ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══ Main Component ═══ */

export function ContractorBookingFlow() {
  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<string>('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [referenceCode] = useState(generateRefCode);
  const [copied, setCopied] = useState(false);

  const filteredContractors = DEMO_CONTRACTORS.filter(
    (c) => !selectedService || c.services.includes(selectedService),
  );

  const selectedContractorData = DEMO_CONTRACTORS.find((c) => c.id === selectedContractor);

  const canProceed = (): boolean => {
    if (step === 0) return selectedService !== null && selectedParcel !== '';
    if (step === 1) return selectedContractor !== null;
    if (step === 2) return description.trim().length > 0;
    return true;
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referenceCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileAttach = () => {
    // Simulated file attach for demo
    setAttachments((prev) => [...prev, `photo_${prev.length + 1}.jpg`]);
  };

  /* ─── Step 0: Service Type ─── */
  const renderServiceType = () => (
    <div>
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">What do you need?</h2>
      <p className="text-xs text-[var(--text3)] mb-4">Select a service type, date range, and parcel.</p>

      <div className="space-y-2 mb-5">
        {SERVICE_OPTIONS.map((opt) => {
          const active = selectedService === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setSelectedService(opt.key)}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                active
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--green)]/40'
              }`}
              style={{ background: active ? undefined : 'var(--bg2)' }}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-[var(--green)]/15 text-[var(--green)]' : 'bg-[var(--bg3)] text-[var(--text3)]'}`}>
                {opt.icon}
              </div>
              <div>
                <span className="text-sm font-semibold text-[var(--text)]">{opt.label}</span>
                <p className="text-[11px] text-[var(--text3)]">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1">
            <CalendarDays size={12} className="inline mr-1" /> Start date
          </label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1">
            <CalendarDays size={12} className="inline mr-1" /> End date
          </label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
          />
        </div>
      </div>

      {/* Parcel selection */}
      <div>
        <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
          <TreePine size={12} className="inline mr-1" /> Parcel
        </label>
        <select
          value={selectedParcel}
          onChange={(e) => setSelectedParcel(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
        >
          <option value="">Select a parcel...</option>
          {DEMO_PARCELS.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.areaHa} ha)</option>
          ))}
        </select>
      </div>
    </div>
  );

  /* ─── Step 1: Browse Contractors ─── */
  const renderBrowseContractors = () => (
    <div>
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Choose a Contractor</h2>
      <p className="text-xs text-[var(--text3)] mb-4">
        {filteredContractors.length} contractor{filteredContractors.length !== 1 ? 's' : ''} available for{' '}
        {SERVICE_OPTIONS.find((s) => s.key === selectedService)?.label?.toLowerCase()}.
      </p>

      <div className="space-y-2">
        {filteredContractors.map((contractor) => {
          const active = selectedContractor === contractor.id;
          return (
            <button
              key={contractor.id}
              onClick={() => setSelectedContractor(contractor.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                active
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--green)]/40'
              }`}
              style={{ background: active ? undefined : 'var(--bg2)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--green)]/10 flex items-center justify-center text-xs font-bold text-[var(--green)]">
                  {contractor.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-[var(--text)]">{contractor.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        contractor.available
                          ? 'bg-[var(--green)]/10 text-[var(--green)]'
                          : 'bg-yellow-500/10 text-yellow-600'
                      }`}
                    >
                      {contractor.available ? 'Available' : 'Busy'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[var(--text3)]">
                    <span className="flex items-center gap-0.5">
                      <Star size={10} className="text-yellow-500 fill-yellow-500" /> {contractor.rating}
                    </span>
                    <span>{contractor.completedJobs} jobs</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin size={10} /> {contractor.distance}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text2)] mt-0.5 font-mono">{contractor.priceRange}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ─── Step 2: Request Details ─── */
  const renderRequestDetails = () => (
    <div>
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Request Details</h2>
      <p className="text-xs text-[var(--text3)] mb-4">Describe what you need and set your budget.</p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <FileText size={12} className="inline mr-1" /> Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the work needed, special conditions, access requirements..."
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)] resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <Paperclip size={12} className="inline mr-1" /> Photos (optional)
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {attachments.map((name, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--bg3)] text-[var(--text2)]"
              >
                {name}
              </span>
            ))}
            <button
              onClick={handleFileAttach}
              className="px-3 py-1.5 rounded-lg border border-dashed border-[var(--border2)] text-xs text-[var(--text3)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
            >
              + Add photo
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <Wrench size={12} className="inline mr-1" /> Budget range (SEK)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="Min"
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm font-mono text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
            />
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="Max"
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm font-mono text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
            />
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Step 3: Confirm & Send ─── */
  const renderConfirmSend = () => {
    const service = SERVICE_OPTIONS.find((s) => s.key === selectedService);
    const parcel = DEMO_PARCELS.find((p) => p.id === selectedParcel);

    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-[var(--green)]/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-[var(--green)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Booking Request Sent!</h2>
        <p className="text-sm text-[var(--text2)] mb-4">
          Your request has been sent to <strong>{selectedContractorData?.name}</strong>.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg3)] mb-4">
          <span className="text-xs text-[var(--text3)]">Reference:</span>
          <span className="text-sm font-mono font-bold text-[var(--text)]">{referenceCode}</span>
          <button onClick={handleCopyRef} className="text-[var(--green)] hover:text-[var(--green2)] transition-colors">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] text-left mb-4" style={{ background: 'var(--bg2)' }}>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text3)]">Service:</span>
              <span className="text-[var(--text)] font-medium">{service?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text3)]">Parcel:</span>
              <span className="text-[var(--text)] font-medium">{parcel?.name}</span>
            </div>
            {dateStart && (
              <div className="flex justify-between">
                <span className="text-[var(--text3)]">Dates:</span>
                <span className="text-[var(--text)] font-mono">{dateStart}{dateEnd ? ` \u2013 ${dateEnd}` : ''}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text3)]">Contractor:</span>
              <span className="text-[var(--text)] font-medium">{selectedContractorData?.name}</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[var(--bg3)] text-left mb-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text2)]">
            <Clock size={12} className="text-[var(--text3)]" />
            Expected response within 1-2 business days
          </div>
        </div>

        <Link
          to="/owner/contractors"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all"
        >
          View My Bookings
          <ChevronRight size={16} />
        </Link>
      </div>
    );
  };

  const steps = [renderServiceType, renderBrowseContractors, renderRequestDetails, renderConfirmSend];

  return (
    <div>
      <StepIndicator current={step} total={4} />
      {steps[step]()}

      {/* Navigation */}
      {step < 3 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-[var(--text2)] hover:text-[var(--text)] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <button
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            disabled={!canProceed()}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--green)] text-white hover:brightness-110 disabled:opacity-40 transition-all"
          >
            {step === 2 ? (
              <>
                <Send size={14} /> Send Booking Request
              </>
            ) : (
              <>
                Next <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

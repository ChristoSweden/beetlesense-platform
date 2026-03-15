import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import {
  Clock,
  Search,
  CheckCircle,
  XCircle,
  Plane,
  Shield,
  Cpu,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';

// ─── Types ───

type ApplicationStatusType = 'submitted' | 'under_review' | 'approved' | 'rejected';

interface StatusEvent {
  status: ApplicationStatusType;
  timestamp: string;
  note?: string;
}

interface PilotApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  county: string;
  license_number: string;
  drone_model: string;
  camera_specs: string;
  has_rtk: boolean;
  has_multispectral: boolean;
  has_thermal: boolean;
  status: ApplicationStatusType;
  rejection_reason?: string;
  status_history: StatusEvent[];
  created_at: string;
}

const STATUS_CONFIG: Record<
  ApplicationStatusType,
  { icon: typeof Clock; color: string; bg: string; label: string }
> = {
  submitted: {
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/30',
    label: 'Submitted',
  },
  under_review: {
    icon: Search,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/30',
    label: 'Under Review',
  },
  approved: {
    icon: CheckCircle,
    color: 'text-[var(--green)]',
    bg: 'bg-[var(--green)]/10 border-[var(--green)]/30',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/30',
    label: 'Rejected',
  },
};

export function ApplicationStatus() {
  const { profile } = useAuthStore();
  const [application, setApplication] = useState<PilotApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const { data, error } = await supabase
        .from('pilot_profiles')
        .select('*')
        .eq('user_id', profile!.id)
        .single();

      if (!error && data) {
        setApplication({
          ...data,
          status_history: data.status_history ?? [
            { status: 'submitted', timestamp: data.created_at },
          ],
        } as PilotApplication);
      }
      setLoading(false);
    }

    load();

    // Subscribe to status changes
    const channel = supabase
      .channel('pilot-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pilot_profiles',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          setApplication((prev) =>
            prev
              ? {
                  ...prev,
                  ...payload.new,
                  status_history: (payload.new as any).status_history ?? prev.status_history,
                }
              : null,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--text3)]">No application found.</p>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[application.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ─── Status Banner ─── */}
      <div className={`rounded-xl border p-5 ${statusCfg.bg}`}>
        <div className="flex items-center gap-3">
          <StatusIcon size={24} className={statusCfg.color} />
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">
              Application {statusCfg.label}
            </h2>
            <p className="text-xs text-[var(--text3)] mt-0.5">
              {application.status === 'submitted' &&
                'Your application is in the queue. We typically review within 2-3 business days.'}
              {application.status === 'under_review' &&
                'Our team is currently reviewing your credentials and equipment.'}
              {application.status === 'approved' &&
                'Welcome aboard! You can now browse and accept missions.'}
              {application.status === 'rejected' &&
                (application.rejection_reason || 'Your application was not approved at this time.')}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Submitted Data Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Personal */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <MapPin size={12} className="text-[var(--green)]" />
            Personal Info
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text3)]">Name</span>
              <span className="text-[var(--text)]">{application.full_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text3)]">Email</span>
              <span className="text-[var(--text)] flex items-center gap-1">
                <Mail size={10} />
                {application.email}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text3)]">Phone</span>
              <span className="text-[var(--text)] flex items-center gap-1">
                <Phone size={10} />
                {application.phone}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text3)]">County</span>
              <span className="text-[var(--text)]">{application.county}</span>
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield size={12} className="text-[var(--green)]" />
            Credentials
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text3)]">License #</span>
              <span className="text-[var(--text)] font-mono">{application.license_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text3)]">License PDF</span>
              <span className="text-[var(--green)]">Uploaded</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text3)]">Insurance</span>
              <span className="text-[var(--green)]">Uploaded</span>
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 sm:col-span-2">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Cpu size={12} className="text-[var(--green)]" />
            Equipment
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[var(--text3)] block mb-0.5">Drone</span>
              <span className="text-[var(--text)]">{application.drone_model}</span>
            </div>
            <div>
              <span className="text-[var(--text3)] block mb-0.5">Camera</span>
              <span className="text-[var(--text)]">{application.camera_specs}</span>
            </div>
            <div className="flex gap-2">
              {application.has_rtk && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                  RTK
                </span>
              )}
              {application.has_multispectral && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                  Multispectral
                </span>
              )}
              {application.has_thermal && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                  Thermal
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Status Timeline ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-4">
          Status Timeline
        </h3>
        <div className="space-y-0">
          {application.status_history.map((event, i) => {
            const cfg = STATUS_CONFIG[event.status];
            const Icon = cfg.icon;
            const isLast = i === application.status_history.length - 1;
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isLast ? cfg.bg.split(' ')[0] : 'bg-[var(--bg3)]'
                    }`}
                  >
                    <Icon size={12} className={isLast ? cfg.color : 'text-[var(--text3)]'} />
                  </div>
                  {!isLast && <div className="w-px h-6 bg-[var(--border)]" />}
                </div>
                <div className="pb-4">
                  <p className={`text-xs font-medium ${isLast ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>
                    {cfg.label}
                  </p>
                  <p className="text-[10px] text-[var(--text3)] font-mono">
                    {new Date(event.timestamp).toLocaleString('sv-SE')}
                  </p>
                  {event.note && (
                    <p className="text-[10px] text-[var(--text3)] mt-0.5">{event.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

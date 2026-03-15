import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { ApplicationStatus } from '@/components/pilot/ApplicationStatus';
import { PilotApplicationForm } from '@/components/pilot/PilotApplicationForm';
import {
  LayoutDashboard,
  Briefcase,
  CheckCircle,
  Wallet,
  ChevronRight,
  MapPin,
  Calendar,
  Loader2,
} from 'lucide-react';

type PilotStatus = 'none' | 'submitted' | 'under_review' | 'approved' | 'rejected';

export default function PilotDashboardPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [pilotStatus, setPilotStatus] = useState<PilotStatus>('none');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, completed: 0, earnings: 0 });
  const [upcomingJobs, setUpcomingJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      // Check pilot profile status
      const { data: pilotData } = await supabase
        .from('pilot_profiles')
        .select('status')
        .eq('user_id', profile!.id)
        .single();

      if (pilotData) {
        setPilotStatus(pilotData.status as PilotStatus);
      }

      if (pilotData?.status === 'approved') {
        // Load stats
        const [activeRes, completedRes, earningsRes, jobsRes] = await Promise.all([
          supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('accepted_by', profile!.id)
            .eq('status', 'assigned'),
          supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('accepted_by', profile!.id)
            .eq('status', 'completed'),
          supabase
            .from('pilot_earnings')
            .select('amount_sek')
            .eq('pilot_id', profile!.id),
          supabase
            .from('jobs')
            .select('*')
            .eq('accepted_by', profile!.id)
            .eq('status', 'assigned')
            .order('deadline', { ascending: true })
            .limit(5),
        ]);

        const totalEarnings = (earningsRes.data ?? []).reduce(
          (sum: number, e: any) => sum + (e.amount_sek ?? 0),
          0,
        );

        setStats({
          active: activeRes.count ?? 0,
          completed: completedRes.count ?? 0,
          earnings: totalEarnings,
        });

        setUpcomingJobs(jobsRes.data ?? []);
      }

      setLoading(false);
    }
    load();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[var(--green)]" />
      </div>
    );
  }

  // No application yet — show application form
  if (pilotStatus === 'none') {
    return (
      <div className="p-4 lg:p-6">
        <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-1">
          Become a BeetleSense Pilot
        </h1>
        <p className="text-xs text-[var(--text3)] mb-6">
          Apply to join our drone pilot network and earn by surveying forest parcels.
        </p>
        <PilotApplicationForm onSubmitted={() => setPilotStatus('submitted')} />
      </div>
    );
  }

  // Application pending
  if (pilotStatus !== 'approved') {
    return (
      <div className="p-4 lg:p-6">
        <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-1">
          {t('pilot.dashboard.title')}
        </h1>
        <p className="text-xs text-[var(--text3)] mb-6">Your pilot application status</p>
        <ApplicationStatus />
      </div>
    );
  }

  // Approved — full dashboard
  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-1">
        {t('pilot.dashboard.title')}
      </h1>
      <p className="text-xs text-[var(--text3)] mb-6">Your missions and earnings at a glance</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center mb-3">
            <Briefcase size={18} className="text-[var(--green)]" />
          </div>
          <p className="text-2xl font-semibold font-mono text-[var(--text)]">{stats.active}</p>
          <p className="text-xs text-[var(--text3)]">{t('pilot.dashboard.activeJobs')}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center mb-3">
            <CheckCircle size={18} className="text-[var(--green)]" />
          </div>
          <p className="text-2xl font-semibold font-mono text-[var(--text)]">{stats.completed}</p>
          <p className="text-xs text-[var(--text3)]">{t('pilot.dashboard.completedJobs')}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
            <Wallet size={18} className="text-[var(--amber)]" />
          </div>
          <p className="text-2xl font-semibold font-mono text-[var(--text)]">
            {stats.earnings.toLocaleString('sv-SE')} kr
          </p>
          <p className="text-xs text-[var(--text3)]">{t('pilot.dashboard.totalEarnings')}</p>
        </div>
      </div>

      {/* Upcoming Missions */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Upcoming Missions
          </h2>
          <Link
            to="/pilot/jobs"
            className="text-[10px] text-[var(--green)] hover:underline flex items-center gap-0.5"
          >
            View all <ChevronRight size={10} />
          </Link>
        </div>

        {upcomingJobs.length === 0 ? (
          <div className="p-6 text-center">
            <LayoutDashboard size={20} className="mx-auto text-[var(--text3)] mb-2" />
            <p className="text-xs text-[var(--text3)]">
              No upcoming missions.{' '}
              <Link to="/pilot/jobs" className="text-[var(--green)] underline">
                Browse available jobs
              </Link>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {upcomingJobs.map((job: any) => (
              <Link
                key={job.id}
                to={`/pilot/jobs/${job.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg3)] transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">{job.parcel_name}</p>
                  <p className="text-[10px] text-[var(--text3)] flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <MapPin size={9} />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Calendar size={9} />
                      {new Date(job.deadline).toLocaleDateString('sv-SE')}
                    </span>
                  </p>
                </div>
                <ChevronRight size={14} className="text-[var(--text3)]" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

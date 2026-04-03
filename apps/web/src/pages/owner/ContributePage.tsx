import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Eye,
  Bug,
  Mic,
  CheckCircle,
  Satellite,
  Award,
  ChevronDown,
  ChevronUp,
  FileBarChart,
  FileText,
  Download,
  GraduationCap,
  Video,
  BookA,
  BookOpen,
  BookMarked,
  Settings,
  CreditCard,
  Bell,
  CalendarDays,
  ClipboardCheck,
  RadioTower,
  FolderOpen,
  HeartHandshake,
  ChevronRight,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { getObservationStats } from '@/services/observationService';
import { getPhotoStats } from '@/services/photoIntelligenceService';

// ── Types ───────────────────────────────────────────────────────────────────

interface QuickAction {
  icon: typeof Camera;
  title: string;
  subtitle: string;
  color: string;
  link: string;
}

interface RecentSubmission {
  id: number;
  icon: typeof Camera;
  type: string;
  time: string;
  badges: { label: string; icon: typeof CheckCircle; color: string }[];
}

interface MenuItem {
  to: string;
  label: string;
  icon: ReactNode;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

// ── Demo Data ───────────────────────────────────────────────────────────────

const quickActions: QuickAction[] = [
  { icon: Camera, title: 'Snap & Classify', subtitle: 'Take a photo, AI identifies the issue', color: '#2563eb', link: '/owner/capture' },
  { icon: Eye, title: 'Field Report', subtitle: 'Log what you see in the forest', color: '#7c3aed', link: '/owner/observations' },
  { icon: Bug, title: 'Log Trap Count', subtitle: "Record this week's beetle count", color: '#dc2626', link: '/owner/observations' },
  { icon: Mic, title: 'Voice Note', subtitle: 'Speak your observation hands-free', color: '#059669', link: '/owner/capture' },
];

const recentSubmissions: RecentSubmission[] = [
  { id: 1, icon: Camera, type: 'Photo — Bark beetle bore dust', time: '2h ago', badges: [{ label: 'AI classified', icon: CheckCircle, color: 'var(--risk-low)' }, { label: 'Satellite confirms', icon: Satellite, color: '#2563eb' }] },
  { id: 2, icon: Eye, type: 'Observation — Crown browning', time: '1d ago', badges: [{ label: 'Verified by 2', icon: CheckCircle, color: 'var(--risk-low)' }] },
  { id: 3, icon: Bug, type: 'Trap reading — 8,400 beetles', time: '3d ago', badges: [{ label: 'AI classified', icon: CheckCircle, color: 'var(--risk-low)' }] },
  { id: 4, icon: Eye, type: 'Observation — Healthy stand', time: '5d ago', badges: [{ label: 'Verified by 3', icon: CheckCircle, color: 'var(--risk-low)' }, { label: 'Satellite confirms', icon: Satellite, color: '#2563eb' }] },
  { id: 5, icon: Camera, type: 'Photo — Wind damage', time: '1w ago', badges: [{ label: 'AI classified', icon: CheckCircle, color: 'var(--risk-low)' }] },
];

const menuGroups: MenuGroup[] = [
  {
    label: 'Reports & Export',
    items: [
      { to: '/owner/reports', label: 'Reports', icon: <FileBarChart size={18} /> },
      { to: '/owner/report-builder', label: 'Report Builder', icon: <FileText size={18} /> },
      { to: '/owner/export', label: 'Data Export', icon: <Download size={18} /> },
    ],
  },
  {
    label: 'Learning',
    items: [
      { to: '/owner/academy', label: 'Academy', icon: <GraduationCap size={18} /> },
      { to: '/owner/tutorials', label: 'Video Tutorials', icon: <Video size={18} /> },
      { to: '/owner/glossary', label: 'Glossary', icon: <BookA size={18} /> },
      { to: '/owner/research', label: 'Research Explorer', icon: <BookOpen size={18} /> },
      { to: '/owner/field-guides', label: 'Field Guides', icon: <BookMarked size={18} /> },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/owner/settings', label: 'Settings', icon: <Settings size={18} /> },
      { to: '/owner/billing', label: 'Billing', icon: <CreditCard size={18} /> },
      { to: '/owner/notifications', label: 'Notifications', icon: <Bell size={18} /> },
      { to: '/owner/calendar', label: 'Calendar', icon: <CalendarDays size={18} /> },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/owner/compliance', label: 'Compliance', icon: <ClipboardCheck size={18} /> },
      { to: '/owner/regulatory-radar', label: 'Regulatory Radar', icon: <RadioTower size={18} /> },
      { to: '/owner/documents', label: 'Documents', icon: <FolderOpen size={18} /> },
      { to: '/owner/succession', label: 'Succession', icon: <HeartHandshake size={18} /> },
    ],
  },
];

// ── Components ──────────────────────────────────────────────────────────────

function ContributionScore() {
  const obsStats = useMemo(() => getObservationStats(), []);
  const photoStats = useMemo(() => getPhotoStats(), []);

  const score = Math.min(100, obsStats.total + photoStats.totalPhotos + 15);
  const level = score >= 80 ? 'Expert' : score >= 50 ? 'Active' : score >= 20 ? 'Contributor' : 'Beginner';

  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ background: 'var(--green-wash)' }}
        >
          <Award size={20} className="text-[var(--green)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Your Intelligence Score</h2>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white mt-0.5"
            style={{ background: 'var(--green)' }}
          >
            {level}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center mb-3">
        {[
          { label: 'Observations', value: obsStats.total },
          { label: 'Photos', value: photoStats.totalPhotos },
          { label: 'Trap readings', value: 12 },
          { label: 'Treatments', value: 3 },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {s.value}
            </p>
            <p className="text-[10px] text-[var(--text3)]">{s.label}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--text3)]">
        You&apos;ve helped validate 12 threats this month
      </p>
    </div>
  );
}

function QuickActionsGrid() {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              to={action.link}
              className="rounded-xl p-4 transition-all hover:scale-[1.01]"
              style={{
                background: 'var(--bg2)',
                boxShadow: 'var(--shadow-card)',
                borderLeft: `3px solid ${action.color}`,
              }}
            >
              <Icon size={28} style={{ color: action.color }} />
              <p className="text-sm font-semibold text-[var(--text)] mt-2">{action.title}</p>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">{action.subtitle}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RecentSubmissionsList() {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Recent Submissions</h2>
      <div className="space-y-2">
        {recentSubmissions.map((sub) => {
          const Icon = sub.icon;
          return (
            <div
              key={sub.id}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                style={{ background: 'var(--green-wash)' }}
              >
                <Icon size={16} className="text-[var(--green)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)] truncate">{sub.type}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] text-[var(--text3)]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {sub.time}
                  </span>
                  {sub.badges.map((badge) => {
                    const BadgeIcon = badge.icon;
                    return (
                      <span
                        key={badge.label}
                        className="flex items-center gap-0.5 text-[10px] font-medium"
                        style={{ color: badge.color }}
                      >
                        <BadgeIcon size={10} /> {badge.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MoreOptions() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] mb-3 w-full"
      >
        Settings & More
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="space-y-6">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wide mb-2 px-1">
                {group.label}
              </h3>
              <div
                className="rounded-xl overflow-hidden divide-y divide-[var(--border)]"
                style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
              >
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg3)]"
                  >
                    <span className="text-[var(--text3)]">{item.icon}</span>
                    <span className="flex-1 text-sm font-medium text-[var(--text)]">{item.label}</span>
                    <ChevronRight size={16} className="text-[var(--text3)]" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ContributePage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-xl sm:text-2xl font-bold text-[var(--text)]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Contribute
        </h1>
        <p className="text-sm text-[var(--text3)] mt-1">Feed the intelligence loop</p>
      </div>

      <ContributionScore />
      <QuickActionsGrid />
      <RecentSubmissionsList />
      <MoreOptions />
    </div>
  );
}

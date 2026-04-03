import { Link } from 'react-router-dom';
import {
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

interface MenuItem {
  to: string;
  label: string;
  icon: ReactNode;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

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

export default function MorePage() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-xl sm:text-2xl font-bold text-[var(--text)]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Mer
        </h1>
        <p className="text-sm text-[var(--text3)] mt-1">Settings, reports, learning, and more</p>
      </div>

      {/* Groups */}
      <div className="space-y-6">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <h2 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wide mb-2 px-1">
              {group.label}
            </h2>
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
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Camera,
  Scan,
  BrainCircuit,
  FileBarChart,
  Bell,
  X,
  TreePine,
  Upload,
  Download,
  Printer,
  MessageCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { triggerHaptic } from '@/components/common/Haptics';

interface QuickAction {
  id: string;
  label: string;
  icon: ReactNode;
  action: string; // navigation path
  color?: string;
}

/** Returns contextual quick actions based on the current route */
function useContextualActions(): QuickAction[] {
  const location = useLocation();
  const { t } = useTranslation();
  const path = location.pathname;

  return useMemo(() => {
    // Default actions available everywhere
    const defaults: QuickAction[] = [
      { id: 'advisor', label: t('nav.advisor', 'Ask AI'), icon: <BrainCircuit size={18} />, action: '/owner/advisor', color: 'var(--green)' },
    ];

    // Route-specific actions
    if (path.includes('/parcels')) {
      return [
        { id: 'new-survey', label: t('actions.newSurvey', 'New Survey'), icon: <Scan size={18} />, action: '/owner/surveys', color: 'var(--green)' },
        { id: 'capture', label: t('nav.capture', 'Take Photo'), icon: <Camera size={18} />, action: '/owner/capture' },
        ...defaults,
      ];
    }

    if (path.includes('/surveys')) {
      return [
        { id: 'capture', label: t('nav.capture', 'Take Photo'), icon: <Camera size={18} />, action: '/owner/capture', color: 'var(--green)' },
        { id: 'report', label: t('actions.generateReport', 'Generate Report'), icon: <FileBarChart size={18} />, action: '/owner/report-builder' },
        ...defaults,
      ];
    }

    if (path.includes('/dashboard') || path.includes('/today')) {
      return [
        { id: 'capture', label: t('nav.capture', 'Quick Capture'), icon: <Camera size={18} />, action: '/owner/capture', color: 'var(--green)' },
        { id: 'alerts', label: t('nav.alerts', 'View Alerts'), icon: <Bell size={18} />, action: '/owner/alerts' },
        { id: 'new-parcel', label: t('actions.addParcel', 'Add Parcel'), icon: <TreePine size={18} />, action: '/owner/parcels' },
        ...defaults,
      ];
    }

    if (path.includes('/reports') || path.includes('/report-builder')) {
      return [
        { id: 'export', label: t('nav.export', 'Export Data'), icon: <Download size={18} />, action: '/owner/export', color: 'var(--green)' },
        { id: 'print', label: t('actions.print', 'Print'), icon: <Printer size={18} />, action: '/owner/report-builder' },
        ...defaults,
      ];
    }

    if (path.includes('/gallery') || path.includes('/vision')) {
      return [
        { id: 'upload', label: t('actions.upload', 'Upload Photo'), icon: <Upload size={18} />, action: '/owner/capture', color: 'var(--green)' },
        { id: 'vision', label: t('nav.vision', 'AI Vision'), icon: <Camera size={18} />, action: '/owner/vision' },
        ...defaults,
      ];
    }

    if (path.includes('/community') || path.includes('/marketplace')) {
      return [
        { id: 'post', label: t('actions.newPost', 'New Post'), icon: <MessageCircle size={18} />, action: '/owner/community', color: 'var(--green)' },
        ...defaults,
      ];
    }

    // Fallback: global quick actions
    return [
      { id: 'capture', label: t('nav.capture', 'Quick Capture'), icon: <Camera size={18} />, action: '/owner/capture', color: 'var(--green)' },
      { id: 'new-survey', label: t('actions.newSurvey', 'New Survey'), icon: <Scan size={18} />, action: '/owner/surveys' },
      ...defaults,
    ];
  }, [path, t]);
}

export function ContextualActions() {
  const [expanded, setExpanded] = useState(false);
  const actions = useContextualActions();
  const navigate = useNavigate();
  const location = useLocation();

  // Close when navigating
  useEffect(() => {
    setExpanded(false);
  }, [location.pathname]);

  // Don't show on landing/auth pages
  if (
    location.pathname === '/' ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/signup') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/pilot') ||
    location.pathname.startsWith('/inspector')
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col items-end gap-2">
      {/* Expanded action buttons */}
      {expanded && (
        <div className="flex flex-col items-end gap-2 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          {actions.map((action, i) => (
            <button
              key={action.id}
              onClick={() => {
                navigate(action.action);
                setExpanded(false);
              }}
              className="flex items-center gap-2 rounded-full bg-[var(--bg2)] border border-[var(--border)] pl-4 pr-3 py-2 text-sm font-medium text-[var(--text)] shadow-lg transition hover:bg-[var(--bg3)] hover:border-[var(--border2)]"
              style={{
                animationDelay: `${i * 50}ms`,
              }}
            >
              <span>{action.label}</span>
              <span style={{ color: action.color || 'var(--text3)' }}>{action.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAB toggle */}
      <button
        onClick={() => { triggerHaptic('light'); setExpanded(!expanded); }}
        className={`
          flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-200
          ${expanded
            ? 'bg-[var(--bg3)] border border-[var(--border)] rotate-45'
            : 'bg-[var(--green)] text-white hover:brightness-110'
          }
        `}
        aria-label={expanded ? 'Close actions' : 'Quick actions'}
      >
        {expanded ? (
          <X size={20} className="text-[var(--text)]" />
        ) : (
          <Plus size={22} />
        )}
      </button>
    </div>
  );
}

export default ContextualActions;

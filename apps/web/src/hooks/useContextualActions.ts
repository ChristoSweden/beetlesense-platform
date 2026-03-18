import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Satellite,
  Sparkles,
  Plus,
  Download,
  FileJson,
  Share2,
  Phone,
  CheckCheck,
  ClipboardList,
  UserCheck,
  Ruler,
  Map,
  HelpCircle,
} from 'lucide-react';
import { useAlerts } from './useAlerts';
import { useForestHealthScore } from './useForestHealthScore';
import { useReducedMotion } from './useReducedMotion';

// ─── Types ───

export interface ContextualAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  priority: number; // lower = higher priority
}

export interface UseContextualActionsReturn {
  actions: ContextualAction[];
  dismiss: () => void;
  visible: boolean;
}

// ─── Session dismissal tracking ───

const DISMISSED_KEY = 'beetlesense-ctx-actions-dismissed';

function getDismissedActions(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissedAction(id: string) {
  try {
    const dismissed = getDismissedActions();
    dismissed.add(id);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Ignore storage errors
  }
}

// ─── Hook ───

export function useContextualActions(): UseContextualActionsReturn {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount, alerts, markAllAsRead } = useAlerts();
  const { score: healthScore } = useForestHealthScore();
  const prefersReducedMotion = useReducedMotion();

  const [visible, setVisible] = useState(false);
  const [idleHelpShown, setIdleHelpShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityRef = useRef(Date.now());

  const pathname = location.pathname;

  // Reset visibility on route change
  useEffect(() => {
    setVisible(false);
    setDismissed(false);
    setIdleHelpShown(false);

    // Small delay before showing actions so the page has time to render
    const showTimer = setTimeout(() => {
      setVisible(true);
    }, prefersReducedMotion ? 0 : 600);

    return () => clearTimeout(showTimer);
  }, [pathname, prefersReducedMotion]);

  // Auto-dismiss after 10 seconds idle (from last interaction with actions area)
  useEffect(() => {
    if (!visible || dismissed) return;

    autoDismissRef.current = setTimeout(() => {
      setDismissed(true);
    }, 10_000);

    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [visible, dismissed]);

  // Idle help after 30 seconds on any page
  useEffect(() => {
    if (idleHelpShown) return;

    function resetIdle() {
      activityRef.current = Date.now();
    }

    window.addEventListener('mousemove', resetIdle, { passive: true });
    window.addEventListener('keydown', resetIdle, { passive: true });
    window.addEventListener('touchstart', resetIdle, { passive: true });

    idleTimerRef.current = setInterval(() => {
      if (Date.now() - activityRef.current >= 30_000) {
        setIdleHelpShown(true);
        setDismissed(false);
        setVisible(true);
      }
    }, 5_000);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [pathname, idleHelpShown]);

  const openCompanion = useCallback(
    (prompt?: string) => {
      navigate('/owner/companion', prompt ? { state: { prompt } } : undefined);
    },
    [navigate],
  );

  // Build actions based on current route and state
  const allActions = useMemo<ContextualAction[]>(() => {
    const acts: ContextualAction[] = [];
    const dismissedSet = getDismissedActions();

    // ── Dashboard / Today ──
    if (pathname === '/owner/dashboard' || pathname === '/owner/today') {
      if (unreadCount > 0) {
        acts.push({
          id: 'dashboard-unread-alerts',
          label: `${unreadCount} olästa varningar`,
          icon: AlertTriangle,
          onClick: () => navigate('/owner/alerts'),
          priority: 1,
        });
      }
      if (healthScore < 70) {
        acts.push({
          id: 'dashboard-order-survey',
          label: 'Beställ drönarsurvey',
          icon: Satellite,
          onClick: () => navigate('/owner/surveys/new'),
          priority: 2,
        });
      }
      acts.push({
        id: 'dashboard-ask-ai',
        label: 'Fråga AI om din skog',
        icon: Sparkles,
        onClick: () => openCompanion('Hur mår min skog just nu?'),
        priority: 3,
      });
    }

    // ── Parcels list ──
    if (pathname === '/owner/parcels') {
      acts.push({
        id: 'parcels-add',
        label: 'Lägg till nytt skifte',
        icon: Plus,
        onClick: () => navigate('/owner/parcels/new'),
        priority: 1,
      });
      acts.push({
        id: 'parcels-export',
        label: 'Exportera alla skiften',
        icon: Download,
        onClick: () => {
          // Dispatch a custom event that the parcels page can listen for
          window.dispatchEvent(new CustomEvent('beetlesense:export-parcels'));
        },
        priority: 2,
      });
    }

    // ── Single parcel ──
    if (/^\/owner\/parcels\/[^/]+$/.test(pathname) && pathname !== '/owner/parcels/new') {
      acts.push({
        id: 'parcel-order-survey',
        label: 'Beställ undersökning',
        icon: ClipboardList,
        onClick: () => navigate(`${pathname}/survey`),
        priority: 1,
      });
      acts.push({
        id: 'parcel-export-geojson',
        label: 'Exportera GeoJSON',
        icon: FileJson,
        onClick: () => {
          window.dispatchEvent(
            new CustomEvent('beetlesense:export-geojson', {
              detail: { parcelPath: pathname },
            }),
          );
        },
        priority: 2,
      });
      acts.push({
        id: 'parcel-share-advisor',
        label: 'Dela med rådgivare',
        icon: Share2,
        onClick: () => {
          window.dispatchEvent(
            new CustomEvent('beetlesense:share-parcel', {
              detail: { parcelPath: pathname },
            }),
          );
        },
        priority: 3,
      });
    }

    // ── Alerts ──
    if (pathname === '/owner/alerts') {
      const hasCritical = alerts.some((a) => a.severity === 'critical' && !a.is_read);
      if (hasCritical) {
        acts.push({
          id: 'alerts-call-agency',
          label: 'Ring Skogsstyrelsen',
          icon: Phone,
          onClick: () => {
            window.open('tel:+4636359300', '_self');
          },
          priority: 1,
        });
      }
      acts.push({
        id: 'alerts-mark-all-read',
        label: 'Markera alla som lästa',
        icon: CheckCheck,
        onClick: () => {
          markAllAsRead();
          persistDismissedAction('alerts-mark-all-read');
        },
        priority: 2,
      });
    }

    // ── Surveys ──
    if (pathname === '/owner/surveys') {
      acts.push({
        id: 'surveys-new',
        label: 'Ny undersökning',
        icon: ClipboardList,
        onClick: () => navigate('/owner/surveys/new'),
        priority: 1,
      });
      acts.push({
        id: 'surveys-book-pilot',
        label: 'Boka drönarpilot',
        icon: UserCheck,
        onClick: () => navigate('/owner/surveys/new?step=pilot'),
        priority: 2,
      });
    }

    // ── Map ──
    if (pathname === '/owner/map') {
      acts.push({
        id: 'map-measure',
        label: 'Mätverktyg',
        icon: Ruler,
        onClick: () => {
          window.dispatchEvent(new CustomEvent('beetlesense:map-measure'));
        },
        priority: 1,
      });
      acts.push({
        id: 'map-download',
        label: 'Ladda ner karta',
        icon: Map,
        onClick: () => {
          window.dispatchEvent(new CustomEvent('beetlesense:map-download'));
        },
        priority: 2,
      });
    }

    // ── Idle help (any page) ──
    if (idleHelpShown) {
      acts.push({
        id: 'idle-help',
        label: 'Behöver du hjälp?',
        icon: HelpCircle,
        onClick: () => openCompanion(),
        priority: 99,
      });
    }

    // Filter out dismissed actions and limit to 3
    return acts
      .filter((a) => !dismissedSet.has(a.id))
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);
  }, [
    pathname,
    unreadCount,
    healthScore,
    alerts,
    idleHelpShown,
    navigate,
    openCompanion,
    markAllAsRead,
  ]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    // Persist all currently-shown action IDs so they don't reappear this session
    for (const action of allActions) {
      persistDismissedAction(action.id);
    }
  }, [allActions]);

  return {
    actions: allActions,
    dismiss,
    visible: visible && !dismissed && allActions.length > 0,
  };
}

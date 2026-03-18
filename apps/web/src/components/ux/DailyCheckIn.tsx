import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Flame,
  X,
  TreePine,
  Bell,
  TrendingUp,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  CheckCircle2,
} from 'lucide-react';
import { triggerHaptic } from '@/components/common/Haptics';

const STORAGE_KEY = 'bs-daily-checkin';
const STREAK_KEY = 'bs-streak';

interface StreakData {
  current: number;
  longest: number;
  lastDate: string; // YYYY-MM-DD
  totalDays: number;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadStreak(): StreakData {
  try {
    const stored = localStorage.getItem(STREAK_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { current: 0, longest: 0, lastDate: '', totalDays: 0 };
}

function saveStreak(data: StreakData) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

function recordCheckIn(): StreakData {
  const today = getToday();
  const streak = loadStreak();

  if (streak.lastDate === today) return streak; // Already checked in today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const newCurrent = streak.lastDate === yesterdayStr ? streak.current + 1 : 1;
  const updated: StreakData = {
    current: newCurrent,
    longest: Math.max(streak.longest, newCurrent),
    lastDate: today,
    totalDays: streak.totalDays + 1,
  };

  saveStreak(updated);
  localStorage.setItem(STORAGE_KEY, today);
  return updated;
}

function hasCheckedInToday(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === getToday();
  } catch {
    return false;
  }
}

// Weather-based greeting
function getWeatherIcon() {
  const month = new Date().getMonth();
  if (month >= 11 || month <= 2) return <Snowflake size={20} className="text-blue-300" />;
  if (month >= 3 && month <= 4) return <Cloud size={20} className="text-gray-400" />;
  if (month >= 9 && month <= 10) return <CloudRain size={20} className="text-blue-400" />;
  return <Sun size={20} className="text-yellow-400" />;
}

function getGreeting(t: (key: string, options?: any) => string): string {
  const hour = new Date().getHours();
  if (hour < 10) return t('checkin.goodMorning', 'Good morning');
  if (hour < 17) return t('checkin.goodDay', 'Good day');
  return t('checkin.goodEvening', 'Good evening');
}

// Simulated daily insights
function getDailyInsights(t: (key: string, options?: any) => string) {
  return [
    {
      icon: <Bell size={16} className="text-amber-400" />,
      text: t('checkin.alertsToday', '2 new alerts since yesterday'),
      action: '/owner/alerts',
    },
    {
      icon: <TreePine size={16} className="text-emerald-400" />,
      text: t('checkin.forestHealthOk', 'Forest health score: 87/100'),
      action: '/owner/dashboard',
    },
    {
      icon: <TrendingUp size={16} className="text-blue-400" />,
      text: t('checkin.timberUpdate', 'Timber prices up 2.3% this week'),
      action: '/owner/timber-market',
    },
  ];
}

export function DailyCheckIn() {
  const [visible, setVisible] = useState(false);
  const [streak, setStreak] = useState<StreakData>(loadStreak);
  const [checkedIn, setCheckedIn] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Show check-in after a short delay if user hasn't checked in today
    if (!hasCheckedInToday()) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCheckIn = () => {
    const updated = recordCheckIn();
    setStreak(updated);
    setCheckedIn(true);
    triggerHaptic('medium');
    // Auto-close after showing streak
    setTimeout(() => setVisible(false), 3000);
  };

  const handleDismiss = () => {
    // Still record the visit even if dismissed
    recordCheckIn();
    setVisible(false);
  };

  if (!visible) return null;

  const insights = getDailyInsights(t);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <div className="fixed inset-x-0 top-[20vh] z-[91] mx-auto w-full max-w-sm px-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-[var(--green)]/10 to-transparent">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              {getWeatherIcon()}
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {getGreeting(t)}
              </h2>
            </div>

            {/* Streak display */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Flame size={20} className={streak.current > 0 ? 'text-orange-400' : 'text-[var(--text3)]'} />
                <div>
                  <div className="text-2xl font-bold text-[var(--text)] tabular-nums">
                    {checkedIn ? streak.current : streak.current}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text3)]">
                    {t('checkin.dayStreak', 'day streak')}
                  </div>
                </div>
              </div>
              <div className="text-xs text-[var(--text3)]">
                {t('checkin.best', 'Best')}: {streak.longest} {t('checkin.days', 'days')}
              </div>
            </div>
          </div>

          {/* Daily insights */}
          {!checkedIn && (
            <div className="px-6 py-3 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">
                {t('checkin.todaySummary', "Today's summary")}
              </p>
              {insights.map((insight, i) => (
                <button
                  key={i}
                  onClick={() => {
                    recordCheckIn();
                    navigate(insight.action);
                    setVisible(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[var(--text2)] hover:bg-[var(--bg3)] transition"
                >
                  {insight.icon}
                  <span className="flex-1">{insight.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Check-in button or success */}
          <div className="px-6 py-4">
            {checkedIn ? (
              <div className="flex items-center justify-center gap-2 py-2 text-[var(--green)]">
                <CheckCircle2 size={20} />
                <span className="text-sm font-medium">
                  {streak.current > 1
                    ? t('checkin.streakContinued', '{{count}} day streak!', { count: streak.current })
                    : t('checkin.checkedIn', 'Checked in!')}
                </span>
              </div>
            ) : (
              <button
                onClick={handleCheckIn}
                className="w-full rounded-lg bg-[var(--green)] py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
              >
                {t('checkin.checkIn', 'Check in today')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** Small streak badge for the sidebar or topbar */
export function StreakBadge() {
  const streak = loadStreak();
  const today = getToday();
  const isActive = streak.lastDate === today;

  if (streak.current === 0 && !isActive) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-[var(--bg3)] border border-[var(--border)] px-2.5 py-1">
      <Flame size={14} className={isActive ? 'text-orange-400' : 'text-[var(--text3)]'} />
      <span className="text-xs font-semibold tabular-nums text-[var(--text2)]">
        {streak.current}
      </span>
    </div>
  );
}

export default DailyCheckIn;

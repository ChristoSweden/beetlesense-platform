import React, { useState, useEffect } from 'react';
import { Bell, Rocket, Sparkles, Bug, X } from 'lucide-react';

interface ChangelogEntry {
  date: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'fix';
}

const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-03-30',
    title: 'ForestWard Observatory',
    description: 'Carbon intelligence dashboard with EU FORWARDS/ROB4GREEN data',
    type: 'feature',
  },
  {
    date: '2026-03-30',
    title: 'AI Forest Predictor',
    description: '7-day forest health risk forecast using SMHI + beetle data',
    type: 'feature',
  },
  {
    date: '2026-03-30',
    title: 'Interactive Threat Map',
    description: 'SVG map of Sweden showing fire, beetle, and healthy zones',
    type: 'feature',
  },
  {
    date: '2026-03-30',
    title: 'Carbon Calculator',
    description: 'Calculate CO2 sequestration for your forest area',
    type: 'feature',
  },
  {
    date: '2026-03-30',
    title: 'Live Data Sources',
    description: 'Real-time SMHI, NASA FIRMS, and Skogsstyrelsen integration',
    type: 'improvement',
  },
];

type IconType = 'feature' | 'improvement' | 'fix';

const TYPE_CONFIG: Record<
  IconType,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  feature: {
    icon: <Rocket size={16} />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  improvement: {
    icon: <Sparkles size={16} />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
  },
  fix: {
    icon: <Bug size={16} />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20',
  },
};

export const WhatsNew: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Get last seen timestamp from localStorage
    const lastSeen = localStorage.getItem('whatsNewLastSeen');
    const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;

    // Count entries that are newer than last seen
    const unread = CHANGELOG.filter(entry => {
      const entryTime = new Date(entry.date).getTime();
      return entryTime > lastSeenTime;
    }).length;

    setUnreadCount(unread);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    // Update last seen timestamp
    localStorage.setItem('whatsNewLastSeen', new Date().toISOString());
    setUnreadCount(0);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Bell Icon Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-[#1a3a1d] transition-colors"
        aria-label="What's New"
        title="What's New"
      >
        <Bell size={20} className="text-[var(--text)]" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={handleClose}>
          {/* Mobile overlay */}
        </div>
      )}

      {isOpen && (
        <div
          className={`
            absolute top-12 right-0 z-50 w-96 max-w-[calc(100vw-2rem)]
            rounded-xl border border-[var(--border)]
            bg-[var(--bg2)] shadow-xl
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
          `}
        >
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg1)]">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-blue-400" />
              <h3 className="font-semibold text-[var(--text)]">What's New</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-[#1a3a1d] transition-colors"
              aria-label="Close"
            >
              <X size={16} className="text-[var(--text3)]" />
            </button>
          </div>

          {/* Changelog List */}
          <div className="max-h-96 overflow-y-auto">
            {CHANGELOG.length === 0 ? (
              <div className="px-4 py-8 text-center text-[var(--text3)]">
                No updates yet. Check back soon!
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {CHANGELOG.map((entry, idx) => {
                  const config = TYPE_CONFIG[entry.type];
                  return (
                    <div
                      key={idx}
                      className={`
                        px-4 py-3 hover:bg-[var(--bg2)] transition-colors
                        cursor-default
                      `}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div
                          className={`
                            flex items-center justify-center shrink-0 w-8 h-8
                            rounded border ${config.bgColor}
                          `}
                        >
                          <div className={config.color}>{config.icon}</div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-[var(--text)]">
                              {entry.title}
                            </h4>
                            <span className="text-xs text-[var(--text3)] shrink-0">
                              {new Date(entry.date).toLocaleDateString('sv-SE')}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text2)] leading-snug">
                            {entry.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg1)] text-center">
            <p className="text-xs text-[var(--text3)]">
              Last updated: {new Date().toLocaleDateString('sv-SE')}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default WhatsNew;

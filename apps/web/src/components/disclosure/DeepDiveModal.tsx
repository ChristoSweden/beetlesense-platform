import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

export type DeepDiveTab = 'overview' | 'sensors' | 'history' | 'comparison';

export interface DeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Content renderers for each tab */
  overviewContent?: ReactNode;
  sensorContent?: ReactNode;
  historyContent?: ReactNode;
  comparisonContent?: ReactNode;
  /** Default active tab */
  defaultTab?: DeepDiveTab;
}

interface TabDef {
  id: DeepDiveTab;
  label: string;
  icon: ReactNode;
}

const TABS: TabDef[] = [
  {
    id: 'overview',
    label: '\u00D6versikt',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'sensors',
    label: 'Sensordata',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'Historik',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'comparison',
    label: 'J\u00E4mf\u00F6relse',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
];

export function DeepDiveModal({
  isOpen,
  onClose,
  title,
  overviewContent,
  sensorContent,
  historyContent,
  comparisonContent,
  defaultTab = 'overview',
}: DeepDiveModalProps) {
  const [activeTab, setActiveTab] = useState<DeepDiveTab>(defaultTab);
  const backdropRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset tab on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const tabContent: Record<DeepDiveTab, ReactNode> = {
    overview: overviewContent,
    sensors: sensorContent,
    history: historyContent,
    comparison: comparisonContent,
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="
        fixed inset-0 z-50
        bg-black/70 backdrop-blur-sm
        flex items-start justify-center
        p-4 pt-8 md:p-8
        overflow-y-auto
        animate-fade-in
      "
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="
          w-full max-w-5xl
          bg-[#030d05] border border-green-800/30
          rounded-2xl shadow-2xl shadow-black/50
          flex flex-col
          max-h-[90vh]
          animate-slide-up
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-green-800/20">
          <h2 className="text-lg font-semibold text-green-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="
              w-8 h-8 flex items-center justify-center rounded-lg
              text-green-500 hover:text-green-300 hover:bg-green-900/30
              transition-colors
            "
            aria-label="St\u00E4ng"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-green-800/20 px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-3
                text-sm font-medium transition-colors
                border-b-2 -mb-px
                ${
                  activeTab === tab.id
                    ? 'border-green-400 text-green-300'
                    : 'border-transparent text-green-600 hover:text-green-400 hover:border-green-700'
                }
              `}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {tabContent[activeTab] ?? (
            <div className="flex items-center justify-center h-48 text-green-600/50 text-sm">
              Inget inneh&aring;ll tillg&auml;ngligt f&ouml;r denna flik.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-green-800/20">
          <span className="text-[10px] text-green-700/50 uppercase tracking-wide">
            BeetleSense.ai — Djupdykning
          </span>
          <button
            type="button"
            onClick={onClose}
            className="
              px-4 py-1.5 rounded-lg text-xs font-medium
              bg-green-900/30 text-green-300
              hover:bg-green-900/50 transition-colors
              border border-green-800/20
            "
          >
            St&auml;ng
          </button>
        </div>
      </div>
    </div>
  );
}
export default DeepDiveModal;

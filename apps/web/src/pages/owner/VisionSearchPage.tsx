import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Scan, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VisionSearch } from '@/components/vision/VisionSearch';
import { IdentificationHistory } from '@/components/vision/IdentificationHistory';

type Tab = 'identify' | 'history';

export default function VisionSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('identify');
  const [showCamera, setShowCamera] = useState(false);

  const handleLearnMore = useCallback(
    (context: string) => {
      // Navigate to companion chat with context pre-filled
      // The companion panel can read this from query params or state
      navigate('/owner/dashboard', { state: { companionContext: context } });
    },
    [navigate],
  );

  // Full-screen camera mode
  if (showCamera) {
    return (
      <VisionSearch
        onClose={() => setShowCamera(false)}
        onLearnMore={handleLearnMore}
      />
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard', 'Dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Vision Search</span>
      </nav>

      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-2">Vision Search</h1>
      <p className="text-xs text-[var(--text3)] mb-6">
        Point your camera at a tree, plant, animal, or diseased bark for instant identification.
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('identify')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'identify'
              ? 'border-[var(--green)] text-[var(--green)]'
              : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
          }`}
        >
          <Scan size={14} />
          Identify
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'history'
              ? 'border-[var(--green)] text-[var(--green)]'
              : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
          }`}
        >
          <History size={14} />
          History
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'identify' && (
        <div className="space-y-6">
          {/* Open camera CTA */}
          <button
            onClick={() => setShowCamera(true)}
            className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            <Scan size={22} />
            Open Camera & Identify
          </button>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center mb-3">
                <Scan size={16} className="text-[var(--green)]" />
              </div>
              <h3 className="text-xs font-semibold text-[var(--text)] mb-1">Species ID</h3>
              <p className="text-[10px] text-[var(--text3)] leading-relaxed">
                Identify 50+ Nordic tree, plant, and animal species with AI-powered recognition.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="text-xs font-semibold text-[var(--text)] mb-1">Disease Detection</h3>
              <p className="text-[10px] text-[var(--text3)] leading-relaxed">
                Detect bark beetle damage, fungal infections, drought stress, and nutrient deficiency.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h3 className="text-xs font-semibold text-[var(--text)] mb-1">Reports</h3>
              <p className="text-[10px] text-[var(--text3)] leading-relaxed">
                Report regulated pests directly to Skogsstyrelsen with one tap.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h3 className="text-xs font-semibold text-[var(--text)] mb-1">Works Offline</h3>
              <p className="text-[10px] text-[var(--text3)] leading-relaxed">
                Capture photos offline. Identification queues and syncs when back online.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && <IdentificationHistory />}
    </div>
  );
}

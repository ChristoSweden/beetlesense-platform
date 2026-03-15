import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NewsFeed } from '@/components/news/NewsFeed';
import { CompanionPanel } from '@/components/companion/CompanionPanel';
import { Newspaper, Sparkles } from 'lucide-react';

/**
 * NewsPage — Forestry news feed for forest owners.
 *
 * Route: /owner/news
 * Note: Route registration should be added to apps/web/src/App.tsx:
 *   <Route path="news" element={<NewsPage />} />
 */
export default function NewsPage() {
  const { t } = useTranslation();
  const [companionOpen, setCompanionOpen] = useState(false);
  const [companionContext, setCompanionContext] = useState<string | null>(null);

  const handleAskAI = (article: { title: string; snippet: string; url: string }) => {
    setCompanionContext(
      `I'd like to discuss this forestry news article:\n\n` +
        `Title: ${article.title}\n` +
        `Summary: ${article.snippet}\n` +
        `Source: ${article.url}\n\n` +
        `What are the implications for Swedish forest owners?`,
    );
    setCompanionOpen(true);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: '#4ade8015', color: '#4ade80' }}
              >
                <Newspaper size={18} />
              </div>
              <div>
                <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                  Forestry News
                </h1>
                <p className="text-xs text-[var(--text3)]">
                  Latest curated forestry intelligence from across Scandinavia and Europe
                </p>
              </div>
            </div>
            <button
              onClick={() => setCompanionOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/10 transition-colors"
            >
              <Sparkles size={14} />
              Ask AI
            </button>
          </div>

          {/* News feed */}
          <div className="mt-6">
            <NewsFeed onAskAI={handleAskAI} />
          </div>
        </div>
      </div>

      {/* AI Companion Panel */}
      <CompanionPanel
        isOpen={companionOpen}
        onToggle={() => setCompanionOpen(!companionOpen)}
      />
    </div>
  );
}

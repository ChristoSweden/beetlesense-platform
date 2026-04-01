import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  WifiOff,
  ChevronRight,
  Send,
  Clock,
  ArrowLeft,
  MessageSquarePlus,
} from 'lucide-react';
import { useFieldModeStore, type QueuedAIQuestion } from '@/stores/fieldModeStore';
import { useNetworkStatus } from '@/lib/offlineSync';

// ─── Sensor context helpers ───

function deriveSensorSummary(cachedSensorData: any) {
  if (!cachedSensorData) return null;

  // Extract representative NDVI
  let ndvi: number | null = null;
  let thermalSigma: number | null = null;

  for (const sp of cachedSensorData.sensorProducts) {
    const meta = sp.metadata as Record<string, unknown>;
    if ((sp.sensor_type === 'multispectral' || sp.product_name.toLowerCase().includes('ndvi')) && ndvi === null) {
      ndvi = typeof meta.mean_ndvi === 'number' ? meta.mean_ndvi : null;
    }
    if ((sp.sensor_type === 'thermal' || sp.product_name.toLowerCase().includes('thermal')) && thermalSigma === null) {
      thermalSigma = typeof meta.anomaly_sigma === 'number' ? meta.anomaly_sigma : null;
    }
  }

  const inv = cachedSensorData.treeInventorySummary;
  const stressedPct = inv && inv.stressed_count !== null && inv.tree_count > 0
    ? Math.round((inv.stressed_count / inv.tree_count) * 100)
    : null;

  return { ndvi, thermalSigma, stressedPct, treeCount: inv?.tree_count ?? null };
}

function buildSensorWarnings(summary: ReturnType<typeof deriveSensorSummary>): string[] {
  if (!summary) return [];
  const warnings: string[] = [];

  if (summary.ndvi !== null && summary.ndvi < 0.5) {
    warnings.push('Lågt NDVI-värde detekterat — kontrollera efter barkborreskador i området.');
  }
  if (summary.thermalSigma !== null && summary.thermalSigma > 1.5) {
    warnings.push(`Termisk anomali (+${summary.thermalSigma.toFixed(1)}σ) i närheten — möjlig angrepp.`);
  }
  if (summary.stressedPct !== null && summary.stressedPct > 10) {
    warnings.push(`${summary.stressedPct}% av träden visar stressymptom.`);
  }

  return warnings;
}

export function FieldAI() {
  const { t } = useTranslation();
  const { cachedAIResponses, queuedAIQuestions, addQueuedQuestion, cachedSensorData } =
    useFieldModeStore();
  const { isOnline } = useNetworkStatus();

  const sensorSummary = deriveSensorSummary(cachedSensorData);
  const sensorWarnings = buildSensorWarnings(sensorSummary);

  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find selected cached response
  const selectedResponse = cachedAIResponses.find(
    (r) => r.questionKey === selectedQuestion,
  );

  // Submit custom question (queued for when online)
  const submitCustomQuestion = useCallback(() => {
    if (!customQuestion.trim()) return;

    const question: QueuedAIQuestion = {
      id: `aq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      question: customQuestion.trim(),
      timestamp: Date.now(),
    };

    addQueuedQuestion(question);
    setCustomQuestion('');
    setShowCustomInput(false);
  }, [customQuestion, addQueuedQuestion]);

  // ─── Detail view ───
  if (selectedResponse) {
    return (
      <div className="h-full flex flex-col bg-[#020a03]">
        {/* Back header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <button
            onClick={() => setSelectedQuestion(null)}
            className="flex items-center gap-2 text-[var(--green)] min-h-[44px]"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t('common.back')}</span>
          </button>
        </div>

        {/* Offline indicator */}
        {!isOnline && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--amber)]/10 border-b border-[var(--amber)]/20">
            <WifiOff size={12} className="text-[var(--amber)]" />
            <span className="text-[10px] font-medium text-[var(--amber)]">
              {t('field.ai.offlineCached')}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Question */}
          <h2 className="text-base font-bold text-white mb-4">
            {selectedResponse.question}
          </h2>

          {/* Answer — render markdown-like formatting */}
          <div className="prose-field space-y-3">
            {selectedResponse.answer.split('\n\n').map((block, i) => {
              // Bold headers
              if (block.startsWith('**') && block.includes(':**')) {
                const parts = block.split(':**');
                const header = parts[0].replace(/\*\*/g, '');
                const rest = parts.slice(1).join(':**');
                return (
                  <div key={i}>
                    <h3 className="text-sm font-bold text-[var(--green)] mb-1">
                      {header}:
                    </h3>
                    {rest && (
                      <p className="text-sm text-[var(--text2)] leading-relaxed">
                        {renderInlineFormatting(rest.trim())}
                      </p>
                    )}
                  </div>
                );
              }

              // Lists (lines starting with - or number.)
              if (
                block.includes('\n') &&
                block.split('\n').some((l) => /^(\d+\.|-)/.test(l.trim()))
              ) {
                return (
                  <div key={i} className="space-y-1.5">
                    {block.split('\n').map((line, li) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;
                      const isBullet =
                        trimmed.startsWith('- ') || /^\d+\./.test(trimmed);
                      return (
                        <p
                          key={li}
                          className={`text-sm leading-relaxed ${
                            isBullet
                              ? 'pl-4 text-[var(--text2)]'
                              : 'text-white font-medium'
                          }`}
                        >
                          {renderInlineFormatting(trimmed)}
                        </p>
                      );
                    })}
                  </div>
                );
              }

              // Regular paragraph
              return (
                <p
                  key={i}
                  className="text-sm text-[var(--text2)] leading-relaxed"
                >
                  {renderInlineFormatting(block)}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Question list view ───
  return (
    <div className="h-full flex flex-col bg-[#020a03]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <Bot size={18} className="text-[var(--green)]" />
          <h2 className="text-base font-bold text-white">
            {t('field.ai.title')}
          </h2>
        </div>
        <p className="text-[10px] text-[var(--text3)]">
          {t('field.ai.subtitle')}
        </p>

        {/* Sensor data summary line */}
        {sensorSummary && (
          <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-[#030d05] border border-[var(--border)] w-fit">
            <span className="text-[10px] font-mono text-[var(--text2)]">
              Senaste sensordata:{' '}
              {sensorSummary.ndvi !== null && (
                <span className={sensorSummary.ndvi < 0.5 ? 'text-[var(--red)]' : 'text-[var(--green)]'}>
                  NDVI {sensorSummary.ndvi.toFixed(2)}
                </span>
              )}
              {sensorSummary.ndvi !== null && sensorSummary.thermalSigma !== null && ', '}
              {sensorSummary.thermalSigma !== null && (
                <span className={sensorSummary.thermalSigma > 1.5 ? 'text-[var(--red)]' : 'text-[var(--amber)]'}>
                  Termisk anomali +{sensorSummary.thermalSigma.toFixed(1)}σ
                </span>
              )}
            </span>
          </div>
        )}

        {/* Offline indicator */}
        {!isOnline && (
          <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-[var(--amber)]/10 w-fit">
            <WifiOff size={10} className="text-[var(--amber)]" />
            <span className="text-[10px] font-medium text-[var(--amber)]">
              {t('field.ai.offlineCached')}
            </span>
          </div>
        )}
      </div>

      {/* Cached questions list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {/* Sensor-based warnings */}
        {sensorWarnings.length > 0 && (
          <div className="mb-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-[var(--red)] uppercase tracking-wider">
              Sensorvarningar
            </p>
            {sensorWarnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-xl border border-[var(--red)]/20 bg-[var(--red)]/5"
              >
                <span className="text-[var(--red)] text-xs mt-0.5">⚠</span>
                <p className="text-xs text-[var(--text2)] leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
          {t('field.ai.commonQuestions')}
        </p>

        {cachedAIResponses.map((response) => (
          <button
            key={response.questionKey}
            onClick={() => setSelectedQuestion(response.questionKey)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border)] bg-[#0f2212] text-left min-h-[48px] hover:bg-[var(--bg3)] active:bg-[var(--green)]/5 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {response.question}
              </p>
            </div>
            <ChevronRight
              size={16}
              className="text-[var(--text3)] flex-shrink-0"
            />
          </button>
        ))}

        {/* Queued questions section */}
        {queuedAIQuestions.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-[var(--amber)] uppercase tracking-wider mt-4 mb-2">
              {t('field.ai.queued')} ({queuedAIQuestions.length})
            </p>
            {queuedAIQuestions.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--amber)]/20 bg-[var(--amber)]/5"
              >
                <Clock size={14} className="text-[var(--amber)] flex-shrink-0" />
                <p className="text-sm text-[var(--text2)] flex-1 truncate">
                  {q.question}
                </p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Custom question input */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        {showCustomInput ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitCustomQuestion()}
              placeholder={t('field.ai.askPlaceholder')}
              className="flex-1 px-3 py-2.5 rounded-xl bg-[#030d05] border border-[var(--border)] text-sm text-white placeholder-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40 min-h-[44px]"
              autoFocus
            />
            <button
              onClick={submitCustomQuestion}
              disabled={!customQuestion.trim()}
              className="w-11 h-11 rounded-xl bg-[var(--green)] text-forest-900 flex items-center justify-center disabled:opacity-40 active:brightness-90 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setShowCustomInput(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[var(--border)] text-[var(--text2)] text-sm min-h-[48px] hover:border-[var(--green)]/30 hover:text-[var(--green)] transition-colors"
          >
            <MessageSquarePlus size={16} />
            {t('field.ai.askCustom')}
          </button>
        )}
        {!isOnline && showCustomInput && (
          <p className="text-[10px] text-[var(--amber)] mt-1.5 text-center">
            {t('field.ai.queuedOffline')}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Inline text formatting helper ───

function renderInlineFormatting(text: string): React.ReactNode {
  // Simple bold rendering: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

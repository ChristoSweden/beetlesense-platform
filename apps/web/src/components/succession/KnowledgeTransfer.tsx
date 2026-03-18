import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  MapPin,
  TreePine,
  Wrench,
  Rabbit,
  Users,
} from 'lucide-react';
import { KNOWLEDGE_ITEMS, type KnowledgeItem } from '@/services/successionService';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Fastigheten: <MapPin size={14} />,
  'The Property': <MapPin size={14} />,
  Infrastruktur: <Wrench size={14} />,
  Infrastructure: <Wrench size={14} />,
  Skogsbruk: <TreePine size={14} />,
  Forestry: <TreePine size={14} />,
  Kontakter: <Users size={14} />,
  Contacts: <Users size={14} />,
  'Jakt och natur': <Rabbit size={14} />,
  'Hunting and nature': <Rabbit size={14} />,
};

export function KnowledgeTransfer() {
  const { t, i18n } = useTranslation();
  const isSv = i18n.language === 'sv';
  const [documented, setDocumented] = useState<Record<string, boolean>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggle = (id: string) =>
    setDocumented((prev) => ({ ...prev, [id]: !prev[id] }));

  const documentedCount = Object.values(documented).filter(Boolean).length;
  const totalItems = KNOWLEDGE_ITEMS.length;

  // Group by category
  const categories = KNOWLEDGE_ITEMS.reduce<Record<string, KnowledgeItem[]>>((acc, item) => {
    const cat = isSv ? item.categorySv : item.categoryEn;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-[var(--green)]" />
          <span className="text-sm font-semibold text-[var(--text)]">
            {t('succession.knowledge.title')}
          </span>
        </div>
        <p className="text-xs text-[var(--text3)] mb-3">
          {t('succession.knowledge.description')}
        </p>

        <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
            style={{ width: `${totalItems > 0 ? (documentedCount / totalItems) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-[var(--text3)]">
          {documentedCount}/{totalItems} {t('succession.knowledge.documented')}
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {Object.entries(categories).map(([category, items]) => {
          const isExpanded = expandedCategory === category;
          const catComplete = items.filter((item) => documented[item.id]).length;

          return (
            <div
              key={category}
              className="rounded-xl border border-[var(--border)] overflow-hidden"
              style={{ background: 'var(--bg2)' }}
            >
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[var(--green)]">
                    {CATEGORY_ICONS[category] ?? <BookOpen size={14} />}
                  </span>
                  <span className="text-sm font-medium text-[var(--text)]">{category}</span>
                  <span className="text-[10px] font-mono text-[var(--text3)]">
                    {catComplete}/{items.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-[var(--text3)]" />
                ) : (
                  <ChevronDown size={16} className="text-[var(--text3)]" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-3 transition-all ${
                        documented[item.id]
                          ? 'border-[var(--green)]/20 bg-[var(--green)]/5'
                          : 'border-[var(--border)] bg-[var(--bg)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggle(item.id)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {documented[item.id] ? (
                            <CheckCircle2 size={16} className="text-[var(--green)]" />
                          ) : (
                            <Circle size={16} className="text-[var(--text3)] hover:text-[var(--text2)]" />
                          )}
                        </button>
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              documented[item.id]
                                ? 'text-[var(--text3)] line-through'
                                : 'text-[var(--text)]'
                            }`}
                          >
                            {isSv ? item.titleSv : item.titleEn}
                          </p>
                          <p className="text-xs text-[var(--text3)] mt-1">
                            {isSv ? item.descriptionSv : item.descriptionEn}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Template prompt */}
      <div className="rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5 p-4">
        <h4 className="text-sm font-semibold text-[var(--text)] mb-2">
          {t('succession.knowledge.templateTitle')}
        </h4>
        <p className="text-xs text-[var(--text2)] mb-3">
          {t('succession.knowledge.templateDescription')}
        </p>
        <div className="rounded-lg bg-[var(--bg2)] border border-[var(--border)] p-3 text-xs text-[var(--text3)] font-mono whitespace-pre-line">
{isSv
  ? `1. Fastighetens historia och traditioner
2. Gränser som inte syns på kartan
3. Viktiga kontaktpersoner och relationer
4. Erfarenheter av olika skötselmetoder
5. Platser med särskilt värde (natur, kultur, jakt)
6. Kommande planerade åtgärder
7. Avtal och överenskommelser (muntliga)`
  : `1. Property history and traditions
2. Boundaries not visible on maps
3. Key contacts and relationships
4. Experiences with different management methods
5. Sites of special value (nature, culture, hunting)
6. Upcoming planned operations
7. Agreements and arrangements (verbal)`}
        </div>
      </div>
    </div>
  );
}

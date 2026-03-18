import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileCheck,
  ExternalLink,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { REQUIRED_DOCUMENTS, type DocumentItem } from '@/services/successionService';

export function DocumentChecklist() {
  const { t, i18n } = useTranslation();
  const isSv = i18n.language === 'sv';
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const completedCount = Object.values(checked).filter(Boolean).length;
  const requiredDocs = REQUIRED_DOCUMENTS.filter((d) => d.required);
  const optionalDocs = REQUIRED_DOCUMENTS.filter((d) => !d.required);
  const requiredComplete = requiredDocs.filter((d) => checked[d.id]).length;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileCheck size={16} className="text-[var(--green)]" />
            <span className="text-sm font-semibold text-[var(--text)]">
              {t('succession.documents.progress')}
            </span>
          </div>
          <span className="text-xs font-mono text-[var(--text3)]">
            {completedCount}/{REQUIRED_DOCUMENTS.length}
          </span>
        </div>

        <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
            style={{
              width: `${(completedCount / REQUIRED_DOCUMENTS.length) * 100}%`,
            }}
          />
        </div>

        {requiredComplete < requiredDocs.length && (
          <div className="flex items-center gap-2 mt-2">
            <AlertCircle size={12} className="text-[#f59e0b]" />
            <span className="text-[10px] text-[#f59e0b]">
              {requiredDocs.length - requiredComplete} {t('succession.documents.requiredRemaining')}
            </span>
          </div>
        )}

        {requiredComplete === requiredDocs.length && (
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 size={12} className="text-[var(--green)]" />
            <span className="text-[10px] text-[var(--green)]">
              {t('succession.documents.allRequiredComplete')}
            </span>
          </div>
        )}
      </div>

      {/* Required documents */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <AlertCircle size={12} className="text-[#f59e0b]" />
          {t('succession.documents.required')}
        </h4>
        <div className="space-y-2">
          {requiredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              checked={!!checked[doc.id]}
              onToggle={() => toggle(doc.id)}
              isSv={isSv}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* Optional documents */}
      {optionalDocs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <Circle size={12} className="text-[var(--text3)]" />
            {t('succession.documents.optional')}
          </h4>
          <div className="space-y-2">
            {optionalDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                checked={!!checked[doc.id]}
                onToggle={() => toggle(doc.id)}
                isSv={isSv}
                t={t}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentCard({
  doc,
  checked,
  onToggle,
  isSv,
  t,
}: {
  doc: DocumentItem;
  checked: boolean;
  onToggle: () => void;
  isSv: boolean;
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border p-3 transition-all ${
        checked
          ? 'border-[var(--green)]/30 bg-[var(--green)]/5'
          : 'border-[var(--border)]'
      }`}
      style={{ background: checked ? undefined : 'var(--bg2)' }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className="mt-0.5 flex-shrink-0"
          aria-label={checked ? t('succession.documents.markIncomplete') : t('succession.documents.markComplete')}
        >
          {checked ? (
            <CheckCircle2 size={18} className="text-[var(--green)]" />
          ) : (
            <Circle size={18} className="text-[var(--text3)] hover:text-[var(--text2)]" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-medium ${
                  checked ? 'text-[var(--text3)] line-through' : 'text-[var(--text)]'
                }`}
              >
                {isSv ? doc.nameSv : doc.nameEn}
              </span>
              {doc.validityYears && (
                <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                  <Clock size={10} />
                  {doc.validityYears} {t('succession.documents.years')}
                </span>
              )}
            </div>
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-[var(--text2)]">
                {isSv ? doc.descriptionSv : doc.descriptionEn}
              </p>
              <div className="rounded-lg bg-[var(--bg3)] p-2.5">
                <p className="text-[10px] text-[var(--text3)] mb-1">
                  {t('succession.documents.whereToGet')}
                </p>
                <p className="text-xs text-[var(--text2)]">
                  {isSv ? doc.whereToGetSv : doc.whereToGetEn}
                </p>
              </div>
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--green)] hover:underline"
                >
                  <ExternalLink size={10} />
                  {t('succession.documents.visitWebsite')}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

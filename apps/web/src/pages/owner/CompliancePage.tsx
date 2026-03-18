import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useCompliance, type FellingPermit } from '@/hooks/useCompliance';
import { FellingWizard } from '@/components/compliance/FellingWizard';
import { PermitTracker, PermitList } from '@/components/compliance/PermitTracker';
import { EnvironmentalCheck } from '@/components/compliance/EnvironmentalCheck';
import { PERMIT_STATUS_CONFIG, FELLING_TYPES, type PermitStatus } from '@/data/regulatoryRules';

export default function CompliancePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const {
    permits,
    activePermits,
    historicalPermits,
    getComplianceScore,
    saveDraft,
    submitPermit,
    deletePermit,
    isLoading,
    error,
  } = useCompliance();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<FellingPermit | null>(null);
  const [selectedPermit, setSelectedPermit] = useState<FellingPermit | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleWizardSubmit = (permit: FellingPermit) => {
    saveDraft(permit);
    setWizardOpen(false);
    setEditingDraft(null);
  };

  const handleSubmitToAuthority = (id: string) => {
    submitPermit(id);
  };

  const handleDelete = (id: string) => {
    if (selectedPermit?.id === id) setSelectedPermit(null);
    deletePermit(id);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const statusIcon = (status: PermitStatus) => {
    switch (status) {
      case 'draft': return <FileText size={14} />;
      case 'submitted': return <Clock size={14} />;
      case 'under_review': return <Clock size={14} />;
      case 'approved': return <CheckCircle2 size={14} />;
      case 'requires_changes': return <AlertCircle size={14} />;
      case 'expired': return <Clock size={14} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <ClipboardCheck size={22} className="text-[var(--green)]" />
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                {t('compliance.page.title')}
              </h1>
            </div>
            <p className="text-xs text-[var(--text3)]">
              {t('compliance.page.subtitle')}
            </p>
          </div>
          <button
            onClick={() => { setEditingDraft(null); setWizardOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--green)] text-forest-950 hover:brightness-110 transition-all"
          >
            <Plus size={16} />
            {t('compliance.page.newNotification')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Permit list overview */}
        <div className="mb-6">
          <PermitList
            permits={permits}
            onSelect={(p) => setSelectedPermit(selectedPermit?.id === p.id ? null : p)}
            selectedId={selectedPermit?.id}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Permit list */}
          <div className="lg:col-span-1 space-y-4">
            {/* Active permits */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <Clock size={14} className="text-[var(--green)]" />
                {t('compliance.page.activePermits')}
                <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
                  {activePermits.length}
                </span>
              </h2>

              {activePermits.length === 0 ? (
                <div className="p-4 rounded-lg border border-[var(--border)] text-center" style={{ background: 'var(--bg2)' }}>
                  <ShieldCheck size={24} className="text-[var(--green)] mx-auto mb-2" />
                  <p className="text-xs text-[var(--text3)]">
                    {t('compliance.page.noActivePermits')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activePermits.map((permit) => {
                    const sc = PERMIT_STATUS_CONFIG[permit.status];
                    const isSelected = selectedPermit?.id === permit.id;
                    const fellingInfo = FELLING_TYPES.find((f) => f.id === permit.fellingType);
                    return (
                      <button
                        key={permit.id}
                        onClick={() => setSelectedPermit(isSelected ? null : permit)}
                        className={`
                          w-full text-left p-3 rounded-lg border transition-all
                          ${isSelected
                            ? 'border-[var(--green)] bg-[var(--green)]/5'
                            : 'border-[var(--border)] hover:border-[var(--border2)]'
                          }
                        `}
                        style={{ background: isSelected ? undefined : 'var(--bg2)' }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[var(--text)] truncate">
                            {permit.parcelName}
                          </span>
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-1"
                            style={{ background: sc.bgColor, color: sc.color }}
                          >
                            {statusIcon(permit.status)}
                            {lang === 'sv' ? sc.label_sv : sc.label_en}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
                          <span>{fellingInfo ? (lang === 'sv' ? fellingInfo.label_sv : fellingInfo.label_en) : permit.fellingType}</span>
                          <span>&middot;</span>
                          <span>{permit.areaHa} ha</span>
                          <span>&middot;</span>
                          <span>{formatDate(permit.createdAt)}</span>
                        </div>

                        {/* Actions for drafts */}
                        {permit.status === 'draft' && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingDraft(permit); setWizardOpen(true); }}
                              className="text-[10px] font-medium text-[var(--green)] hover:underline"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSubmitToAuthority(permit.id); }}
                              className="text-[10px] font-medium text-blue-400 hover:underline"
                            >
                              {t('compliance.page.submit')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(permit.id); }}
                              className="text-[10px] font-medium text-red-400 hover:underline flex items-center gap-0.5"
                            >
                              <Trash2 size={10} />
                              {t('common.delete')}
                            </button>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historical permits */}
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] mb-3 hover:text-[var(--green)] transition-colors"
              >
                {showHistory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {t('compliance.page.history')}
                <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
                  {historicalPermits.length}
                </span>
              </button>

              {showHistory && (
                <div className="space-y-2">
                  {historicalPermits.map((permit) => {
                    const sc = PERMIT_STATUS_CONFIG[permit.status];
                    const fellingInfo = FELLING_TYPES.find((f) => f.id === permit.fellingType);
                    return (
                      <button
                        key={permit.id}
                        onClick={() => setSelectedPermit(selectedPermit?.id === permit.id ? null : permit)}
                        className={`
                          w-full text-left p-3 rounded-lg border transition-all opacity-70
                          ${selectedPermit?.id === permit.id
                            ? 'border-[var(--green)] bg-[var(--green)]/5 opacity-100'
                            : 'border-[var(--border)] hover:border-[var(--border2)] hover:opacity-90'
                          }
                        `}
                        style={{ background: selectedPermit?.id === permit.id ? undefined : 'var(--bg2)' }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-[var(--text)] truncate">
                            {permit.parcelName}
                          </span>
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: sc.bgColor, color: sc.color }}
                          >
                            {lang === 'sv' ? sc.label_sv : sc.label_en}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
                          <span>{fellingInfo ? (lang === 'sv' ? fellingInfo.label_sv : fellingInfo.label_en) : ''}</span>
                          <span>&middot;</span>
                          <span>{permit.areaHa} ha</span>
                          <span>&middot;</span>
                          <span>{formatDate(permit.createdAt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Detail panel */}
          <div className="lg:col-span-2 space-y-4">
            {selectedPermit ? (
              <>
                {/* Permit tracker */}
                <PermitTracker permit={selectedPermit} />

                {/* Compliance checklist */}
                <div
                  className="rounded-xl border border-[var(--border)] p-4"
                  style={{ background: 'var(--bg2)' }}
                >
                  <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[var(--green)]" />
                    {t('compliance.page.complianceScore')}
                  </h3>
                  {(() => {
                    const score = getComplianceScore(selectedPermit);
                    return (
                      <div>
                        {/* Score bar */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${score.total}%`,
                                background: score.total >= 80 ? '#4ade80' : score.total >= 50 ? '#fbbf24' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="text-sm font-mono font-semibold text-[var(--text)]">
                            {score.total}%
                          </span>
                        </div>

                        {/* Checklist items */}
                        <div className="space-y-1.5">
                          {score.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 py-1">
                              {item.passed ? (
                                <CheckCircle2 size={14} className="text-[var(--green)] flex-shrink-0" />
                              ) : (
                                <AlertCircle size={14} className="text-[var(--text3)] flex-shrink-0" />
                              )}
                              <span className={`text-[11px] ${item.passed ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>
                                {lang === 'sv' ? item.label_sv : item.label_en}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Environmental check */}
                {selectedPermit.constraints.length > 0 && (
                  <div
                    className="rounded-xl border border-[var(--border)] p-4"
                    style={{ background: 'var(--bg2)' }}
                  >
                    <EnvironmentalCheck
                      constraints={selectedPermit.constraints}
                      parcelName={selectedPermit.parcelName}
                    />
                  </div>
                )}

                {/* Notes */}
                {selectedPermit.notes && (
                  <div
                    className="rounded-xl border border-[var(--border)] p-4"
                    style={{ background: 'var(--bg2)' }}
                  >
                    <h3 className="text-sm font-semibold text-[var(--text)] mb-2">
                      {t('compliance.wizard.notes')}
                    </h3>
                    <p className="text-xs text-[var(--text2)]">{selectedPermit.notes}</p>
                  </div>
                )}
              </>
            ) : (
              /* Empty state */
              <div
                className="rounded-xl border border-[var(--border)] p-8 text-center flex flex-col items-center justify-center min-h-[300px]"
                style={{ background: 'var(--bg2)' }}
              >
                <ClipboardCheck size={40} className="text-[var(--text3)] mb-3" />
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
                  {t('compliance.page.selectPermit')}
                </h3>
                <p className="text-xs text-[var(--text3)] max-w-xs">
                  {t('compliance.page.selectPermitDesc')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wizard modal */}
      {wizardOpen && (
        <FellingWizard
          onClose={() => { setWizardOpen(false); setEditingDraft(null); }}
          onSubmit={handleWizardSubmit}
          existingDraft={editingDraft}
        />
      )}
    </div>
  );
}

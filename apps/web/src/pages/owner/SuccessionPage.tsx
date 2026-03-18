import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HeartHandshake,
  GitCompare,
  Scissors,
  FileCheck,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { TransferComparison } from '@/components/succession/TransferComparison';
import { ValueSplitter } from '@/components/succession/ValueSplitter';
import { DocumentChecklist } from '@/components/succession/DocumentChecklist';
import { TimelinePlanner } from '@/components/succession/TimelinePlanner';
import { KnowledgeTransfer } from '@/components/succession/KnowledgeTransfer';

type Tab = 'comparison' | 'splitter' | 'documents' | 'timeline' | 'knowledge';

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  comparison: <GitCompare size={14} />,
  splitter: <Scissors size={14} />,
  documents: <FileCheck size={14} />,
  timeline: <Calendar size={14} />,
  knowledge: <BookOpen size={14} />,
};

export default function SuccessionPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('comparison');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'comparison', label: t('succession.tabs.comparison') },
    { key: 'splitter', label: t('succession.tabs.splitter') },
    { key: 'documents', label: t('succession.tabs.documents') },
    { key: 'timeline', label: t('succession.tabs.timeline') },
    { key: 'knowledge', label: t('succession.tabs.knowledge') },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-5 lg:p-8">
        {/* Hero Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <HeartHandshake size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                {t('succession.page.title')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('succession.page.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">
                {t('succession.page.heroTitle')}
              </h2>
              <p className="text-xs text-[var(--text2)]">
                {t('succession.page.heroDescription')}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="text-center">
                <p className="text-lg font-bold font-mono text-[var(--green)]">0%</p>
                <p className="text-[10px] text-[var(--text3)]">{t('succession.page.giftTax')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold font-mono text-[var(--green)]">0%</p>
                <p className="text-[10px] text-[var(--text3)]">{t('succession.page.inheritanceTax')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold font-mono text-[var(--text)]">1.5%</p>
                <p className="text-[10px] text-[var(--text3)]">{t('succession.page.stampDuty')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all
                whitespace-nowrap -mb-px border-b-2
                ${activeTab === tab.key
                  ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                }
              `}
            >
              <span className={activeTab === tab.key ? 'text-[var(--green)]' : 'text-[var(--text3)]'}>
                {TAB_ICONS[tab.key]}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[60vh]">
          {activeTab === 'comparison' && <TransferComparison />}
          {activeTab === 'splitter' && <ValueSplitter />}
          {activeTab === 'documents' && <DocumentChecklist />}
          {activeTab === 'timeline' && <TimelinePlanner />}
          {activeTab === 'knowledge' && <KnowledgeTransfer />}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <p className="text-[10px] text-[var(--text3)]">
            {t('succession.page.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}

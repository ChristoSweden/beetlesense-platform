import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';

export function WikiWidget() {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={18} style={{ color: 'var(--green)' }} />
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          {t('wiki.title', 'Forest Wiki')}
        </h3>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {t('wiki.comingSoon', 'Species guides and management tips coming soon.')}
      </p>
    </div>
  );
}

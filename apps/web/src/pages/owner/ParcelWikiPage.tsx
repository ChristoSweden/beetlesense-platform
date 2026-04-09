import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, BookOpen } from 'lucide-react';

export default function ParcelWikiPage() {
  const { parcelId } = useParams<{ parcelId: string }>();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          <Link to="/dashboard" className="hover:underline">{t('nav.dashboard', 'Dashboard')}</Link>
          <ChevronRight size={14} />
          <Link to={`/dashboard/parcel/${parcelId}`} className="hover:underline">{t('nav.parcel', 'Parcel')}</Link>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--text)' }}>{t('parcelWiki.title', 'Parcel Wiki')}</span>
        </nav>

        <div className="flex items-center gap-3 mb-8">
          <BookOpen size={28} style={{ color: 'var(--green)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {t('parcelWiki.title', 'Parcel Wiki')}
          </h1>
        </div>

        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <BookOpen size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
            {t('parcelWiki.comingSoon', 'Parcel Wiki — Coming Soon')}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {t('parcelWiki.description', 'Detailed information about tree species, soil conditions, and management history for this parcel will be available here.')}
          </p>
        </div>
      </div>
    </div>
  );
}

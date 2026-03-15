import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, TreePine } from 'lucide-react';

export default function ParcelDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/parcels" className="hover:text-[var(--text2)]">{t('nav.parcels')}</Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Parcel #{id}</span>
      </nav>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[var(--green)]/10 border border-[var(--border)] flex items-center justify-center">
          <TreePine size={20} className="text-[var(--green)]" />
        </div>
        <h1 className="text-xl font-serif font-bold text-[var(--text)]">Parcel Detail</h1>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
        <p className="text-sm text-[var(--text2)]">Parcel detail view with map, health timeline, and survey history will be rendered here.</p>
        <p className="text-xs text-[var(--text3)] mt-2 font-mono">parcel_id: {id}</p>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TreePine, Users, ChevronRight, Loader2, Calendar } from 'lucide-react';
import { useParcelSharing } from '@/hooks/useParcelSharing';

const ROLE_STYLES: Record<string, string> = {
  viewer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  commenter: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  editor: 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20',
  admin: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
};

export function SharedWithMeSection() {
  const { t } = useTranslation();
  const { sharedWithMe, isLoading, fetchSharedWithMe } = useParcelSharing();

  useEffect(() => {
    fetchSharedWithMe();
  }, [fetchSharedWithMe]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2 mb-3">
          <Users size={14} className="text-[var(--green)]" />
          {t('sharing.sharedWithMe')}
        </h2>
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-[var(--green)]" />
        </div>
      </div>
    );
  }

  if (sharedWithMe.length === 0) {
    return null; // Don't show the section if nothing is shared
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Users size={14} className="text-[var(--green)]" />
          {t('sharing.sharedWithMe')}
        </h2>
        <span className="text-[10px] text-[var(--text3)] font-mono">
          {sharedWithMe.length}
        </span>
      </div>

      <div className="space-y-2">
        {sharedWithMe.map((shared) => (
          <Link
            key={shared.id}
            to={`/owner/parcels/${shared.parcel_id}`}
            className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] bg-[var(--bg3)] transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 border border-[var(--border)] flex items-center justify-center flex-shrink-0">
              <TreePine size={14} className="text-[var(--green)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text)] truncate">
                {shared.parcel?.name ?? t('sharing.unknownParcel')}
                {shared.parcel?.area_ha && (
                  <span className="ml-1.5 text-[10px] text-[var(--text3)] font-normal">
                    {shared.parcel.area_ha} ha
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {shared.invited_by_profile && (
                  <span className="text-[10px] text-[var(--text3)]">
                    {t('sharing.sharedBy')}{' '}
                    {shared.invited_by_profile.full_name ||
                      shared.invited_by_profile.email}
                  </span>
                )}
                {shared.created_at && (
                  <span className="text-[10px] text-[var(--text3)] flex items-center gap-0.5">
                    <Calendar size={8} />
                    {new Date(shared.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${ROLE_STYLES[shared.role]}`}
            >
              {t(`sharing.${shared.role}`)}
            </span>
            <ChevronRight size={14} className="text-[var(--text3)] flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

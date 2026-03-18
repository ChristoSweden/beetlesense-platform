import { useTranslation } from 'react-i18next';
import { Crown, Clock, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Collaborator, ParcelOwner, ShareRole } from '@/hooks/useParcelSharing';

const ROLE_STYLES: Record<string, string> = {
  viewer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  commenter: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  editor: 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20',
  admin: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
};

const ROLE_OPTIONS: ShareRole[] = ['viewer', 'commenter', 'editor', 'admin'];

interface CollaboratorsListProps {
  collaborators: Collaborator[];
  owner: ParcelOwner | null;
  onRemove: (shareId: string) => void;
  onUpdateRole: (shareId: string, role: ShareRole) => void;
  isCurrentUserOwner: boolean;
}

export function CollaboratorsList({
  collaborators,
  owner,
  onRemove,
  onUpdateRole,
  isCurrentUserOwner,
}: CollaboratorsListProps) {
  const { t } = useTranslation();
  const accepted = collaborators.filter((c) => c.status === 'accepted');
  const pending = collaborators.filter((c) => c.status === 'pending');

  return (
    <div className="space-y-3">
      {/* Owner */}
      {owner && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)]">
          <Avatar name={owner.full_name} url={owner.avatar_url} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text)] truncate">
              {owner.full_name || owner.email}
            </p>
            <p className="text-[11px] text-[var(--text3)] truncate">{owner.email}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/20">
            <Crown size={10} />
            {t('sharing.owner')}
          </div>
        </div>
      )}

      {/* Accepted collaborators */}
      {accepted.map((collab) => (
        <CollaboratorRow
          key={collab.id}
          collaborator={collab}
          onRemove={onRemove}
          onUpdateRole={onUpdateRole}
          canManage={isCurrentUserOwner}
        />
      ))}

      {/* Pending invitations */}
      {pending.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-[var(--text3)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock size={10} />
            {t('sharing.pendingInvitations')}
          </p>
          {pending.map((collab) => (
            <CollaboratorRow
              key={collab.id}
              collaborator={collab}
              onRemove={onRemove}
              onUpdateRole={onUpdateRole}
              canManage={isCurrentUserOwner}
              isPending
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {collaborators.length === 0 && !owner && (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--text3)]">{t('sharing.noCollaborators')}</p>
        </div>
      )}
    </div>
  );
}

function CollaboratorRow({
  collaborator,
  onRemove,
  onUpdateRole,
  canManage,
  isPending,
}: {
  collaborator: Collaborator;
  onRemove: (shareId: string) => void;
  onUpdateRole: (shareId: string, role: ShareRole) => void;
  canManage: boolean;
  isPending?: boolean;
}) {
  const { t } = useTranslation();
  const [roleOpen, setRoleOpen] = useState(false);
  const displayName =
    collaborator.profile?.full_name || collaborator.invited_email;
  const email = collaborator.profile?.email || collaborator.invited_email;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] ${
        isPending ? 'bg-[var(--bg2)] opacity-70' : 'bg-[var(--bg3)]'
      }`}
    >
      <Avatar
        name={collaborator.profile?.full_name ?? null}
        url={collaborator.profile?.avatar_url ?? null}
        isPending={isPending}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--text)] truncate">
            {displayName}
          </p>
          {isPending && (
            <Clock size={12} className="text-[var(--text3)] flex-shrink-0" />
          )}
        </div>
        <p className="text-[11px] text-[var(--text3)] truncate">{email}</p>
      </div>

      {/* Role selector or badge */}
      {canManage ? (
        <div className="relative">
          <button
            onClick={() => setRoleOpen(!roleOpen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${ROLE_STYLES[collaborator.role]}`}
          >
            {t(`sharing.${collaborator.role}`)}
            <ChevronDown size={10} />
          </button>
          {roleOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setRoleOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--bg2)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[120px]">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      onUpdateRole(collaborator.id, role);
                      setRoleOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg3)] transition-colors ${
                      collaborator.role === role
                        ? 'text-[var(--green)] font-medium'
                        : 'text-[var(--text2)]'
                    }`}
                  >
                    {t(`sharing.${role}`)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${ROLE_STYLES[collaborator.role]}`}
        >
          {t(`sharing.${collaborator.role}`)}
        </span>
      )}

      {/* Remove button */}
      {canManage && (
        <button
          onClick={() => onRemove(collaborator.id)}
          className="p-1 rounded-lg hover:bg-red-500/10 text-[var(--text3)] hover:text-red-400 transition-colors"
          title={t('sharing.removeAccess')}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function Avatar({
  name,
  url,
  isPending,
}: {
  name: string | null;
  url: string | null;
  isPending?: boolean;
}) {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ''}
        className={`w-8 h-8 rounded-full flex-shrink-0 ${isPending ? 'grayscale' : ''}`}
      />
    );
  }

  return (
    <div
      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold border border-[var(--border)] ${
        isPending
          ? 'bg-[var(--bg2)] text-[var(--text3)]'
          : 'bg-[var(--green)]/10 text-[var(--green)]'
      }`}
    >
      {initials}
    </div>
  );
}

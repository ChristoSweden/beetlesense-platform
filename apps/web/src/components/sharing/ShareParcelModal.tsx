import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users, Send, AlertCircle, Loader2 } from 'lucide-react';
import { CollaboratorsList } from './CollaboratorsList';
import { ShareLink } from './ShareLink';
import { useParcelSharing, type ShareRole } from '@/hooks/useParcelSharing';
import { useAuthStore } from '@/stores/authStore';

const ROLE_OPTIONS: { value: ShareRole; labelKey: string; descKey: string }[] = [
  { value: 'viewer', labelKey: 'sharing.viewer', descKey: 'sharing.viewerDesc' },
  { value: 'commenter', labelKey: 'sharing.commenter', descKey: 'sharing.commenterDesc' },
  { value: 'editor', labelKey: 'sharing.editor', descKey: 'sharing.editorDesc' },
  { value: 'admin', labelKey: 'sharing.admin', descKey: 'sharing.adminDesc' },
];

interface ShareParcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcelId: string;
  parcelName: string;
}

export function ShareParcelModal({
  isOpen,
  onClose,
  parcelId,
  parcelName,
}: ShareParcelModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('viewer');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<'people' | 'link'>('people');

  const user = useAuthStore((s) => s.user);
  const {
    collaborators,
    owner,
    isLoading,
    error,
    invite,
    remove,
    updateRole,
    generateLink,
  } = useParcelSharing(parcelId);

  // Check if the current user is the parcel owner
  const isCurrentUserOwner = owner?.id === user?.id;

  const handleInvite = async () => {
    if (!email.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setInviteError(t('sharing.invalidEmail'));
      return;
    }

    setInviting(true);
    setInviteError(null);

    try {
      await invite(parcelId, email.trim(), role);
      setEmail('');
      setRole('viewer');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : t('sharing.inviteFailed'));
    } finally {
      setInviting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInvite();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg2)] shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <Users size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">
                {t('sharing.shareParcel')}
              </h2>
              <p className="text-[11px] text-[var(--text3)]">{parcelName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'people'
                ? 'text-[var(--green)] border-b-2 border-[var(--green)]'
                : 'text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            {t('sharing.inviteCollaborator')}
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'link'
                ? 'text-[var(--green)] border-b-2 border-[var(--green)]'
                : 'text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            {t('sharing.copyShareLink')}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'people' ? (
            <>
              {/* Invite form */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-[var(--text3)] block mb-1.5">
                    {t('sharing.enterEmail')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setInviteError(null);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="name@example.com"
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 focus:ring-1 focus:ring-[var(--green)]/20"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={inviting || !email.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      {t('sharing.invite')}
                    </button>
                  </div>
                </div>

                {/* Role selector */}
                <div>
                  <label className="text-[11px] text-[var(--text3)] block mb-1.5">
                    {t('sharing.permissionLevel')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setRole(opt.value)}
                        className={`p-2.5 rounded-lg border text-left transition-colors ${
                          role === opt.value
                            ? 'border-[var(--green)]/50 bg-[var(--green)]/5'
                            : 'border-[var(--border)] hover:border-[var(--border2)]'
                        }`}
                      >
                        <p
                          className={`text-xs font-medium ${
                            role === opt.value
                              ? 'text-[var(--green)]'
                              : 'text-[var(--text)]'
                          }`}
                        >
                          {t(opt.labelKey)}
                        </p>
                        <p className="text-[10px] text-[var(--text3)] mt-0.5">
                          {t(opt.descKey)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {(inviteError || error) && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-400">{inviteError || error}</p>
                  </div>
                )}
              </div>

              {/* Collaborators list */}
              <div>
                <h3 className="text-[11px] font-medium text-[var(--text3)] uppercase tracking-wide mb-3">
                  {t('sharing.currentCollaborators')}
                </h3>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-[var(--green)]" />
                  </div>
                ) : (
                  <CollaboratorsList
                    collaborators={collaborators}
                    owner={owner}
                    onRemove={remove}
                    onUpdateRole={updateRole}
                    isCurrentUserOwner={isCurrentUserOwner}
                  />
                )}
              </div>
            </>
          ) : (
            <ShareLink
              parcelId={parcelId}
              onGenerateLink={generateLink}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  FolderInput,
  MoreVertical,
  Eye,
} from 'lucide-react';
import {
  type VaultDocument,
  type FolderKey,
  getFileCategory,
  formatFileSize,
} from '@/hooks/useDocumentVault';

interface DocumentCardProps {
  document: VaultDocument;
  onDownload: (doc: VaultDocument) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, folder: FolderKey) => void;
  onPreview: (doc: VaultDocument) => void;
}

const FOLDER_KEYS: FolderKey[] = [
  'skogsbruksplan',
  'kopeavtal',
  'rapporter',
  'fakturor',
  'skattedokument',
  'forsakring',
  'ovrigt',
];

function FileIcon({ mimeType, size = 20 }: { mimeType: string; size?: number }) {
  const category = getFileCategory(mimeType);
  switch (category) {
    case 'image':
      return <ImageIcon size={size} />;
    case 'pdf':
      return <FileText size={size} />;
    case 'document':
      return <FileSpreadsheet size={size} />;
    default:
      return <File size={size} />;
  }
}

function fileIconColor(mimeType: string): string {
  const category = getFileCategory(mimeType);
  switch (category) {
    case 'image':
      return '#60a5fa'; // blue
    case 'pdf':
      return '#f87171'; // red
    case 'document':
      return '#34d399'; // emerald
    default:
      return '#a3a3a3'; // gray
  }
}

export function DocumentCard({
  document: doc,
  onDownload,
  onDelete,
  onMove,
  onPreview,
}: DocumentCardProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const iconColor = fileIconColor(doc.mimeType);
  const category = getFileCategory(doc.mimeType);
  const canPreview = category === 'pdf' || category === 'image';

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      onDelete(doc.id);
      setConfirmDelete(false);
      setMenuOpen(false);
    } else {
      setConfirmDelete(true);
    }
  }, [confirmDelete, doc.id, onDelete]);

  const formattedDate = new Date(doc.uploadedAt).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="group relative rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 hover:border-[var(--border2)] transition-all duration-200">
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}15`, color: iconColor }}
        >
          <FileIcon mimeType={doc.mimeType} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => canPreview && onPreview(doc)}
            className={`text-sm font-medium text-[var(--text)] truncate block max-w-full text-left ${
              canPreview ? 'hover:text-[var(--green)] cursor-pointer' : ''
            }`}
            title={doc.name}
          >
            {doc.name}
          </button>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-[var(--text3)] font-mono">
              {formatFileSize(doc.size)}
            </span>
            <span className="text-[var(--text3)]">&middot;</span>
            <span className="text-[10px] text-[var(--text3)]">{formattedDate}</span>
            <span className="text-[var(--text3)]">&middot;</span>
            <span className="text-[10px] text-[var(--green)]/70 bg-[var(--green)]/10 px-1.5 py-0.5 rounded">
              {t(`vault.folders.${doc.folder}`)}
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canPreview && (
            <button
              onClick={() => onPreview(doc)}
              className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
              title={t('vault.preview')}
            >
              <Eye size={14} />
            </button>
          )}
          <button
            onClick={() => onDownload(doc)}
            className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            title={t('vault.download')}
          >
            <Download size={14} />
          </button>
          <div className="relative">
            <button
              onClick={() => {
                setMenuOpen(!menuOpen);
                setConfirmDelete(false);
                setMoveMenuOpen(false);
              }}
              className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            >
              <MoreVertical size={14} />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-[var(--border)] bg-[var(--bg2)] shadow-xl py-1">
                  <button
                    onClick={() => {
                      setMoveMenuOpen(!moveMenuOpen);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                  >
                    <FolderInput size={13} />
                    {t('vault.moveToFolder')}
                  </button>

                  {moveMenuOpen && (
                    <div className="border-t border-[var(--border)] py-1">
                      {FOLDER_KEYS.filter((k) => k !== doc.folder).map((key) => (
                        <button
                          key={key}
                          onClick={() => {
                            onMove(doc.id, key);
                            setMenuOpen(false);
                            setMoveMenuOpen(false);
                          }}
                          className="w-full px-6 py-1.5 text-[11px] text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] text-left transition-colors"
                        >
                          {t(`vault.folders.${key}`)}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      onDownload(doc);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                  >
                    <Download size={13} />
                    {t('vault.download')}
                  </button>

                  <div className="border-t border-[var(--border)] mt-1 pt-1">
                    <button
                      onClick={handleDelete}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors ${
                        confirmDelete
                          ? 'text-red-400 bg-red-500/10 font-semibold'
                          : 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      <Trash2 size={13} />
                      {confirmDelete ? t('vault.confirmDelete') : t('common.delete')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

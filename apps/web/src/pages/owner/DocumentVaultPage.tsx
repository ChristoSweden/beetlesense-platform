import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  FolderOpen,
  Search,
  ArrowDown,
  ArrowUp,
  Loader2,
  FileText,
  X,
  HardDrive,
  FolderClosed,
} from 'lucide-react';
import { useDocumentVault, type FolderKey, type VaultDocument, formatFileSize } from '@/hooks/useDocumentVault';
import { DocumentCard } from '@/components/vault/DocumentCard';
import { UploadZone } from '@/components/vault/UploadZone';
import { TaxSummarySection } from '@/components/vault/TaxSummarySection';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

// ─── Folder icons (emoji) ───

const FOLDER_ICONS: Record<FolderKey, string> = {
  skogsbruksplan: '\uD83C\uDF32',
  kopeavtal: '\uD83D\uDCDD',
  rapporter: '\uD83D\uDCCA',
  fakturor: '\uD83E\uDDFE',
  skattedokument: '\uD83D\uDCB0',
  forsakring: '\uD83D\uDEE1\uFE0F',
  ovrigt: '\uD83D\uDCC1',
};

// ─── Document preview modal ───

function PreviewModal({
  document: doc,
  onClose,
}: {
  document: VaultDocument;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isPdf = doc.mimeType === 'application/pdf';
  const isImage = doc.mimeType.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-xl border border-[var(--border)] bg-[var(--bg2)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-[var(--text3)] flex-shrink-0" />
            <span className="text-sm font-medium text-[var(--text)] truncate">
              {doc.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[400px]">
          {isPdf && doc.url ? (
            <iframe
              src={doc.url}
              className="w-full h-full min-h-[600px] rounded-lg border border-[var(--border)]"
              title={doc.name}
            />
          ) : isImage && doc.url ? (
            <img
              src={doc.url}
              alt={doc.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          ) : (
            <div className="text-center">
              <FileText size={48} className="mx-auto text-[var(--text3)] mb-3" />
              <p className="text-sm text-[var(--text2)]">
                {t('vault.previewNotAvailable')}
              </p>
              <p className="text-xs text-[var(--text3)] mt-1">
                {t('vault.downloadToView')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───

export default function DocumentVaultPage() {
  const { t } = useTranslation();
  const {
    documents,
    folders,
    activeFolder,
    setActiveFolder,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDir,
    setSortField,
    toggleSortDir,
    upload,
    deleteDoc,
    moveDoc,
    getDownloadUrl,
    storageUsed,
    storageMax,
    isUploading,
    uploadProgress,
    isLoading,
    error,
  } = useDocumentVault();

  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);

  const handleDownload = useCallback(
    async (doc: VaultDocument) => {
      const url = await getDownloadUrl(doc);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        a.click();
      }
    },
    [getDownloadUrl],
  );

  const handlePreview = useCallback(
    async (doc: VaultDocument) => {
      if (doc.url) {
        setPreviewDoc(doc);
        return;
      }
      const url = await getDownloadUrl(doc);
      if (url) {
        setPreviewDoc({ ...doc, url });
      } else {
        // Demo mode or no URL available
        setPreviewDoc(doc);
      }
    },
    [getDownloadUrl],
  );

  const storagePercent = Math.round((storageUsed / storageMax) * 100);

  return (
    <div className="p-4 lg:p-6 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('nav.documents')}</span>
        {activeFolder && (
          <>
            <ChevronRight size={12} />
            <span className="text-[var(--text)]">
              {t(`vault.folders.${activeFolder}`)}
            </span>
          </>
        )}
      </nav>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">
            {t('vault.title')}
          </h1>
          <p className="text-xs text-[var(--text3)] mt-1">
            {t('vault.subtitle')}
          </p>
        </div>

        {/* Storage indicator */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[var(--bg2)] border border-[var(--border)]">
          <HardDrive size={14} className="text-[var(--text3)]" />
          <div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    storagePercent > 80 ? 'bg-amber-400' : 'bg-[var(--green)]'
                  }`}
                  style={{ width: `${Math.min(storagePercent, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[var(--text3)]">
                {formatFileSize(storageUsed)} / {formatFileSize(storageMax)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => window.location.reload()} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left sidebar: folders + upload + tax */}
        <div className="space-y-4">
          {/* Folder list */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
            <button
              onClick={() => setActiveFolder(null)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors mb-1 ${
                activeFolder === null
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
              }`}
            >
              <FolderOpen size={16} />
              <span className="text-xs font-medium flex-1">{t('vault.allDocuments')}</span>
              <span className="text-[10px] font-mono text-[var(--text3)]">
                {folders.reduce((sum, f) => sum + f.count, 0)}
              </span>
            </button>

            {folders.map((folder) => (
              <button
                key={folder.key}
                onClick={() => setActiveFolder(folder.key)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeFolder === folder.key
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                }`}
              >
                <span className="text-base" role="img" aria-hidden="true">
                  {FOLDER_ICONS[folder.key]}
                </span>
                <span className="text-xs font-medium flex-1 truncate">
                  {t(`vault.folders.${folder.key}`)}
                </span>
                {folder.count > 0 && (
                  <span className="text-[10px] font-mono text-[var(--text3)]">
                    {folder.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Upload zone */}
          <UploadZone
            activeFolder={activeFolder}
            onUpload={upload}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />

          {/* Tax summary */}
          <TaxSummarySection documents={documents} />
        </div>

        {/* Right: document list */}
        <div className="space-y-4">
          {/* Search and sort bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('vault.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-1">
              {(['date', 'name', 'type'] as const).map((field) => (
                <button
                  key={field}
                  onClick={() => {
                    if (sortField === field) {
                      toggleSortDir();
                    } else {
                      setSortField(field);
                    }
                  }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                    sortField === field
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  {t(`vault.sort.${field}`)}
                  {sortField === field &&
                    (sortDir === 'desc' ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                </button>
              ))}
            </div>
          </div>

          {/* Active folder header */}
          {activeFolder && (
            <div className="flex items-center gap-2">
              <span className="text-lg" role="img" aria-hidden="true">
                {FOLDER_ICONS[activeFolder]}
              </span>
              <h2 className="text-sm font-semibold text-[var(--text)]">
                {t(`vault.folders.${activeFolder}`)}
              </h2>
              <button
                onClick={() => setActiveFolder(null)}
                className="ml-auto text-xs text-[var(--text3)] hover:text-[var(--text)] flex items-center gap-1"
              >
                <X size={12} />
                {t('vault.clearFilter')}
              </button>
            </div>
          )}

          {/* Document list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-[var(--green)]" />
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-12 text-center">
              <FolderClosed size={32} className="mx-auto text-[var(--text3)] mb-3" />
              <p className="text-sm text-[var(--text2)]">
                {searchQuery
                  ? t('common.noResults')
                  : activeFolder
                    ? t('vault.emptyFolder')
                    : t('vault.emptyVault')}
              </p>
              <p className="text-xs text-[var(--text3)] mt-1">
                {t('vault.uploadHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-[var(--text3)] font-mono">
                {documents.length} {documents.length === 1 ? t('vault.document') : t('vault.documents')}
              </p>
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDownload={handleDownload}
                  onDelete={deleteDoc}
                  onMove={moveDoc}
                  onPreview={handlePreview}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewDoc && (
        <PreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}

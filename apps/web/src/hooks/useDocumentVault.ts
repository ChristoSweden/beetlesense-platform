import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ───

export type FolderKey =
  | 'skogsbruksplan'
  | 'kopeavtal'
  | 'rapporter'
  | 'fakturor'
  | 'skattedokument'
  | 'forsakring'
  | 'ovrigt';

export interface VaultDocument {
  id: string;
  name: string;
  folder: FolderKey;
  size: number; // bytes
  mimeType: string;
  uploadedAt: string; // ISO
  storagePath: string;
  thumbnailUrl: string | null;
  url: string | null;
}

export interface FolderInfo {
  key: FolderKey;
  count: number;
  totalSize: number;
}

export type SortField = 'date' | 'name' | 'type';
export type SortDir = 'asc' | 'desc';

const STORAGE_BUCKET = 'document-vault';
const MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 500 MB

// ─── Filename auto-categorisation patterns ───

const FOLDER_PATTERNS: { pattern: RegExp; folder: FolderKey }[] = [
  { pattern: /skogsbruksplan/i, folder: 'skogsbruksplan' },
  { pattern: /forest.?management/i, folder: 'skogsbruksplan' },
  { pattern: /k[öo]peavtal|purchase.?agreement/i, folder: 'kopeavtal' },
  { pattern: /rapport|report|survey/i, folder: 'rapporter' },
  { pattern: /faktura|invoice|kvitto|receipt/i, folder: 'fakturor' },
  { pattern: /skatt|tax|deklaration/i, folder: 'skattedokument' },
  { pattern: /f[öo]rs[äa]kring|insurance/i, folder: 'forsakring' },
];

export function guessFolder(filename: string): FolderKey {
  for (const { pattern, folder } of FOLDER_PATTERNS) {
    if (pattern.test(filename)) return folder;
  }
  return 'ovrigt';
}

// ─── File type helpers ───

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PDF_TYPES = ['application/pdf'];
const DOC_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ALLOWED_TYPES = [...IMAGE_TYPES, ...PDF_TYPES, ...DOC_TYPES, 'text/plain', 'text/csv'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file

export function isAllowedType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType);
}

export function getFileCategory(mimeType: string): 'image' | 'pdf' | 'document' | 'other' {
  if (IMAGE_TYPES.includes(mimeType)) return 'image';
  if (PDF_TYPES.includes(mimeType)) return 'pdf';
  if (DOC_TYPES.includes(mimeType)) return 'document';
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Demo data ───

const DEMO_DOCUMENTS: VaultDocument[] = [
  {
    id: 'demo-doc-1',
    name: 'Skogsbruksplan_Norra_Skogen_2025.pdf',
    folder: 'skogsbruksplan',
    size: 2_450_000,
    mimeType: 'application/pdf',
    uploadedAt: '2025-11-15T10:30:00Z',
    storagePath: 'demo/skogsbruksplan/plan_2025.pdf',
    thumbnailUrl: null,
    url: null,
  },
  {
    id: 'demo-doc-2',
    name: 'Kopeavtal_Ekbacken_2024.pdf',
    folder: 'kopeavtal',
    size: 1_200_000,
    mimeType: 'application/pdf',
    uploadedAt: '2024-06-20T14:15:00Z',
    storagePath: 'demo/kopeavtal/ekbacken_2024.pdf',
    thumbnailUrl: null,
    url: null,
  },
  {
    id: 'demo-doc-3',
    name: 'BeetleSense_Survey_Report_March2026.pdf',
    folder: 'rapporter',
    size: 3_800_000,
    mimeType: 'application/pdf',
    uploadedAt: '2026-03-12T09:00:00Z',
    storagePath: 'demo/rapporter/survey_mar2026.pdf',
    thumbnailUrl: null,
    url: null,
  },
  {
    id: 'demo-doc-4',
    name: 'Faktura_Skogsentreprenor_AB_2026-01.pdf',
    folder: 'fakturor',
    size: 450_000,
    mimeType: 'application/pdf',
    uploadedAt: '2026-01-15T08:00:00Z',
    storagePath: 'demo/fakturor/entreprenor_jan2026.pdf',
    thumbnailUrl: null,
    url: null,
  },
  {
    id: 'demo-doc-5',
    name: 'Faktura_Plantering_Norra_2025.pdf',
    folder: 'fakturor',
    size: 320_000,
    mimeType: 'application/pdf',
    uploadedAt: '2025-05-20T11:30:00Z',
    storagePath: 'demo/fakturor/plantering_2025.pdf',
    thumbnailUrl: null,
    url: null,
  },
  {
    id: 'demo-doc-6',
    name: 'Deklarationsbilaga_Skog_2025.pdf',
    folder: 'skattedokument',
    size: 180_000,
    mimeType: 'application/pdf',
    uploadedAt: '2026-02-01T16:00:00Z',
    storagePath: 'demo/skattedokument/bilaga_2025.pdf',
    thumbnailUrl: null,
    url: null,
  },
  {
    id: 'demo-doc-7',
    name: 'Forsakringsbrev_Lf_2025.pdf',
    folder: 'forsakring',
    size: 890_000,
    mimeType: 'application/pdf',
    uploadedAt: '2025-01-10T13:00:00Z',
    storagePath: 'demo/forsakring/lf_2025.pdf',
    thumbnailUrl: null,
    url: null,
  },
  {
    id: 'demo-doc-8',
    name: 'Norra_Skogen_flygbild.jpg',
    folder: 'ovrigt',
    size: 5_600_000,
    mimeType: 'image/jpeg',
    uploadedAt: '2026-03-10T07:45:00Z',
    storagePath: 'demo/ovrigt/flygbild.jpg',
    thumbnailUrl: null,
    url: null,
  },
  {
    id: 'demo-doc-9',
    name: 'Timmerforsakring_Tallmon_2026.pdf',
    folder: 'rapporter',
    size: 1_100_000,
    mimeType: 'application/pdf',
    uploadedAt: '2026-02-20T10:00:00Z',
    storagePath: 'demo/rapporter/tallmon_2026.pdf',
    thumbnailUrl: null,
    url: null,
  },
  {
    id: 'demo-doc-10',
    name: 'Faktura_Avverkning_Dec2025.pdf',
    folder: 'fakturor',
    size: 510_000,
    mimeType: 'application/pdf',
    uploadedAt: '2025-12-18T14:30:00Z',
    storagePath: 'demo/fakturor/avverkning_dec2025.pdf',
    thumbnailUrl: null,
    url: null,
  },
];

// ─── Hook ───

interface UseDocumentVaultReturn {
  documents: VaultDocument[];
  folders: FolderInfo[];
  activeFolder: FolderKey | null;
  setActiveFolder: (f: FolderKey | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: SortField;
  sortDir: SortDir;
  setSortField: (f: SortField) => void;
  toggleSortDir: () => void;
  upload: (files: File[], folder?: FolderKey) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  moveDoc: (id: string, newFolder: FolderKey) => Promise<void>;
  getDownloadUrl: (doc: VaultDocument) => Promise<string | null>;
  storageUsed: number;
  storageMax: number;
  isUploading: boolean;
  uploadProgress: number; // 0-100
  isLoading: boolean;
  error: string | null;
}

export function useDocumentVault(): UseDocumentVaultReturn {
  const { profile } = useAuthStore();
  const [allDocuments, setAllDocuments] = useState<VaultDocument[]>([]);
  const [activeFolder, setActiveFolder] = useState<FolderKey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load documents
  useEffect(() => {
    if (!profile) return;

    async function load() {
      setError(null);

      if (isDemo()) {
        setAllDocuments(DEMO_DOCUMENTS);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from('vault_documents')
          .select('*')
          .eq('owner_id', profile!.id)
          .order('uploaded_at', { ascending: false });

        if (dbError) throw dbError;

        const docs: VaultDocument[] = (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          name: row.name as string,
          folder: row.folder as FolderKey,
          size: row.size as number,
          mimeType: row.mime_type as string,
          uploadedAt: row.uploaded_at as string,
          storagePath: row.storage_path as string,
          thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
          url: null,
        }));

        setAllDocuments(docs);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      }

      setIsLoading(false);
    }

    load();
  }, [profile]);

  // Compute folders
  const folders = useMemo<FolderInfo[]>(() => {
    const keys: FolderKey[] = [
      'skogsbruksplan',
      'kopeavtal',
      'rapporter',
      'fakturor',
      'skattedokument',
      'forsakring',
      'ovrigt',
    ];
    return keys.map((key) => {
      const docs = allDocuments.filter((d) => d.folder === key);
      return {
        key,
        count: docs.length,
        totalSize: docs.reduce((sum, d) => sum + d.size, 0),
      };
    });
  }, [allDocuments]);

  // Filter + sort
  const documents = useMemo(() => {
    let filtered = allDocuments;

    if (activeFolder) {
      filtered = filtered.filter((d) => d.folder === activeFolder);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(q));
    }

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name, 'sv');
          break;
        case 'type':
          cmp = a.mimeType.localeCompare(b.mimeType);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return sorted;
  }, [allDocuments, activeFolder, searchQuery, sortField, sortDir]);

  const storageUsed = useMemo(
    () => allDocuments.reduce((sum, d) => sum + d.size, 0),
    [allDocuments],
  );

  const toggleSortDir = useCallback(() => {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  // Upload files
  const upload = useCallback(
    async (files: File[], folder?: FolderKey) => {
      if (!profile) return;
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      const total = files.length;
      let completed = 0;

      try {
        for (const file of files) {
          // Validate
          if (!isAllowedType(file.type)) {
            throw new Error(`File type not allowed: ${file.type}`);
          }
          if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File too large: ${file.name} (max 50 MB)`);
          }

          const targetFolder = folder ?? guessFolder(file.name);
          const uuid = crypto.randomUUID();
          const storagePath = `${profile!.id}/${targetFolder}/${uuid}_${file.name}`;

          if (isDemo()) {
            // In demo mode, just add to local state
            const newDoc: VaultDocument = {
              id: uuid,
              name: file.name,
              folder: targetFolder,
              size: file.size,
              mimeType: file.type,
              uploadedAt: new Date().toISOString(),
              storagePath,
              thumbnailUrl: null,
              url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            };
            setAllDocuments((prev) => [newDoc, ...prev]);
          } else {
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .upload(storagePath, file, { contentType: file.type, upsert: false });

            if (uploadError) throw uploadError;

            // Insert metadata row
            const { data: row, error: dbError } = await supabase
              .from('vault_documents')
              .insert({
                owner_id: profile!.id,
                name: file.name,
                folder: targetFolder,
                size: file.size,
                mime_type: file.type,
                storage_path: storagePath,
              })
              .select()
              .single();

            if (dbError) throw dbError;

            const newDoc: VaultDocument = {
              id: row.id,
              name: row.name,
              folder: row.folder as FolderKey,
              size: row.size,
              mimeType: row.mime_type,
              uploadedAt: row.uploaded_at,
              storagePath: row.storage_path,
              thumbnailUrl: row.thumbnail_url ?? null,
              url: null,
            };

            setAllDocuments((prev) => [newDoc, ...prev]);
          }

          completed++;
          setUploadProgress(Math.round((completed / total) * 100));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }

      setIsUploading(false);
    },
    [profile],
  );

  // Delete
  const deleteDoc = useCallback(
    async (id: string) => {
      if (!profile) return;
      setError(null);

      const doc = allDocuments.find((d) => d.id === id);
      if (!doc) return;

      if (isDemo()) {
        setAllDocuments((prev) => prev.filter((d) => d.id !== id));
        return;
      }

      try {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([doc.storagePath]);

        if (storageError) throw storageError;

        const { error: dbError } = await supabase
          .from('vault_documents')
          .delete()
          .eq('id', id);

        if (dbError) throw dbError;

        setAllDocuments((prev) => prev.filter((d) => d.id !== id));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to delete document');
      }
    },
    [profile, allDocuments],
  );

  // Move to folder
  const moveDoc = useCallback(
    async (id: string, newFolder: FolderKey) => {
      if (!profile) return;
      setError(null);

      if (isDemo()) {
        setAllDocuments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, folder: newFolder } : d)),
        );
        return;
      }

      try {
        const { error: dbError } = await supabase
          .from('vault_documents')
          .update({ folder: newFolder })
          .eq('id', id);

        if (dbError) throw dbError;

        setAllDocuments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, folder: newFolder } : d)),
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to move document');
      }
    },
    [profile],
  );

  // Get download URL
  const getDownloadUrl = useCallback(
    async (doc: VaultDocument): Promise<string | null> => {
      if (isDemo()) return null;

      try {
        const { data, error: urlError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(doc.storagePath, 3600);

        if (urlError) throw urlError;
        return data?.signedUrl ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  return {
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
    storageMax: MAX_STORAGE_BYTES,
    isUploading,
    uploadProgress,
    isLoading,
    error,
  };
}

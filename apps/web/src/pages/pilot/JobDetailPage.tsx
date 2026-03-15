import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { JobDetail } from '@/components/pilot/JobDetail';
import { PilotDataUpload } from '@/components/pilot/PilotDataUpload';

export default function JobDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const showUpload = searchParams.get('upload') === 'true';

  if (!id) return null;

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/pilot/jobs" className="hover:text-[var(--text2)]">
          {t('nav.jobs')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Mission Detail</span>
      </nav>

      {showUpload ? (
        <div className="max-w-2xl">
          <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-4">Upload Data</h1>
          <PilotDataUpload jobId={id} />
        </div>
      ) : (
        <JobDetail jobId={id} />
      )}
    </div>
  );
}

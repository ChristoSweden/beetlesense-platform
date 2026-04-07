import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const MAIN_PATHS = ['/owner/dashboard', '/owner/status', '/owner/wingman', '/owner/threats', '/owner/today'];

export function BackToForest() {
  const location = useLocation();
  const navigate = useNavigate();

  if (MAIN_PATHS.some((p) => location.pathname === p || location.pathname === p + '/')) {
    return null;
  }

  if (!location.pathname.startsWith('/owner/')) {
    return null;
  }

  return (
    <button
      onClick={() => navigate('/owner/dashboard')}
      className="flex items-center gap-1.5 px-3 py-1.5 mb-3 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
    >
      <ArrowLeft size={14} />
      Back to My Forest
    </button>
  );
}

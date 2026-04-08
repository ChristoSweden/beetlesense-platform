/**
 * RegionalBeetleNetworkPage — Full-page wrapper for the regional beetle alert network.
 */

import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { RegionalBeetleNetwork } from '@/components/owner/RegionalBeetleNetwork';

export default function RegionalBeetleNetworkPage() {
  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">Dashboard</Link>
        <ChevronRight size={12} />
        <Link to="/owner/alerts" className="hover:text-[var(--text2)]">Alerts</Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Regional Beetle Network</span>
      </nav>

      <RegionalBeetleNetwork />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ArrowLeft, Truck } from 'lucide-react';
import { ContractorBookingFlow } from '@/components/transactions/ContractorBookingFlow';

export default function BookContractorPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/owner/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ArrowLeft size={16} className="text-[var(--text2)]" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
              <Truck size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)]">Book a Contractor</h1>
              <p className="text-[11px] text-[var(--text3)]">Find and book forest service contractors</p>
            </div>
          </div>
        </div>

        {/* Flow */}
        <div className="rounded-2xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
          <ContractorBookingFlow />
        </div>
      </div>
    </div>
  );
}

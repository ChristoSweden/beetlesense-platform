/**
 * GroupSellingPage — Collective timber selling / auction platform.
 *
 * The most disruptive feature in BeetleSense: lets small forest owners band together
 * to pool volumes and get volume-tier pricing normally reserved for Stora Enso, Södra, etc.
 *
 * Route: /owner/group-selling
 */

import { useState } from 'react';
import {
  Users,
  Plus,
  Gavel,
  History,
  TrendingUp,
  BarChart3,
  TreePine,
} from 'lucide-react';
import { useGroupSelling } from '@/hooks/useGroupSelling';
import { PoolCard } from '@/components/groupselling/PoolCard';
import { CreatePool } from '@/components/groupselling/CreatePool';
import { LiveAuctionCard } from '@/components/groupselling/LiveAuction';
import { PoolResultsList } from '@/components/groupselling/PoolResults';
import { VolumeCommitment } from '@/components/groupselling/VolumeCommitment';

type Tab = 'active' | 'mine' | 'auctions' | 'history';

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'active', label: 'Aktiva pooler', icon: Users },
  { id: 'mine', label: 'Mina pooler', icon: TreePine },
  { id: 'auctions', label: 'Auktioner', icon: Gavel },
  { id: 'history', label: 'Historik', icon: History },
];

export default function GroupSellingPage() {
  const {
    pools,
    myPools,
    auctions,
    results,
    isLoading,
    joinPool,
    createPool,
    voteOnAuction,
    totalSavedSEK,
    avgPremiumPercent,
    estimatedEligibleOwners,
  } = useGroupSelling();

  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [joiningPoolId, setJoiningPoolId] = useState<string | null>(null);

  const joiningPool = joiningPoolId ? pools.find((p) => p.id === joiningPoolId) : null;

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--green)]/10">
              <Users size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">Gruppförsäljning</h1>
              <p className="text-xs text-[var(--text3)]">
                Slå samman volymer med andra skogsägare och få volympriser
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-[var(--green)]" />
              <span className="text-[10px] text-[var(--text3)]">Aktiva pooler</span>
            </div>
            <p className="text-lg font-mono font-semibold text-[var(--text)]">
              {pools.filter((p) => p.status === 'collecting' || p.status === 'full').length}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Gavel size={14} className="text-[var(--yellow)]" />
              <span className="text-[10px] text-[var(--text3)]">Pågående auktioner</span>
            </div>
            <p className="text-lg font-mono font-semibold text-[var(--text)]">
              {auctions.filter((a) => a.status === 'live').length}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-[var(--green)]" />
              <span className="text-[10px] text-[var(--text3)]">Snitt premium</span>
            </div>
            <p className="text-lg font-mono font-semibold text-[var(--green)]">+{avgPremiumPercent}%</p>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={14} className="text-[var(--green)]" />
              <span className="text-[10px] text-[var(--text3)]">Totalt sparat</span>
            </div>
            <p className="text-lg font-mono font-semibold text-[var(--green)]">
              {totalSavedSEK.toLocaleString('sv-SE')} SEK
            </p>
          </div>
        </div>

        {/* Disruption banner */}
        <div className="mb-6 p-4 rounded-xl border border-[var(--green)]/20 bg-gradient-to-r from-[var(--green)]/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/15 flex-shrink-0">
              <TrendingUp size={16} className="text-[var(--green)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)] mb-1">
                Ensam säljer du 200 m³ till marknadspris. Tillsammans säljer ni 3 000 m³ till volympris.
              </p>
              <p className="text-xs text-[var(--text3)] leading-relaxed">
                Stora skogsbolag har i årtionden haft övertaget i prisförhandlingar med enskilda skogsägare.
                Gruppförsäljning genom BeetleSense jämnar ut spelplanen — samma volymrabatter, samma förhandlingsstyrka.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs + Create button */}
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20'
                    : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg2)]'
                }`}
              >
                <Icon size={14} />
                {label}
                {id === 'auctions' && auctions.filter((a) => a.status === 'live').length > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-[var(--yellow)] text-[#030d05] text-[9px] font-bold flex items-center justify-center">
                    {auctions.filter((a) => a.status === 'live').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreatePool(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[#030d05] hover:brightness-110 transition-colors flex-shrink-0"
          >
            <Plus size={14} />
            Skapa pool
          </button>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--green)] animate-spin" />
          </div>
        ) : (
          <>
            {/* Tab: Aktiva pooler */}
            {activeTab === 'active' && (
              <div className="grid gap-4 sm:grid-cols-2">
                {pools
                  .filter((p) => p.status === 'collecting' || p.status === 'full')
                  .map((pool) => (
                    <PoolCard
                      key={pool.id}
                      pool={pool}
                      onJoin={(id) => setJoiningPoolId(id)}
                    />
                  ))}
                {pools.filter((p) => p.status === 'collecting' || p.status === 'full').length === 0 && (
                  <div className="col-span-2 text-center py-12">
                    <Users size={32} className="mx-auto mb-3 text-[var(--text3)]" />
                    <p className="text-sm text-[var(--text3)]">Inga aktiva pooler just nu</p>
                    <button
                      onClick={() => setShowCreatePool(true)}
                      className="mt-3 text-xs text-[var(--green)] hover:underline"
                    >
                      Skapa den första!
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Mina pooler */}
            {activeTab === 'mine' && (
              <div className="grid gap-4 sm:grid-cols-2">
                {myPools.length > 0 ? (
                  myPools.map((pool) => (
                    <PoolCard
                      key={pool.id}
                      pool={pool}
                      onJoin={(id) => setJoiningPoolId(id)}
                    />
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12">
                    <TreePine size={32} className="mx-auto mb-3 text-[var(--text3)]" />
                    <p className="text-sm text-[var(--text3)]">Du har inte gått med i någon pool ännu</p>
                    <button
                      onClick={() => setActiveTab('active')}
                      className="mt-3 text-xs text-[var(--green)] hover:underline"
                    >
                      Se aktiva pooler
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Auktioner */}
            {activeTab === 'auctions' && (
              <div className="space-y-4">
                {auctions
                  .filter((a) => a.status === 'live')
                  .map((auction) => (
                    <LiveAuctionCard
                      key={auction.id}
                      auction={auction}
                      onVote={(id, accept) => voteOnAuction(id, accept)}
                    />
                  ))}
                {auctions.filter((a) => a.status === 'live').length === 0 && (
                  <div className="text-center py-12">
                    <Gavel size={32} className="mx-auto mb-3 text-[var(--text3)]" />
                    <p className="text-sm text-[var(--text3)]">Inga pågående auktioner</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Historik */}
            {activeTab === 'history' && <PoolResultsList results={results} />}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreatePool && (
        <CreatePool
          onSubmit={createPool}
          onClose={() => setShowCreatePool(false)}
          estimatedEligibleOwners={estimatedEligibleOwners}
        />
      )}

      {joiningPool && (
        <VolumeCommitment
          pool={joiningPool}
          onSubmit={joinPool}
          onClose={() => setJoiningPoolId(null)}
        />
      )}
    </div>
  );
}

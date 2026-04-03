import { useState } from 'react';
import {
  Heart,
  MessageCircle,
  MapPin,
  CheckCircle,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  ImageIcon,
} from 'lucide-react';

type TabKey = 'discussions' | 'sightings' | 'marketplace' | 'prices';

const tabLabels: { key: TabKey; label: string }[] = [
  { key: 'discussions', label: 'Discussions' },
  { key: 'sightings', label: 'Sightings' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'prices', label: 'Prices' },
];

/* ── Demo Data ── */

const demoDiscussions = [
  { id: 1, author: 'Erik Lindgren', avatar: 'EL', time: '2h ago', title: 'Bark beetle activity near Jokkmokk', preview: 'Has anyone noticed increased bark beetle activity near the E45 corridor? I found fresh bore dust on several spruce trees in my stand last week...', likes: 12, replies: 5 },
  { id: 2, author: 'Anna Svensson', avatar: 'AS', time: '5h ago', title: 'Optimal harvest timing for G28 spruce?', preview: 'My growth model shows optimal rotation at 65 years but the timber price forecast suggests waiting another 3-5 years. What would you do?', likes: 8, replies: 3 },
  { id: 3, author: 'Lars Karlsson', avatar: 'LK', time: '1d ago', title: 'Best chainsaw for thinning operations?', preview: 'Looking to upgrade from my old Husqvarna 550 XP. Anyone tried the new Stihl MS 261 C-M for selective thinning in dense spruce?', likes: 15, replies: 9 },
  { id: 4, author: 'Maria Johansson', avatar: 'MJ', time: '2d ago', title: 'New Skogsstyrelsen regulation on clear-cut buffer zones', preview: 'The updated guidelines require 15m buffer zones near watercourses instead of 10m. This will affect about 20% of my planned harvest area...', likes: 22, replies: 11 },
  { id: 5, author: 'Ola Nilsson', avatar: 'ON', time: '3d ago', title: 'Pine weevil protection strategies for replanting', preview: 'We lost 30% of seedlings to pine weevil damage last year. Considering mechanical protection versus chemical treatment for this spring...', likes: 6, replies: 4 },
];

const demoSightings = [
  { id: 1, county: 'Kronoberg', species: 'Ips typographus', time: '3h ago', proximity: '~2km from your parcel', hasPhoto: true },
  { id: 2, county: 'Kalmar', species: 'Wind damage (storm)', time: '8h ago', proximity: '~15km from your parcel', hasPhoto: true },
  { id: 3, county: 'Kronoberg', species: 'Wild boar damage', time: '1d ago', proximity: '~5km from your parcel', hasPhoto: true },
];

const demoListings = [
  { id: 1, title: 'Ponsse Ergo 8W Harvester (2019)', price: 'SEK 1,850,000', location: 'Vaxjo', hasPhoto: true },
  { id: 2, title: 'Forest Management Consulting', price: 'From SEK 800/hr', location: 'Nationwide', hasPhoto: false },
  { id: 3, title: 'Professional Drone Survey Service', price: 'SEK 3,500/flight', location: 'Southern Sweden', hasPhoto: false },
  { id: 4, title: 'Seasoned Birch Firewood (10m\u00B3)', price: 'SEK 1,200/m\u00B3', location: 'Alvesta', hasPhoto: true },
];

const demoPrices = [
  { species: 'Spruce', assortment: 'Sawlog', range: 'SEK 560\u2013610/m\u00B3', reports: 24, trend: 'stable' as const },
  { species: 'Spruce', assortment: 'Pulpwood', range: 'SEK 320\u2013360/m\u00B3', reports: 18, trend: 'up' as const },
  { species: 'Pine', assortment: 'Sawlog', range: 'SEK 540\u2013590/m\u00B3', reports: 15, trend: 'down' as const },
  { species: 'Pine', assortment: 'Pulpwood', range: 'SEK 300\u2013340/m\u00B3', reports: 12, trend: 'stable' as const },
  { species: 'Birch', assortment: 'Pulpwood', range: 'SEK 310\u2013350/m\u00B3', reports: 8, trend: 'up' as const },
];

/* ── Components ── */

function SegmentControl({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div
      className="inline-flex rounded-xl p-1 gap-0.5"
      style={{ background: 'var(--bg3)' }}
    >
      {tabLabels.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
            ${active === key
              ? 'bg-[var(--green)] text-white shadow-sm'
              : 'text-[var(--text3)] hover:text-[var(--text2)]'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function DiscussionsTab() {
  return (
    <div className="space-y-3">
      {demoDiscussions.map((post) => (
        <div
          key={post.id}
          className="rounded-xl p-4"
          style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--green-wash)', color: 'var(--green)' }}
            >
              {post.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-[var(--text)]">{post.author}</span>
              <span className="text-xs text-[var(--text3)] ml-2">{post.time}</span>
            </div>
          </div>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{post.title}</h3>
          <p className="text-xs text-[var(--text3)] line-clamp-2 mb-3">{post.preview}</p>
          <div className="flex items-center gap-4 text-xs text-[var(--text3)]">
            <span className="flex items-center gap-1">
              <Heart size={14} /> {post.likes}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={14} /> {post.replies}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SightingsTab() {
  return (
    <div className="space-y-3">
      {demoSightings.map((sighting) => (
        <div
          key={sighting.id}
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
        >
          {/* Photo placeholder */}
          <div
            className="flex items-center justify-center"
            style={{
              aspectRatio: '16/9',
              background: 'var(--bg3)',
            }}
          >
            <ImageIcon size={32} className="text-[var(--text3)]" />
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'var(--green-wash)', color: 'var(--green)' }}
              >
                <MapPin size={10} /> {sighting.county}
              </span>
              <span className="text-xs text-[var(--text3)]">{sighting.time}</span>
            </div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{sighting.species}</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--green)' }}>{sighting.proximity}</p>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
            >
              <CheckCircle size={14} /> Verify
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketplaceTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {demoListings.map((listing) => (
        <div
          key={listing.id}
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
        >
          {listing.hasPhoto && (
            <div
              className="flex items-center justify-center"
              style={{ aspectRatio: '16/9', background: 'var(--bg3)' }}
            >
              <ImageIcon size={32} className="text-[var(--text3)]" />
            </div>
          )}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{listing.title}</h3>
            <p
              className="text-base font-bold mb-1"
              style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}
            >
              {listing.price}
            </p>
            <p className="text-xs text-[var(--text3)] mb-3 flex items-center gap-1">
              <MapPin size={12} /> {listing.location}
            </p>
            <button
              className="w-full px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors"
              style={{ background: 'var(--green)' }}
            >
              Contact
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PricesTab() {
  return (
    <div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Species</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Assortment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Price Range</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Reports</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Trend</th>
              </tr>
            </thead>
            <tbody>
              {demoPrices.map((row, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--text)]">{row.species}</td>
                  <td className="px-4 py-3 text-[var(--text2)]">{row.assortment}</td>
                  <td className="px-4 py-3 font-mono text-[var(--text)]" style={{ fontFamily: 'var(--font-mono)' }}>{row.range}</td>
                  <td className="px-4 py-3 text-center text-[var(--text3)]">{row.reports}</td>
                  <td className="px-4 py-3 text-center">
                    {row.trend === 'up' && <TrendingUp size={16} className="mx-auto" style={{ color: 'var(--risk-low)' }} />}
                    {row.trend === 'down' && <TrendingDown size={16} className="mx-auto" style={{ color: 'var(--risk-high)' }} />}
                    {row.trend === 'stable' && <Minus size={16} className="mx-auto text-[var(--text3)]" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10px] text-[var(--text3)] mt-3 italic">
        Prices are anonymous community reports, not official market data.
      </p>
    </div>
  );
}

export default function ForumPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('discussions');

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold text-[var(--text)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Forum
          </h1>
          <p className="text-sm text-[var(--text3)] mt-1">Community discussions and local intelligence</p>
        </div>
        {activeTab === 'discussions' && (
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: 'var(--green)' }}
          >
            <Plus size={16} /> New Discussion
          </button>
        )}
      </div>

      {/* Segment Control */}
      <div className="mb-6 overflow-x-auto">
        <SegmentControl active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === 'discussions' && <DiscussionsTab />}
      {activeTab === 'sightings' && <SightingsTab />}
      {activeTab === 'marketplace' && <MarketplaceTab />}
      {activeTab === 'prices' && <PricesTab />}
    </div>
  );
}

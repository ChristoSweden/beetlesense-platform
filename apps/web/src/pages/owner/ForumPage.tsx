import { useNavigate, Link } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  getObservationsNearby,
  OBSERVATION_TYPE_LABELS,
} from '@/services/observationService';
import { generateCommunityAlerts } from '@/services/communityIntelligenceService';
import {
  Plus,
  Camera,
  MapPin,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  CheckCircle,
  Satellite,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Users,
  Search,
  Bell,
  Star,
  Bookmark,
  BookmarkCheck,
  Flag,
  Share2,
  SlidersHorizontal,
  Flame,
  ArrowUpDown,
  Lightbulb,
  HelpCircle,
  Package,
  MessagesSquare,
  X,
} from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { ReportModal } from '@/components/community/ReportModal';
import {
  UserReputationCard,
  UserNameWithReputation,
  getReputation,
} from '@/components/community/UserReputationCard';
import type { PostType } from '@/hooks/useCommunityFeed';

type TabKey = 'nearby' | 'sightings' | 'discussions' | 'reviews' | 'prices' | 'marketplace';
type SortOption = 'latest' | 'most_liked' | 'most_commented' | 'trending';

const tabLabels: { key: TabKey; label: string }[] = [
  { key: 'nearby', label: 'Nearby' },
  { key: 'sightings', label: 'Sightings' },
  { key: 'discussions', label: 'Discussions' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'prices', label: 'Prices' },
  { key: 'marketplace', label: 'Market' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'most_liked', label: 'Most Liked' },
  { value: 'most_commented', label: 'Most Commented' },
  { value: 'trending', label: 'Trending' },
];

const CATEGORY_FILTERS = ['All', 'Pest Alert', 'Contractor Tip', 'Group Buy', 'Equipment', 'Beginner', 'Regulation', 'Market'];

/* ── Demo Data ── */

interface EnhancedPost {
  id: string;
  postId: string;
  author: string;
  avatar: string;
  time: string;
  title: string;
  preview: string;
  likes: number;
  replies: number;
  type: PostType;
  category: string;
  municipality: string;
  county: string;
  verifiedForester: boolean;
}

const demoEnhancedDiscussions: EnhancedPost[] = [
  { id: '1', postId: 'demo-post-1', author: 'Erik Lindgren', avatar: 'EL', time: '2h ago', title: 'Bark beetle activity near Lessebo', preview: 'Found bore dust on 4-5 spruce trunks along the south-facing slope. Looks like Ips typographus based on the gallery patterns...', likes: 12, replies: 5, type: 'alert', category: 'Pest Alert', municipality: 'Lessebo', county: 'Kronoberg', verifiedForester: true },
  { id: '2', postId: 'demo-post-2', author: 'Anna Svensson', avatar: 'AS', time: '5h ago', title: 'Optimal harvest timing for G28 spruce?', preview: 'My growth model shows optimal rotation at 65 years but the timber price forecast suggests waiting another 3-5 years. What would you do?', likes: 8, replies: 3, type: 'discussion', category: 'Market', municipality: 'Vaxjo', county: 'Kronoberg', verifiedForester: true },
  { id: '3', postId: 'demo-post-3', author: 'Lars Karlsson', avatar: 'LK', time: '1d ago', title: 'Best chainsaw for thinning operations?', preview: 'Looking to upgrade from my old Husqvarna 550 XP. Anyone tried the new Stihl MS 261 C-M for selective thinning in dense spruce?', likes: 15, replies: 9, type: 'request', category: 'Equipment', municipality: 'Alvesta', county: 'Kronoberg', verifiedForester: false },
  { id: '4', postId: 'demo-post-4', author: 'Maria Johansson', avatar: 'MJ', time: '2d ago', title: 'New Skogsstyrelsen regulation on buffer zones', preview: 'The updated guidelines require 15m buffer zones near watercourses instead of 10m. This will affect about 20% of my planned harvest area...', likes: 22, replies: 11, type: 'tip', category: 'Regulation', municipality: 'Vaxjo', county: 'Kronoberg', verifiedForester: true },
  { id: '5', postId: 'demo-post-5', author: 'Lars Karlsson', avatar: 'LK', time: '3d ago', title: 'First-time owner -- what should I know about gallring?', preview: 'Just inherited 35ha of mixed forest outside Vaxjo. Most of the spruce seems to be 35-40 years old. When is the right time?', likes: 22, replies: 5, type: 'discussion', category: 'Beginner', municipality: 'Vaxjo', county: 'Kronoberg', verifiedForester: false },
  { id: '6', postId: 'demo-post-4', author: 'Maria Johansson', avatar: 'MJ', time: '4d ago', title: 'Helicopter spraying group buy -- Alvesta area', preview: 'If we pool 50+ hectares, per-hectare cost drops by 40%. Treatment window is mid-May. Need 5 landowners.', likes: 15, replies: 3, type: 'offer', category: 'Group Buy', municipality: 'Alvesta', county: 'Kronoberg', verifiedForester: true },
];

const demoSightings = [
  { id: 1, county: 'Kronoberg', species: 'Ips typographus', time: '3h ago', proximity: '~2km from your parcel', hasPhoto: true, verificationStatus: 'verified' },
  { id: 2, county: 'Kalmar', species: 'Wind damage (storm)', time: '8h ago', proximity: '~15km from your parcel', hasPhoto: true, verificationStatus: 'pending' },
  { id: 3, county: 'Kronoberg', species: 'Wild boar damage', time: '1d ago', proximity: '~5km from your parcel', hasPhoto: true, verificationStatus: 'verified' },
  { id: 4, county: 'Jonkoping', species: 'Red heart rot', time: '2d ago', proximity: '~30km from your parcel', hasPhoto: true, verificationStatus: 'ai-confirmed' },
];

const demoPrices = [
  { species: 'Spruce', assortment: 'Sawlog', range: 'SEK 560-610/m3', reports: 24, trend: 'stable' as const },
  { species: 'Spruce', assortment: 'Pulpwood', range: 'SEK 320-360/m3', reports: 18, trend: 'up' as const },
  { species: 'Pine', assortment: 'Sawlog', range: 'SEK 540-590/m3', reports: 15, trend: 'down' as const },
];

const demoReviews = [
  { id: 1, author: 'Goran P.', avatar: 'GP', category: 'equipment' as const, subject: 'Husqvarna 572 XP', rating: 5, text: 'Fantastisk motorsag for grovt virke. Stark motor och bra balans vid fallning av gran med 50+ cm diameter.', date: '2026-03-28' },
  { id: 2, author: 'Karin M.', avatar: 'KM', category: 'contractor' as const, subject: 'NordSkog Avverkning AB', rating: 4, text: 'Proffsigt team som holl tidsplanen. Lamnade skogen i bra skick efter gallringen.', date: '2026-03-20' },
  { id: 3, author: 'Bengt S.', avatar: 'BS', category: 'equipment' as const, subject: 'Haglof Vertex Laser Geo', rating: 4, text: 'Mycket bra hojdmatare med GPS-funktion. Exakt och enkel att anvanda i falt.', date: '2026-03-15' },
  { id: 4, author: 'Lena A.', avatar: 'LA', category: 'contractor' as const, subject: 'Smalands Skogstjanst', rating: 2, text: 'Tyvarr dalig upplevelse. Tre veckors forsening och dalig kommunikation.', date: '2026-03-10' },
];

// Demo user location
const USER_LAT = 57.19;
const USER_LNG = 14.05;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function directionLabel(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  const dLat = toLat - fromLat;
  const dLng = toLng - fromLng;
  const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
  if (angle > -22.5 && angle <= 22.5) return 'N';
  if (angle > 22.5 && angle <= 67.5) return 'NE';
  if (angle > 67.5 && angle <= 112.5) return 'E';
  if (angle > 112.5 && angle <= 157.5) return 'SE';
  if (angle > 157.5 || angle <= -157.5) return 'S';
  if (angle > -157.5 && angle <= -112.5) return 'SW';
  if (angle > -112.5 && angle <= -67.5) return 'W';
  return 'NW';
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const POST_TYPE_CONFIG: Record<PostType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  alert: { icon: <AlertTriangle size={12} />, label: 'Alert', color: '#d97706', bg: '#fffbeb' },
  tip: { icon: <Lightbulb size={12} />, label: 'Tip', color: '#059669', bg: '#ecfdf5' },
  request: { icon: <HelpCircle size={12} />, label: 'Request', color: '#2563eb', bg: '#eff6ff' },
  offer: { icon: <Package size={12} />, label: 'Offer', color: '#7c3aed', bg: '#f5f3ff' },
  discussion: { icon: <MessagesSquare size={12} />, label: 'Discussion', color: '#0891b2', bg: '#ecfeff' },
};

/* ── Components ── */

function NearbyActivity() {
  const nearby = useMemo(
    () => getObservationsNearby(USER_LAT, USER_LNG, 10, 30)
      .filter(o => o.userId !== 'demo-user')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3),
    []
  );

  if (nearby.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em] mb-4 font-['Manrope'] px-1">Nearby Activity</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {nearby.map((obs) => {
          const dist = haversineKm(USER_LAT, USER_LNG, obs.lat, obs.lng);
          const dir = directionLabel(USER_LAT, USER_LNG, obs.lat, obs.lng);
          return (
            <div
              key={obs.id}
              className="rounded-3xl p-5 border border-stone-100 transition-all hover:border-emerald-200 hover:shadow-lg"
              style={{ background: '#ffffff', boxShadow: '0 4px 15px -2px rgba(0,0,0,0.02)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-stone-800">
                  {OBSERVATION_TYPE_LABELS[obs.type]}
                </span>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#ecfdf5', color: '#059669' }}
                >
                  ~{dist.toFixed(1)}km {dir}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                <span>{timeAgo(obs.timestamp)}</span>
                {obs.verified && (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle size={10} /> {obs.verificationCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommunityAlertBanner() {
  const alerts = useMemo(() => generateCommunityAlerts(USER_LAT, USER_LNG, 20), []);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  if (criticalAlerts.length === 0) return null;

  return (
    <div
      className="rounded-3xl p-5 mb-8 flex items-center gap-4 bg-red-50 border border-red-100 shadow-sm animate-pulse"
      style={{ color: '#dc2626' }}
    >
      <AlertTriangle size={24} className="shrink-0" />
      <div className="text-sm font-bold leading-tight">
        <span className="block text-[10px] uppercase tracking-widest mb-1 opacity-70">Critical Alert</span>
        {criticalAlerts[0].message}
      </div>
    </div>
  );
}

function SegmentControl({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div
      className="inline-flex rounded-2xl p-1 gap-1 mb-8"
      style={{ background: '#f5f5f4' }}
    >
      {tabLabels.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`
            px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 uppercase tracking-widest
            ${active === key
              ? 'bg-white text-stone-900 shadow-md scale-105'
              : 'text-stone-400 hover:text-stone-600 hover:bg-stone-200/50'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Search & Filter Bar ── */

function SearchFilterBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortOption,
  onSortChange,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
  sortOption: SortOption;
  onSortChange: (s: SortOption) => void;
}) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="mb-6">
      {/* Search input */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search discussions, sightings, advice..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-stone-100 text-stone-400"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-3 rounded-2xl border transition-colors ${showFilters ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-white border border-stone-100" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          {/* Categories */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-stone-200 hidden sm:block" />

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={14} className="text-stone-400" />
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => onSortChange(opt.value)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  sortOption === opt.value
                    ? 'bg-stone-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Trending Section ── */

function TrendingSection() {
  const trendingPosts = useMemo(() => {
    return [...demoEnhancedDiscussions]
      .sort((a, b) => (b.likes + b.replies) - (a.likes + a.replies))
      .slice(0, 3);
  }, []);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-1">
        <Flame size={16} className="text-orange-500" />
        <h2 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em] font-['Manrope']">Trending This Week</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {trendingPosts.map((post) => {
          const typeConfig = POST_TYPE_CONFIG[post.type];
          const rep = getReputation(post.author);
          return (
            <Link
              key={post.id}
              to={`/owner/forum/${post.postId}`}
              className="rounded-2xl p-5 border border-stone-100 transition-all hover:border-emerald-200 hover:shadow-lg hover:-translate-y-0.5 group"
              style={{ background: '#ffffff', boxShadow: '0 4px 15px -2px rgba(0,0,0,0.02)' }}
            >
              {/* Category badge */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: typeConfig.bg, color: typeConfig.color }}
                >
                  {typeConfig.icon}
                  {typeConfig.label}
                </span>
                <span className="text-[10px] text-stone-300">{post.time}</span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold text-stone-900 leading-snug mb-3 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                {post.title}
              </h3>

              {/* Author + stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ background: '#f0f9ff', color: '#0369a1' }}
                  >
                    {post.avatar}
                  </div>
                  <span className="text-[10px] font-semibold text-stone-500">{post.author}</span>
                  {rep.verifiedForester && (
                    <CheckCircle size={10} className="text-emerald-500" fill="currentColor" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-stone-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Heart size={10} /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={10} /> {post.replies}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Enhanced Discussion Card ── */

function EnhancedDiscussionCard({ post }: { post: EnhancedPost }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [bookmarked, setBookmarked] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const typeConfig = POST_TYPE_CONFIG[post.type];
  const rep = getReputation(post.author);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/owner/forum/${post.postId}`);
    toast('Link copied to clipboard', 'success');
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked(!bookmarked);
    toast(bookmarked ? 'Removed from bookmarks' : 'Saved to bookmarks', 'success');
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
  };

  return (
    <>
      <div
        onClick={() => navigate(`/owner/forum/${post.postId}`)}
        className="rounded-[24px] p-6 border border-stone-100 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group"
        style={{ background: '#ffffff', boxShadow: '0 8px 30px rgba(0,0,0,0.02)' }}
      >
        {/* Header: Author + badges */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner"
            style={{ background: '#f0f9ff', color: '#0369a1' }}
          >
            {post.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <UserNameWithReputation userName={post.author}>
                <span className="text-sm font-bold text-stone-900 hover:text-emerald-700 transition-colors cursor-pointer">
                  {post.author}
                </span>
              </UserNameWithReputation>
              {rep.verifiedForester && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <CheckCircle size={9} fill="currentColor" /> Verified
                </span>
              )}
              <span className="w-1 h-1 rounded-full bg-stone-200" />
              <span className="text-[10px] font-bold text-stone-400">{post.time}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: typeConfig.bg, color: typeConfig.color }}
              >
                {typeConfig.icon}
                {typeConfig.label}
              </span>
              <span className="text-[10px] font-medium text-stone-400 px-2 py-0.5 rounded-full bg-stone-50">
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-stone-400">
                <MapPin size={10} />
                {post.municipality}
              </span>
            </div>
          </div>
        </div>

        {/* Title + Preview */}
        <h3 className="text-lg font-bold text-stone-900 mb-2 group-hover:text-emerald-800 transition-colors" style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", Georgia, serif)' }}>
          {post.title}
        </h3>
        <p className="text-sm text-stone-500 leading-relaxed line-clamp-2 mb-4">
          {post.preview}
        </p>

        {/* Actions row */}
        <div className="flex items-center gap-2 pt-3 border-t border-stone-50">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              liked
                ? 'bg-red-50 text-red-500'
                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
            {post.likes + (liked ? 1 : 0)}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/owner/forum/${post.postId}`); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <MessageCircle size={14} />
            {post.replies}
          </button>

          <div className="flex-1" />

          <button
            onClick={handleBookmark}
            className={`p-2 rounded-xl transition-colors ${
              bookmarked
                ? 'text-amber-500 bg-amber-50'
                : 'text-stone-300 hover:text-stone-500 hover:bg-stone-50'
            }`}
            title={bookmarked ? 'Remove bookmark' : 'Save post'}
          >
            {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl text-stone-300 hover:text-stone-500 hover:bg-stone-50 transition-colors"
            title="Copy link"
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowReport(true); }}
            className="p-2 rounded-xl text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors"
            title="Report post"
          >
            <Flag size={16} />
          </button>
        </div>
      </div>

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetType="post"
        targetId={post.postId}
      />
    </>
  );
}

/* ── Enhanced Discussions Tab ── */

function EnhancedDiscussionsTab({ searchQuery, category, sortOption }: { searchQuery: string; category: string; sortOption: SortOption }) {
  const filtered = useMemo(() => {
    let posts = [...demoEnhancedDiscussions];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.preview.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (category !== 'All') {
      posts = posts.filter(p => p.category === category);
    }

    // Sort
    switch (sortOption) {
      case 'most_liked':
        posts.sort((a, b) => b.likes - a.likes);
        break;
      case 'most_commented':
        posts.sort((a, b) => b.replies - a.replies);
        break;
      case 'trending':
        posts.sort((a, b) => (b.likes + b.replies) - (a.likes + a.replies));
        break;
      case 'latest':
      default:
        // already in order
        break;
    }

    return posts;
  }, [searchQuery, category, sortOption]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <Search size={32} className="mx-auto text-stone-300 mb-3" />
        <p className="text-base font-semibold text-stone-500">No discussions found</p>
        <p className="text-sm text-stone-400 mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((post) => (
        <EnhancedDiscussionCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function SightingsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {demoSightings.map((sighting) => (
        <div
          key={sighting.id}
          className="rounded-[40px] overflow-hidden border border-stone-100 transition-all hover:shadow-2xl"
          style={{ background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        >
          <div
            className="group relative flex items-center justify-center overflow-hidden"
            style={{ aspectRatio: '16/10', background: '#fafaf9' }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <ImageIcon size={48} className="text-stone-200 group-hover:scale-110 transition-transform duration-700" />
            {sighting.verificationStatus === 'ai-confirmed' && (
               <div className="absolute top-4 right-4 px-3 py-1.5 bg-[#006b2a] text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full flex items-center gap-1.5 shadow-lg">
                 <Satellite size={12} /> AI Verified
               </div>
            )}
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-stone-100 text-stone-500">
                <MapPin size={12} /> {sighting.county}
              </span>
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-tighter">{sighting.time}</span>
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-2" style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", Georgia, serif)' }}>{sighting.species}</h3>
            <p className="text-xs font-black uppercase tracking-[0.1em] mb-5 text-emerald-600 italic">{sighting.proximity}</p>
            <div className="flex items-center justify-between pt-4 border-t border-stone-50">
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all hover:bg-stone-50 hover:border-stone-300"
                style={{ borderColor: '#e7e5e4', color: '#78716c' }}
              >
                <CheckCircle size={16} /> Verify
              </button>
              {sighting.verificationStatus === 'verified' && (
                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle size={14} /> Trusted
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PricesTab() {
  return (
    <div className="rounded-[40px] overflow-hidden border border-stone-100 shadow-xl" style={{ background: '#ffffff' }}>
      <div className="p-8 border-b border-stone-50">
        <h3 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", Georgia, serif)' }}>Regional Timber Trends</h3>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">Live from Smaland Corridor</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50/50">
              <th className="text-left px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Species</th>
              <th className="text-left px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Assortment</th>
              <th className="text-left px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Price Range</th>
              <th className="text-center px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {demoPrices.map((row, i) => (
              <tr key={i} className="hover:bg-stone-50/30 transition-colors">
                <td className="px-8 py-6 font-bold text-stone-800">{row.species}</td>
                <td className="px-8 py-6 text-stone-500 font-medium">{row.assortment}</td>
                <td className="px-8 py-6 text-stone-900 font-black" style={{ fontFamily: 'var(--font-mono)' }}>{row.range}</td>
                <td className="px-8 py-6 text-center">
                  {row.trend === 'up' && <TrendingUp size={20} className="mx-auto text-emerald-500" />}
                  {row.trend === 'down' && <TrendingDown size={20} className="mx-auto text-red-500" />}
                  {row.trend === 'stable' && <Minus size={20} className="mx-auto text-stone-300" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-6 bg-stone-50/50 text-center">
        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest italic">
          Aggregate of 42 anonymous community reports this week.
        </p>
      </div>
    </div>
  );
}

function ReviewsTab() {
  return (
    <div className="space-y-4">
      {demoReviews.map((review) => (
        <div
          key={review.id}
          className="rounded-[32px] p-6 border border-stone-100 transition-all hover:shadow-xl hover:-translate-y-1"
          style={{ background: '#ffffff', boxShadow: '0 8px 30px rgba(0,0,0,0.02)' }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner"
              style={{ background: review.category === 'equipment' ? '#fef3c7' : '#ede9fe', color: review.category === 'equipment' ? '#92400e' : '#6d28d9' }}
            >
              {review.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900">{review.author}</span>
                <span className="w-1 h-1 rounded-full bg-stone-200" />
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">{review.date}</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: review.category === 'equipment' ? '#92400e' : '#6d28d9' }}>
                {review.category === 'equipment' ? 'Equipment' : 'Contractor'}
              </p>
            </div>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mb-2" style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", Georgia, serif)' }}>{review.subject}</h3>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={18}
                className={star <= review.rating ? 'text-amber-400' : 'text-stone-200'}
                fill={star <= review.rating ? 'currentColor' : 'none'}
              />
            ))}
            <span className="ml-2 text-xs font-bold text-stone-400">{review.rating}/5</span>
          </div>
          <p className="text-sm text-stone-500 leading-relaxed">{review.text}</p>
        </div>
      ))}
    </div>
  );
}

export default function ForumPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('discussions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const navigate = useNavigate();

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  return (
    <div className="relative p-6 sm:p-10 max-w-5xl mx-auto min-h-screen bg-[#fcfcfb]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg">
                <Users size={16} className="text-white" />
             </div>
             <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em]">Nordic Peer Exchange</p>
          </div>
          <h1 className="text-4xl font-black text-stone-900 leading-tight" style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", Georgia, serif)' }}>
            Skogsforumet <span className="text-stone-300 italic">Network</span>
          </h1>
          <p className="text-sm font-bold text-stone-400 mt-3 max-w-md leading-relaxed uppercase tracking-widest">
            LIVE INTELLIGENCE FROM 4,200+ CONNECTED FOREST OWNERS
          </p>
        </div>

        <div className="flex items-center gap-2">
           <Link
             to="/owner/bookmarks"
             className="p-3 rounded-2xl bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors"
             title="Saved posts"
           >
              <Bookmark size={20} />
           </Link>
           <button className="p-3 rounded-2xl bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
           </button>
           <button
             onClick={() => setActiveTab('discussions')}
             className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full text-xs font-black text-white transition-all shadow-xl hover:scale-105 active:scale-95 bg-[#006b2a] uppercase tracking-widest"
           >
             <Plus size={18} /> New Thread
           </button>
        </div>
      </div>

      <CommunityAlertBanner />

      {/* Trending Section */}
      <TrendingSection />

      <NearbyActivity />

      {/* Search & Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortOption={sortOption}
        onSortChange={setSortOption}
      />

      <div className="overflow-x-auto no-scrollbar">
        <SegmentControl active={activeTab} onChange={setActiveTab} />
      </div>

      <div className="pb-32">
        {activeTab === 'nearby' && <SightingsTab />}
        {activeTab === 'sightings' && <SightingsTab />}
        {activeTab === 'discussions' && (
          <EnhancedDiscussionsTab
            searchQuery={debouncedSearch}
            category={selectedCategory}
            sortOption={sortOption}
          />
        )}
        {activeTab === 'reviews' && <ReviewsTab />}
        {activeTab === 'marketplace' && <SightingsTab />}
        {activeTab === 'prices' && <PricesTab />}
      </div>

      {/* Report Observation FAB */}
      <div className="fixed bottom-10 right-10 z-50">
        <button
          className="flex items-center gap-3 pr-8 pl-6 py-4 rounded-full text-white shadow-2xl transition-all hover:scale-110 active:scale-95 group bg-[#006b2a]"
          onClick={() => navigate('/owner/contribute')}
        >
          <Camera size={24} className="group-hover:rotate-[15deg] transition-transform duration-500" />
          <span className="font-black text-xs uppercase tracking-[0.2em]">Report Sightings</span>
        </button>
      </div>
    </div>
  );
}

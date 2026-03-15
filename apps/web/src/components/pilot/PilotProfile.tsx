import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import {
  MapPin,
  Star,
  CheckCircle,
  Cpu,
  Camera,
  Edit2,
  Loader2,
  User,
} from 'lucide-react';

// ─── Types ───

interface PilotProfileData {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  county: string;
  drone_model: string;
  camera_specs: string;
  has_rtk: boolean;
  has_multispectral: boolean;
  has_thermal: boolean;
  completed_missions: number;
  rating: number;
  sample_image_paths: string[];
}

// ─── Component ───

export function PilotProfile({
  userId,
  onEdit,
}: {
  userId?: string;
  onEdit?: () => void;
}) {
  const { profile: currentUser } = useAuthStore();
  const targetId = userId || currentUser?.id;
  const isOwnProfile = targetId === currentUser?.id;

  const [pilot, setPilot] = useState<PilotProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sampleUrls, setSampleUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!targetId) return;

    async function load() {
      const { data, error } = await supabase
        .from('pilot_profiles')
        .select('*')
        .eq('user_id', targetId!)
        .single();

      if (!error && data) {
        const pd = data as PilotProfileData;
        setPilot(pd);

        // Get signed URLs for sample images
        if (pd.sample_image_paths?.length) {
          const urls: string[] = [];
          for (const path of pd.sample_image_paths) {
            const { data: urlData } = await supabase.storage
              .from('pilot-uploads')
              .createSignedUrl(path, 3600);
            if (urlData?.signedUrl) urls.push(urlData.signedUrl);
          }
          setSampleUrls(urls);
        }
      }
      setLoading(false);
    }
    load();
  }, [targetId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[var(--green)]" />
      </div>
    );
  }

  if (!pilot) {
    return (
      <div className="text-center py-12">
        <User size={24} className="mx-auto text-[var(--text3)] mb-2" />
        <p className="text-sm text-[var(--text3)]">Pilot profile not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ─── Header Card ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {pilot.avatar_url ? (
              <img
                src={pilot.avatar_url}
                alt={pilot.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={24} className="text-[var(--text3)]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-serif font-bold text-[var(--text)]">
                  {pilot.full_name}
                </h2>
                <p className="text-xs text-[var(--text3)] flex items-center gap-1 mt-0.5">
                  <MapPin size={10} />
                  {pilot.county}, Sweden
                </p>
              </div>

              {isOwnProfile && onEdit && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                >
                  <Edit2 size={12} />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <CheckCircle size={12} className="text-[var(--green)]" />
                <span className="text-xs font-mono text-[var(--text)]">
                  {pilot.completed_missions}
                </span>
                <span className="text-[10px] text-[var(--text3)]">missions</span>
              </div>

              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={
                      i < Math.round(pilot.rating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-[var(--text3)]'
                    }
                  />
                ))}
                <span className="text-xs font-mono text-[var(--text)] ml-1">
                  {pilot.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Equipment ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Cpu size={12} className="text-[var(--green)]" />
          Equipment
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
              <Cpu size={16} className="text-[var(--text3)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text)]">{pilot.drone_model}</p>
              <p className="text-xs text-[var(--text3)] flex items-center gap-1 mt-0.5">
                <Camera size={10} />
                {pilot.camera_specs}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {pilot.has_rtk && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                RTK GNSS
              </span>
            )}
            {pilot.has_multispectral && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                Multispectral
              </span>
            )}
            {pilot.has_thermal && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                Thermal Imaging
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Portfolio Gallery ─── */}
      {sampleUrls.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">
            Portfolio
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sampleUrls.map((url, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-lg overflow-hidden border border-[var(--border)]"
              >
                <img
                  src={url}
                  alt={`Portfolio ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';
import {
  User,
  Camera,
  Check,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Building2,
  Shield,
} from 'lucide-react';

// ─── Constants ───

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Forest Owner',
  pilot: 'Drone Pilot',
  inspector: 'Inspector',
  admin: 'Administrator',
};

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
  pilot: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  inspector: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

// ─── Component ───

export function ProfileSettings() {
  const { profile } = useAuthStore();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [organization, setOrganization] = useState(profile?.organization ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (file: File) => {
    if (!profile) return;
    setUploadingAvatar(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

      const newUrl = urlData.publicUrl;
      setAvatarUrl(newUrl);

      await supabase
        .from('profiles')
        .update({ avatar_url: newUrl })
        .eq('id', profile.id);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaved(false);

    if (isDemo()) {
      await new Promise((r) => setTimeout(r, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        organization: organization.trim() || null,
      })
      .eq('id', profile.id);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (!profile) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-4 flex items-center gap-2">
        <User size={12} className="text-[var(--green)]" />
        Profile
      </h3>

      <div className="space-y-4">
        {/* ─── Avatar ─── */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-[var(--text3)]" />
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--green)] text-[var(--bg)] flex items-center justify-center hover:brightness-110 transition"
            >
              {uploadingAvatar ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Camera size={10} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
              className="hidden"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-[var(--text)]">
              {profile.full_name || 'Unnamed'}
            </p>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border mt-1 ${
                ROLE_COLORS[profile.role]
              }`}
            >
              <Shield size={8} />
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
        </div>

        {/* ─── Fields ─── */}
        <label className="block">
          <span className="text-xs font-medium text-[var(--text2)] mb-1 flex items-center gap-1">
            <User size={10} />
            Full Name
          </span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[var(--text2)] mb-1 flex items-center gap-1">
            <Mail size={10} />
            Email
          </span>
          <input
            type="email"
            value={profile.email}
            disabled
            className="input-field opacity-50 cursor-not-allowed"
          />
          <p className="text-[10px] text-[var(--text3)] mt-0.5">Email cannot be changed.</p>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[var(--text2)] mb-1 flex items-center gap-1">
            <Phone size={10} />
            Phone
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+46 70 123 4567"
            className="input-field"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[var(--text2)] mb-1 flex items-center gap-1">
            <MapPin size={10} />
            Region
          </span>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Jönköping, Sweden"
            className="input-field"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[var(--text2)] mb-1 flex items-center gap-1">
            <Building2 size={10} />
            Organization
          </span>
          <input
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Company or org name"
            className="input-field"
          />
        </label>

        {/* ─── Save ─── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <Check size={14} />
          ) : null}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

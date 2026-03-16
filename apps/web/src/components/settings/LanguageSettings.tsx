import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Globe, Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: 'GB', locale: 'en-GB' },
  { code: 'sv', label: 'Svenska', flag: 'SE', locale: 'sv-SE' },
] as const;

export function LanguageSettings() {
  const { i18n } = useTranslation();
  const { profile } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const currentLang = i18n.language;

  const handleChange = async (langCode: string) => {
    if (langCode === currentLang) return;

    // Change immediately
    i18n.changeLanguage(langCode);
    localStorage.setItem('beetlesense-lang', langCode);

    // Persist to Supabase
    if (profile) {
      setSaving(true);
      await supabase
        .from('profiles')
        .update({ language: langCode })
        .eq('id', profile.id);
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3 flex items-center gap-2">
        <Globe size={12} className="text-[var(--green)]" />
        Language
      </h3>

      <div className="space-y-2">
        {LANGUAGES.map((lang) => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                isActive
                  ? 'border-[var(--green)]/40 bg-[var(--green)]/10'
                  : 'border-[var(--border)] hover:border-[var(--text3)] hover:bg-[var(--bg3)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">{lang.flag === 'GB' ? '\u{1F1EC}\u{1F1E7}' : '\u{1F1F8}\u{1F1EA}'}</span>
                <div className="text-left">
                  <p className={`text-xs font-medium ${isActive ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                    {lang.label}
                  </p>
                  <p className="text-[10px] text-[var(--text3)]">
                    Date/number: {lang.locale}
                  </p>
                </div>
              </div>
              {isActive && <Check size={14} className="text-[var(--green)]" />}
            </button>
          );
        })}
      </div>

      {saving && (
        <p className="text-[10px] text-[var(--text3)] mt-2">Saving preference...</p>
      )}
    </div>
  );
}

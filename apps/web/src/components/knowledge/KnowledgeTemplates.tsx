import { useTranslation } from 'react-i18next';
import {
  Droplets,
  Truck,
  Landmark,
  Route,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

export interface TemplateItem {
  id: string;
  icon: React.ReactNode;
  textEn: string;
  textSv: string;
  category: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: 'flood',
    icon: <Droplets size={14} />,
    textEn: 'This area floods in [month]',
    textSv: 'Det h\u00e4r omr\u00e5det \u00f6versv\u00e4mmas i [m\u00e5nad]',
    category: 'water',
  },
  {
    id: 'drive',
    icon: <Truck size={14} />,
    textEn: 'Never drive here before [month]',
    textSv: 'K\u00f6r aldrig h\u00e4r f\u00f6re [m\u00e5nad]',
    category: 'operations',
  },
  {
    id: 'historic',
    icon: <Landmark size={14} />,
    textEn: 'This tree/feature is historically significant because...',
    textSv: 'Det h\u00e4r tr\u00e4det/objektet \u00e4r historiskt betydelsefullt f\u00f6r att...',
    category: 'history',
  },
  {
    id: 'access',
    icon: <Route size={14} />,
    textEn: 'Best access route to this stand is...',
    textSv: 'B\u00e4sta v\u00e4gen till det h\u00e4r best\u00e5ndet \u00e4r...',
    category: 'operations',
  },
  {
    id: 'hazard',
    icon: <AlertTriangle size={14} />,
    textEn: 'Watch out for [hazard] near...',
    textSv: 'Se upp f\u00f6r [fara] n\u00e4ra...',
    category: 'warnings',
  },
  {
    id: 'previous',
    icon: <MessageSquare size={14} />,
    textEn: 'The previous owner always said...',
    textSv: 'Den f\u00f6rra \u00e4garen sa alltid...',
    category: 'traditions',
  },
];

interface KnowledgeTemplatesProps {
  onSelect: (text: string, category: string) => void;
}

export function KnowledgeTemplates({ onSelect }: KnowledgeTemplatesProps) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;

  return (
    <div>
      <h4 className="text-[11px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-2">
        {t('knowledge.templates')}
      </h4>
      <div className="grid grid-cols-1 gap-1.5">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onSelect(lang === 'sv' ? tpl.textSv : tpl.textEn, tpl.category)}
            className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border)] text-left hover:bg-[var(--bg3)] hover:border-[var(--border2)] transition-colors text-xs text-[var(--text2)]"
          >
            <span className="text-[var(--text3)] flex-shrink-0">{tpl.icon}</span>
            <span className="truncate">{lang === 'sv' ? tpl.textSv : tpl.textEn}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { Wind, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getStandRiskData,
  getWindConditions,
  getOverallPropertyRisk,
  getRiskColor,
  getWindAlertColor,
} from '@/services/stormRiskService';

export function StormWidget() {
  const { t } = useTranslation();
  const stands = getStandRiskData();
  const wind = getWindConditions();
  const overall = getOverallPropertyRisk(stands);
  const riskColor = getRiskColor(overall.classification);
  const windColor = getWindAlertColor(wind.alertLevel);

  const isStormWarning = wind.currentSpeed > 20;

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Storm warning banner */}
      {isStormWarning && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#ef4444]/10 border-b border-[#ef4444]/30">
          <AlertTriangle size={14} className="text-[#ef4444]" />
          <span className="text-[11px] font-semibold text-[#ef4444]">
            {t('storm.widget.stormWarning')}
          </span>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            {t('storm.widget.title')}
          </h3>
          <Wind size={14} className="text-[var(--text3)]" />
        </div>

        <div className="flex items-center gap-4 mb-3">
          {/* Risk level */}
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-xl font-bold font-mono"
                style={{ color: riskColor }}
              >
                {overall.score}
              </span>
              <span
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase"
                style={{ color: riskColor, background: `${riskColor}15` }}
              >
                {t(`storm.risk.${overall.classification}`)}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {t('storm.widget.windRisk')}
            </p>
          </div>

          {/* Wind conditions */}
          <div className="ml-auto text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <Wind size={12} style={{ color: windColor }} />
              <span className="text-sm font-mono font-semibold text-[var(--text)]">
                {wind.currentSpeed} m/s
              </span>
            </div>
            <span
              className="text-[9px] font-semibold"
              style={{ color: windColor }}
            >
              {t(`storm.wind.alert.${wind.alertLevel}`)}
            </span>
          </div>
        </div>

        {/* Link to full page */}
        <Link
          to="/owner/storm-risk"
          className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] transition-colors"
        >
          <span className="text-xs font-medium text-[var(--text)]">
            {t('storm.widget.viewDetails')}
          </span>
          <ChevronRight size={14} className="text-[var(--text3)]" />
        </Link>
      </div>
    </div>
  );
}

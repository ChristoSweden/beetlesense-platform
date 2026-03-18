import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, Brain } from 'lucide-react';
import { ScarfStatus } from './ScarfStatus';
import { ScarfCertainty } from './ScarfCertainty';
import { ScarfAutonomy } from './ScarfAutonomy';
import { ScarfRelatedness } from './ScarfRelatedness';
import { ScarfFairness } from './ScarfFairness';

// ─── Types ───

interface ScarfDashboardProps {
  /** Start collapsed? */
  defaultCollapsed?: boolean;
  /** Override individual SCARF component props */
  statusProps?: React.ComponentProps<typeof ScarfStatus>;
  certaintyProps?: React.ComponentProps<typeof ScarfCertainty>;
  autonomyProps?: React.ComponentProps<typeof ScarfAutonomy>;
  relatednessProps?: React.ComponentProps<typeof ScarfRelatedness>;
  fairnessProps?: React.ComponentProps<typeof ScarfFairness>;
  className?: string;
}

// ─── Component ───

export function ScarfDashboard(props: ScarfDashboardProps) {
  const {
    defaultCollapsed = false,
    statusProps,
    certaintyProps,
    autonomyProps,
    relatednessProps,
    fairnessProps,
    className = '',
  } = props;

  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`${className}`}>
      {/* Panel header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <Brain size={16} className="text-[var(--green)]" />
          </div>
          <div>
            <h2 className="text-sm font-serif font-bold text-[var(--text)]">SCARF-panel</h2>
            <p className="text-[10px] text-[var(--text3)]">
              Status, Trygghet, Autonomi, Gemenskap, Rättvisa
            </p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors text-[var(--text3)] hover:text-[var(--text)]"
          aria-label={collapsed ? 'Expandera SCARF-panel' : 'Minimera SCARF-panel'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Collapsed summary */}
      {collapsed && (
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Status', color: '#8b5cf6', letter: 'S' },
            { label: 'Trygghet', color: '#3b82f6', letter: 'C' },
            { label: 'Autonomi', color: '#10b981', letter: 'A' },
            { label: 'Gemenskap', color: '#f59e0b', letter: 'R' },
            { label: 'Rättvisa', color: '#06b6d4', letter: 'F' },
          ].map((item) => (
            <button
              key={item.letter}
              onClick={() => setCollapsed(false)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--border2)] transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: item.color }}
              >
                {item.letter}
              </div>
              <span className="text-[9px] text-[var(--text3)]">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Expanded panel with all 5 SCARF elements */}
      {!collapsed && (
        <div className="space-y-3">
          {/* S — Status */}
          <ScarfStatus {...statusProps} />

          {/* C — Certainty */}
          <ScarfCertainty {...certaintyProps} />

          {/* A — Autonomy */}
          <ScarfAutonomy {...autonomyProps} />

          {/* R — Relatedness */}
          <ScarfRelatedness {...relatednessProps} />

          {/* F — Fairness */}
          <ScarfFairness {...fairnessProps} />
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

/**
 * Nano Banana Floating Action Button
 * Optimized for mobile thumb-reach (bottom right)
 */
export const FAB: React.FC<FABProps> = ({ onClick, icon, label, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-24 right-6 z-50 flex items-center justify-center gap-2 
        h-14 px-4 rounded-2xl bg-[var(--green)] text-[var(--bg)] shadow-2xl shadow-[var(--green)]/40 
        hover:scale-105 active:scale-95 transition-all lg:hidden ${className}`}
      aria-label={label || 'Action'}
    >
      {icon || <Plus size={24} />}
      {label && <span className="text-sm font-bold pr-1">{label}</span>}
    </button>
  );
};

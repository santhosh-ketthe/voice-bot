import React from 'react';
import { Sparkles, Zap, Flame, Compass, BrainCircuit } from 'lucide-react';
import { SampleQuestion } from '../types';

interface StarterChipsProps {
  samples: SampleQuestion[];
  onSelect: (chip: SampleQuestion) => void;
  disabled?: boolean;
}

const CHIP_ICONS: Record<string, React.ReactNode> = {
  intro: <Compass className="w-3.5 h-3.5 text-indigo-400" />,
  superpower: <Zap className="w-3.5 h-3.5 text-amber-400" />,
  growth_areas: <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />,
  pushing_limits: <Flame className="w-3.5 h-3.5 text-rose-400" />,
  why_genai: <Sparkles className="w-3.5 h-3.5 text-violet-400" />,
};

export const StarterChips: React.FC<StarterChipsProps> = ({
  samples,
  onSelect,
  disabled = false,
}) => {
  if (!samples || samples.length === 0) {
    return null;
  }

  return (
    <div className="w-full px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Suggested Questions
        </span>
        <span className="text-[10px] text-indigo-400 font-medium">
          Instant Answers
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pb-1">
        {samples.map((chip) => (
          <button
            key={chip.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(chip)}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {CHIP_ICONS[chip.id] || <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{chip.short_label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};


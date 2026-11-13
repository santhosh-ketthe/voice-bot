import React from 'react';

interface AudioVisualizerProps {
  active: boolean;
  color?: string; // e.g. 'indigo' or 'emerald' or 'rose'
  bars?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  active,
  color = 'indigo',
  bars = 5,
}) => {
  const barElements = Array.from({ length: bars });

  const getColorClass = () => {
    switch (color) {
      case 'rose':
        return 'bg-rose-500 shadow-rose-500/50';
      case 'amber':
        return 'bg-amber-400 shadow-amber-400/50';
      case 'emerald':
        return 'bg-emerald-400 shadow-emerald-400/50';
      case 'indigo':
      default:
        return 'bg-indigo-400 shadow-indigo-400/50';
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5 h-8">
      {barElements.map((_, idx) => {
        // Stagger animation delays for natural wave motion
        const delay = `${(idx * 0.15).toFixed(2)}s`;
        const height = active ? 'h-full' : 'h-2';

        return (
          <span
            key={idx}
            style={{
              animationDelay: delay,
              animationDuration: `${0.8 + (idx % 3) * 0.2}s`,
            }}
            className={`w-1 rounded-full transition-all duration-300 shadow-sm ${
              active ? `animate-wave ${getColorClass()}` : 'bg-slate-700 h-2'
            } ${height}`}
          />
        );
      })}
    </div>
  );
};

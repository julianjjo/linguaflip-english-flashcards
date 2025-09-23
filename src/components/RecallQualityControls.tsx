import React from 'react';

export enum RecallQuality {
  AGAIN = 0, // Failed, show again soon
  HARD = 1, // Recalled, but with difficulty
  GOOD = 2, // Recalled correctly
  EASY = 3, // Recalled easily
}

interface RecallQualityControlsProps {
  onRate: ((quality: RecallQuality) => void) | string;
}

const RecallQualityControls: React.FC<RecallQualityControlsProps> = ({
  onRate,
}) => {
  const qualityButtons = [
    {
      label: 'Again',
      quality: RecallQuality.AGAIN,
      color: 'bg-red-500 hover:bg-red-600',
      textColor: 'text-white',
    },
    {
      label: 'Hard',
      quality: RecallQuality.HARD,
      color: 'bg-orange-500 hover:bg-orange-600',
      textColor: 'text-white',
    },
    {
      label: 'Good',
      quality: RecallQuality.GOOD,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      textColor: 'text-white',
    },
    {
      label: 'Easy',
      quality: RecallQuality.EASY,
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-white',
    },
  ];

  const handleRate = (quality: RecallQuality) => {
    if (typeof onRate === 'function') {
      onRate(quality);
    } else if (typeof onRate === 'string') {
      // Call global function
      const globalFn = (window as any)[onRate];
      if (typeof globalFn === 'function') {
        globalFn(quality);
      }
    }
  };

  return (
    <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3 px-2 sm:grid-cols-4">
      {qualityButtons.map(({ label, quality, color, textColor }) => (
        <button
          key={label}
          onClick={() => handleRate(quality)}
          className={`touch-target rounded-lg p-4 text-base font-semibold ${textColor} ${color} touch-feedback focus-mobile shadow-md transition-all duration-200 ease-in-out hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-75 focus:ring-offset-2 focus:ring-offset-slate-200`}
          aria-label={`Rate recall as ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default RecallQualityControls;

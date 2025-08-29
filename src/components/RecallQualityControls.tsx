import React from 'react';

export enum RecallQuality {
  AGAIN = 0, // Failed, show again soon
  HARD = 1,  // Recalled, but with difficulty
  GOOD = 2,  // Recalled correctly
  EASY = 3   // Recalled easily
}

interface RecallQualityControlsProps {
  onRate: (quality: RecallQuality) => void;
}

const RecallQualityControls: React.FC<RecallQualityControlsProps> = ({ onRate }) => {
  const qualityButtons = [
    { label: 'Again', quality: RecallQuality.AGAIN, color: 'bg-red-500 hover:bg-red-600', textColor: 'text-white' },
    { label: 'Hard', quality: RecallQuality.HARD, color: 'bg-orange-500 hover:bg-orange-600', textColor: 'text-white' },
    { label: 'Good', quality: RecallQuality.GOOD, color: 'bg-yellow-500 hover:bg-yellow-600', textColor: 'text-white' },
    { label: 'Easy', quality: RecallQuality.EASY, color: 'bg-green-500 hover:bg-green-600', textColor: 'text-white' },
  ];

  return (
    <div className="mt-6 w-full max-w-md grid grid-cols-2 sm:grid-cols-4 gap-3 px-2">
      {qualityButtons.map(({ label, quality, color, textColor }) => (
        <button
          key={label}
          onClick={() => onRate(quality)}
          className={`touch-target p-4 rounded-lg font-semibold text-base ${textColor} ${color} transition-all duration-200 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-75 focus:ring-offset-2 focus:ring-offset-slate-200 touch-feedback focus-mobile`}
          aria-label={`Rate recall as ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default RecallQualityControls;
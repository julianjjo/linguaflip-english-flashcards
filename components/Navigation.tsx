import React from 'react';

interface NavigationProps {
  currentCardOrder: number;
  reviewDeckSize: number;
}

const Navigation: React.FC<NavigationProps> = ({
  currentCardOrder,
  reviewDeckSize,
}) => {
  if (reviewDeckSize === 0) {
    return null;
  }

  return (
    <div className="mt-8 w-full max-w-md flex justify-center items-center">
      <span className="text-white font-medium text-lg bg-black bg-opacity-20 px-4 py-2 rounded-lg shadow">
        Card: {currentCardOrder} / {reviewDeckSize}
      </span>
    </div>
  );
};

export default Navigation;

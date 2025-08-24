import React, { useState } from 'react';

interface ManualCardFormProps {
  onAddCard: (englishWord: string) => Promise<void>;
  onClose: () => void;
  isCreating: boolean;
  creationError: string | null;
}

const ManualCardForm: React.FC<ManualCardFormProps> = ({ onAddCard, onClose, isCreating, creationError }) => {
  const [englishWord, setEnglishWord] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (englishWord.trim() && !isCreating) {
      onAddCard(englishWord.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-3xl leading-none"
          aria-label="Close form"
        >
          &times;
        </button>
        <h3 className="text-2xl font-bold text-slate-800 mb-2 text-center">Create a New Card</h3>
        <p className="text-slate-600 mb-6 text-center">Enter an English word or phrase. We'll use AI to add the translation and an example sentence.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="english-word" className="block text-sm font-medium text-gray-700 mb-1">
              English Word or Phrase
            </label>
            <input
              id="english-word"
              type="text"
              value={englishWord}
              onChange={(e) => setEnglishWord(e.target.value)}
              placeholder="e.g., 'To take for granted'"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              required
              disabled={isCreating}
              autoFocus
            />
          </div>
          {creationError && (
            <div className="my-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
              {creationError}
            </div>
          )}
          <button
            type="submit"
            disabled={isCreating || !englishWord.trim()}
            className={`w-full px-6 py-3 font-semibold rounded-lg shadow-md transition-all text-white
                        ${isCreating || !englishWord.trim() ? 'bg-gray-400 cursor-not-allowed'
                                                 : 'bg-sky-600 hover:bg-sky-700 hover:shadow-lg'}`}
            aria-live="polite"
          >
            {isCreating ? 'Creating Card...' : 'Create with AI'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManualCardForm;

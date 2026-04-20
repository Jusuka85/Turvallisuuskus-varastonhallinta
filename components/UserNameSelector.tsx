import React, { useState } from 'react';
import { User, Check, ArrowLeft } from 'lucide-react';

interface UserNameSelectorProps {
  onSelect: (name: string) => void;
  onBack?: () => void;
  organization: string;
}

const UserNameSelector: React.FC<UserNameSelectorProps> = ({ onSelect, onBack, organization }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSelect(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-[100] flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full mb-4">
            <User size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Kuka olet?</h1>
          <p className="text-gray-500">
            Kirjoita nimesi jatkaaksesi organisaatiossa <br/>
            <span className="font-semibold text-cyan-600">{organization}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 space-y-6">
          <div className="space-y-2">
            <label htmlFor="user-name" className="block text-sm font-medium text-gray-700">
              Nimesi tai nimimerkkisi
            </label>
            <input
              id="user-name"
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Esim. Matti Meikäläinen"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-lg"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-gray-900 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <Check size={20} />
            Aloita käyttö
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full bg-transparent text-gray-500 p-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:text-gray-700 transition-all"
            >
              <ArrowLeft size={16} />
              Takaisin
            </button>
          )}
        </form>

        <p className="text-center text-xs text-gray-400 pt-4">
          Nimi tallennetaan kirjauksia varten.
        </p>
      </div>
    </div>
  );
};

export default UserNameSelector;

import React, { useState } from 'react';
import { Building2, Shield, Users, Landmark, ChevronRight, Edit3, Check } from 'lucide-react';
import { Organization } from '../types';

interface OrganizationSelectorProps {
  onSelect: (org: Organization) => void;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ onSelect }) => {
  const [customOrg, setCustomOrg] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const organizations: { id: string; icon: React.ReactNode; description: string }[] = [
    { 
      id: 'Pelastuslaitos vakinaiset', 
      icon: <Shield className="text-red-600" />, 
      description: 'Vakinainen henkilöstö' 
    },
    { 
      id: 'Pelastuslaitos sopimuspalokunnat', 
      icon: <Users className="text-orange-600" />, 
      description: 'VPK ja sopimushenkilöstö' 
    },
    { 
      id: 'LSPEL', 
      icon: <Landmark className="text-blue-600" />, 
      description: 'Länsi-Suomen Pelastusalan Liitto' 
    },
    { 
      id: 'Turvallisuuskeskus', 
      icon: <Building2 className="text-emerald-600" />, 
      description: 'Koulutuskeskuksen henkilöstö' 
    },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customOrg.trim()) {
      onSelect(customOrg.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-[100] flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <img 
            src="/logo.png" 
            alt="Turvallisuuskeskus" 
            className="h-16 mx-auto object-contain mb-6" 
          />
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tervetuloa</h1>
          <p className="text-gray-500">Valitse organisaatiosi jatkaaksesi</p>
        </div>

        {!showCustomInput ? (
          <div className="grid gap-4">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => onSelect(org.id)}
                className="group relative flex items-center gap-4 w-full p-5 bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-cyan-500 hover:shadow-md transition-all text-left active:scale-[0.98]"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-cyan-50 transition-colors">
                  {org.icon}
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold text-gray-900 leading-tight">{org.id}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{org.description}</p>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-cyan-500 transition-colors" size={20} />
              </button>
            ))}
            
            <button
              onClick={() => setShowCustomInput(true)}
              className="group relative flex items-center gap-4 w-full p-5 bg-white border border-dashed border-gray-300 rounded-2xl shadow-sm hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left active:scale-[0.98]"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                <Edit3 className="text-gray-500 group-hover:text-cyan-600" />
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-gray-900 leading-tight">Muu toimija</h3>
                <p className="text-xs text-gray-500 mt-0.5">Kirjoita oma organisaatiosi</p>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-cyan-500 transition-colors" size={20} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-2">
              <button 
                type="button" 
                onClick={() => setShowCustomInput(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
              >
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <h3 className="font-bold text-gray-900">Kirjoita organisaatio</h3>
            </div>
            
            <input
              autoFocus
              type="text"
              value={customOrg}
              onChange={(e) => setCustomOrg(e.target.value)}
              placeholder="Organisaation nimi..."
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-lg"
              required
            />
            
            <button
              type="submit"
              disabled={!customOrg.trim()}
              className="w-full bg-gray-900 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all"
            >
              <Check size={20} />
              Vahvista valinta
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 pt-4">
          Valinta tallennetaan tälle laitteelle.
        </p>
      </div>
    </div>
  );
};

export default OrganizationSelector;

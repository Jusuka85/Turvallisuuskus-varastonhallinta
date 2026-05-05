import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { X, Check, Package, Tag, Hash, Box, Layers, Settings } from 'lucide-react';

interface AddItemModalProps {
  onConfirm: (item: Omit<InventoryItem, 'id' | 'borrowedQuantity'>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ onConfirm, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '0',
    unit: 'kpl',
    qrCode: '',
    itemType: 'consumable' as 'consumable' | 'borrowable'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.qrCode) return;

    onConfirm({
      name: formData.name,
      category: formData.category,
      quantity: parseInt(formData.quantity) || 0,
      unit: formData.unit,
      qrCode: formData.qrCode,
      itemType: formData.itemType
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-cyan-400" />
            <h3 className="text-lg font-bold">Lisää uusi nimike</h3>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Package size={16} className="text-gray-400" />
                Tuotteen nimi
              </label>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Esim. Sammutin, Puutavara..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-shadow"
              />
            </div>

            {/* Category */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Tag size={16} className="text-gray-400" />
                Kategoria
              </label>
              <input
                required
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="Esim. Kalusto, Poltto..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-shadow"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                  <Hash size={16} className="text-gray-400" />
                  Alkusaldot
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-shadow font-mono"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                  <Box size={16} className="text-gray-400" />
                  Yksikkö
                </label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  placeholder="kpl, m, l..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-shadow"
                />
              </div>
            </div>

            {/* QR Code */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Layers size={16} className="text-gray-400" />
                QR-koodin sisältö / ID
              </label>
              <input
                required
                type="text"
                name="qrCode"
                value={formData.qrCode}
                onChange={handleChange}
                placeholder="Esim. ITEM-005"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-shadow font-mono"
              />
            </div>

            {/* Item Type */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Settings size={16} className="text-gray-400" />
                Tyyppi
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, itemType: 'consumable' }))}
                  className={`py-2 text-sm font-medium rounded-lg transition-all ${formData.itemType === 'consumable' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Kulutustavara
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, itemType: 'borrowable' }))}
                  className={`py-2 text-sm font-medium rounded-lg transition-all ${formData.itemType === 'borrowable' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Lainattava
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3.5 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Peruuta
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.category || !formData.qrCode}
              className="flex-1 py-3.5 px-4 bg-gray-900 text-white font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-gray-200"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={20} />
                  Lisää tuote
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;

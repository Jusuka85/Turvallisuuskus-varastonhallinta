import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { X, Check, Package, Tag, Hash, Box, Layers, Settings, Trash2, AlertTriangle } from 'lucide-react';

interface EditItemModalProps {
  item: InventoryItem;
  onConfirm: (id: string, updatedFields: Omit<InventoryItem, 'id' | 'borrowedQuantity'>) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onConfirm, onDelete, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState({
    name: item.name || '',
    category: item.category || '',
    quantity: String(item.quantity !== undefined ? item.quantity : 0),
    unit: item.unit || 'kpl',
    qrCode: item.qrCode || '',
    itemType: (item.itemType || 'consumable') as 'consumable' | 'borrowable'
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.qrCode) return;

    onConfirm(item.id, {
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

  const handleDeleteClick = () => {
    if (showDeleteConfirm) {
      onDelete(item.id);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-cyan-400" />
            <h3 className="text-lg font-bold">Muokkaa nimikettä</h3>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {showDeleteConfirm ? (
          /* Delete Confirmation Screen */
          <div className="p-6 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={36} />
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-gray-900">Poistetaanko "{item.name}"?</h4>
              <p className="text-sm text-gray-500 mt-1">
                Tämä toiminto poistaa nimikkeen pysyvästi järjestelmästä. Saldoja ja käyttöhistoriaa ei voi enää palauttaa.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                Peruuta
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-md"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={16} />
                    Kyllä, poista
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Main Edit Form */
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
                  placeholder="Tuotteen nimi"
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
                  placeholder="Kategoria"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-shadow"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    <Hash size={16} className="text-gray-400" />
                    Saldo / Määrä
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
                  QR-koodi / ID
                </label>
                <input
                  required
                  type="text"
                  name="qrCode"
                  value={formData.qrCode}
                  onChange={handleChange}
                  placeholder="ID tai QR-koodin sisältö"
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

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Peruuta
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.category || !formData.qrCode}
                  className="flex-1 py-3 px-4 bg-gray-900 text-white font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-gray-200"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={20} />
                      Tallenna
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleDeleteClick}
                className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-xl flex justify-center items-center gap-2 transition-colors"
              >
                <Trash2 size={16} />
                Poista nimike
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditItemModal;

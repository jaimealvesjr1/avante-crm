import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ActionModal({ config, setConfig }) {
  if (!config.isOpen) return null;

  const closeModal = () => setConfig({ ...config, isOpen: false });

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {config.isDanger && <AlertTriangle className="text-red-500" size={20} />}
            {config.title}
          </h3>
          <button onClick={closeModal} className="p-1 hover:bg-gray-700 rounded-lg transition-colors">
            <X size={20} className="text-gray-400 hover:text-white" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-300 text-sm mb-6 whitespace-pre-line">{config.message}</p>

          {config.isPrompt && (
            <input
              type="text"
              value={config.promptValue || ''}
              onChange={(e) => setConfig({ ...config, promptValue: e.target.value })}
              placeholder={config.promptPlaceholder}
              className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-3 mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
          )}

          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-bold transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => config.onConfirm(config.promptValue)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors text-white ${config.isDanger ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'}`}
            >
              {config.confirmText || 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

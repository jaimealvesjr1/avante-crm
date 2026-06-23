import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CloseMonthModal({ isOpen, onClose, onConfirm }) {
  const [closeMonthValue, setCloseMonthValue] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!closeMonthValue) {
      return toast.error("Selecione a competência para fechar o mês.");
    }
    // Repassa o valor escolhido para o App.jsx executar a ação
    onConfirm(closeMonthValue);
    setCloseMonthValue(''); // Limpa o estado após o uso
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-gray-900 p-6 rounded-3xl border border-gray-700 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <CalendarDays size={20} className="text-red-400" /> Fechamento de Mês
        </h3>
        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          Selecione a competência (mês/ano) que você deseja encerrar. Os relatórios serão gerados e o histórico financeiro será salvo.
        </p>
        
        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Competência</label>
        <input 
          type="month" 
          value={closeMonthValue} 
          onChange={e => setCloseMonthValue(e.target.value)} 
          className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-sm text-white outline-none focus:border-red-500 mb-8 transition-colors cursor-pointer shadow-inner" 
        />
        
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="text-gray-400 hover:text-white px-4 py-2 text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl font-bold shadow-md transition-colors text-sm">
            Continuar Fechamento
          </button>
        </div>
      </div>
    </div>
  );
}

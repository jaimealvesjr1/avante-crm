import React, { useState } from 'react';
import { X, Download, FileJson, FileText, FileSpreadsheet, CalendarDays } from 'lucide-react';
import { toast } from 'react-hot-toast'; 

export default function ExportModal({ isOpen, onClose, onExport, filterCount, allowJson }) {
  const [pdf, setPdf] = useState(true);
  const [excel, setExcel] = useState(true);
  const [json, setJson] = useState(false);
  
  const [monthInput, setMonthInput] = useState(() => {
    const today = new Date();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${m}`;
  });

  if (!isOpen) return null;

  const formatToBankMonth = (yyyyMm) => {
      if (!yyyyMm || typeof yyyyMm !== 'string' || !yyyyMm.includes('-')) return '';
      const [year, month] = yyyyMm.split('-');
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      return `${months[parseInt(month, 10) - 1]}/${year.slice(-2)}`;
  };

  const handleExport = () => {
    if (!pdf && !excel && !json) {
       return toast.error("Selecione pelo menos um formato de exportação.");
    }

    if ((pdf || excel) && !monthInput) {
        return toast.error("Por favor, selecione a Competência (Mês/Ano) para gerar os relatórios.");
    }
    
    // Removido o parâmetro "showAgencyFee"
    onExport({ 
        json, 
        pdf, 
        excel, 
        monthInput: (pdf || excel) ? formatToBankMonth(monthInput) : ''
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-gray-900 p-6 rounded-3xl border border-gray-700 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Download size={22} className="text-orange-500" /> Exportar Dados
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-6">
          Você está gerando relatórios considerando as <strong>{filterCount}</strong> lojas atualmente filtradas no painel.
        </p>

        <div className="space-y-4 mb-8">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 bg-black/20 cursor-pointer hover:bg-white/5 transition-colors">
            <input type="checkbox" checked={pdf} onChange={e => setPdf(e.target.checked)} className="w-5 h-5 rounded text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-offset-gray-900" />
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-red-400" />
              <span className="text-sm font-bold text-white">Relatório em PDF</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 bg-black/20 cursor-pointer hover:bg-white/5 transition-colors">
            <input type="checkbox" checked={excel} onChange={e => setExcel(e.target.checked)} className="w-5 h-5 rounded text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-offset-gray-900" />
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-emerald-400" />
              <span className="text-sm font-bold text-white">Planilha Excel (XLSX)</span>
            </div>
          </label>

          {allowJson && (
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 bg-black/20 cursor-pointer hover:bg-white/5 transition-colors">
              <input type="checkbox" checked={json} onChange={e => setJson(e.target.checked)} className="w-5 h-5 rounded text-orange-500 bg-gray-800 border-gray-600 focus:ring-orange-500 focus:ring-offset-gray-900" />
              <div className="flex items-center gap-2">
                <FileJson size={18} className="text-yellow-400" />
                <div>
                  <span className="text-sm font-bold text-white block">Backup Completo (JSON)</span>
                  <span className="text-[10px] text-gray-500">Dados brutos para restauração do sistema</span>
                </div>
              </div>
            </label>
          )}
        </div>

        {(pdf || excel) && (
          <div className="bg-black/40 p-4 rounded-xl border border-white/5 mb-6 animate-in slide-in-from-top-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
              <CalendarDays size={14} /> Configurações do Relatório
            </h4>
            
            <div className="mb-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Competência</label>
              <input 
                type="month" 
                value={monthInput} 
                onChange={e => setMonthInput(e.target.value)} 
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-orange-500 transition-colors cursor-pointer" 
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleExport} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2">
            <Download size={16} /> Baixar Arquivos
          </button>
        </div>
      </div>
    </div>
  );
}

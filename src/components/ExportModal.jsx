import React, { useState, useEffect } from 'react';
import { X, FileJson, FileText, FileSpreadsheet, Download } from 'lucide-react';

export default function ExportModal({ isOpen, onClose, onExport, filterCount }) {
  const [selJson, setSelJson] = useState(false);
  const [selPdf, setSelPdf] = useState(true);
  const [selExcel, setSelExcel] = useState(true);
  const [monthInput, setMonthInput] = useState('');

  // Preenche uma sugestão de mês automaticamente (Ex: MAIO/2026)
  useEffect(() => {
    if (isOpen) {
      const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
      const hoje = new Date();
      setMonthInput(`${meses[hoje.getMonth()]}/${hoje.getFullYear()}`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    if ((selPdf || selExcel) && !monthInput.trim()) {
      alert("Por favor, digite a competência (Ex: MAIO/2026) para gerar PDF/Excel.");
      return;
    }
    if (!selJson && !selPdf && !selExcel) {
      alert("Selecione pelo menos um formato para exportar.");
      return;
    }
    onExport({ json: selJson, pdf: selPdf, excel: selExcel, monthInput });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors bg-gray-800 rounded-full p-1"><X size={16} /></button>
        
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Download size={20} className="text-indigo-400" /> Exportar Dados
        </h2>
        <p className="text-xs text-gray-400 mb-6">
          Você está exportando os dados de <strong className="text-indigo-400">{filterCount} loja(s)</strong> visíveis no filtro atual.
        </p>

        <div className="space-y-4 mb-6">
          <label className="flex items-center gap-3 p-3 border border-gray-700 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
            <input type="checkbox" checked={selExcel} onChange={e => setSelExcel(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
            <FileSpreadsheet size={18} className="text-emerald-500" />
            <div>
              <p className="text-sm font-bold text-gray-200 leading-none">Planilha Gerencial (Excel)</p>
              <p className="text-[10px] text-gray-500 mt-1">Visão completa com split de comissões e indicadores.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-gray-700 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
            <input type="checkbox" checked={selPdf} onChange={e => setSelPdf(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
            <FileText size={18} className="text-red-500" />
            <div>
              <p className="text-sm font-bold text-gray-200 leading-none">Relatório Executivo (PDF)</p>
              <p className="text-[10px] text-gray-500 mt-1">PDF premium formatado para envio direto ao cliente.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-gray-700 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
            <input type="checkbox" checked={selJson} onChange={e => setSelJson(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
            <FileJson size={18} className="text-amber-500" />
            <div>
              <p className="text-sm font-bold text-gray-200 leading-none">Backup Bruto (JSON)</p>
              <p className="text-[10px] text-gray-500 mt-1">Cópia de segurança para restauração do sistema.</p>
            </div>
          </label>
        </div>

        {(selPdf || selExcel) && (
          <div className="mb-6 animate-in slide-in-from-top-2">
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Competência do Relatório</label>
            <input 
              type="text" 
              value={monthInput} 
              onChange={e => setMonthInput(e.target.value.toUpperCase())}
              placeholder="Ex: MAIO/2026"
              className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        )}

        <button onClick={handleExport} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
          Gerar Arquivos Selecionados
        </button>
      </div>
    </div>
  );
}

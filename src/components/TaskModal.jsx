import React, { useState } from 'react';
import { X, Plus, CalendarDays, CheckCircle2, Trash2, Send } from 'lucide-react';

export default function TaskModal({ store, onClose, updateStoreInCloud, stores, setStores }) {
  const [newLog, setNewLog] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [nextDate, setNextDate] = useState(store.dataProximoAcesso || '');

  // Funções de salvamento (Simulam o updateStoreChange do seu App.jsx)
  const saveChanges = (updatedStore) => {
    updateStoreInCloud(updatedStore);
    setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
  };

  const addLog = () => {
    if (!newLog.trim()) return;
    const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: newLog };
    saveChanges({ 
      ...store, 
      taskLogs: [...(store.taskLogs || []), log], 
      dataUltimoAcesso: new Date().toISOString() 
    });
    setNewLog('');
  };

  const addChecklist = () => {
    if (!newChecklist.trim()) return;
    const item = { id: Date.now(), texto: newChecklist, feita: false };
    saveChanges({ ...store, checklists: [...(store.checklists || []), item] });
    setNewChecklist('');
  };

  const toggleChecklist = (id) => {
    const updatedChecklists = store.checklists.map(c => c.id === id ? { ...c, feita: !c.feita } : c);
    saveChanges({ ...store, checklists: updatedChecklists });
  };

  const deleteChecklist = (id) => {
    saveChanges({ ...store, checklists: store.checklists.filter(c => c.id !== id) });
  };

  const saveNextDate = () => {
    saveChanges({ ...store, dataProximoAcesso: nextDate });
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[85vh]">
        
        {/* LADO ESQUERDO: CHECKLIST E HISTÓRICO */}
        <div className="flex-1 flex flex-col border-r border-gray-700 bg-gray-900/50">
          <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-indigo-400"/> {store.client}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{store.store}</p>
            </div>
            {/* Oculto no Desktop, visível no Mobile */}
            <button onClick={onClose} className="md:hidden p-1 hover:bg-gray-700 rounded-lg"><X size={20} className="text-gray-400" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* SESSÃO DE CHECKLIST */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">To-Do List (O que falta fazer?)</h4>
              <div className="space-y-2 mb-3">
                {store.checklists?.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-800 p-2.5 rounded-lg border border-gray-700 group">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={item.feita} onChange={() => toggleChecklist(item.id)} className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-indigo-500 cursor-pointer" />
                      <span className={`text-sm ${item.feita ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.texto}</span>
                    </div>
                    <button onClick={() => deleteChecklist(item.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newChecklist} onChange={e => setNewChecklist(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklist()} placeholder="Ex: Adicionar link na Bio..." className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm text-white outline-none focus:border-indigo-500" />
                <button onClick={addChecklist} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg"><Plus size={18}/></button>
              </div>
            </div>

            {/* SESSÃO DE LOGS */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 mt-6">Histórico de Ações</h4>
              <div className="space-y-3 mb-3 border-l-2 border-gray-700 ml-2 pl-4">
                {store.taskLogs?.slice().reverse().map(log => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="text-[10px] text-blue-400 font-bold mb-0.5">{log.data}</div>
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-sm text-gray-300 shadow-sm">{log.texto}</div>
                  </div>
                ))}
                {(!store.taskLogs || store.taskLogs.length === 0) && <div className="text-xs text-gray-500 italic">Nenhum log registrado ainda.</div>}
              </div>
              <div className="flex gap-2 mt-4">
                <textarea value={newLog} onChange={e => setNewLog(e.target.value)} placeholder="Descreva o que você fez hoje nesta conta..." className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500 min-h-[60px] resize-none" />
                <button onClick={addLog} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"><Send size={16}/> <span className="text-[10px] font-bold">Lançar</span></button>
              </div>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: AGENDAMENTO */}
        <div className="w-full md:w-72 bg-gray-800 flex flex-col">
          <div className="hidden md:flex justify-end p-4">
            <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-lg transition-colors"><X size={20} className="text-gray-400 hover:text-white" /></button>
          </div>
          
          <div className="p-6 pt-0 flex-1">
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <CalendarDays size={16} className="text-amber-400" /> Próximo Acesso
              </h4>
              <p className="text-xs text-gray-400 mb-4">Agende o dia exato para voltar a trabalhar nesta conta.</p>
              
              <div className="flex flex-col gap-2">
                <input 
                  type="date" 
                  value={nextDate} 
                  onChange={(e) => setNextDate(e.target.value)} 
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white outline-none font-bold"
                />
                <button onClick={saveNextDate} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-lg shadow-lg transition-colors mt-2">
                  Agendar Retorno
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

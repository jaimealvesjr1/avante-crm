import React, { useState } from 'react';
import { X, Plus, CalendarDays, CheckCircle2, Trash2, Send, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TaskModal({ store, onClose, updateStoreInCloud, stores, setStores, currentUserData, isManager, teamMembers }) {
  const [newLog, setNewLog] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [newChecklistResp, setNewChecklistResp] = useState('');
  const [nextDate, setNextDate] = useState(store.dataProximoAcesso || '');
  const [storeResp, setStoreResp] = useState(store.responsavel || '');

  // Lê o Nome Completo. Se não existir, cai para o Nome. Se for conta muito antiga, cai para o e-mail.
  const username = currentUserData?.nomeCompleto || currentUserData?.nome || currentUserData?.email?.split('@')[0] || 'Usuário';
  
  // Lista de nomes bem formatados para o Dropdown
  const teamNames = teamMembers?.map(m => m.nomeCompleto || m.nome || m.email.split('@')[0]).filter(Boolean) || [];

  const saveChanges = (updatedStore) => {
    updateStoreInCloud(updatedStore);
    setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
  };

  const handleStoreRespChange = (e) => {
    const newResp = e.target.value;
    setStoreResp(newResp);
    saveChanges({ ...store, responsavel: newResp });
    toast.success('Responsável atualizado com sucesso!');
  };

  const addLog = () => {
    if (!newLog.trim()) return;
    const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: newLog, author: username };
    saveChanges({ 
      ...store, 
      taskLogs: [...(store.taskLogs || []), log], 
      dataUltimoAcesso: new Date().toISOString() 
    });
    setNewLog('');
    toast.success('Ação registrada no histórico!');
  };

  const deleteLog = (logId) => {
    if(window.confirm("Apagar este registro do histórico?")) {
      saveChanges({ ...store, taskLogs: store.taskLogs.filter(l => l.id !== logId) });
      toast.success('Registro apagado!');
    }
  };

  const addChecklist = () => {
    if (!newChecklist.trim()) return;
    const item = { id: Date.now(), texto: newChecklist, feita: false, responsavel: newChecklistResp.trim() };
    saveChanges({ ...store, checklists: [...(store.checklists || []), item] });
    setNewChecklist('');
    setNewChecklistResp('');
    toast.success('Tarefa adicionada!');
  };

  const toggleChecklist = (id) => {
    const item = store.checklists.find(c => c.id === id);
    const isCompleting = !item.feita;
    
    const updatedChecklists = store.checklists.map(c => c.id === id ? { ...c, feita: !c.feita } : c);
    
    let updatedLogs = store.taskLogs || [];
    if (isCompleting) {
      updatedLogs = [...updatedLogs, { 
        id: Date.now(), 
        data: new Date().toLocaleString('pt-BR'), 
        texto: `✅ Tarefa concluída: "${item.texto}"`, 
        author: username 
      }];
    }

    saveChanges({ 
      ...store, 
      checklists: updatedChecklists, 
      taskLogs: updatedLogs,
      dataUltimoAcesso: new Date().toISOString()
    });
    
    toast.success(isCompleting ? '✅ Tarefa concluída!' : 'Tarefa reaberta!');
  };

  const deleteChecklist = (id) => {
    saveChanges({ ...store, checklists: store.checklists.filter(c => c.id !== id) });
    toast.success('Tarefa removida!');
  };

  const saveNextDate = () => {
    saveChanges({ ...store, dataProximoAcesso: nextDate });
    toast.success('Retorno agendado com sucesso!');
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[85vh]">
        
        {/* LADO ESQUERDO: CHECKLIST E HISTÓRICO */}
        <div className="flex-1 flex flex-col border-r border-gray-700 bg-gray-900/50">
          <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-indigo-400"/> {store.client}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{store.store}</p>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
              <User size={14} className="text-blue-400" />
              <select 
                value={storeResp} 
                onChange={handleStoreRespChange}
                className="bg-transparent text-sm text-gray-200 outline-none w-36 cursor-pointer font-semibold"
              >
                <option value="">Sem Resp.</option>
                {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <button onClick={onClose} className="md:hidden p-1 hover:bg-gray-700 rounded-lg"><X size={20} className="text-gray-400" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            {/* SESSÃO DE CHECKLIST */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">To-Do List</h4>
              <div className="space-y-2 mb-3">
                {store.checklists?.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-800 p-2.5 rounded-lg border border-gray-700 group">
                    <div className="flex items-center gap-3 flex-1">
                      <input type="checkbox" checked={item.feita} onChange={() => toggleChecklist(item.id)} className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-indigo-500 cursor-pointer" />
                      <span className={`text-sm ${item.feita ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.texto}</span>
                      {item.responsavel && (
                        <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded ml-2 border border-indigo-800/50 whitespace-nowrap">
                          Resp: {item.responsavel}
                        </span>
                      )}
                    </div>
                    <button onClick={() => deleteChecklist(item.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <input type="text" value={newChecklist} onChange={e => setNewChecklist(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklist()} placeholder="O que fazer? Ex: Ajustar Preços..." className="flex-[2] bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm text-white outline-none focus:border-indigo-500" />
                <div className="flex gap-2">
                  <select value={newChecklistResp} onChange={e => setNewChecklistResp(e.target.value)} className="w-36 bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm text-white outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="">Sem Resp.</option>
                    {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <button onClick={addChecklist} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg"><Plus size={18}/></button>
                </div>
              </div>
            </div>

            {/* SESSÃO DE LOGS */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 mt-6">Histórico de Ações</h4>
              <div className="space-y-3 mb-3 border-l-2 border-gray-700 ml-2 pl-4">
                {store.taskLogs?.slice().reverse().map(log => (
                  <div key={log.id} className="relative group/log">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="text-[10px] text-blue-400 font-bold">
                        {log.data} <span className="text-gray-500 font-normal ml-1">por {log.author}</span>
                      </div>
                      {isManager && (
                        <button onClick={() => deleteLog(log.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover/log:opacity-100 transition-opacity mr-2">
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-sm text-gray-300 shadow-sm">{log.texto}</div>
                  </div>
                ))}
                {(!store.taskLogs || store.taskLogs.length === 0) && <div className="text-xs text-gray-500 italic">Nenhum log registrado.</div>}
              </div>
              <div className="flex gap-2 mt-4">
                <textarea value={newLog} onChange={e => setNewLog(e.target.value)} placeholder="Descreva o que você fez hoje nesta conta..." className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500 min-h-[60px] resize-none" />
                <button onClick={addLog} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"><Send size={16}/> <span className="text-[10px] font-bold">Lançar</span></button>
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

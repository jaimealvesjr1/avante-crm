import React, { useState } from 'react';
import { X, Plus, CalendarDays, CheckCircle2, Trash2, Send, User, StickyNote, Save, Copy, Eraser, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TaskModal({ store, onClose, updateStoreInCloud, stores, setStores, currentUserData, isManager, teamMembers }) {
  const [newLog, setNewLog] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [newChecklistResp, setNewChecklistResp] = useState('');
  const [nextDate, setNextDate] = useState(store.dataProximoAcesso || '');
  const [storeResp, setStoreResp] = useState(store.responsavel || '');
  const [fixedNotes, setFixedNotes] = useState(store.notasFixas || '');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateTargetId, setDuplicateTargetId] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [dailyGMV, setDailyGMV] = useState('');
  const [dailyAds, setDailyAds] = useState('');
  const [dailyOrders, setDailyOrders] = useState('');
  const [dailyUnits, setDailyUnits] = useState('');
  const [entryDay, setEntryDay] = useState(new Date().getDate());
  const [isSavingDaily, setIsSavingDaily] = useState(false);

  const username = currentUserData?.nomeCompleto || currentUserData?.nome || currentUserData?.email?.split('@')[0] || 'Usuário';
  
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

  const saveDailyEntry = () => {
    if (!dailyGMV && !dailyAds && !dailyOrders && !dailyUnits) {
      return toast.error("Preencha os dados para lançar.");
    }

    setIsSavingDaily(true);

    const gmvVal = Number(dailyGMV) || 0;
    const adsVal = Number(dailyAds) || 0;
    const ordersVal = Number(dailyOrders) || 0;
    const unitsVal = Number(dailyUnits) || 0;
    const dayVal = Number(entryDay);

    let prevRev = 0, prevAds = 0, prevOrd = 0, prevUni = 0;
    const pastEntries = [...(store.history || [])].filter(h => h.day < dayVal).sort((a,b) => b.day - a.day);
    if(pastEntries.length > 0) {
        prevRev = pastEntries[0].revenue || 0;
        prevAds = pastEntries[0].ads || 0;
        prevOrd = pastEntries[0].orders || 0;
        prevUni = pastEntries[0].units || 0;
    }

    const cumRev = prevRev + gmvVal;
    const cumAds = prevAds + adsVal;
    const cumOrd = prevOrd + ordersVal;
    const cumUni = prevUni + unitsVal;

    const entry = {
      id: Date.now(),
      day: dayVal,
      dailyRevenue: gmvVal,
      revenue: cumRev,
      ads: cumAds,
      orders: cumOrd,
      units: cumUni,
      date: new Date().toLocaleDateString('pt-BR')
    };

    // 4. Inserir ou atualizar no histórico
    let updatedHistory = [...(store.history || [])];
    const existingIndex = updatedHistory.findIndex(h => h.day === dayVal);
    
    if(existingIndex >= 0) {
      entry.id = updatedHistory[existingIndex].id;
      updatedHistory[existingIndex] = entry;
    } else {
      updatedHistory.push(entry);
    }

    const log = {
      id: Date.now() + 1,
      data: new Date().toLocaleString('pt-BR'),
      texto: `📊 Lançamento [Dia ${dayVal}]: R$${gmvVal} | Ads R$${adsVal} | ${ordersVal} Ped`,
      author: username // Certifique-se de que a variável username existe no componente
    };

    const updatedStore = {
      ...store,
      history: updatedHistory.sort((a,b) => a.day - b.day),
      taskLogs: [...(store.taskLogs || []), log],
      dataUltimoAcesso: new Date().toISOString()
    };

    const maxDay = Math.max(...updatedStore.history.map(h => h.day));
    if (dayVal === maxDay) {
      updatedStore.currentRevenue = cumRev;
      updatedStore.adsInvestment = cumAds;
      updatedStore.orders = cumOrd;
      updatedStore.units = cumUni;
    }

    saveChanges(updatedStore);

    setTimeout(() => {
      setIsSavingDaily(false);
      setDailyGMV('');
      setDailyAds('');
      setDailyOrders('');
      setDailyUnits('');
      toast.success(`Dados do dia ${dayVal} lançados com sucesso!`);
    }, 600);
  };

  const addChecklist = () => {
    if (!newChecklist.trim()) return;
    setIsAddingTask(true);

    const item = { 
      id: Date.now(), 
      texto: newChecklist, 
      feita: false, 
      responsavel: newChecklistResp.trim(),
      criadoPor: username
    };
    saveChanges({ ...store, checklists: [...(store.checklists || []), item] });
    
    setTimeout(() => {
      setNewChecklist('');
      setNewChecklistResp('');
      setIsAddingTask(false);
      toast.success('Tarefa adicionada!');
    }, 500);
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
    setIsScheduling(true); // Liga o spinner
    saveChanges({ ...store, dataProximoAcesso: nextDate });
    
    setTimeout(() => {
      setIsScheduling(false); // Desliga o spinner
      toast.success('Retorno agendado com sucesso!');
    }, 500);
  };

  const saveFixedNotes = () => {
    setIsSavingNotes(true);
    
    const log = { 
      id: Date.now(), 
      data: new Date().toLocaleString('pt-BR'), 
      texto: `📝 Nota fixa editada: "${fixedNotes.substring(0, 30)}${fixedNotes.length > 30 ? '...' : ''}"`, 
      author: username 
    };
    
    saveChanges({ 
      ...store, 
      notasFixas: fixedNotes,
      taskLogs: [...(store.taskLogs || []), log]
    });

    setTimeout(() => {
      setIsSavingNotes(false);
      toast.success('Lembretes fixos atualizados e registados!');
    }, 500);
  };

  const deleteFixedNotes = () => {
    if (window.confirm("Tem certeza que deseja apagar permanentemente todas as notas fixas desta loja?")) {
      const log = { 
        id: Date.now(), 
        data: new Date().toLocaleString('pt-BR'), 
        texto: `🗑️ Nota fixa apagada integralmente`, 
        author: username 
      };
      
      setFixedNotes('');
      saveChanges({ 
        ...store, 
        notasFixas: '',
        taskLogs: [...(store.taskLogs || []), log]
      });
      toast.success('Notas apagadas e registadas!');
    }
  };

  const confirmDuplication = () => {
    if (!duplicateTargetId) return toast.error("Selecione uma loja de destino.");
    
    // Procura a loja na lista baseando-se no ID selecionado
    const destinationStore = stores.find(s => s.id === Number(duplicateTargetId));
    if (!destinationStore) return;

    const logOrigem = { 
      id: Date.now(), 
      data: new Date().toLocaleString('pt-BR'), 
      texto: `📤 Nota fixa duplicada para a loja: ${destinationStore.store}`, 
      author: username 
    };

    const logDestino = { 
      id: Date.now() + 1, 
      data: new Date().toLocaleString('pt-BR'), 
      texto: `📥 Nota fixa recebida via duplicação da loja: ${store.store}`, 
      author: username 
    };

    // Atualiza a loja atual (origem)
    saveChanges({ ...store, taskLogs: [...(store.taskLogs || []), logOrigem] });

    // Atualiza a loja de destino
    const updatedDestStore = {
      ...destinationStore,
      notasFixas: fixedNotes,
      taskLogs: [...(destinationStore.taskLogs || []), logDestino]
    };
    
    updateStoreInCloud(updatedDestStore);
    setStores(stores.map(s => s.id === updatedDestStore.id ? updatedDestStore : s));
    
    toast.success(`Nota duplicada com sucesso para ${destinationStore.store}!`);
    setIsDuplicating(false);
    setDuplicateTargetId('');
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

                      {item.criadoPor && (
                        <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded ml-1 border border-gray-600 whitespace-nowrap">
                          Por: {item.criadoPor}
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
                  <button 
                    onClick={addChecklist} 
                    disabled={isAddingTask}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shrink-0 min-w-[120px]"
                  >
                    {isAddingTask ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Plus size={16}/> Add Tarefa</>}
                  </button>
                </div>
              </div>
            </div>

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

        {/* LADO DIREITO: AGENDAMENTO E NOTAS */}
        <div className="w-full md:w-80 bg-gray-800 flex flex-col border-l border-gray-700">
          <div className="hidden md:flex justify-end p-4">
            <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-lg transition-colors">
              <X size={20} className="text-gray-400 hover:text-white" />
            </button>
          </div>
          
          <div className="p-5 pt-0 flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            
            {/* 1. DESEMPENHO DIÁRIO */}
            <div className="bg-gray-900 p-4 rounded-xl border border-blue-500/30 shrink-0">
              <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2 mb-3">
                <TrendingUp size={14} /> Lançamento de Desempenho
              </h4>
              
              <div className="grid grid-cols-4 gap-2 mb-3">
                {/* Campo de Dia */}
                <div className="col-span-1">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Dia</label>
                  <input 
                    type="number" 
                    value={entryDay}
                    onChange={e => setEntryDay(e.target.value)}
                    className="w-full bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 text-xs text-white outline-none text-center font-bold"
                  />
                </div>
                {/* GMV */}
                <div className="col-span-3">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">GMV (R$)</label>
                  <input 
                    type="number" 
                    value={dailyGMV}
                    onChange={e => setDailyGMV(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
                {/* ADS */}
                <div className="col-span-2">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Ads (R$)</label>
                  <input 
                    type="number" 
                    value={dailyAds}
                    onChange={e => setDailyAds(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
                {/* Pedidos */}
                <div className="col-span-1">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Pedidos</label>
                  <input 
                    type="number" 
                    value={dailyOrders}
                    onChange={e => setDailyOrders(e.target.value)}
                    placeholder="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
                {/* Unidades */}
                <div className="col-span-1">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Unidades</label>
                  <input 
                    type="number" 
                    value={dailyUnits}
                    onChange={e => setDailyUnits(e.target.value)}
                    placeholder="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button 
                onClick={saveDailyEntry}
                disabled={isSavingDaily}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2"
              >
                {isSavingDaily ? <Loader2 size={14} className="animate-spin" /> : `Lançar Dados para o dia ${entryDay}`}
              </button>
            </div>

            {/* 2. NOTAS FIXAS */}
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 flex-1 flex flex-col min-h-[200px]">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                  <StickyNote size={14} /> Bloco de Notas
                </h4>
                {!isDuplicating && (
                  <div className="flex gap-1">
                    <button onClick={() => setIsDuplicating(true)} className="p-1 text-gray-500 hover:text-blue-400 transition-colors"><Copy size={12}/></button>
                    <button onClick={deleteFixedNotes} className="p-1 text-gray-500 hover:text-red-400 transition-colors"><Eraser size={12}/></button>
                  </div>
                )}
              </div>

              {isDuplicating ? (
                <div className="flex flex-col gap-2 flex-1">
                  <select 
                    value={duplicateTargetId} 
                    onChange={e => setDuplicateTargetId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-[10px] text-white outline-none"
                  >
                    <option value="">Selecionar destino...</option>
                    {stores.filter(s => s.id !== store.id).map(s => (
                      <option key={s.id} value={s.id}>{s.client} - {s.store}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={() => setIsDuplicating(false)} className="flex-1 bg-gray-700 text-[10px] py-1.5 rounded">Sair</button>
                    <button onClick={confirmDuplication} className="flex-1 bg-blue-600 text-[10px] py-1.5 rounded">OK</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 flex-1">
                  <textarea 
                    value={fixedNotes} 
                    onChange={(e) => setFixedNotes(e.target.value)} 
                    placeholder="Acessos, regras, preços..."
                    className="w-full flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-[11px] text-gray-300 outline-none resize-none focus:border-emerald-500"
                  />
                  <button 
                    onClick={saveFixedNotes} 
                    disabled={isSavingNotes}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white font-bold py-2 rounded-lg text-xs flex justify-center items-center gap-2"
                  >
                    {isSavingNotes ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Salvar</>}
                  </button>
                </div>
              )}
            </div>

            {/* 3. PRÓXIMO ACESSO */}
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 shrink-0 mb-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-2 mb-3">
                <CalendarDays size={14} /> Próximo Acesso
              </h4>
              <input 
                type="date" 
                value={nextDate} 
                onChange={(e) => setNextDate(e.target.value)} 
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500 font-bold"
              />
              <button 
                onClick={saveNextDate} 
                disabled={isScheduling}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900 text-white font-bold py-2 rounded-lg text-xs mt-2 transition-all flex items-center justify-center gap-2"
              >
                {isScheduling ? <Loader2 size={14} className="animate-spin" /> : 'Agendar Retorno'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

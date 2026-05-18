import React, { useState } from 'react';
import { X, Plus, CalendarDays, CheckCircle2, Trash2, Send, User, StickyNote, Save, Copy, Eraser, Loader2, TrendingUp, Edit2, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TaskModal({ store, onClose, updateStoreInCloud, stores, setStores, currentUserData, isManager, teamMembers }) {
  const [newLog, setNewLog] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [newChecklistResp, setNewChecklistResp] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState('none');

  const [nextDate, setNextDate] = useState(store.dataProximoAcesso || '');
  const [storeResp, setStoreResp] = useState(store.responsavel || '');
  const [fixedNotes, setFixedNotes] = useState(store.notasFixas || '');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateTargetId, setDuplicateTargetId] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskData, setEditTaskData] = useState({});

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

  const autoScheduleStore = (currentChecklists) => {
    const pendingWithDate = currentChecklists.filter(t => !t.feita && t.data);
    let nextAccessStr = '';

    if (pendingWithDate.length > 0) {
      pendingWithDate.sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.hora || '00:00'}:00`);
        const dateB = new Date(`${b.data}T${b.hora || '00:00'}:00`);
        return dateA - dateB;
      });
      const earliest = pendingWithDate[0];
      nextAccessStr = `${earliest.data}T${earliest.hora || '00:00'}`;
    }

    return nextAccessStr; 
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

    let updatedHistory = [...(store.history || [])];
    const existingIndex = updatedHistory.findIndex(h => h.day === dayVal);
    
    if(existingIndex >= 0) {
      const existingEntry = updatedHistory[existingIndex];
      entry.id = existingEntry.id;
      entry.dailyRevenue = (existingEntry.dailyRevenue || 0) + gmvVal;
      entry.revenue = (existingEntry.revenue || 0) + gmvVal;
      entry.ads = (existingEntry.ads || 0) + cumAds;
      entry.orders = (existingEntry.orders || 0) + ordersVal;
      entry.units = (existingEntry.units || 0) + unitsVal;
      updatedHistory[existingIndex] = entry;
    } else {
      updatedHistory.push(entry);
    }

    const log = {
      id: Date.now() + 1,
      data: new Date().toLocaleString('pt-BR'),
      texto: `📊 Lançamento [Dia ${dayVal}]: R$${gmvVal} | Ads R$${adsVal} | ${ordersVal} Ped`,
      author: username 
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
      criadoPor: username,
      data: newTaskDate,
      hora: newTaskTime,
      recorrencia: newTaskRecurrence
    };
    
    const updatedChecklists = [...(store.checklists || []), item];
    const newNextAccess = autoScheduleStore(updatedChecklists);

    saveChanges({ 
      ...store, 
      checklists: updatedChecklists,
      dataProximoAcesso: newNextAccess || store.dataProximoAcesso || ''
    });
    
    setTimeout(() => {
      setNewChecklist('');
      setNewChecklistResp('');
      setNewTaskDate('');
      setNewTaskTime('');
      setNewTaskRecurrence('none');
      setIsAddingTask(false);
      toast.success('Tarefa adicionada com sucesso!');
    }, 500);
  };

  const toggleChecklist = (id) => {
    const task = store.checklists.find(c => c.id === id);
    const isCompleting = !task.feita;
    let updatedChecklists = [...store.checklists];

    if (isCompleting && task.recorrencia && task.recorrencia !== 'none') {
      const currentIndex = updatedChecklists.findIndex(t => t.id === id);
      updatedChecklists[currentIndex].feita = true;

      const [year, month, day] = task.data.split('-').map(Number);
      let nextDateObj = new Date(year, month - 1, day);

      if (task.recorrencia === 'daily') nextDateObj.setDate(nextDateObj.getDate() + 1);
      if (task.recorrencia === 'weekly') nextDateObj.setDate(nextDateObj.getDate() + 7);
      if (task.recorrencia === 'monthly') nextDateObj.setMonth(nextDateObj.getMonth() + 1);

      const nextDateStr = `${nextDateObj.getFullYear()}-${String(nextDateObj.getMonth() + 1).padStart(2, '0')}-${String(nextDateObj.getDate()).padStart(2, '0')}`;

      updatedChecklists.push({
        ...task,
        id: Date.now() + 1,
        feita: false,
        data: nextDateStr
      });
      toast.success('Tarefa concluída! Próxima repetição gerada.');
    } else {
      updatedChecklists = updatedChecklists.map(c => c.id === id ? { ...c, feita: !c.feita } : c);
      toast.success(isCompleting ? '✅ Tarefa concluída!' : 'Tarefa reaberta!');
    }

    let updatedLogs = store.taskLogs || [];
    if (isCompleting) {
      updatedLogs = [...updatedLogs, { 
        id: Date.now(), 
        data: new Date().toLocaleString('pt-BR'), 
        texto: `✅ Tarefa concluída: "${task.texto}"`, 
        author: username 
      }];
    }

    const newNextAccess = autoScheduleStore(updatedChecklists);
    let finalNextAccess = newNextAccess;
    if (!newNextAccess && isCompleting && task.data) {
      finalNextAccess = '';
    } else if (!newNextAccess) {
      finalNextAccess = store.dataProximoAcesso || '';
    }

    saveChanges({ 
      ...store, 
      checklists: updatedChecklists, 
      taskLogs: updatedLogs,
      dataUltimoAcesso: new Date().toISOString(),
      dataProximoAcesso: finalNextAccess
    });
  };

  const deleteChecklist = (id) => {
    const task = store.checklists.find(c => c.id === id);
    const updatedChecklists = store.checklists.filter(c => c.id !== id);
    const newNextAccess = autoScheduleStore(updatedChecklists);

    let finalNextAccess = newNextAccess;
    if (!newNextAccess && task?.data) {
      finalNextAccess = '';
    } else if (!newNextAccess) {
      finalNextAccess = store.dataProximoAcesso || '';
    }

    saveChanges({ ...store, checklists: updatedChecklists, dataProximoAcesso: finalNextAccess });
    toast.success('Tarefa removida!');
  };

  const startEditingTask = (task) => {
    setEditingTaskId(task.id);
    setEditTaskData({
      texto: task.texto,
      responsavel: task.responsavel || '',
      data: task.data || '',
      hora: task.hora || '',
      recorrencia: task.recorrencia || 'none'
    });
  };

  const saveTaskEdit = (taskId) => {
    if (!editTaskData.texto.trim()) return toast.error("O texto da tarefa não pode estar vazio.");
    
    const updatedChecklists = store.checklists.map(t =>
      t.id === taskId ? { ...t, ...editTaskData } : t
    );

    const log = {
      id: Date.now(),
      data: new Date().toLocaleString('pt-BR'),
      texto: `✏️ Tarefa atualizada: "${editTaskData.texto}"`,
      author: username
    };

    const newNextAccess = autoScheduleStore(updatedChecklists);
    let finalNextAccess = newNextAccess;
    const oldTask = store.checklists.find(t => t.id === taskId);
    
    if (!newNextAccess && (oldTask?.data || editTaskData.data)) {
      finalNextAccess = '';
    } else if (!newNextAccess) {
      finalNextAccess = store.dataProximoAcesso || '';
    }

    saveChanges({
      ...store,
      checklists: updatedChecklists,
      taskLogs: [...(store.taskLogs || []), log],
      dataProximoAcesso: finalNextAccess,
      dataUltimoAcesso: new Date().toISOString()
    });

    setEditingTaskId(null);
    toast.success('Tarefa atualizada!');
  };

  const saveNextDate = () => {
    setIsScheduling(true);
    saveChanges({ ...store, dataProximoAcesso: nextDate });
    
    setTimeout(() => {
      setIsScheduling(false);
      toast.success('Retorno agendado com sucesso!');
    }, 500);
  };

  const clearNextDate = () => {
    setNextDate('');
    saveChanges({ ...store, dataProximoAcesso: '' });
    toast.success('Agendamento removido!');
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

    saveChanges({ ...store, taskLogs: [...(store.taskLogs || []), logOrigem] });

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
          
          <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center shrink-0">
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

          <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
            
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">To-Do List</h4>
              
              <div className="space-y-2 mb-4">
                {store.checklists?.map(item => {
                  const isEditing = editingTaskId === item.id;
                  const canEditTask = isManager || item.criadoPor === username;

                  return (
                    <div key={item.id} className="flex flex-col bg-gray-800 p-2.5 rounded-lg border border-gray-700 group shadow-sm transition-all">
                      {isEditing ? (
                        <div className="flex flex-col gap-2 w-full animate-in fade-in duration-200">
                          <div className="flex gap-2">
                            <input type="text" value={editTaskData.texto} onChange={e => setEditTaskData({...editTaskData, texto: e.target.value})} className="flex-1 bg-gray-900 border border-gray-600 rounded p-1.5 text-sm text-white outline-none focus:border-indigo-500" />
                            <select value={editTaskData.responsavel} onChange={e => setEditTaskData({...editTaskData, responsavel: e.target.value})} className="w-28 bg-gray-900 border border-gray-600 rounded p-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer">
                              <option value="">Sem Resp.</option>
                              {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <input type="date" value={editTaskData.data} onChange={(e) => setEditTaskData({...editTaskData, data: e.target.value})} className="bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer" />
                            <input type="time" value={editTaskData.hora} onChange={(e) => setEditTaskData({...editTaskData, hora: e.target.value})} className="bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer" />
                            <select value={editTaskData.recorrencia} onChange={(e) => setEditTaskData({...editTaskData, recorrencia: e.target.value})} className="bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none cursor-pointer">
                              <option value="none">S/ Repetição</option>
                              <option value="daily">🔁 Diário</option>
                              <option value="weekly">🔁 Semanal</option>
                              <option value="monthly">🔁 Mensal</option>
                            </select>
                            <button 
                              onClick={() => setEditTaskData({...editTaskData, data: '', hora: '', recorrencia: 'none'})} 
                              className="p-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors" 
                              title="Limpar Data e Hora"
                            >
                              <Eraser size={14}/>
                            </button>
                            <div className="flex gap-1 ml-auto">
                              <button onClick={() => setEditingTaskId(null)} className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded"><X size={14}/></button>
                              <button onClick={() => saveTaskEdit(item.id)} className="p-1 bg-green-600 hover:bg-green-500 text-white rounded"><Check size={14}/></button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between w-full">
                          <div className="flex items-start gap-3 flex-1">
                            <input type="checkbox" checked={item.feita} onChange={() => toggleChecklist(item.id)} className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-900 text-indigo-500 cursor-pointer" />
                            <div className="flex-1 flex flex-col">
                              <span className={`text-sm font-medium ${item.feita ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.texto}</span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {item.data && (
                                  <span className="text-[9px] bg-gray-900 border border-gray-700 text-amber-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 shadow-sm">
                                    <CalendarDays size={10} /> 
                                    {item.data.split('-').reverse().join('/')} {item.hora && `às ${item.hora}`}
                                  </span>
                                )}
                                {item.recorrencia && item.recorrencia !== 'none' && (
                                  <span className="text-[9px] bg-indigo-900/40 border border-indigo-500/50 text-indigo-300 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                    🔁 {item.recorrencia === 'daily' ? 'Diário' : item.recorrencia === 'weekly' ? 'Semanal' : 'Mensal'}
                                  </span>
                                )}
                                {item.responsavel && <span className="text-[9px] text-gray-400 border border-gray-600 px-1.5 py-0.5 rounded shadow-sm">Resp: {item.responsavel}</span>}
                                {item.criadoPor && <span className="text-[9px] text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded shadow-sm">Por: {item.criadoPor}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            {canEditTask && (
                              <button onClick={() => startEditingTask(item)} className="text-gray-500 hover:text-blue-400 p-1 bg-gray-900 rounded"><Edit2 size={14}/></button>
                            )}
                            <button onClick={() => deleteChecklist(item.id)} className="text-gray-500 hover:text-red-400 p-1 bg-gray-900 rounded"><Trash2 size={14}/></button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {(!store.checklists || store.checklists.length === 0) && (
                  <p className="text-xs text-gray-500 italic p-2 border border-dashed border-gray-700 rounded-lg text-center">Nenhuma tarefa pendente.</p>
                )}
              </div>
              
              <div className="flex flex-col gap-3 bg-gray-800 p-3.5 rounded-xl border border-gray-700 shadow-inner">
                <div className="flex flex-col md:flex-row gap-2">
                  <input type="text" value={newChecklist} onChange={e => setNewChecklist(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklist()} placeholder="O que fazer? Ex: Ajustar Preços..." className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white outline-none focus:border-indigo-500" />
                  <select value={newChecklistResp} onChange={e => setNewChecklistResp(e.target.value)} className="w-full md:w-36 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="">Sem Resp.</option>
                    {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-lg p-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer" title="Data da Tarefa" />
                  <input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-lg p-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer" title="Hora de Brasília" />
                  
                  <select value={newTaskRecurrence} onChange={(e) => setNewTaskRecurrence(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-lg p-1.5 text-xs text-white outline-none cursor-pointer flex-1 min-w-[130px]">
                    <option value="none">S/ Repetição</option>
                    <option value="daily">🔁 Diário</option>
                    <option value="weekly">🔁 Semanal</option>
                    <option value="monthly">🔁 Mensal</option>
                  </select>

                  {/* BOTÃO LIMPAR DATAS */}
                  <button 
                    onClick={() => {setNewTaskDate(''); setNewTaskTime(''); setNewTaskRecurrence('none');}} 
                    className="bg-gray-900 border border-gray-600 hover:bg-gray-700 text-gray-400 p-2 rounded-lg transition-colors" 
                    title="Limpar Datas"
                  >
                    <Eraser size={14}/>
                  </button>

                  <button 
                    onClick={addChecklist} 
                    disabled={isAddingTask}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-xs shrink-0 shadow-md ml-auto"
                  >
                    {isAddingTask ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14}/> Add Tarefa</>}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Histórico de Ações</h4>
              <div className="flex gap-2">
                <textarea value={newLog} onChange={e => setNewLog(e.target.value)} placeholder="Descreva o que você fez hoje nesta conta..." className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500 min-h-[50px] max-h-[120px] custom-scrollbar" />
                <button onClick={addLog} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors shadow-md"><Send size={16}/> <span className="text-[10px] font-bold uppercase tracking-wider">Lançar</span></button>
              </div>
              <div className="space-y-4 mb-4 border-l-2 border-gray-700 ml-2 pl-4 mt-4">
                {store.taskLogs?.slice().reverse().map(log => (
                  <div key={log.id} className="relative group/log">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-[10px] text-blue-400 font-bold">
                        {log.data} <span className="text-gray-500 font-normal ml-1">por {log.author}</span>
                      </div>
                      {isManager && (
                        <button onClick={() => deleteLog(log.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover/log:opacity-100 transition-opacity mr-2 p-1">
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-sm text-gray-300 shadow-sm leading-relaxed">{log.texto}</div>
                  </div>
                ))}
                {(!store.taskLogs || store.taskLogs.length === 0) && <div className="text-xs text-gray-500 italic p-2 border border-dashed border-gray-700 rounded-lg text-center mt-2">Nenhum log registrado.</div>}
              </div>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: AGENDAMENTO E NOTAS */}
        <div className="w-full md:w-80 bg-gray-800 flex flex-col border-l border-gray-700 shrink-0">
          <div className="hidden md:flex justify-end p-3 border-b border-gray-800">
            <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
              <X size={20} className="text-gray-400 hover:text-white" />
            </button>
          </div>
          
          <div className="p-5 flex-1 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
            
            <div className="bg-gray-900 p-4 rounded-xl border border-blue-500/30 shrink-0 shadow-sm">
              <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2 mb-3">
                <TrendingUp size={14} /> Lançamento de Desempenho
              </h4>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="col-span-1">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Dia</label>
                  <input type="number" value={entryDay} onChange={e => setEntryDay(e.target.value)} className="w-full bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 text-xs text-white outline-none text-center font-bold" />
                </div>
                <div className="col-span-3">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">GMV (R$)</label>
                  <input type="number" value={dailyGMV} onChange={e => setDailyGMV(e.target.value)} placeholder="0.00" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Ads (R$)</label>
                  <input type="number" value={dailyAds} onChange={e => setDailyAds(e.target.value)} placeholder="0.00" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Ped.</label>
                  <input type="number" value={dailyOrders} onChange={e => setDailyOrders(e.target.value)} placeholder="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500 text-center" />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1 uppercase">Unid.</label>
                  <input type="number" value={dailyUnits} onChange={e => setDailyUnits(e.target.value)} placeholder="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500 text-center" />
                </div>
              </div>

              <button 
                onClick={saveDailyEntry}
                disabled={isSavingDaily}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {isSavingDaily ? <Loader2 size={14} className="animate-spin" /> : `Lançar Dia ${entryDay}`}
              </button>
            </div>

            <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 flex-1 flex flex-col min-h-[220px] shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                  <StickyNote size={14} /> Bloco de Notas
                </h4>
                {!isDuplicating && (
                  <div className="flex gap-1.5">
                    <button onClick={() => setIsDuplicating(true)} className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors" title="Duplicar nota para outra loja"><Copy size={12}/></button>
                    <button onClick={deleteFixedNotes} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors" title="Apagar notas"><Eraser size={12}/></button>
                  </div>
                )}
              </div>

              {isDuplicating ? (
                <div className="flex flex-col gap-2 flex-1 justify-center bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                  <p className="text-[10px] text-gray-400 mb-1">Copiar bloco de notas para:</p>
                  <select 
                    value={duplicateTargetId} 
                    onChange={e => setDuplicateTargetId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-[11px] text-white outline-none mb-2"
                  >
                    <option value="">Selecionar destino...</option>
                    {stores.filter(s => s.id !== store.id).map(s => (
                      <option key={s.id} value={s.id}>{s.client} - {s.store}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setIsDuplicating(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold text-[10px] py-2 rounded transition-colors">Cancelar</button>
                    <button onClick={confirmDuplication} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] py-2 rounded transition-colors shadow-md">Confirmar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 flex-1">
                  <textarea 
                    value={fixedNotes} 
                    onChange={(e) => setFixedNotes(e.target.value)} 
                    placeholder="Regras de frete, limites de desconto, acessos..."
                    className="w-full flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 outline-none resize-none focus:border-emerald-500 custom-scrollbar"
                  />
                  <button 
                    onClick={saveFixedNotes} 
                    disabled={isSavingNotes}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white font-bold py-2 rounded-lg text-xs flex justify-center items-center gap-2 shadow-md transition-colors"
                  >
                    {isSavingNotes ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Salvar Notas</>}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 shrink-0 shadow-sm">
              <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-2 mb-3">
                <CalendarDays size={14} /> Próximo Acesso
              </h4>
              <input 
                type="date" 
                value={nextDate} 
                onChange={(e) => setNextDate(e.target.value)} 
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500 font-bold"
              />
              
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={saveNextDate} 
                  disabled={isScheduling}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  {isScheduling ? <Loader2 size={14} className="animate-spin" /> : 'Agendar'}
                </button>
                
                {/* BOTÃO LIMPAR PRÓXIMO ACESSO */}
                <button 
                  onClick={clearNextDate} 
                  className="px-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center shadow-md"
                  title="Limpar Data"
                >
                  <Eraser size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

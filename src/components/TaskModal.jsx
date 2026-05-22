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

  // --- FUNÇÕES DE AVATAR (Para a UI ficar incrível) ---
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    if (!name) return 'from-gray-600 to-gray-700';
    const colors = [
      'from-indigo-500 to-purple-600', 'from-blue-500 to-cyan-600', 'from-emerald-500 to-teal-600',
      'from-rose-500 to-orange-600', 'from-pink-500 to-rose-600', 'from-amber-500 to-orange-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const Avatar = ({ name, size = 'md' }) => {
    const sizeClasses = size === 'sm' ? 'w-5 h-5 text-[9px]' : size === 'lg' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]';
    return (
      <div className={`${sizeClasses} rounded-full bg-gradient-to-br ${getAvatarColor(name)} flex items-center justify-center font-bold text-white shadow-sm border border-white/20 shrink-0 cursor-default`} title={name || 'Sem Responsável'}>
        {getInitials(name)}
      </div>
    );
  };

  // --- LÓGICA DE NEGÓCIO (Intacta) ---
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
      nextAccessStr = `${pendingWithDate[0].data}T${pendingWithDate[0].hora || '00:00'}`;
    }
    return nextAccessStr; 
  };

  const addLog = () => {
    if (!newLog.trim()) return;
    const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: newLog, author: username };
    saveChanges({ ...store, taskLogs: [...(store.taskLogs || []), log], dataUltimoAcesso: new Date().toISOString() });
    setNewLog('');
    toast.success('Ação registrada!');
  };

  const deleteLog = (logId) => {
    if(window.confirm("Apagar este registro do histórico?")) {
      saveChanges({ ...store, taskLogs: store.taskLogs.filter(l => l.id !== logId) });
      toast.success('Registro apagado!');
    }
  };

  const saveDailyEntry = () => {
    if (!dailyGMV && !dailyAds && !dailyOrders && !dailyUnits) return toast.error("Preencha os dados para lançar.");
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

    const entry = { id: Date.now(), day: dayVal, dailyRevenue: gmvVal, revenue: cumRev, ads: cumAds, orders: cumOrd, units: cumUni, date: new Date().toLocaleDateString('pt-BR') };

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

    const log = { id: Date.now() + 1, data: new Date().toLocaleString('pt-BR'), texto: `📊 Lançamento [Dia ${dayVal}]: R$${gmvVal} | Ads R$${adsVal} | ${ordersVal} Ped`, author: username };
    const updatedStore = { ...store, history: updatedHistory.sort((a,b) => a.day - b.day), taskLogs: [...(store.taskLogs || []), log], dataUltimoAcesso: new Date().toISOString() };
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
      setDailyGMV(''); setDailyAds(''); setDailyOrders(''); setDailyUnits('');
      toast.success(`Dados lançados com sucesso!`);
    }, 600);
  };

  const addChecklist = () => {
    if (!newChecklist.trim()) return;
    setIsAddingTask(true);
    const item = { id: Date.now(), texto: newChecklist, feita: false, responsavel: newChecklistResp.trim(), criadoPor: username, data: newTaskDate, hora: newTaskTime, recorrencia: newTaskRecurrence };
    const updatedChecklists = [...(store.checklists || []), item];
    const newNextAccess = autoScheduleStore(updatedChecklists);

    saveChanges({ ...store, checklists: updatedChecklists, dataProximoAcesso: newNextAccess || store.dataProximoAcesso || '' });
    setTimeout(() => {
      setNewChecklist(''); setNewChecklistResp(''); setNewTaskDate(''); setNewTaskTime(''); setNewTaskRecurrence('none');
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
      updatedChecklists.push({ ...task, id: Date.now() + 1, feita: false, data: nextDateStr });
      toast.success('Tarefa concluída! Próxima repetição gerada.');
    } else {
      updatedChecklists = updatedChecklists.map(c => c.id === id ? { ...c, feita: !c.feita } : c);
      toast.success(isCompleting ? '✅ Tarefa concluída!' : 'Tarefa reaberta!');
    }

    let updatedLogs = store.taskLogs || [];
    if (isCompleting) updatedLogs = [...updatedLogs, { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: `✅ Tarefa concluída: "${task.texto}"`, author: username }];

    const newNextAccess = autoScheduleStore(updatedChecklists);
    let finalNextAccess = newNextAccess;
    if (!newNextAccess && isCompleting && task.data) finalNextAccess = '';
    else if (!newNextAccess) finalNextAccess = store.dataProximoAcesso || '';

    saveChanges({ ...store, checklists: updatedChecklists, taskLogs: updatedLogs, dataUltimoAcesso: new Date().toISOString(), dataProximoAcesso: finalNextAccess });
  };

  const deleteChecklist = (id) => {
    const task = store.checklists.find(c => c.id === id);
    const updatedChecklists = store.checklists.filter(c => c.id !== id);
    const newNextAccess = autoScheduleStore(updatedChecklists);
    let finalNextAccess = newNextAccess;
    if (!newNextAccess && task?.data) finalNextAccess = '';
    else if (!newNextAccess) finalNextAccess = store.dataProximoAcesso || '';
    saveChanges({ ...store, checklists: updatedChecklists, dataProximoAcesso: finalNextAccess });
    toast.success('Tarefa removida!');
  };

  const startEditingTask = (task) => {
    setEditingTaskId(task.id);
    setEditTaskData({ texto: task.texto, responsavel: task.responsavel || '', data: task.data || '', hora: task.hora || '', recorrencia: task.recorrencia || 'none' });
  };

  const saveTaskEdit = (taskId) => {
    if (!editTaskData.texto.trim()) return toast.error("O texto da tarefa não pode estar vazio.");
    const updatedChecklists = store.checklists.map(t => t.id === taskId ? { ...t, ...editTaskData } : t );
    const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: `✏️ Tarefa atualizada: "${editTaskData.texto}"`, author: username };
    const newNextAccess = autoScheduleStore(updatedChecklists);
    let finalNextAccess = newNextAccess;
    const oldTask = store.checklists.find(t => t.id === taskId);
    
    if (!newNextAccess && (oldTask?.data || editTaskData.data)) finalNextAccess = '';
    else if (!newNextAccess) finalNextAccess = store.dataProximoAcesso || '';

    saveChanges({ ...store, checklists: updatedChecklists, taskLogs: [...(store.taskLogs || []), log], dataProximoAcesso: finalNextAccess, dataUltimoAcesso: new Date().toISOString() });
    setEditingTaskId(null);
    toast.success('Tarefa atualizada!');
  };

  const saveNextDate = () => {
    setIsScheduling(true);
    saveChanges({ ...store, dataProximoAcesso: nextDate });
    setTimeout(() => { setIsScheduling(false); toast.success('Retorno agendado com sucesso!'); }, 500);
  };

  const clearNextDate = () => {
    setNextDate('');
    saveChanges({ ...store, dataProximoAcesso: '' });
    toast.success('Agendamento removido!');
  };

  const saveFixedNotes = () => {
    setIsSavingNotes(true);
    const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: `📝 Nota fixa editada: "${fixedNotes.substring(0, 30)}${fixedNotes.length > 30 ? '...' : ''}"`, author: username };
    saveChanges({ ...store, notasFixas: fixedNotes, taskLogs: [...(store.taskLogs || []), log] });
    setTimeout(() => { setIsSavingNotes(false); toast.success('Lembretes fixos atualizados!'); }, 500);
  };

  const deleteFixedNotes = () => {
    if (window.confirm("Tem certeza que deseja apagar permanentemente todas as notas fixas desta loja?")) {
      const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: `🗑️ Nota fixa apagada integralmente`, author: username };
      setFixedNotes('');
      saveChanges({ ...store, notasFixas: '', taskLogs: [...(store.taskLogs || []), log] });
      toast.success('Notas apagadas!');
    }
  };

  const confirmDuplication = () => {
    if (!duplicateTargetId) return toast.error("Selecione uma loja de destino.");
    const destinationStore = stores.find(s => s.id === Number(duplicateTargetId));
    if (!destinationStore) return;
    const logOrigem = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: `📤 Nota duplicada para: ${destinationStore.store}`, author: username };
    const logDestino = { id: Date.now() + 1, data: new Date().toLocaleString('pt-BR'), texto: `📥 Nota recebida via duplicação: ${store.store}`, author: username };

    saveChanges({ ...store, taskLogs: [...(store.taskLogs || []), logOrigem] });
    const updatedDestStore = { ...destinationStore, notasFixas: fixedNotes, taskLogs: [...(destinationStore.taskLogs || []), logDestino] };
    updateStoreInCloud(updatedDestStore);
    setStores(stores.map(s => s.id === updatedDestStore.id ? updatedDestStore : s));
    toast.success(`Nota duplicada para ${destinationStore.store}!`);
    setIsDuplicating(false); setDuplicateTargetId('');
  };

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      {/* 🌟 CONTAINER PRINCIPAL (GLASSMORPHISM) */}
      <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-6xl overflow-hidden flex flex-col lg:flex-row h-[90vh]">
        
        {/* =========================================
            LADO ESQUERDO: CHECKLIST E HISTÓRICO
        ============================================= */}
        <div className="flex-1 flex flex-col md:border-r border-white/10 relative">
          
          {/* CABEÇALHO DA LOJA */}
          <div className="p-5 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={20} className="text-indigo-400"/> {store.store}
              </h3>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">
                {store.client} {store.marketplace && `• ${store.marketplace}`}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-8 custom-scrollbar">
            
            {/* 1. SESSÃO DE CHECKLIST */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                To-Do List
              </h4>
              
              {/* Lista de Tarefas (Ordenadas por Urgência e Tipo) */}
              <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                {(() => {
                  const pendingTasks = store.checklists?.filter(t => !t.feita) || [];
                  const completedTasks = store.checklists?.filter(t => t.feita) || [];
                  
                  // Ordenação inteligente das pendentes: tarefas com prazos mais próximos ou atrasados ficam no topo
                  pendingTasks.sort((a, b) => {
                    if (a.data && b.data) {
                      const dateTimeA = new Date(`${a.data}T${a.hora || '00:00'}`);
                      const dateTimeB = new Date(`${b.data}T${b.hora || '00:00'}`);
                      return dateTimeA - dateTimeB;
                    }
                    if (a.data) return -1; // Com data ganha prioridade máxima
                    if (b.data) return 1;
                    return 0;
                  });

                  // Mantém apenas as últimas 5 concluídas na base do modal
                  const recentCompleted = completedTasks.slice(-5);
                  const tasksToRender = [...pendingTasks, ...recentCompleted];

                  if (tasksToRender.length === 0) {
                    return (
                      <p className="text-xs text-gray-500 italic p-2 border border-dashed border-gray-700 rounded-lg text-center">
                        Nenhuma tarefa cadastrada.
                      </p>
                    );
                  }

                  return tasksToRender.map(item => {
                    const isEditing = editingTaskId === item.id;
                    const canEditTask = isManager || item.criadoPor === username;
                    
                    // Identificador Inteligente de Campanhas Críticas (Cupons, Descontos, Relâmpago)
                    const textLower = (item.texto || '').toLowerCase();
                    const isSpecialCampaign = textLower.includes('cupom') || textLower.includes('desconto') || textLower.includes('relampago') || textLower.includes('oferta') || textLower.includes('promo');

                    return (
                      <div 
                        key={item.id} 
                        className={`flex flex-col p-2.5 rounded-lg border group shadow-sm transition-all ${
                          item.feita ? 'bg-gray-800/40 border-gray-800' :
                          isSpecialCampaign ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70 shadow-[0_0_8px_rgba(245,158,11,0.05)]' :
                          'bg-gray-800 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {isEditing ? (
                          /* MODO DE EDIÇÃO */
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
                              <div className="flex gap-1 ml-auto">
                                <button type="button" onClick={() => setEditingTaskId(null)} className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded"><X size={14}/></button>
                                <button type="button" onClick={() => saveTaskEdit(item.id)} className="p-1 bg-green-600 hover:bg-green-500 text-white rounded"><Check size={14}/></button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* MODO DE LEITURA NORMAL */
                          <div className="flex items-start justify-between w-full">
                            <div className="flex items-start gap-3 flex-1">
                              <input type="checkbox" checked={item.feita} onChange={() => toggleChecklist(item.id)} className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-900 text-indigo-500 cursor-pointer" />
                              <div className="flex-1 flex flex-col">
                                <span className={`text-sm font-medium ${item.feita ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                  {item.texto}
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  {/* TAG CRÍTICA DE PROMOÇÃO/CUPOM */}
                                  {isSpecialCampaign && !item.feita && (
                                    <span className="text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider animate-pulse">
                                      🔥 Alerta de Oferta
                                    </span>
                                  )}
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
                              {canEditTask && !item.feita && (
                                <button type="button" onClick={() => startEditingTask(item)} className="text-gray-500 hover:text-blue-400 p-1 bg-gray-900 rounded"><Edit2 size={14}/></button>
                              )}
                              <button type="button" onClick={() => deleteChecklist(item.id)} className="text-gray-500 hover:text-red-400 p-1 bg-gray-900 rounded"><Trash2 size={14}/></button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* Formulário Nova Tarefa */}
              <div className="flex flex-col gap-3 bg-black/20 p-4 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex flex-col lg:flex-row gap-2">
                  <input type="text" value={newChecklist} onChange={e => setNewChecklist(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklist()} placeholder="O que precisa ser feito?" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                  <select value={newChecklistResp} onChange={e => setNewChecklistResp(e.target.value)} className="w-full md:w-36 bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-gray-300 outline-none focus:border-indigo-500 cursor-pointer transition-colors">
                    <option value="">Sem Resp.</option>
                    {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-gray-300 outline-none focus:border-indigo-500 cursor-pointer" title="Data da Tarefa" />
                  <input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-gray-300 outline-none focus:border-indigo-500 cursor-pointer" title="Hora" />
                  <select value={newTaskRecurrence} onChange={(e) => setNewTaskRecurrence(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-gray-300 outline-none cursor-pointer flex-1 min-w-[130px]">
                    <option value="none">S/ Repetição</option>
                    <option value="daily">🔁 Diário</option>
                    <option value="weekly">🔁 Semanal</option>
                    <option value="monthly">🔁 Mensal</option>
                  </select>
                  <button onClick={() => {setNewTaskDate(''); setNewTaskTime(''); setNewTaskRecurrence('none');}} className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 p-2 rounded-xl transition-colors" title="Limpar Datas"><Eraser size={14}/></button>
                  <button onClick={addChecklist} disabled={isAddingTask} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs shrink-0 shadow-md ml-auto">
                    {isAddingTask ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14}/> Add Tarefa</>}
                  </button>
                </div>
              </div>
            </div>

            {/* 2. HISTÓRICO DE AÇÕES */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Timeline de Ações</h4>
              <div className="flex gap-2">
                <textarea value={newLog} onChange={e => setNewLog(e.target.value)} placeholder="Descreva o que você fez hoje nesta conta..." className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-indigo-500 min-h-[60px] max-h-[120px] custom-scrollbar resize-none" />
                <button onClick={addLog} className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 px-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-sm"><Send size={16}/> <span className="text-[10px] font-bold uppercase tracking-wider">Lançar</span></button>
              </div>
              
              <div className="space-y-4 border-l border-white/10 ml-3 pl-5 mt-6 relative">
                {store.taskLogs?.slice().reverse().map((log, i) => (
                  <div key={log.id} className="relative group/log">
                    {/* Dot Timeline */}
                    <div className="absolute -left-[25px] top-1.5 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)] border border-indigo-300"></div>
                    
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={log.author} size="sm" />
                        <span className="text-[11px] text-gray-400 font-medium">
                          <strong className="text-gray-300">{log.author}</strong> • {log.data}
                        </span>
                      </div>
                      {isManager && (
                        <button onClick={() => deleteLog(log.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover/log:opacity-100 transition-opacity p-1">
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                    <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5 text-sm text-gray-300 shadow-sm leading-relaxed inline-block max-w-full">
                      {log.texto}
                    </div>
                  </div>
                ))}
                {(!store.taskLogs || store.taskLogs.length === 0) && <div className="text-xs text-gray-500 italic py-2">Nenhum log registrado na timeline.</div>}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================
            LADO DIREITO: AGENDAMENTO E NOTAS
        ============================================= */}
        <div className="w-full md:w-[340px] bg-black/20 flex flex-col shrink-0">
          <div className="hidden md:flex justify-end p-4 border-b border-white/5">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors border border-transparent">
              <X size={20} className="text-gray-400 hover:text-white" />
            </button>
          </div>
          
          <div className="p-5 flex-1 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
            
            {/* 1. DESEMPENHO DIÁRIO */}
            <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/10 shadow-sm">
              <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2 mb-4">
                <TrendingUp size={14} /> Lançamento Diário
              </h4>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="col-span-1">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1.5 uppercase tracking-wider">Dia</label>
                  <input type="number" value={entryDay} onChange={e => setEntryDay(e.target.value)} className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-2.5 text-xs text-indigo-200 outline-none text-center font-bold" />
                </div>
                <div className="col-span-3">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1.5 uppercase tracking-wider">GMV (R$)</label>
                  <input type="number" value={dailyGMV} onChange={e => setDailyGMV(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1.5 uppercase tracking-wider">Ads (R$)</label>
                  <input type="number" value={dailyAds} onChange={e => setDailyAds(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1.5 uppercase tracking-wider">Ped.</label>
                  <input type="number" value={dailyOrders} onChange={e => setDailyOrders(e.target.value)} placeholder="0" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500 text-center transition-colors" />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] text-gray-500 font-bold block mb-1.5 uppercase tracking-wider">Unid.</label>
                  <input type="number" value={dailyUnits} onChange={e => setDailyUnits(e.target.value)} placeholder="0" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500 text-center transition-colors" />
                </div>
              </div>

              <button onClick={saveDailyEntry} disabled={isSavingDaily} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md">
                {isSavingDaily ? <Loader2 size={14} className="animate-spin" /> : `Lançar Dados (Dia ${entryDay})`}
              </button>
            </div>

            {/* 2. NOTAS FIXAS */}
            <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/10 flex-1 flex flex-col min-h-[220px] shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                  <StickyNote size={14} /> Bloco de Notas
                </h4>
                {!isDuplicating && (
                  <div className="flex gap-1.5 bg-black/20 p-1 rounded-lg border border-white/5">
                    <button onClick={() => setIsDuplicating(true)} className="p-1.5 text-gray-400 hover:text-white rounded-md transition-colors" title="Duplicar"><Copy size={12}/></button>
                    <button onClick={deleteFixedNotes} className="p-1.5 text-gray-400 hover:text-red-400 rounded-md transition-colors" title="Apagar"><Eraser size={12}/></button>
                  </div>
                )}
              </div>

              {isDuplicating ? (
                <div className="flex flex-col gap-2 flex-1 justify-center bg-black/40 p-4 rounded-xl border border-white/10 animate-in fade-in">
                  <p className="text-[10px] text-gray-400 font-medium mb-1 uppercase tracking-wider">Copiar bloco para:</p>
                  <select value={duplicateTargetId} onChange={e => setDuplicateTargetId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-gray-200 outline-none mb-3">
                    <option value="">Selecionar destino...</option>
                    {stores.filter(s => s.id !== store.id).map(s => <option key={s.id} value={s.id}>{s.client} - {s.store}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setIsDuplicating(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] py-2.5 rounded-xl transition-all">Cancelar</button>
                    <button onClick={confirmDuplication} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] py-2.5 rounded-xl transition-all shadow-md">Confirmar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 flex-1">
                  <textarea 
                    value={fixedNotes} onChange={(e) => setFixedNotes(e.target.value)} 
                    placeholder="Regras de frete, limites de desconto, logins..."
                    className="w-full flex-1 bg-black/20 border border-white/10 rounded-xl p-3.5 text-sm text-gray-300 outline-none resize-none focus:border-emerald-500/50 custom-scrollbar transition-colors leading-relaxed"
                  />
                  <button onClick={saveFixedNotes} disabled={isSavingNotes} className="w-full bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-400 font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-2 shadow-sm transition-all">
                    {isSavingNotes ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Salvar Notas</>}
                  </button>
                </div>
              )}
            </div>

            {/* 3. PRÓXIMO ACESSO */}
            <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/10 shrink-0 shadow-sm">
              <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-2 mb-4">
                <CalendarDays size={14} /> Próximo Acesso
              </h4>
              <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500/50 font-bold transition-colors cursor-pointer" />
              
              <div className="flex gap-2 mt-3">
                <button onClick={saveNextDate} disabled={isScheduling} className="flex-1 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 text-amber-400 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm">
                  {isScheduling ? <Loader2 size={14} className="animate-spin" /> : 'Agendar'}
                </button>
                <button onClick={clearNextDate} className="px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 font-bold rounded-xl transition-all flex items-center justify-center shadow-sm" title="Limpar">
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

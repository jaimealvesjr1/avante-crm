import React, { useState } from 'react';
import { X, Plus, CalendarDays, CheckCircle2, Trash2, Send, User, StickyNote, Save, Copy, Eraser, Loader2, TrendingUp, Edit2, Check, Play, Pause, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TaskModal({ store, onClose, updateStoreInCloud, stores, setStores, currentUserData, isManager, teamMembers, broadcastTaskFocus, onCopyTaskToBulk }) {
  const [newLog, setNewLog] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [newChecklistResp, setNewChecklistResp] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState('none');
  const [newTaskWeight, setNewTaskWeight] = useState('media');

  const myName = currentUserData?.nomeCompleto || currentUserData?.nome;
  const isVisitante = currentUserData?.role === 'Visitante';
  const isAdmin = currentUserData?.role === 'Admin' || currentUserData?.role === 'admin' || currentUserData?.role === 'manager';

  const canEditOrDeleteTask = (task) => {
    return isAdmin || task.responsavel === myName || task.criadoPor === myName;
  };

  const [nextDate, setNextDate] = useState(store.dataProximoAcesso ? store.dataProximoAcesso.split('T')[0] : '');
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
  const [pendingStartInfo, setPendingStartInfo] = useState(null);

  const username = currentUserData?.nomeCompleto || currentUserData?.nome || currentUserData?.email?.split('@')[0] || 'Usuário';
  const teamNames = teamMembers?.map(m => m.nomeCompleto || m.nome || m.email.split('@')[0]).filter(Boolean) || [];

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

  const saveChanges = (updatedStore) => {
    updateStoreInCloud(updatedStore);
    setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
  };

  const handleStoreRespChange = (e) => {
    const newResp = e.target.value;
    setStoreResp(newResp);
    saveChanges({ ...store, responsavel: newResp });
    toast.success('Responsável updated com sucesso!');
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
    const item = {
      id: Date.now(), 
      texto: newChecklist, 
      feita: false, 
      responsavel: newChecklistResp.trim(), 
      criadoPor: username, 
      data: newTaskDate, 
      hora: newTaskTime, 
      recorrencia: newTaskRecurrence,
      peso: newTaskWeight
    };
    const updatedChecklists = [...(store.checklists || []), item];
    const newNextAccess = autoScheduleStore(updatedChecklists);

    saveChanges({ ...store, checklists: updatedChecklists, dataProximoAcesso: newNextAccess || store.dataProximoAcesso || '' });
    setTimeout(() => {
      setNewChecklist(''); setNewChecklistResp(''); setNewTaskDate(''); setNewTaskTime(''); setNewTaskRecurrence('none');
      setIsAddingTask(false);
      toast.success('Tarefa adicionada com sucesso!');
    }, 500);
  };

  const deleteChecklist = (id) => {
    const task = store.checklists.find(c => c.id === id);
    
    if (task && (task.executingStatus === 'playing' || task.executingStatus === 'paused') && broadcastTaskFocus) {
       broadcastTaskFocus('', 'clear');
    }

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
    setEditTaskData({ 
        texto: task.texto, 
        responsavel: task.responsavel || task.resp || '', 
        data: task.data || '', 
        hora: task.hora || '', 
        recorrencia: task.recorrencia || 'none',
        peso: task.peso || 'media'
    });
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
    saveChanges({ ...store, dataProximoAcesso: nextDate ? `${nextDate}T00:00` : '' });
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

  const handleStartTask = (taskId, taskText) => {
    const runningTask = stores
      .flatMap(s => (s.checklists || []).map(t => ({ ...t, storeObject: s })))
      .find(t => t.executingStatus === 'playing' && t.startedBy === username && !t.feita);

    if (runningTask) {
      setPendingStartInfo({ currentTaskId: taskId, currentTaskText: taskText, runningTask });
      return;
    }

    executeStart(taskId, taskText);
  };

  const executeStart = (taskId, taskText) => {
    if (broadcastTaskFocus) {
      broadcastTaskFocus(`▶️ Executando: ${taskText} | ${store.store}`, 'set', store.id);
    }
    const updatedChecklists = store.checklists.map(c => 
      c.id === taskId ? { ...c, startedAt: new Date().toISOString(), executingStatus: 'playing', startedBy: username } : c
    );
    const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: `▶️ Iniciou a tarefa: "${taskText}"`, author: username };
    saveChanges({ ...store, checklists: updatedChecklists, taskLogs: [...(store.taskLogs || []), log], dataUltimoAcesso: new Date().toISOString() });
  };

  const handlePauseTask = (taskId, taskText) => {
    if (broadcastTaskFocus) {
      broadcastTaskFocus(`⏸️ Pausada: ${taskText} | ${store.store}`, 'set', store.id);
    }
    const nowTime = new Date().getTime();
    const updatedChecklists = store.checklists.map(c => {
      if (c.id === taskId) {
        const sessionTime = c.startedAt ? nowTime - new Date(c.startedAt).getTime() : 0;
        return { 
            ...c, 
            executingStatus: 'paused', 
            accumulatedTimeMs: (c.accumulatedTimeMs || 0) + sessionTime, 
            startedAt: null 
        };
      }
      return c;
    });
    const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: `⏸️ Pausou a tarefa: "${taskText}"`, author: username };
    saveChanges({ ...store, checklists: updatedChecklists, taskLogs: [...(store.taskLogs || []), log], dataUltimoAcesso: new Date().toISOString() });
    toast.success("Tarefa pausada.");
  };

  const toggleChecklist = (id) => {
    const task = store.checklists.find(c => c.id === id);
    const isCompleting = !task.feita;

    if (isCompleting && (task.executingStatus === 'playing' || task.executingStatus === 'paused') && broadcastTaskFocus) {
       broadcastTaskFocus('', 'clear');
    }
    
    const nowTime = new Date().getTime();
    let updatedChecklists = [...store.checklists];

    if (isCompleting && task.recorrencia && task.recorrencia !== 'none') {
      const currentIndex = updatedChecklists.findIndex(t => t.id === id);
      
      const [year, month, day] = task.data.split('-').map(Number);
      let nextDateObj = new Date(year, month - 1, day);
      if (task.recorrencia === 'daily') nextDateObj.setDate(nextDateObj.getDate() + 1);
      if (task.recorrencia === 'weekly') nextDateObj.setDate(nextDateObj.getDate() + 7);
      if (task.recorrencia === 'monthly') nextDateObj.setMonth(nextDateObj.getMonth() + 1);

      const nextDateStr = `${nextDateObj.getFullYear()}-${String(nextDateObj.getMonth() + 1).padStart(2, '0')}-${String(nextDateObj.getDate()).padStart(2, '0')}`;
      
      const sessionTime = task.startedAt && task.executingStatus === 'playing' ? nowTime - new Date(task.startedAt).getTime() : 0;

      updatedChecklists[currentIndex] = { 
        ...task, feita: false, data: nextDateStr, startedAt: null, completedAt: null, completedAtFull: null, completedBy: null, accumulatedTimeMs: 0, executingStatus: 'none'
      };

      const deadCopy = {
          ...task, id: Date.now() + Math.random(), feita: true, recorrencia: 'ghost', completedAt: new Date().toISOString().split('T')[0], completedAtFull: new Date().toISOString(), completedBy: username, accumulatedTimeMs: (task.accumulatedTimeMs || 0) + sessionTime
      };
      updatedChecklists.push(deadCopy);
      toast.success('Tarefa renovada para o próximo ciclo!');
      
    } else {
      updatedChecklists = updatedChecklists.map(c => {
        if (c.id === id) {
          if (isCompleting) {
            const sessionTime = c.startedAt && c.executingStatus === 'playing' ? nowTime - new Date(c.startedAt).getTime() : 0;
            return { 
              ...c, feita: true, completedAt: new Date().toISOString().split('T')[0], completedAtFull: new Date().toISOString(), completedBy: username, accumulatedTimeMs: (c.accumulatedTimeMs || 0) + sessionTime, executingStatus: 'completed'
            };
          } else {
            const { completedAt, completedAtFull, completedBy, startedAt, accumulatedTimeMs, executingStatus, ...rest } = c;
            return { ...rest, feita: false };
          }
        }
        return c;
      });
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

  const resolveConflictAndStart = async (action) => {
    if (!pendingStartInfo) return;
    const { currentTaskId, currentTaskText, runningTask } = pendingStartInfo;
    const nowTime = new Date().getTime();

    if (store.id !== runningTask.storeObject.id) {
      const oldStore = stores.find(s => s.id === runningTask.storeObject.id);
      if (oldStore) {
        const updatedOldChecklists = oldStore.checklists.map(t => {
          if (t.id === runningTask.id) {
            const sessionTime = t.startedAt ? nowTime - new Date(t.startedAt).getTime() : 0;
            const totalTime = (t.accumulatedTimeMs || 0) + sessionTime;
            
            return action === 'complete' 
              ? { ...t, feita: true, executingStatus: 'completed', accumulatedTimeMs: totalTime, completedAt: new Date().toISOString().split('T')[0], completedAtFull: new Date().toISOString(), completedBy: username }
              : { ...t, executingStatus: 'paused', accumulatedTimeMs: totalTime, startedAt: null };
          }
          return t;
        });

        const logText = action === 'complete' ? `✅ Tarefa concluída via alternância: "${runningTask.texto}"` : `⏸️ Tarefa pausada via alternância: "${runningTask.texto}"`;
        const updatedOldLogs = [...(oldStore.taskLogs || []), { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: logText, author: username }];
        
        const finalOldStore = { ...oldStore, checklists: updatedOldChecklists, taskLogs: updatedOldLogs, dataUltimoAcesso: new Date().toISOString() };
        updateStoreInCloud(finalOldStore);
        setStores(prev => prev.map(s => s.id === oldStore.id ? finalOldStore : s));
      }
      executeStart(currentTaskId, currentTaskText);
    } else {
      const finalChecklists = store.checklists.map(c => {
        if (c.id === runningTask.id) {
          const sessionTime = c.startedAt ? nowTime - new Date(c.startedAt).getTime() : 0;
          const totalTime = (c.accumulatedTimeMs || 0) + sessionTime;
          return action === 'complete'
            ? { ...c, feita: true, executingStatus: 'completed', accumulatedTimeMs: totalTime, completedAt: new Date().toISOString().split('T')[0], completedAtFull: new Date().toISOString(), completedBy: username }
            : { ...c, executingStatus: 'paused', accumulatedTimeMs: totalTime, startedAt: null };
        }
        if (c.id === currentTaskId) {
          return { ...c, startedAt: new Date().toISOString(), executingStatus: 'playing', startedBy: username };
        }
        return c;
      });

      const logTextOld = action === 'complete' ? `✅ Tarefa concluída via alternância: "${runningTask.texto}"` : `⏸️ Tarefa pausada via alternância: "${runningTask.texto}"`;
      const finalLogs = [
        ...(store.taskLogs || []),
        { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: logTextOld, author: username },
        { id: Date.now() + 1, data: new Date().toLocaleString('pt-BR'), texto: `▶️ Iniciou a tarefa: "${currentTaskText}"`, author: username }
      ];

      const finalStoreObj = { ...store, checklists: finalChecklists, taskLogs: finalLogs, dataUltimoAcesso: new Date().toISOString() };
      updateStoreInCloud(finalStoreObj);
      setStores(prev => prev.map(s => s.id === store.id ? finalStoreObj : s));

      broadcastTaskFocus(`▶️ Executando: ${currentTaskText} | ${store.store}`, 'set', store.id);
    }
    setPendingStartInfo(null);
    toast.success(action === 'complete' ? "Anterior concluída e nova iniciada!" : "Anterior pausada e nova iniciada!");
  };

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-6xl overflow-hidden flex flex-col lg:flex-row h-[90vh]">
        
        {/* LADO ESQUERDO */}
        <div className="flex-1 flex flex-col md:border-r border-white/10 relative">
          <div className="p-5 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={20} className="text-indigo-400"/> {store.store}
              </h3>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">
                {store.client} {store.marketplace && `• ${store.marketplace}`}
              </p>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 hover:bg-white/10 rounded-full transition-colors border border-transparent">
              <X size={20} className="text-gray-400 hover:text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-8 custom-scrollbar">
            {/* 1. SESSÃO DE CHECKLIST */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                To-Do List
              </h4>
              
              <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                {(() => {
                  let baseTasks = store.checklists || [];
                  if (isVisitante) {
                    baseTasks = baseTasks.filter(t => t.responsavel === myName);
                  }

                  const pendingTasks = baseTasks.filter(t => !t.feita);
                  const completedTasks = baseTasks.filter(t => t.feita && (!t.recorrencia || t.recorrencia === 'none'));
                  
                  pendingTasks.sort((a, b) => {
                    if (a.data && b.data) {
                      const dateTimeA = new Date(`${a.data}T${a.hora || '00:00'}`);
                      const dateTimeB = new Date(`${b.data}T${b.hora || '00:00'}`);
                      return dateTimeA - dateTimeB;
                    }
                    if (a.data) return -1;
                    if (b.data) return 1;
                    return 0;
                  });

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
                    
                    const rightNow = new Date();
                    let isOverdue = false;
                    let isWarning = false;

                    if (!item.feita && item.data) {
                        const timeString = item.hora || '23:59';
                        const deadlineDate = new Date(`${item.data}T${timeString}:00`);
                        const timeDiff = deadlineDate.getTime() - rightNow.getTime();
                        const hoursDiff = timeDiff / (1000 * 60 * 60);

                        if (hoursDiff < 0) {
                            isOverdue = true;
                        } else if (hoursDiff <= 24) {
                            isWarning = true;
                        }
                    }

                    const taskStyles = item.feita 
                        ? 'bg-gray-800/40 border-gray-800 hover:border-gray-600 border-l-4 border-l-gray-700' 
                        : isOverdue
                            ? 'bg-red-500/10 border-red-500/30 hover:border-red-500 border-l-4 border-l-red-500'
                            : isWarning
                                ? 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500 border-l-4 border-l-orange-500'
                                : 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500 border-l-4 border-l-blue-500';
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`flex flex-col p-2.5 rounded-r-lg group shadow-sm transition-colors duration-200 ${taskStyles}`}
                      >
                        {isEditing ? (
                          <div className="flex flex-col gap-2 w-full animate-in fade-in duration-200">
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={editTaskData.texto} 
                                onChange={e => setEditTaskData({...editTaskData, texto: e.target.value})} 
                                className="flex-1 bg-gray-900 border border-gray-600 rounded p-1.5 text-sm text-white outline-none focus:border-indigo-500" 
                              />
                              <select 
                                value={editTaskData.responsavel} 
                                onChange={e => setEditTaskData({...editTaskData, responsavel: e.target.value})} 
                                className="w-28 bg-gray-900 border border-gray-600 rounded p-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="">Sem Resp.</option>
                                {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
                              </select>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 items-center">
                              <input 
                                type="date" 
                                value={editTaskData.data} 
                                onChange={(e) => setEditTaskData({...editTaskData, data: e.target.value})} 
                                className="bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer" 
                                title="Data Limite (SLA)" 
                              />
                              <input 
                                type="time" 
                                value={editTaskData.hora} 
                                onChange={(e) => setEditTaskData({...editTaskData, hora: e.target.value})} 
                                className="bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer" 
                                title="Horário Limite (SLA)" 
                              />
                              <select 
                                value={editTaskData.recorrencia} 
                                onChange={(e) => setEditTaskData({...editTaskData, recorrencia: e.target.value})} 
                                className="bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none cursor-pointer"
                              >
                                <option value="none">S/ Repetição</option>
                                <option value="daily">🔁 Diário</option>
                                <option value="weekly">🔁 Semanal</option>
                                <option value="monthly">🔁 Mensal</option>
                              </select>
                              
                              <select 
                                value={editTaskData.peso || 'media'} 
                                onChange={(e) => setEditTaskData({...editTaskData, peso: e.target.value})} 
                                className="bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none cursor-pointer"
                              >
                                <option value="baixa">🟢 Rápida</option>
                                <option value="media">🟡 Média</option>
                                <option value="alta">🔴 Demorada</option>
                              </select>

                              <div className="flex gap-1 ml-auto">
                                <button type="button" onClick={() => setEditingTaskId(null)} className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded"><X size={14}/></button>
                                <button type="button" onClick={() => saveTaskEdit(item.id)} className="p-1 bg-green-600 hover:bg-green-500 text-white rounded"><Check size={14}/></button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between w-full">
                            <div className="flex items-start gap-3 flex-1">
                              <input type="checkbox" checked={item.feita} onChange={() => toggleChecklist(item.id)} className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-900 text-indigo-500 cursor-pointer" />
                              <div className="flex-1 flex flex-col">
                                <span className={`text-sm font-medium ${item.feita ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                  {item.texto}
                                </span>
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
                                  {(item.responsavel || item.resp) && <span className="text-[9px] text-gray-400 border border-gray-600 px-1.5 py-0.5 rounded shadow-sm">Resp: {item.responsavel || item.resp}</span>}
                                  {item.criadoPor && <span className="text-[9px] text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded shadow-sm">Por: {item.criadoPor}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                              {!item.feita && item.executingStatus !== 'playing' && (
                                <button type="button" onClick={() => handleStartTask(item.id, item.texto)} className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 bg-gray-900 border border-emerald-500/30 rounded flex items-center gap-1 text-[10px] font-bold transition-colors">
                                  <Play size={12}/> {item.executingStatus === 'paused' ? 'Retomar' : 'Iniciar'}
                                </button>
                              )}

                              {!item.feita && item.executingStatus === 'playing' && (
                                <button type="button" onClick={() => handlePauseTask(item.id, item.texto)} className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/20 px-2 py-1 bg-gray-900 border border-amber-500/30 rounded flex items-center gap-1 text-[10px] font-bold transition-colors">
                                  <Pause size={12}/> Pausar
                                </button>
                              )}

                              {!item.feita && onCopyTaskToBulk && (
                                <button type="button" onClick={() => onCopyTaskToBulk(item)} className="text-gray-500 hover:text-indigo-400 p-1.5 bg-gray-900 hover:bg-indigo-500/10 rounded transition-colors" title="Copiar para Tarefa em Massa">
                                  <Copy size={14}/>
                                </button>
                              )}

                              {canEditOrDeleteTask(item) && !item.feita && (
                                <>
                                  <button type="button" onClick={() => startEditingTask(item)} className="text-gray-500 hover:text-blue-400 p-1.5 bg-gray-900 hover:bg-white/10 rounded transition-colors">
                                    <Edit2 size={14}/>
                                  </button>
                                  <button type="button" onClick={() => deleteChecklist(item.id)} className="text-gray-500 hover:text-red-400 p-1.5 bg-gray-900 hover:bg-red-500/10 rounded transition-colors">
                                    <Trash2 size={14}/>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
              
              <div className="flex flex-col gap-3 bg-black/20 p-4 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex flex-col lg:flex-row gap-2">
                  <input type="text" value={newChecklist} onChange={e => setNewChecklist(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklist()} placeholder="O que precisa ser feito?" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                  <select value={newChecklistResp} onChange={e => setNewChecklistResp(e.target.value)} className="w-full md:w-36 bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-gray-300 outline-none focus:border-indigo-500 cursor-pointer transition-colors">
                    <option value="">Sem Resp.</option>
                    {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                
                <div className="w-full flex items-center gap-1.5 mt-1">
                    <AlertCircle size={12} className="text-amber-500" />
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Atenção: Defina a data e o horário limite para concluir a tarefa</span>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-gray-300 outline-none focus:border-indigo-500 cursor-pointer" title="Data Limite para Conclusão" />
                  <input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-gray-300 outline-none focus:border-indigo-500 cursor-pointer" title="Horário Limite" />

                  <select 
                    value={newTaskWeight} 
                    onChange={e => setNewTaskWeight(e.target.value)} 
                    className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
                    title="Tempo Médio Estimado da Tarefa"
                  >
                    <option value="baixa">🟢 Tarefa Rápida</option>
                    <option value="media">🟡 Tarefa Média</option>
                    <option value="alta">🔴 Tarefa Demorada</option>
                  </select>

                  <select value={newTaskRecurrence} onChange={e => setNewTaskRecurrence(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="none">Sem Repetição</option>
                    <option value="daily">🔁 Diária</option>
                    <option value="weekly">🔁 Semanal</option>
                    <option value="monthly">🔁 Mensal</option>
                  </select>

                  <button onClick={() => {setNewTaskDate(''); setNewTaskTime(''); setNewTaskRecurrence('none');}} className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 p-2 rounded-xl transition-colors"><Eraser size={14}/></button>
                  <button onClick={addChecklist} disabled={isAddingTask} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs shrink-0 shadow-md ml-auto">
                    {isAddingTask ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14}/> Add Tarefa</>}
                  </button>
                </div>
              </div>
            </div>

            {/* 2. HISTÓRICO DE AÇÕES */}
            {!isVisitante && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Timeline de Ações</h4>
                <div className="flex gap-2">
                  <textarea value={newLog} onChange={e => setNewLog(e.target.value)} placeholder="Descreva o que você fez hoje nesta conta..." className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-indigo-500 min-h-[60px] max-h-[120px] custom-scrollbar resize-none" />
                  <button onClick={addLog} className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 px-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-sm"><Send size={16}/> <span className="text-[10px] font-bold uppercase tracking-wider">Lançar</span></button>
                </div>
                
                <div className="space-y-4 relative mt-6 px-2">
                  {store.taskLogs?.slice().reverse().map((log, i) => {
                    const isMine = log.author === username; 
                    
                    const memberData = teamMembers?.find(m => m.nomeCompleto === log.author || m.nome === log.author);
                    const authorColor = memberData?.avatarColor || 'from-indigo-500 to-purple-600';
                    const authorPhoto = memberData?.avatarUrl || null;
                    
                    return (
                      <div key={log.id} className={`relative flex flex-col group/log ${isMine ? 'items-end' : 'items-start'}`}>
                        
                        <div className={`flex items-center gap-2 mb-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                          
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/10 bg-gradient-to-br ${authorColor} overflow-hidden shrink-0`}>
                            {authorPhoto ? (
                              <img src={authorPhoto} alt={log.author} className="w-full h-full object-cover" />
                            ) : (
                              (log.author || 'U').charAt(0).toUpperCase()
                            )}
                          </div>

                          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                            <strong className={isMine ? "text-indigo-400" : "text-gray-300"}>
                              {isMine ? 'Você' : log.author}
                            </strong> 
                            <span className="text-gray-600">•</span> {log.data}
                          </span>
                          
                          {isManager && (
                            <button onClick={() => deleteLog(log.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover/log:opacity-100 transition-opacity p-1">
                              <Trash2 size={12}/>
                            </button>
                          )}
                        </div>

                        {/* Balão de Mensagem */}
                        <div className={`p-3.5 rounded-2xl border text-sm shadow-sm leading-relaxed inline-block max-w-[90%] sm:max-w-[80%] ${
                          isMine 
                            ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-100 rounded-tr-none' 
                            : 'bg-white/[0.03] border-white/10 text-gray-300 rounded-tl-none'
                        }`}>
                          {log.texto}
                        </div>
                      </div>
                    );
                  })}
                  {(!store.taskLogs || store.taskLogs.length === 0) && (
                    <div className="text-xs text-gray-500 italic py-2 text-center">Nenhum log registrado na timeline.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LADO DIREITO */}
        <div className="w-full lg:w-[340px] bg-black/20 flex flex-col shrink-0">
          <div className="hidden lg:flex justify-end p-4 border-b border-white/5">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors border border-transparent">
              <X size={20} className="text-gray-400 hover:text-white" />
            </button>
          </div>
          
          <div className="p-5 flex-1 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
            {/* NOTAS FIXAS */}
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

            {/* PRÓXIMO ACESSO */}
            {!isVisitante && (
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
            )}
          </div>
        </div>
      </div>

      {/* Interface de Resolução de Conflitos */}
      {pendingStartInfo && (
        <div className="fixed inset-0 bg-[#0B0F19]/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-2xl max-w-md w-full shadow-2xl flex flex-col gap-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              ⚠️ Tarefa já em execução
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              Você já possui a tarefa <strong className="text-indigo-400">"{pendingStartInfo.runningTask.texto}"</strong> ativa na loja <strong className="text-white">{pendingStartInfo.runningTask.storeObject.store}</strong>.
            </p>
            <p className="text-xs text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              Você deseja pausar ou concluir a tarefa anterior para poder iniciar esta nova?
            </p>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => setPendingStartInfo(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => resolveConflictAndStart('pause')}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1"
              >
                Pausar
              </button>
              <button 
                onClick={() => resolveConflictAndStart('complete')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

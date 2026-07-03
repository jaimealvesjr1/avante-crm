import React, { useState, useMemo } from 'react';
import { X, Plus, CalendarDays, CheckCircle2, Trash2, Send, StickyNote, Save, Copy, Eraser, Loader2, TrendingUp, Edit2, Check, Play, Pause, AlertCircle, Package, FileText, Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { processTaskCompletion, processTaskStart, processTaskPause, calculateNextAccess } from '../../utils/taskEngine';

export default function TaskModal({ store, onClose, updateStoreInCloud, stores, setStores, currentUserData, isManager, teamMembers, broadcastTaskFocus, onCopyTaskToBulk, sendGlobalNotification }) {
  const [newLog, setNewLog] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [newChecklistResp, setNewChecklistResp] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  });
  const [newTaskTime, setNewTaskTime] = useState(() => new Date().toTimeString().substring(0, 5));
  const [newTaskRecurrence, setNewTaskRecurrence] = useState('none');
  const [newTaskWeight, setNewTaskWeight] = useState('media');

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [acessoEmail, setAcessoEmail] = useState(store.acessoEmail || '');
  const [acessoSenha, setAcessoSenha] = useState(store.acessoSenha || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingAcesso, setIsSavingAcesso] = useState(false);

  const myName = currentUserData?.nomeCompleto || currentUserData?.nome;
  const isVisitante = currentUserData?.role === 'Visitante';
  const isAdmin = currentUserData?.role === 'Admin' || currentUserData?.role === 'admin' || currentUserData?.role === 'manager';

  const canEditOrDeleteTask = (task) => {
    return isAdmin || task.responsavel === myName || task.criadoPor === myName;
  };

  const [fixedNotes, setFixedNotes] = useState(store.notasFixas || '');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateTargetId, setDuplicateTargetId] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskData, setEditTaskData] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null); 
  
  const [animatingTasks, setAnimatingTasks] = useState([]);
  const [pendingStartInfo, setPendingStartInfo] = useState(null);

  const username = currentUserData?.nomeCompleto || currentUserData?.nome || currentUserData?.email?.split('@')[0] || 'Usuário';
  const teamNames = teamMembers?.map(m => m.nomeCompleto || m.nome || m.email.split('@')[0]).filter(Boolean) || [];

  const allUniqueTasks = useMemo(() => {
    const taskSet = new Set();
    stores.forEach(s => {
      if (s.checklists) {
        s.checklists.forEach(t => {
          if (t.texto && t.texto.trim().length > 3) {
            taskSet.add(t.texto.trim());
          }
        });
      }
    });
    return Array.from(taskSet);
  }, [stores]);

  const saveChanges = (updatedStore) => {
    updateStoreInCloud(updatedStore);
    setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
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

  const handleChecklistChange = (e) => {
    const val = e.target.value;
    setNewChecklist(val);
    
    if (val.trim().length >= 2) {
      const filtered = allUniqueTasks.filter(t => 
        t.toLowerCase().includes(val.toLowerCase()) && t.toLowerCase() !== val.toLowerCase()
      );
      setSuggestions(filtered.slice(0, 6)); 
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const addChecklist = () => {
    if (!newChecklist.trim()) return;
    setIsAddingTask(true);
    setShowSuggestions(false);
    
    const item = { id: Date.now(), texto: newChecklist, feita: false, responsavel: newChecklistResp.trim(), criadoPor: username, data: newTaskDate, hora: newTaskTime, recorrencia: newTaskRecurrence, peso: newTaskWeight };
    const updatedChecklists = [...(store.checklists || []), item];
    const newNextAccess = calculateNextAccess(updatedChecklists);

    let updatedLogs = store.taskLogs || [];
    const resp = newChecklistResp.trim();
    if (resp && resp !== username) {
        updatedLogs.push({
            id: Date.now() + 1,
            data: new Date().toLocaleString('pt-BR'),
            texto: `📌 @${resp}, você recebeu uma nova tarefa: "${newChecklist}"`,
            author: username
        });
    }

    saveChanges({ ...store, checklists: updatedChecklists, taskLogs: updatedLogs, dataProximoAcesso: newNextAccess || store.dataProximoAcesso || '' });
    
    setTimeout(() => {
      const now = new Date();
      setNewChecklist(''); setNewChecklistResp(''); 
      setNewTaskDate(new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]); 
      setNewTaskTime(now.toTimeString().substring(0, 5)); 
      setNewTaskRecurrence('none');
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
    const newNextAccess = calculateNextAccess(updatedChecklists);
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
    const newNextAccess = calculateNextAccess(updatedChecklists);
    let finalNextAccess = newNextAccess;
    const oldTask = store.checklists.find(t => t.id === taskId);
    
    if (!newNextAccess && (oldTask?.data || editTaskData.data)) finalNextAccess = '';
    else if (!newNextAccess) finalNextAccess = store.dataProximoAcesso || '';

    saveChanges({ ...store, checklists: updatedChecklists, taskLogs: [...(store.taskLogs || []), log], dataProximoAcesso: finalNextAccess, dataUltimoAcesso: new Date().toISOString() });
    setEditingTaskId(null);
    toast.success('Tarefa atualizada!');
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

  const saveAcesso = () => {
    setIsSavingAcesso(true);
    const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: `🔐 Credenciais de acesso atualizadas`, author: username };
    saveChanges({ ...store, acessoEmail, acessoSenha, taskLogs: [...(store.taskLogs || []), log] });
    setTimeout(() => { setIsSavingAcesso(false); toast.success('Credenciais salvas com sucesso!'); }, 500);
  };

  const handleCopy = (text, type) => {
    if (!text) return toast.error(`Nenhum ${type.toLowerCase()} para copiar.`);
    navigator.clipboard.writeText(text);
    toast.success(`${type} copiado para a área de transferência!`);
  };

  const handleStartTask = (taskId, taskText) => {
    // 1. Procura em todo o banco se há uma tarefa sua rodando
    const runningTask = stores
      .flatMap(s => (s.checklists || []).map(t => ({ ...t, storeObject: s })))
      .find(t => t.executingStatus === 'playing' && t.startedBy === username && !t.feita);

    // 2. Se achou, abre o Popup e PARA aqui
    if (runningTask) {
      setPendingStartInfo({ currentTaskId: taskId, currentTaskText: taskText, runningTask });
      return;
    }

    // 3. Se não achou, inicia normalmente
    executeStart(taskId, taskText);
  };

  const executeStart = (taskId, taskText) => {
    const task = store.checklists?.find(t => t.id === taskId);
    if(!task) return;

    const { updatedChecklists, newLog } = processTaskStart(store, task, username);

    saveChanges({ ...store, checklists: updatedChecklists, taskLogs: [...(store.taskLogs || []), newLog], dataUltimoAcesso: new Date().toISOString() });
    
    if (broadcastTaskFocus) {
      // Adicionamos o envio do 'taskId' no final para a animação global funcionar!
      broadcastTaskFocus(`▶️ Executando: ${taskText} | ${store.store}`, 'set', store.id, taskId);
    }
  };

  const resolveConflictAndStart = async (action) => {
    if (!pendingStartInfo) return;
    const { currentTaskId, currentTaskText, runningTask } = pendingStartInfo;

    // Se a tarefa que esquecemos rodando estiver em OUTRA loja
    if (store.id !== runningTask.storeObject.id) {
      const oldStore = stores.find(s => s.id === runningTask.storeObject.id);
      if (oldStore) {
        const oldTask = oldStore.checklists.find(t => t.id === runningTask.id);
        
        const result = action === 'complete' 
          ? processTaskCompletion(oldStore, oldTask, username)
          : processTaskPause(oldStore, oldTask, username);

        const newNextAccess = calculateNextAccess(result.updatedChecklists);

        const finalOldStore = { 
          ...oldStore, 
          checklists: result.updatedChecklists, 
          taskLogs: [...(oldStore.taskLogs || []), result.newLog], 
          dataUltimoAcesso: new Date().toISOString(),
          dataProximoAcesso: newNextAccess || oldStore.dataProximoAcesso || ''
        };
        updateStoreInCloud(finalOldStore);
      }
      executeStart(currentTaskId, currentTaskText);
      
    } else {
      // Se for na MESMA loja
      const oldTask = store.checklists.find(t => t.id === runningTask.id);
      
      const resultOld = action === 'complete'
        ? processTaskCompletion(store, oldTask, username)
        : processTaskPause(store, oldTask, username);
      
      const tempStore = { ...store, checklists: resultOld.updatedChecklists };
      const currentTask = tempStore.checklists.find(t => t.id === currentTaskId);
      
      const resultNew = processTaskStart(tempStore, currentTask, username);

      const finalLogs = [
        ...(store.taskLogs || []),
        resultOld.newLog,
        resultNew.newLog
      ];

      const newNextAccess = calculateNextAccess(resultNew.updatedChecklists);

      const finalStoreObj = { 
        ...store, 
        checklists: resultNew.updatedChecklists, 
        taskLogs: finalLogs, 
        dataUltimoAcesso: new Date().toISOString(),
        dataProximoAcesso: newNextAccess || store.dataProximoAcesso || ''
      };
      
      updateStoreInCloud(finalStoreObj);
      broadcastTaskFocus(`▶️ Executando: ${currentTaskText} | ${store.store}`, 'set', store.id, currentTaskId);
    }
    
    setPendingStartInfo(null);
    toast.success(action === 'complete' ? "Anterior concluída e nova iniciada!" : "Anterior pausada e nova iniciada!");
  };

  const handlePauseTask = (taskId, taskText) => {
    const task = store.checklists?.find(t => t.id === taskId);
    if(!task) return;

    const { updatedChecklists, newLog } = processTaskPause(store, task, username);

    saveChanges({ ...store, checklists: updatedChecklists, taskLogs: [...(store.taskLogs || []), newLog], dataUltimoAcesso: new Date().toISOString() });
    
    if (broadcastTaskFocus) {
      broadcastTaskFocus(`⏸️ Pausada: ${taskText} | ${store.store}`, 'set', store.id, taskId);
    }
    toast.success("Tarefa pausada.");
  };

  const toggleChecklist = (id) => {
    const task = store.checklists.find(c => c.id === id);
    const isCompleting = !task.feita;

    if (isCompleting && (task.executingStatus === 'playing' || task.executingStatus === 'paused') && broadcastTaskFocus) {
       broadcastTaskFocus('', 'clear');
    }
    
    let updatedChecklists = [...store.checklists];
    let updatedLogs = store.taskLogs || [];

    if (isCompleting) {
      const result = processTaskCompletion(store, task, username);
      updatedChecklists = result.updatedChecklists;
      updatedLogs = [...updatedLogs, result.newLog];
      toast.success('✅ Tarefa concluída!');
      
      if (sendGlobalNotification) {
        sendGlobalNotification(`Concluiu a tarefa "${task.texto}" na loja ${store.store}.`, 'success');
      }
      
    } else {
      updatedChecklists = updatedChecklists.map(c => {
        if (c.id === id) {
          const { completedAt, completedAtFull, completedBy, startedAt, accumulatedTimeMs, executingStatus, ...rest } = c;
          return { ...rest, feita: false };
        }
        return c;
      });
      toast.success('Tarefa reaberta!');
    }

    const newNextAccess = calculateNextAccess(updatedChecklists);
    let finalNextAccess = newNextAccess;
    if (!newNextAccess && isCompleting && task.data) finalNextAccess = '';
    else if (!newNextAccess) finalNextAccess = store.dataProximoAcesso || '';

    saveChanges({ ...store, checklists: updatedChecklists, taskLogs: updatedLogs, dataUltimoAcesso: new Date().toISOString(), dataProximoAcesso: finalNextAccess });
  };

  const handleCheckClick = (id, isAlreadyDone) => {
    if (isAlreadyDone) {
      toggleChecklist(id);
    } else {
      setAnimatingTasks(prev => [...prev, id]);
      setTimeout(() => {
        toggleChecklist(id);
        setAnimatingTasks(prev => prev.filter(tId => tId !== id)); 
      }, 600); 
    }
  };

  const calcularLucroOferta = (precoVenda, custoBase, quantidade) => {
    const venda = Number(precoVenda) || 0;
    const custoUnico = Number(custoBase) || 0;
    const qtdPares = Number(quantidade) || 1;
    
    if (venda === 0) return { valor: 0, margem: 0 };
    
    const custoTotal = custoUnico * qtdPares;
    const lucro = venda - custoTotal;
    const margem = (lucro / venda) * 100;
    return { valor: lucro, margem: margem };
  };

  const clientProducts = useMemo(() => {
      const productsMap = new Map();
      stores.filter(s => s.client === store.client).forEach(s => {
          (s.produtos || []).forEach(p => {
              if (!productsMap.has(p.id)) productsMap.set(p.id, p);
          });
      });
      return Array.from(productsMap.values());
  }, [stores, store.client]);

  return (
  <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center z-[250] p-4 animate-in zoom-in-95 duration-200">
        <div className="relative bg-[#0d1321]/95 backdrop-blur-3xl rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] border border-white/15 w-full max-w-6xl overflow-hidden flex flex-col lg:flex-row h-[90vh]">
        
        {/* LADO ESQUERDO */}
        <div className="flex-1 flex flex-col md:border-r border-white/10 relative">
          <div className="p-5 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={20} className="text-indigo-400"/> {store.store}
              </h3>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium flex items-center gap-1">
                <button 
                   onClick={() => {
                      if (window.openClientFileGlobal) {
                         onClose(); 
                         window.openClientFileGlobal(store.client); 
                      }
                   }}
                   className="hover:text-indigo-400 transition-colors cursor-pointer text-left"
                   title="Abrir Ficha do Cliente"
                >
                   {store.client}
                </button> 
                {store.marketplace && ` • ${store.marketplace}`}
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
                                <option value="3days">🔁 3 Dias (Relâmpago)</option>
                                <option value="weekly">🔁 Semanal</option>
                                <option value="15days">🔁 Quinzenal</option>
                                <option value="monthly">🔁 Mensal</option>
                                <option value="90days">🔁 90 Dias (Promo)</option>
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
                              <input 
                                type="checkbox" 
                                checked={item.feita || animatingTasks.includes(item.id)} 
                                onChange={() => handleCheckClick(item.id, item.feita)} 
                                className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-900 text-indigo-500 cursor-pointer" 
                              />
                              <div className="flex-1 flex flex-col">
                                <span className={`text-sm font-medium transition-all duration-300 ${item.feita || animatingTasks.includes(item.id) ? 'text-gray-500 line-through opacity-60' : 'text-gray-200'}`}>
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
                                      🔁 {
                                          item.recorrencia === 'daily' ? 'Diário' : 
                                          item.recorrencia === '3days' ? '3 Dias' : 
                                          item.recorrencia === 'weekly' ? 'Semanal' : 
                                          item.recorrencia === '15days' ? 'Quinzenal' : 
                                          item.recorrencia === 'monthly' ? 'Mensal' : 
                                          item.recorrencia === '90days' ? '90 Dias' : item.recorrencia
                                         }
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
                <div className="flex flex-col lg:flex-row gap-2 relative z-20">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={newChecklist} 
                      onChange={handleChecklistChange} 
                      onKeyDown={e => {
                         if (e.key === 'Enter') {
                            setShowSuggestions(false);
                            addChecklist();
                         }
                      }}
                      onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="O que precisa ser feito?" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors" 
                    />
                    
                    {showSuggestions && suggestions.length > 0 && (
                      <ul className="absolute top-full left-0 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                        {suggestions.map((sug, idx) => (
                          <li 
                            key={idx} 
                            onMouseDown={(e) => { 
                              e.preventDefault(); 
                              setNewChecklist(sug); 
                              setShowSuggestions(false); 
                            }} 
                            className="px-4 py-2.5 text-sm text-gray-300 hover:bg-indigo-600 hover:text-white cursor-pointer transition-colors border-b border-gray-800 last:border-0 truncate"
                          >
                            {sug}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  
                  <select value={newChecklistResp} onChange={e => setNewChecklistResp(e.target.value)} className="w-full md:w-36 bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-gray-300 outline-none focus:border-indigo-500 cursor-pointer transition-colors shrink-0">
                    <option value="">Sem Resp.</option>
                    {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                
                <div className="w-full flex items-center gap-1.5 mt-1">
                    <AlertCircle size={12} className="text-amber-500" />
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Atenção: Defina a data e o horário limite para concluir a tarefa</span>
                </div>

                <div className="flex flex-wrap gap-2 items-center relative z-10">
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
                    <option value="3days">🔁 3 Dias (Relâmpago)</option>
                    <option value="weekly">🔁 Semanal</option>
                    <option value="15days">🔁 Quinzenal</option>
                    <option value="monthly">🔁 Mensal</option>
                    <option value="90days">🔁 90 Dias (Promo)</option>
                  </select>

                  <button onClick={() => {
                    const now = new Date();
                    setNewTaskDate(new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
                    setNewTaskTime(now.toTimeString().substring(0, 5));
                    setNewTaskRecurrence('none');
                  }} className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 p-2 rounded-xl transition-colors" title="Redefinir Data/Hora"><Eraser size={14}/></button>
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

            {/* ACESSO DA CONTA */}
            <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/10 shadow-sm shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2">
                  <Lock size={14} /> Acesso da Conta
                </h4>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={acessoEmail} 
                    onChange={(e) => setAcessoEmail(e.target.value)} 
                    placeholder="Login / E-mail"
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl p-2.5 text-xs text-gray-300 outline-none focus:border-blue-500 transition-colors"
                  />
                  <button onClick={() => handleCopy(acessoEmail, 'Login')} className="p-2.5 bg-black/20 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors" title="Copiar Login">
                    <Copy size={14}/>
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={acessoSenha} 
                      onChange={(e) => setAcessoSenha(e.target.value)} 
                      placeholder="Senha de Acesso"
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-2.5 pr-10 text-xs text-gray-300 outline-none focus:border-blue-500 transition-colors"
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button onClick={() => handleCopy(acessoSenha, 'Senha')} className="p-2.5 bg-black/20 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors" title="Copiar Senha">
                    <Copy size={14}/>
                  </button>
                </div>

                <button onClick={saveAcesso} disabled={isSavingAcesso} className="w-full bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 text-blue-400 font-bold py-2 rounded-xl text-xs flex justify-center items-center gap-2 shadow-sm transition-all mt-1">
                  {isSavingAcesso ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Salvar Credenciais</>}
                </button>
              </div>
            </div>
            
            {/* CATÁLOGO DE PRODUTOS */}
            {clientProducts.length > 0 && (
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10 shadow-sm shrink-0">
                <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2 mb-3">
                  <Package size={14} /> Catálogo
                </h4>
                <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar">
                  {clientProducts.map(prod => {
                    const canalAtivo = (prod.canais || []).find(c => c.canal?.toLowerCase() === store.marketplace?.toLowerCase());
                    const melhorOferta = canalAtivo?.ofertas?.[0]; 
                    const precoExibicao = melhorOferta?.precoPor || melhorOferta?.precoDe || prod.precoPor || prod.precoDe || '---';

                    return (
                      <div 
                        key={prod.id} 
                        onClick={() => setSelectedProduct(prod)}
                        className="w-24 shrink-0 bg-black/40 border border-white/5 rounded-xl overflow-hidden flex flex-col group hover:border-indigo-500/30 transition-colors cursor-pointer"
                      >
                        <div className="h-20 w-full bg-gray-900 flex items-center justify-center relative border-b border-white/5">
                          {prod.fotoUrl ? (
                            <img src={prod.fotoUrl} alt={prod.descricao} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <Package size={16} className="text-gray-600" />
                          )}
                        </div>
                        <div className="p-2 flex flex-col flex-1 justify-between bg-black/20">
                          <p className="text-[9px] font-bold text-gray-300 truncate w-full mb-1" title={prod.descricao}>
                            {prod.descricao}
                          </p>
                          <p className="text-[10px] font-black text-emerald-400 truncate" title={`R$ ${precoExibicao}`}>
                            R$ {precoExibicao}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
          </div>
        </div>
      </div>

      {/* GAVETA LATERAL: DETALHES DO PRODUTO */}
      {selectedProduct && (
          <>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] z-[90]" onClick={() => setSelectedProduct(null)}></div>
            <div className="absolute top-4 right-4 bottom-4 w-[450px] bg-gradient-to-b from-gray-900/98 to-[#0B0F19] backdrop-blur-3xl border border-white/15 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col z-[100] overflow-hidden animate-in slide-in-from-right-10 duration-300">
              <div className="relative h-48 shrink-0 flex items-end p-6 overflow-hidden">
                 <div className="absolute inset-0 bg-gray-900">
                    {selectedProduct.fotoUrl && <img src={selectedProduct.fotoUrl} alt="bg" className="w-full h-full object-cover opacity-25 blur-sm scale-110" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/40 to-transparent"></div>
                 </div>
                 
                 <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl backdrop-blur-xl transition-all border border-white/10 hover:scale-110 active:scale-95">
                   <X size={20}/>
                 </button>

                 <div className="relative z-10 flex gap-5 items-center w-full">
                    <div className="w-24 h-24 shrink-0 bg-black/80 rounded-2xl border border-white/20 flex items-center justify-center overflow-hidden shadow-2xl">
                      {selectedProduct.fotoUrl ? (
                        <img src={selectedProduct.fotoUrl} alt={selectedProduct.descricao} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={32} className="text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-black text-white leading-tight drop-shadow-lg">{selectedProduct.descricao}</h4>
                      <div className="flex gap-2 mt-2">
                        {selectedProduct.custo && (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-sm">
                            Custo Un: R$ {selectedProduct.custo}
                          </span>
                        )}
                      </div>
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-5">
                {(selectedProduct.variacoes && selectedProduct.variacoes.length > 0) && (
                  <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl">
                    <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Variações Disponíveis</h5>
                    <div className="flex flex-col gap-2">
                      {selectedProduct.variacoes.map(v => (
                        <div key={v.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-[10px] font-bold text-indigo-300 w-16 truncate shrink-0" title={v.cor}>{v.cor || 'Sem cor'}:</span>
                          <div className="flex flex-wrap gap-1 flex-1">
                            {v.tamanhos.map(t => (
                              <span key={t} className="bg-gray-800 text-gray-300 text-[10px] px-2 py-0.5 rounded border border-gray-700">{t}</span>
                            ))}
                            {v.tamanhos.length === 0 && <span className="text-[9px] text-gray-600">Sem tamanhos</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <TrendingUp size={16} className="text-indigo-400" />
                     <h5 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Oportunidades de Canal</h5>
                   </div>
                   <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold">
                     {selectedProduct.canais?.length || 0} Ativos
                   </span>
                </div>
                
                <div className="space-y-4">
                  {(selectedProduct.canais || []).map((c, i) => (
                    <div key={c.id || i} className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 flex flex-col gap-4 relative group transition-all hover:bg-white/[0.06] hover:border-indigo-500/40">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-white uppercase tracking-wider">{c.canal}</span>
                            {c.modalidade && <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{c.modalidade}</span>}
                          </div>
                        </div>
                      </div>
                      
                      {(c.ofertas && c.ofertas.length > 0) && (
                        <div className="mt-2 bg-black/30 rounded-xl p-3 border border-white/5">
                           <table className="w-full text-left">
                             <thead>
                               <tr className="text-[9px] text-gray-500 uppercase tracking-wider border-b border-white/10">
                                 <th className="pb-2 w-16">Pares</th>
                                 <th className="pb-2 w-20">P. Cheio</th>
                                 <th className="pb-2 w-20 text-emerald-400">Promo</th>
                                 <th className="pb-2 w-20 text-orange-400">Spam</th>
                                 <th className="pb-2 text-right">Lucro Bruto</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5">
                               {c.ofertas.map(of => {
                                  const lucro = calcularLucroOferta(of.precoPor || of.precoDe, selectedProduct.custo, of.quantidade);
                                  const isNegativo = lucro.valor < 0;

                                  return (
                                    <tr key={of.id} className="group/row">
                                       <td className="py-2.5 text-[11px] font-bold text-gray-300">{of.quantidade}</td>
                                       <td className="py-2.5 text-[11px] text-gray-500 line-through">R$ {of.precoDe}</td>
                                       <td className="py-2.5 text-[11px] font-black text-emerald-400">R$ {of.precoPor || of.precoDe || '0.00'}</td>
                                       <td className="py-2.5 text-[11px] font-black text-orange-400">
                                         {of.spam ? `R$ ${of.spam}` : '-'}
                                       </td>
                                       <td className="py-2.5 text-right flex flex-col items-end">
                                            <span className={`text-[11px] font-black ${isNegativo ? 'text-red-400' : 'text-emerald-400'}`}>
                                              {isNegativo ? '' : '+'}R$ {lucro.valor.toFixed(2)}
                                            </span>
                                            {selectedProduct.custo && (
                                                <span className={`text-[9px] font-bold ${isNegativo ? 'text-red-500' : 'text-emerald-500/60'}`}>
                                                  {lucro.margem.toFixed(1)}%
                                                </span>
                                            )}
                                       </td>
                                    </tr>
                                  )
                               })}
                             </tbody>
                           </table>
                        </div>
                      )}

                      {c.kits && c.kits.length > 0 && (
                        <div className="space-y-2 mt-2 border-t border-white/5 pt-3">
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Kits Legados</p>
                          {(c.kits || []).map((kit, kIdx) => (
                            <div key={kit.id || kIdx} className="flex justify-between items-center bg-black/30 p-2.5 rounded-xl border border-white/5">
                              <div className="flex items-center gap-2">
                                <Package size={12} className="text-indigo-400"/>
                                <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wide truncate max-w-[150px]">
                                  {kit.descricao || 'Kit'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {kit.precoDe && <span className="text-[9px] text-gray-600 line-through font-bold">R$ {kit.precoDe}</span>}
                                <span className="text-[11px] font-black text-indigo-300">R$ {kit.precoPor || '0.00'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {selectedProduct.observacoes && (
                   <div className="mt-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex flex-col gap-2 relative">
                      <div className="flex items-center gap-1.5 text-indigo-400">
                        <FileText size={14} className="shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Observações da Gestão</span>
                      </div>
                      <p className="text-xs text-indigo-100/70 leading-relaxed whitespace-pre-wrap">
                        {selectedProduct.observacoes}
                      </p>
                   </div>
                )}
              </div>
            </div>
          </>
        )}

      {pendingStartInfo && (
        <div className="fixed inset-0 bg-[#0B0F19]/90 backdrop-blur-md flex items-center justify-center z-[300] p-4 animate-in fade-in duration-200">
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

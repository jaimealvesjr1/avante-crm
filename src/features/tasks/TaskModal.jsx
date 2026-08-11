import React, { useState, useMemo } from 'react';
import { X, Plus, CalendarDays, CheckCircle2, Trash2, Send, StickyNote, Save, Copy, Eraser, Loader2, TrendingUp, Edit2, Check, Play, Pause, AlertCircle, Package, FileText, Lock, ListPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { processTaskCompletion, processTaskStart, processTaskPause, processTaskSchedule, calculateNextAccess } from '../../utils/taskEngine';

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
  const [isCatalogOpen, setIsCatalogOpen] = useState(false); 
  
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

    let updatedLogs = store.taskLogs ? [...store.taskLogs] : [];
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

    const updatedOriginStore = { ...store, taskLogs: [...(store.taskLogs || []), logOrigem] };
    const updatedDestStore = { ...destinationStore, notasFixas: fixedNotes, taskLogs: [...(destinationStore.taskLogs || []), logDestino] };
    
    // 2. Dispara a gravação na nuvem para as duas lojas
    updateStoreInCloud(updatedOriginStore);
    updateStoreInCloud(updatedDestStore);
    
    // 3. Atualiza o estado local uma única vez, unindo as duas alterações no mesmo array
    setStores(stores.map(s => {
        if (s.id === updatedOriginStore.id) return updatedOriginStore;
        if (s.id === updatedDestStore.id) return updatedDestStore;
        return s;
    }));
    
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

  const handleScheduleTask = (taskId, taskText) => {
    const task = store.checklists?.find(t => t.id === taskId);
    if(!task) return;

    // Chama o motor para mudar o status e registrar o log
    const { updatedChecklists, newLog } = processTaskSchedule(store, task, username);

    // Salva a atualização no banco de dados e no estado local
    saveChanges({ 
      ...store, 
      checklists: updatedChecklists, 
      taskLogs: [...(store.taskLogs || []), newLog] 
    });
    
    toast.success("Tarefa adicionada ao seu roteiro diário!");
  };

  const handleReturnToBacklog = (taskId, taskText) => {
    const task = store.checklists?.find(t => t.id === taskId);
    if (!task) return;

    const updatedChecklists = store.checklists.map(c => 
      c.id === taskId ? { ...c, executingStatus: 'none', startedAt: null, startedBy: null } : c
    );

    const log = { 
      id: Date.now(), 
      data: new Date().toLocaleString('pt-BR'), 
      texto: `↩️ Devolveu ao "Á Fazer": "${taskText}"`, 
      author: username 
    };

    saveChanges({ 
      ...store, 
      checklists: updatedChecklists, 
      taskLogs: [...(store.taskLogs || []), log] 
    });

    if (task.executingStatus === 'playing' && broadcastTaskFocus) {
      broadcastTaskFocus('', 'clear');
    }

    toast.success("Tarefa devolvida para a coluna 'Á Fazer'.");
  };

  const handleStartTask = (taskId, taskText) => {
    const task = store.checklists?.find(t => t.id === taskId);
    if (!task) return;

    // Se a tarefa não tem status ou está no backlog ('none')
    if (!task.executingStatus || task.executingStatus === 'none') {
      if (!window.confirm('Deseja inserir essa tarefa na sua programação diária e iniciá-la?')) {
        return; // O usuário clicou em cancelar
      }
    }

    // Se confirmou (ou se já estava programada/pausada), inicia normalmente
    executeStart(taskId, taskText);
  };

  const executeStart = (taskId, taskText) => {
    const task = store.checklists?.find(t => t.id === taskId);
    if(!task) return;

    const { updatedChecklists, newLog } = processTaskStart(store, task, username);

    saveChanges({ ...store, checklists: updatedChecklists, taskLogs: [...(store.taskLogs || []), newLog], dataUltimoAcesso: new Date().toISOString() });
    
    if (broadcastTaskFocus) {
      broadcastTaskFocus(`▶️ Executando: ${taskText} | ${store.store}`, 'set', store.id, taskId);
    }
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

  const renderTaskCard = (item) => {
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

    // Identifica se a tarefa está na coluna "Em Execução" (Roteiro / Executando / Pausada)
    const isInExecutionColumn = ['scheduled', 'playing', 'paused'].includes(item.executingStatus);

    return (
      <div key={item.id} className={`flex flex-col p-2.5 rounded-r-lg group shadow-sm transition-colors duration-200 ${taskStyles}`}>
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
              
              {/* O CHECKBOX DE CONCLUSÃO SÓ APARECE SE A TAREFA ESTIVER NA COLUNA "EM EXECUÇÃO" */}
              {!item.feita && isInExecutionColumn && (
                <input 
                  type="checkbox" 
                  checked={animatingTasks.includes(item.id)} 
                  onChange={() => handleCheckClick(item.id, item.feita)} 
                  className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-900 text-indigo-500 cursor-pointer shrink-0" 
                  title="Concluir tarefa"
                />
              )}

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
          </div>
        )}
        
        {/* BOTÕES DE AÇÃO NA ESTEIRA */}
        {!isEditing && (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex-wrap">
            
            {/* SE ESTIVER NO BACKLOG (Á Fazer) -> Botões Puxar e Iniciar */}
            {!item.feita && (!item.executingStatus || item.executingStatus === 'none') && (
              <>
                <button type="button" onClick={() => handleScheduleTask(item.id, item.texto)} className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 px-2 py-1 bg-gray-900 border border-indigo-500/30 rounded flex items-center gap-1 text-[10px] font-bold transition-colors">
                  <ListPlus size={12}/> Puxar p/ Roteiro
                </button>
                
                <button type="button" onClick={() => handleStartTask(item.id, item.texto)} className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 bg-gray-900 border border-emerald-500/30 rounded flex items-center gap-1 text-[10px] font-bold transition-colors">
                  <Play size={12}/> Iniciar
                </button>
              </>
            )}

            {/* SE ESTIVER NO ROTEIRO (Em Execução / Pausada) -> Botões Voltar para Á Fazer, Iniciar/Retomar e Pausar */}
            {!item.feita && isInExecutionColumn && (
              <>
                <button type="button" onClick={() => handleReturnToBacklog(item.id, item.texto)} className="text-gray-400 hover:text-gray-200 hover:bg-white/10 px-2 py-1 bg-gray-900 border border-white/10 rounded flex items-center gap-1 text-[10px] font-bold transition-colors" title="Devolver para a coluna Á Fazer">
                  ↩️ Voltar p/ Á Fazer
                </button>

                {item.executingStatus !== 'playing' ? (
                  <button type="button" onClick={() => handleStartTask(item.id, item.texto)} className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 bg-gray-900 border border-emerald-500/30 rounded flex items-center gap-1 text-[10px] font-bold transition-colors">
                    <Play size={12}/> {item.executingStatus === 'paused' ? 'Retomar' : 'Iniciar'}
                  </button>
                ) : (
                  <button type="button" onClick={() => handlePauseTask(item.id, item.texto)} className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/20 px-2 py-1 bg-gray-900 border border-amber-500/30 rounded flex items-center gap-1 text-[10px] font-bold transition-colors">
                    <Pause size={12}/> Pausar
                  </button>
                )}
              </>
            )}

            {/* BOTOES PADRÃO */}
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
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center z-[250] p-2 sm:p-4 animate-in zoom-in-95 duration-200">
      {/* ATUALIZADO: Largura expandida para 1400px (ou 1600px em 2XL) para o Kanban respirar */}
      <div className="relative bg-[#0d1321]/95 backdrop-blur-3xl rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] border border-white/15 w-full max-w-[98vw] xl:max-w-[1400px] 2xl:max-w-[1600px] overflow-hidden flex flex-col lg:flex-row h-[95vh] md:h-[90vh]">
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
            {/* 1. SESSÃO KANBAN DE TAREFAS E CRIAÇÃO */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                Esteira de Tarefas
              </h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-[4fr_4fr_2fr] gap-4 xl:gap-5 mb-4 min-h-[40vh] max-h-[55vh] xl:max-h-[60vh]">
                {(() => {
                  let baseTasks = store.checklists || [];
                  if (isVisitante) {
                    baseTasks = baseTasks.filter(t => t.responsavel === myName);
                  }

                  // Separa as tarefas por status do Pipeline
                  const backlogTasks = baseTasks.filter(t => !t.feita && (!t.executingStatus || t.executingStatus === 'none'));
                  const scheduledTasks = baseTasks.filter(t => !t.feita && ['scheduled', 'playing', 'paused'].includes(t.executingStatus));
                  const completedTasks = baseTasks.filter(t => t.feita && (!t.recorrencia || t.recorrencia === 'none')).slice(-10); // Máx 10 para não lotar

                  // Ordena o Roteiro: Rodando primeiro, Pausado depois, Programado no final
                  scheduledTasks.sort((a, b) => {
                    const weight = { 'playing': 1, 'paused': 2, 'scheduled': 3 };
                    return (weight[a.executingStatus] || 4) - (weight[b.executingStatus] || 4);
                  });

                  return (
                    <>
                      {/* COLUNA 1: BACKLOG */}
                      <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex flex-col gap-3 overflow-hidden shadow-inner">
                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2">📋 Á Fazer ({backlogTasks.length})</h5>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                          {backlogTasks.length === 0 ? (
                            <p className="text-[10px] text-gray-600 italic text-center py-4">Vazio.</p>
                          ) : (
                            backlogTasks.map(task => renderTaskCard(task))
                          )}
                        </div>
                      </div>

                      {/* COLUNA 2: ROTEIRO DIÁRIO */}
                      <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-3 flex flex-col gap-3 overflow-hidden shadow-inner relative">
                        {scheduledTasks.some(t => t.executingStatus === 'playing') && (
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-indigo-500 animate-pulse"></div>
                        )}
                        <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest border-b border-indigo-500/20 pb-2">🚀 Em Execução ({scheduledTasks.length})</h5>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                          {scheduledTasks.length === 0 ? (
                            <p className="text-[10px] text-indigo-300/40 italic text-center py-4">Puxe tarefas dos afazeres para cá.</p>
                          ) : (
                            scheduledTasks.map(task => renderTaskCard(task))
                          )}
                        </div>
                      </div>

                      {/* COLUNA 3: CONCLUÍDAS */}
                      <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-3 overflow-hidden shadow-inner">
                        <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest border-b border-emerald-500/20 pb-2">✅ Concluídas ({completedTasks.length})</h5>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                          {completedTasks.length === 0 ? (
                            <p className="text-[10px] text-emerald-600/40 italic text-center py-4">Nenhuma entrega ainda.</p>
                          ) : (
                            completedTasks.map(task => renderTaskCard(task))
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* FORMULÁRIO DE CRIAÇÃO (PADRÃO LINHA DE PRODUÇÃO) */}
              <div className="bg-black/20 border border-white/5 p-4 rounded-xl shadow-inner mt-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  Criar Nova Tarefa
                </h4>
                {/* ATUALIZADO: Proporções do grid ajustadas para dar mais espaço à descrição */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr_1fr_1fr_auto] gap-3 xl:gap-4 w-full">
                    
                    {/* COLUNA 1: Responsável e Peso */}
                    <div className="flex flex-col justify-between gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Delegar Para:</label>
                            <select 
                                value={newChecklistResp} 
                                onChange={e => setNewChecklistResp(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-md p-1.5 text-xs text-white outline-none focus:border-indigo-500 h-8"
                            >
                                <option value="">Sem Resp.</option>
                                {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Peso:</label>
                            <select 
                                value={newTaskWeight} 
                                onChange={e => setNewTaskWeight(e.target.value)} 
                                className="w-full bg-gray-900 border border-gray-700 rounded-md p-1.5 text-xs text-white outline-none focus:border-indigo-500 h-8"
                            >
                                <option value="baixa">🟢 Rápido</option>
                                <option value="media">🟡 Médio</option>
                                <option value="alta">🔴 Demorado</option>
                            </select>
                        </div>
                    </div>

                    {/* COLUNA 2: Descrição da Tarefa (Esticada) */}
                    <div className="flex flex-col gap-1 relative h-full">
                        <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Descrição da Tarefa:</label>
                        <textarea 
                            value={newChecklist} 
                            onChange={handleChecklistChange}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    setShowSuggestions(false);
                                    addChecklist();
                                }
                            }}
                            onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder="O que precisa ser feito nesta loja?"
                            className="w-full h-full min-h-[44px] bg-gray-900 border border-gray-700 rounded-md p-2 text-xs text-white outline-none focus:border-indigo-500 resize-none custom-scrollbar"
                        />
                        {showSuggestions && suggestions.length > 0 && (
                            <ul className="absolute top-full left-0 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden z-50 mt-1">
                                {suggestions.map((sug, idx) => (
                                    <li 
                                        key={idx} 
                                        onMouseDown={(e) => { e.preventDefault(); setNewChecklist(sug); setShowSuggestions(false); }} 
                                        className="px-3 py-2 text-xs text-gray-300 hover:bg-indigo-600 hover:text-white cursor-pointer transition-colors border-b border-gray-700 last:border-0 truncate"
                                    >
                                        {sug}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* COLUNA 3: Prazo e Hora */}
                    <div className="flex flex-col justify-between gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Data limite:</label>
                            <input 
                                type="date" 
                                value={newTaskDate} 
                                onChange={e => setNewTaskDate(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-md p-1.5 text-xs text-white outline-none focus:border-indigo-500 h-8 cursor-pointer"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Hora Limite:</label>
                            <input 
                                type="time" 
                                value={newTaskTime} 
                                onChange={e => setNewTaskTime(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-md p-1.5 text-xs text-white outline-none focus:border-indigo-500 h-8 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* COLUNA 4: Recorrência e Botão Limpar */}
                    <div className="flex flex-col justify-between gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Repetição:</label>
                            <select 
                                value={newTaskRecurrence} 
                                onChange={e => setNewTaskRecurrence(e.target.value)} 
                                className="w-full bg-gray-900 border border-gray-700 rounded-md p-1.5 text-xs text-white outline-none focus:border-indigo-500 h-8 cursor-pointer"
                            >
                                <option value="none">Nenhuma</option>
                                <option value="daily">🔁 Diária</option>
                                <option value="3days">🔁 3 Dias</option>
                                <option value="weekly">🔁 Semanal</option>
                                <option value="15days">🔁 15 Dias</option>
                                <option value="monthly">🔁 Mensal</option>
                                <option value="90days">🔁 90 Dias</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => {setNewTaskDate(''); setNewTaskTime(''); setNewTaskRecurrence('none'); setNewTaskWeight('media');}} 
                            className="h-8 w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-400 rounded-md transition-colors flex items-center justify-center"
                            title="Limpar configurações de prazo e repetição"
                        >
                            <Eraser size={14}/>
                        </button>
                    </div>

                    {/* COLUNA 5: Botão Criar alinhado na altura */}
                    <div className="flex flex-col h-full pt-[14px]">
                        <button 
                            onClick={addChecklist} 
                            disabled={isAddingTask} 
                            className="h-full w-full lg:w-24 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold rounded-md shadow-md transition-colors flex flex-col justify-center items-center gap-1 border border-indigo-500/50"
                        >
                            {isAddingTask ? <Loader2 size={18} className="animate-spin text-indigo-300" /> : <Plus size={18} className="text-indigo-300"/>}
                            Criar
                        </button>
                    </div>
                </div>
              </div>
            </div>

            {/* 2. HISTÓRICO DE AÇÕES */}
            {!isVisitante && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Timeline de Ações</h4>
                
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
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-black/20 flex flex-col shrink-0 md:border-l border-white/5">
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
                  <input 
                    type="text" 
                    value={acessoSenha} 
                    onChange={(e) => setAcessoSenha(e.target.value)} 
                    placeholder="Senha de Acesso"
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl p-2.5 text-xs text-gray-300 outline-none focus:border-blue-500 transition-colors"
                  />
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
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10 shadow-sm shrink-0 flex flex-col max-h-[250px]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2">
                    <Package size={14} /> Catálogo
                  </h4>
                  <button onClick={() => setIsCatalogOpen(true)} className="text-[10px] bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 px-2 py-1 rounded transition-colors">
                    Expandir Tudo
                  </button>
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
                  {clientProducts.map(prod => {
                    const canalAtivo = (prod.canais || []).find(c => c.canal?.toLowerCase() === store.marketplace?.toLowerCase());
                    const melhorOferta = canalAtivo?.ofertas?.[0]; 
                    const precoExibicao = melhorOferta?.precoPor || melhorOferta?.precoDe || prod.precoPor || prod.precoDe || '---';

                    return (
                      <div 
                        key={prod.id} 
                        onClick={() => setIsCatalogOpen(true)}
                        className="w-full shrink-0 bg-black/40 border border-white/5 rounded-xl overflow-hidden flex items-center group hover:border-indigo-500/30 transition-colors cursor-pointer p-2 gap-3"
                      >
                        <div className="h-12 w-12 shrink-0 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
                          {prod.fotoUrl ? (
                            <img src={prod.fotoUrl} alt={prod.descricao} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <Package size={14} className="text-gray-600" />
                          )}
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <p className="text-[10px] font-bold text-gray-300 truncate w-full" title={prod.descricao}>
                            {prod.descricao}
                          </p>
                          <p className="text-[11px] font-black text-emerald-400 mt-0.5">
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
      {isCatalogOpen && (
          <>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] z-[90]" onClick={() => setIsCatalogOpen(false)}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[1200px] h-[80vh] bg-gradient-to-b from-gray-900/98 to-[#0B0F19] backdrop-blur-3xl border border-white/15 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col z-[100] overflow-hidden animate-in zoom-in-95 duration-300">
              
              {/* HEADER GENÉRICO DA GAVETA */}
              <div className="relative h-20 shrink-0 flex items-center justify-between p-6 bg-gray-900 border-b border-white/10">
                 <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Package size={20} className="text-indigo-400"/> Catálogo de Produtos
                 </h3>
                 <button onClick={() => setIsCatalogOpen(false)} className="text-gray-400 hover:text-white p-2 rounded-xl transition-all border border-transparent hover:border-white/10 hover:bg-white/5">
                   <X size={20}/>
                 </button>
              </div>
              
              {/* LISTA ROLÁVEL COM TODOS OS PRODUTOS (CARROSSEL HORIZONTAL) */}
              <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar p-6 flex gap-6 snap-x snap-mandatory items-start">
                {clientProducts.map(produto => (
                  <div key={produto.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 w-[420px] shrink-0 snap-center max-h-full overflow-y-auto custom-scrollbar">
                    
                    {/* CABEÇALHO DO PRODUTO ESPECÍFICO */}
                    <div className="flex gap-4 items-center w-full border-b border-white/5 pb-4">
                      <div className="w-16 h-16 shrink-0 bg-black/80 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shadow-md">
                        {produto.fotoUrl ? (
                          <img src={produto.fotoUrl} alt={produto.descricao} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={24} className="text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-white leading-tight drop-shadow-sm">{produto.descricao}</h4>
                        <div className="flex gap-2 mt-1.5">
                          {produto.custo && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm">
                              Custo Un: R$ {produto.custo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* VARIAÇÕES */}
                    {(produto.variacoes && produto.variacoes.length > 0) && (
                      <div className="bg-black/20 border border-white/5 p-3 rounded-xl">
                        <h5 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Variações Disponíveis</h5>
                        <div className="flex flex-col gap-1.5">
                          {produto.variacoes.map(v => (
                            <div key={v.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <span className="text-[10px] font-bold text-indigo-300 w-16 truncate shrink-0" title={v.cor}>{v.cor || 'Sem cor'}:</span>
                              <div className="flex flex-wrap gap-1 flex-1">
                                {v.tamanhos.map(t => (
                                  <span key={t} className="bg-gray-800 text-gray-300 text-[9px] px-1.5 py-0.5 rounded border border-gray-700">{t}</span>
                                ))}
                                {v.tamanhos.length === 0 && <span className="text-[8px] text-gray-600">Sem tamanhos</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* FILTRO DE CANAIS (Para este produto específico) */}
                    {(() => {
                      const canaisFiltrados = (produto.canais || []).filter(c => 
                        !store.marketplace || c.canal?.toLowerCase() === store.marketplace.toLowerCase()
                      );

                      return (
                        <>
                          <div className="flex items-center justify-between mb-1 mt-2">
                             <div className="flex items-center gap-1.5">
                               <TrendingUp size={12} className="text-indigo-400" />
                               <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                 {store.marketplace ? `Ofertas em ${store.marketplace}` : 'Oportunidades'}
                               </h5>
                             </div>
                             <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-500/20 font-bold">
                               {canaisFiltrados.length} {canaisFiltrados.length === 1 ? 'Ativa' : 'Ativas'}
                             </span>
                          </div>
                          
                          <div className="space-y-3">
                            {canaisFiltrados.length > 0 ? (
                              canaisFiltrados.map((c, i) => (
                                <div key={c.id || i} className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex flex-col gap-3 relative transition-all hover:bg-white/[0.06] hover:border-indigo-500/40">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                                      <div className="flex flex-col">
                                        <span className="text-xs font-black text-white uppercase tracking-wider">{c.canal}</span>
                                        {c.modalidade && <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">{c.modalidade}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {(c.ofertas && c.ofertas.length > 0) && (
                                    <div className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                                       <table className="w-full text-left">
                                         <thead>
                                           <tr className="text-[8px] text-gray-500 uppercase tracking-wider border-b border-white/10">
                                             <th className="pb-1.5 w-12">Pares</th>
                                             <th className="pb-1.5 w-16">P. Cheio</th>
                                             <th className="pb-1.5 w-16 text-emerald-400">Promo</th>
                                             <th className="pb-1.5 w-16 text-orange-400">Spam</th>
                                             <th className="pb-1.5 text-right">Lucro Bruto</th>
                                           </tr>
                                         </thead>
                                         <tbody className="divide-y divide-white/5">
                                           {c.ofertas.map(of => {
                                              const lucro = calcularLucroOferta(of.precoPor || of.precoDe, produto.custo, of.quantidade);
                                              const isNegativo = lucro.valor < 0;

                                              return (
                                                <tr key={of.id}>
                                                   <td className="py-2 text-[10px] font-bold text-gray-300">{of.quantidade}</td>
                                                   <td className="py-2 text-[10px] text-gray-500">R$ {of.precoDe}</td>
                                                   <td className="py-2 text-[10px] font-black text-emerald-400">R$ {of.precoPor || of.precoDe || '0.00'}</td>
                                                   <td className="py-2 text-[10px] font-black text-orange-400">
                                                     {of.spam ? `R$ ${of.spam}` : '-'}
                                                   </td>
                                                   <td className="py-2 text-right flex flex-col items-end">
                                                      <span className={`text-[10px] font-black ${isNegativo ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        {isNegativo ? '' : '+'}R$ {lucro.valor.toFixed(2)}
                                                      </span>
                                                      {produto.custo && (
                                                          <span className={`text-[8px] font-bold ${isNegativo ? 'text-red-500' : 'text-emerald-500/60'}`}>
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
                                    <div className="space-y-1.5 mt-1 border-t border-white/5 pt-2">
                                      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest ml-1">Kits Legados</p>
                                      {(c.kits || []).map((kit, kIdx) => (
                                        <div key={kit.id || kIdx} className="flex justify-between items-center bg-black/30 p-2 rounded-lg border border-white/5">
                                          <div className="flex items-center gap-1.5">
                                            <Package size={10} className="text-indigo-400"/>
                                            <span className="text-[9px] font-bold text-indigo-100 uppercase tracking-wide truncate max-w-[120px]">
                                              {kit.descricao || 'Kit'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            {kit.precoDe && <span className="text-[8px] text-gray-600 line-through font-bold">R$ {kit.precoDe}</span>}
                                            <span className="text-[10px] font-black text-indigo-300">R$ {kit.precoPor || '0.00'}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-center p-4 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                  <p className="text-[10px] text-gray-500">Nenhuma oferta cadastrada para o canal <strong className="text-indigo-400">{store.marketplace || 'desta loja'}</strong>.</p>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* OBSERVAÇÕES */}
                    {produto.observacoes && (
                       <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-indigo-400">
                            <FileText size={12} className="shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Observações da Gestão</span>
                          </div>
                          <p className="text-[11px] text-indigo-100/70 leading-relaxed whitespace-pre-wrap">
                            {produto.observacoes}
                          </p>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
    </div>
  );
}

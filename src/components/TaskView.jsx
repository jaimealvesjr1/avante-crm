import React, { useMemo, useState } from 'react';
import { CalendarDays, AlertCircle, Clock, CheckCircle2, MoreHorizontal, Bell, CopyPlus, Check, CalendarClock, Briefcase, Plus, Trash2, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TaskView({ 
  stores, clientTasks = [], onToggleClientTask, onDeleteClientTask, onSaveClientTask, clients = [],
  openTaskModal, openBulkTaskModal, currentUserData, user, updateStoreInCloud, setStores, openClientFile, teamMembers 
}) {
  const myName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || '';
  const [menuOpenId, setMenuOpenId] = useState(null);

  const [showNewClientTask, setShowNewClientTask] = useState(false);
  const [cTaskText, setCTaskText] = useState('');
  const [cTaskClient, setCTaskClient] = useState('');
  const [cTaskResp, setCTaskResp] = useState('');
  const [cTaskDate, setCTaskDate] = useState('');

  const teamNames = teamMembers?.map(m => m.nomeCompleto || m.nome || m.email.split('@')[0]).filter(Boolean) || [];

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    if (!name) return 'from-gray-600 to-gray-700';
    const colors = ['from-indigo-500 to-purple-600', 'from-blue-500 to-cyan-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-orange-600', 'from-pink-500 to-rose-600', 'from-amber-500 to-orange-500'];
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

  const handleCreateClientTask = (e) => {
    e.preventDefault();
    if (!cTaskText.trim() || !cTaskClient) return toast.error("Preencha a descrição e selecione o cliente.");
    onSaveClientTask({ texto: cTaskText, client: cTaskClient, responsavel: cTaskResp, data: cTaskDate });
    setCTaskText(''); setCTaskClient(''); setCTaskResp(''); setCTaskDate('');
    setShowNewClientTask(false);
  };

  const groupedInbox = useMemo(() => {
    if (!myName) return [];
    const groups = {};
    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().substring(0, 5);

    stores.forEach(store => {
      const notificationReasons = [];

      const delegatedTasksCount = store.checklists?.filter(c => {
        if (c.feita) return false;
        const isAssignedToMe = c.responsavel === myName;
        const isOrphanAndIAmManager = (!c.responsavel || c.responsavel.trim() === '') && store.responsavel === myName;
        if (!isAssignedToMe && !isOrphanAndIAmManager) return false;
        if (!c.data) return true;
        if (c.data < todayStr) return true;
        if (c.data === todayStr) return !c.hora || c.hora <= currentTimeStr;
        return false;
      }).length || 0;

      if (delegatedTasksCount > 0) notificationReasons.push(`${delegatedTasksCount} tarefa(s) pendente(s)`);

      if (store.responsavel === myName && store.taskLogs && store.taskLogs.length > 0) {
        const lastLog = store.taskLogs[store.taskLogs.length - 1];
        if (lastLog.author !== myName) notificationReasons.push(`Ação de ${lastLog.author}`);
      }

      if (notificationReasons.length > 0) {
        if (!groups[store.client]) groups[store.client] = { clientName: store.client, stores: [], lastAccess: store.dataUltimoAcesso || 0 };
        groups[store.client].stores.push({ ...store, highlightMessages: notificationReasons });
        const currentStoreAccess = new Date(store.dataUltimoAcesso || 0);
        const groupOldestAccess = new Date(groups[store.client].lastAccess);
        if (currentStoreAccess < groupOldestAccess) groups[store.client].lastAccess = store.dataUltimoAcesso;
      }
    });
    return Object.values(groups).sort((a, b) => new Date(a.lastAccess || 0) - new Date(b.lastAccess || 0));
  }, [stores, myName]);

  // Filtra e organiza as colunas Kanban das lojas tradicionais
  const groupedTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const groups = { atrasadas: [], hoje: [], semData: [], futuro: [] };

    stores.forEach(store => {
      if (!store.dataProximoAcesso) {
        groups.semData.push(store);
      } else {
        const storeDateOnly = store.dataProximoAcesso.split('T')[0];
        if (storeDateOnly < today) groups.atrasadas.push(store);
        else if (storeDateOnly === today) groups.hoje.push(store);
        else groups.futuro.push(store);
      }
    });

    groups.semData.sort((a, b) => new Date(a.dataUltimoAcesso || 0) - new Date(b.dataUltimoAcesso || 0));
    groups.atrasadas.sort((a, b) => new Date(a.dataProximoAcesso) - new Date(b.dataProximoAcesso));
    groups.futuro.sort((a, b) => new Date(a.dataProximoAcesso) - new Date(b.dataProximoAcesso));

    return groups;
  }, [stores]);

  // Filtra as Tarefas de Cliente Pendentes para a visão geral
  const pendingClientTasks = useMemo(() => {
    return clientTasks.filter(t => !t.feita).sort((a,b) => (a.data || '9999') > (b.data || '9999') ? 1 : -1);
  }, [clientTasks]);

  const handleQuickAction = (e, store, action) => {
    e.stopPropagation();
    setMenuOpenId(null);
    let updatedStore = { ...store };
    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    if (action === 'accessed') {
      updatedStore.dataUltimoAcesso = now.toISOString();
      updatedStore.dataProximoAcesso = todayStr; 
      toast.success("Acesso registrado e pendência limpa!");
    } else if (action === 'delay') {
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      updatedStore.dataProximoAcesso = tomorrow.toISOString().split('T')[0];
      toast.success("Adiado para amanhã!");
    }
    updateStoreInCloud(updatedStore);
    setStores(prev => prev.map(s => s.id === store.id ? updatedStore : s));
  };

  const TaskCard = ({ store, isHighlighted = false, highlightMessages = [] }) => {
    const tasksDone = store.checklists?.filter(c => c.feita).length || 0;
    const tasksTotal = store.checklists?.length || 0;
    const progress = tasksTotal === 0 ? 0 : (tasksDone / tasksTotal) * 100;

    return (
      <div onClick={() => openTaskModal(store)} className={`p-4 rounded-2xl shadow-sm cursor-pointer transition-all duration-300 group relative backdrop-blur-md ${isHighlighted ? 'bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10'}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h4 className={`font-bold text-sm ${isHighlighted ? 'text-indigo-100' : 'text-gray-200'} flex items-center gap-2 truncate`}>{store.store}</h4>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5 truncate">{store.client} {store.marketplace && `• ${store.marketplace}`}</p>
          </div>
          <div className="relative ml-2 shrink-0 flex items-center gap-2">
            {store.responsavel && <Avatar name={store.responsavel} size="sm" />}
            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === store.id ? null : store.id); }} className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"><MoreHorizontal size={16} /></button>
            {menuOpenId === store.id && (
              <div className="absolute right-0 top-6 mt-1 w-44 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-100">
                <button onClick={(e) => handleQuickAction(e, store, 'accessed')} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors"><Check size={14} className="text-emerald-500" /> Marcar Acesso</button>
                <button onClick={(e) => handleQuickAction(e, store, 'delay')} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors border-t border-white/5"><CalendarClock size={14} className="text-amber-500" /> Adiar P/ Amanhã</button>
              </div>
            )}
          </div>
        </div>
        {isHighlighted && highlightMessages.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-3">
            {highlightMessages.map((msg, index) => (
              <div key={index} className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 border border-indigo-500/30"><Bell size={10} className={index === 0 ? "animate-pulse" : ""} /> {msg}</div>
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-1.5 group/progress relative"><CheckCircle2 size={12} className={progress === 100 ? "text-emerald-500" : "text-gray-500"} /> <span>{tasksDone}/{tasksTotal} Tarefas</span></div>
          <span>Últ. Acesso: {store.dataUltimoAcesso ? new Date(store.dataUltimoAcesso).toLocaleDateString('pt-BR') : 'Nunca'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-300" onClick={() => setMenuOpenId(null)}>
      
      {/* CABEÇALHO PADRONIZADO GLASS */}
      <div className="bg-white/[0.02] backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
            <CalendarDays className="text-indigo-400" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Gestão de Workflow</h2>
            <p className="text-gray-400 text-xs mt-0.5">Organize seu dia, checklists e retornos agendados.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={openBulkTaskModal} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm">
            <CopyPlus size={18} /> Tarefa em Massa
          </button>
        </div>
      </div>

      {/* BLOCO CENTRALIZADO DE TAREFAS DE CLIENTES */}
      {pendingClientTasks.length > 0 && (
        <div className="mb-6 bg-emerald-500/5 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="text-emerald-400" size={18} />
            <h3 className="text-base font-bold text-white tracking-wide">Pendências Corporativas (Clientes)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingClientTasks.map(task => (
              <div key={task.id} className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl flex items-start justify-between gap-3 shadow-sm hover:border-emerald-500/30 transition-all">
                <div className="flex items-start gap-3 flex-1">
                  <input type="checkbox" checked={task.feita} onChange={() => onToggleClientTask(task.id, task.feita)} className="w-4 h-4 mt-0.5 rounded border-white/20 bg-black/40 text-emerald-500 cursor-pointer" />
                  <div>
                    <p className="text-xs text-gray-200 font-medium leading-relaxed">{task.texto}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span onClick={() => openClientFile(task.client)} className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded cursor-pointer uppercase tracking-wider">{task.client}</span>
                      {task.data && <span className="text-[9px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-medium">📅 {task.data.split('-').reverse().join('/')}</span>}
                      {task.responsavel && <span className="text-[9px] text-gray-400 bg-white/5 px-2 py-0.5 rounded">👤 {task.responsavel}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => onDeleteClientTask(task.id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-start">
        <div className="bg-red-500/5 backdrop-blur-sm p-4 rounded-2xl border border-red-500/10 flex flex-col gap-3 min-h-[400px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5"><AlertCircle size={14} /> Atrasadas</h3>
            <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupedTasks.atrasadas.length}</span>
          </div>
          {groupedTasks.atrasadas.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
        <div className="bg-blue-500/5 backdrop-blur-sm p-4 rounded-2xl border border-blue-500/10 flex flex-col gap-3 min-h-[400px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5"><Clock size={14} /> Para Hoje</h3>
            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupedTasks.hoje.length}</span>
          </div>
          {groupedTasks.hoje.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
        <div className="bg-white/[0.02] backdrop-blur-sm p-4 rounded-2xl border border-white/5 flex flex-col gap-3 min-h-[400px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><CalendarDays size={14} /> Agendadas</h3>
            <span className="bg-white/10 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupedTasks.futuro.length}</span>
          </div>
          {groupedTasks.futuro.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
        <div className="bg-white/[0.01] backdrop-blur-sm p-4 rounded-2xl border border-white/[0.03] flex flex-col gap-3 min-h-[400px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5" title="Sem agendamento futuro"><CalendarClock size={14} /> Ociosas</h3>
            <span className="bg-white/5 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{groupedTasks.semData.length}</span>
          </div>
          {groupedTasks.semData.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
      </div>
    </div>
  );
}

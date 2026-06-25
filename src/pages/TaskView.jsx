import React, { useMemo, useState } from 'react';
import { CalendarDays, AlertCircle, Clock, CheckCircle2, MoreHorizontal, Bell, CopyPlus, Check, CalendarClock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TaskView({ stores, openTaskModal, openBulkTaskModal, currentUserData, user, updateStoreInCloud, setStores, sendGlobalNotification }) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [animatingTasks, setAnimatingTasks] = useState([]); 
  const isManager = currentUserData?.role === 'Admin' || currentUserData?.role === 'admin' || currentUserData?.role === 'manager';

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
      
      if (sendGlobalNotification) {
         sendGlobalNotification(`Limpou as pendências diárias da loja ${store.store}.`, 'success');
      }
      
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
          {isManager && (
              <div className="relative ml-2 shrink-0 flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === store.id ? null : store.id); }} className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"><MoreHorizontal size={16} /></button>
                {menuOpenId === store.id && (
                  <div className="absolute right-0 top-6 mt-1 w-44 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-100">
                    <button onClick={(e) => handleQuickAction(e, store, 'accessed')} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors"><Check size={14} className="text-emerald-500" /> Marcar Acesso</button>
                    <button onClick={(e) => handleQuickAction(e, store, 'delay')} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors border-t border-white/5"><CalendarClock size={14} className="text-amber-500" /> Adiar P/ Amanhã</button>
                  </div>
                )}
              </div>
          )}
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
      
      <div className="flex justify-end mb-4">
        <button onClick={openBulkTaskModal} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm">
          <CopyPlus size={18} /> Tarefa em Massa
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-start">
        <div className="bg-red-500/5 backdrop-blur-sm p-4 rounded-2xl border border-red-500/10 flex flex-col gap-3 min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2"><AlertCircle size={16} /> Atrasadas</h3>
            <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2.5 py-0.5 rounded-full">{groupedTasks.atrasadas.length}</span>
          </div>
          {groupedTasks.atrasadas.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
        <div className="bg-blue-500/5 backdrop-blur-sm p-4 rounded-2xl border border-blue-500/10 flex flex-col gap-3 min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2"><Clock size={16} /> Para Hoje</h3>
            <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2.5 py-0.5 rounded-full">{groupedTasks.hoje.length}</span>
          </div>
          {groupedTasks.hoje.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
        <div className="bg-white/[0.02] backdrop-blur-sm p-4 rounded-2xl border border-white/5 flex flex-col gap-3 min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><CalendarDays size={16} /> Agendadas</h3>
            <span className="bg-white/10 text-gray-400 text-xs font-bold px-2.5 py-0.5 rounded-full">{groupedTasks.futuro.length}</span>
          </div>
          {groupedTasks.futuro.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
        <div className="bg-white/[0.01] backdrop-blur-sm p-4 rounded-2xl border border-white/[0.03] flex flex-col gap-3 min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2" title="Sem agendamento futuro"><CalendarClock size={16} /> Ociosas</h3>
            <span className="bg-white/5 text-gray-500 text-xs font-bold px-2.5 py-0.5 rounded-full">{groupedTasks.semData.length}</span>
          </div>
          {groupedTasks.semData.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
      </div>
    </div>
  );
}

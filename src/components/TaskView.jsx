import React, { useMemo, useState } from 'react';
import { CalendarDays, AlertCircle, Clock, CheckCircle2, MoreHorizontal, Filter, User, Bell, CopyPlus, Check, CalendarClock, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TaskView({ stores, openTaskModal, openBulkTaskModal, currentUserData, user, updateStoreInCloud, setStores, openClientFile }) {
  const [clientFilter, setClientFilter] = useState('');
  const [storeRespFilter, setStoreRespFilter] = useState('');
  const [taskRespFilter, setTaskRespFilter] = useState('');
  const [mktFilter, setMktFilter] = useState('');

  const myName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || '';

  const clients = [...new Set(stores.map(s => s.client))].filter(Boolean).sort();
  const storeResps = [...new Set(stores.map(s => s.responsavel))].filter(Boolean).sort();
  const taskResps = [...new Set(stores.flatMap(s => (s.checklists || []).map(c => c.responsavel)))].filter(Boolean).sort();
  const mkts = [...new Set(stores.map(s => s.marketplace))].filter(Boolean).sort();
  const [menuOpenId, setMenuOpenId] = useState(null);

  // --- PAINEL DE NOTIFICAÇÕES (CAIXA DE ENTRADA AGRUPADA POR CLIENTE) ---
  const groupedInbox = useMemo(() => {
    if (!myName) return [];

    const groups = {};
    
    // Pegar a data e hora exatas de agora no fuso correto
    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().substring(0, 5); // Fica no formato "HH:MM"

    stores.forEach(store => {
      const notificationReasons = [];

      // Regra 1: Tarefas delegadas (AGORA COM INTELIGÊNCIA DE TEMPO)
      const delegatedTasksCount = store.checklists?.filter(c => {
        if (c.feita || c.responsavel !== myName) return false;
        
        // Se não tem data, alerta sempre
        if (!c.data) return true;

        // Se a data é no passado, alerta sempre (atrasada)
        if (c.data < todayStr) return true;

        // Se a data é hoje, checa a hora
        if (c.data === todayStr) {
          if (!c.hora) return true; // Se não tem hora marcada, avisa o dia todo
          return c.hora <= currentTimeStr; // Só avisa se a hora já chegou ou passou
        }

        // Se é no futuro (amanhã em diante), NÃO alerta na caixa de entrada
        return false;
      }).length || 0;

      if (delegatedTasksCount > 0) {
        notificationReasons.push(`${delegatedTasksCount} tarefa(s) no prazo ou atrasada(s)`);
      }

      // Regra 2: Atualizado por outra pessoa
      if (store.responsavel === myName && store.taskLogs && store.taskLogs.length > 0) {
        const lastLog = store.taskLogs[store.taskLogs.length - 1];
        if (lastLog.author !== myName) {
          notificationReasons.push(`Atualizado por ${lastLog.author}`);
        }
      }

      // Se a loja tiver pelo menos um motivo, agrupamos dentro do Cliente dela
      if (notificationReasons.length > 0) {
        if (!groups[store.client]) {
          groups[store.client] = {
            clientName: store.client,
            stores: [],
            lastAccess: store.dataUltimoAcesso || 0
          };
        }
        
        groups[store.client].stores.push({
          ...store,
          highlightMessages: notificationReasons
        });

        const currentStoreAccess = new Date(store.dataUltimoAcesso || 0);
        const groupOldestAccess = new Date(groups[store.client].lastAccess);
        if (currentStoreAccess < groupOldestAccess) {
            groups[store.client].lastAccess = store.dataUltimoAcesso;
        }
      }
    });

    return Object.values(groups).sort((a, b) => new Date(a.lastAccess || 0) - new Date(b.lastAccess || 0));
  }, [stores, myName]);

  const groupedTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const groups = { atrasadas: [], hoje: [], semData: [], futuro: [] };

    stores.forEach(store => {
      // Aplicar Filtros (agora com segurança para maiúsculas e minúsculas)
      if (clientFilter && store.client !== clientFilter) return;
      if (storeRespFilter && store.responsavel !== storeRespFilter) return;
      
      // Filtro de Marketplace Corrigido
      if (mktFilter) {
        if (!store.marketplace || store.marketplace.toUpperCase() !== mktFilter.toUpperCase()) {
          return;
        }
      }

      if (taskRespFilter) {
        const hasAssignedTask = store.checklists?.some(c => c.responsavel === taskRespFilter);
        if (!hasAssignedTask) return;
      }

      // Agrupamento por Data
      if (!store.dataProximoAcesso) {
        groups.semData.push(store);
      } else {
        const storeDateOnly = store.dataProximoAcesso.split('T')[0];
        
        if (storeDateOnly < today) {
          groups.atrasadas.push(store);
        } else if (storeDateOnly === today) {
          groups.hoje.push(store);
        } else {
          groups.futuro.push(store);
        }
      }
    });

    // Ordenação
    groups.semData.sort((a, b) => new Date(a.dataUltimoAcesso || 0) - new Date(b.dataUltimoAcesso || 0));
    groups.atrasadas.sort((a, b) => new Date(a.dataProximoAcesso) - new Date(b.dataProximoAcesso));
    groups.futuro.sort((a, b) => new Date(a.dataProximoAcesso) - new Date(b.dataProximoAcesso));

    return groups;
  }, [stores, clientFilter, storeRespFilter, taskRespFilter, mktFilter]);

  const TaskCard = ({ store, isHighlighted = false, highlightMessages = [] }) => (
    <div 
      onClick={() => openTaskModal(store)}
      className={`p-4 rounded-xl shadow-sm cursor-pointer transition-all group relative ${
        isHighlighted 
        ? 'bg-indigo-900/40 border-2 border-indigo-500 hover:bg-indigo-900/60' 
        : 'bg-gray-800 border border-gray-700 hover:bg-gray-750 hover:border-blue-500/50'
      }`}
    >
      {/* CABEÇALHO DO CARD */}
      <div className="flex justify-between items-start mb-1">
        <h4 className={`font-bold text-sm ${isHighlighted ? 'text-indigo-100' : 'text-gray-200'} flex items-center gap-1`}>
          {store.store}
          {store.marketplace && (
            <span className="text-[10px] text-gray-500 font-normal">({store.marketplace})</span>
          )}
        </h4>

        {/* 2. MENU DE 3 PONTOS COM AÇÕES RÁPIDAS */}
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === store.id ? null : store.id); }}
            className="p-1 hover:bg-gray-700 rounded text-gray-500 hover:text-blue-400 transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpenId === store.id && (
            <div className="absolute right-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in zoom-in-95 duration-100">
              <button 
                onClick={(e) => handleQuickAction(e, store, 'accessed')}
                className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-2"
              >
                <Check size={14} className="text-green-500" /> Marcar Acesso Hoje
              </button>
              <button 
                onClick={(e) => handleQuickAction(e, store, 'delay')}
                className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-2"
              >
                <CalendarClock size={14} className="text-amber-500" /> Adiar para Amanhã
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* CADA NOTIFICAÇÃO EM SUA PRÓPRIA DIV */}
      {isHighlighted && highlightMessages.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {highlightMessages.map((msg, index) => (
            <div 
              key={index} 
              className="bg-indigo-500/30 text-indigo-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 border border-indigo-500/40 shadow-sm"
            >
              <Bell size={12} className={index === 0 ? "animate-pulse text-indigo-300" : "text-indigo-400"} />
              {msg}
            </div>
          ))}
        </div>
      )}

      {!isHighlighted && store.responsavel && (
        <div className="inline-flex items-center gap-1 bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-[10px] font-bold mb-2">
          <User size={10} /> {store.responsavel}
        </div>
      )}
      
      <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-700/50 pt-2 mt-2">
        <span className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-green-500/70" /> 
          {store.checklists?.filter(c => c.feita).length || 0}/{store.checklists?.length || 0} Tarefas
        </span>
        <span>Últ. Acesso: {store.dataUltimoAcesso ? new Date(store.dataUltimoAcesso).toLocaleDateString('pt-BR') : 'Nunca'}</span>
      </div>
    </div>
  );

  const handleQuickAction = (e, store, action) => {
    e.stopPropagation();
    setMenuOpenId(null);

    let updatedStore = { ...store };
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (action === 'accessed') {
      // 1. Registra que você acessou agora
      updatedStore.dataUltimoAcesso = now.toISOString();
      
      // 2. Se a loja estava atrasada ou agendada para hoje, 
      // limpamos o agendamento para ela ir para "Sem Data" (concluída)
      // ou você pode mudar para updatedStore.dataProximoAcesso = todayStr se quiser que ela fique na coluna "Hoje"
      updatedStore.dataProximoAcesso = todayStr; 
      
      toast.success("Acesso registrado e pendência limpa!");
    } else if (action === 'delay') {
      // Adia o agendamento para amanhã
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      updatedStore.dataProximoAcesso = tomorrow.toISOString().split('T')[0];
      
      toast.success("Adiado para amanhã!");
    }

    // Salva no Firebase e atualiza a tela
    updateStoreInCloud(updatedStore);
    setStores(prev => prev.map(s => s.id === store.id ? updatedStore : s));
  };

  return (
    <div className="animate-in fade-in duration-300" onClick={() => setMenuOpenId(null)}>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="text-indigo-500" /> Gestão de Contas
          </h2>
          <p className="text-gray-400 text-sm mt-1">Gerencie checklists, responsáveis e agendamentos das contas.</p>
        </div>
        
        <button 
          onClick={openBulkTaskModal} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all"
        >
          <CopyPlus size={18} /> Criar Tarefa em Massa
        </button>
      </div>

      {/* CAIXA DE ENTRADA AGRUPADA (FICHA DO CLIENTE) */}
      {groupedInbox.length > 0 && (
        <div className="mb-8 bg-gray-900 border border-indigo-500/50 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Bell className="text-indigo-400" /> Minhas Notificações ({groupedInbox.length} Clientes)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {groupedInbox.map(group => (
              <div key={group.clientName} className="bg-gray-800 border border-indigo-500/30 rounded-xl p-4 flex flex-col shadow-sm relative overflow-hidden">
                {/* Linha de destaque superior no card do cliente */}
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/30"></div>
                
                {/* Cabeçalho do Cliente (A mini "Ficha") */}
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                  <h4 
                    onClick={() => openClientFile(group.clientName)}
                    className="font-bold text-indigo-100 text-base cursor-pointer hover:text-white hover:underline decoration-indigo-400 underline-offset-4 transition-all"
                    title="Ver Ficha Completa"
                  >
                    {group.clientName}
                  </h4>
                  <span className="bg-indigo-900/50 text-indigo-300 text-[10px] px-2 py-1 rounded font-bold uppercase border border-indigo-500/30">
                    {group.stores.length} Loja(s) com alerta
                  </span>
                </div>
                
                {/* Lojas com Notificações */}
                <div className="flex flex-col gap-3">
                  {group.stores.map(store => (
                    <TaskCard 
                      key={`inbox-${store.id}`} 
                      store={store} 
                      isHighlighted={true} 
                      highlightMessages={store.highlightMessages} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="flex flex-wrap items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6 shadow-sm">
        <div className="flex items-center gap-2 text-gray-400 mr-2">
          <Filter size={18} /> <span className="text-sm font-bold uppercase">Filtros:</span>
        </div>
        <div className="flex-1 min-w-[150px]">
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500">
            <option value="">🏢 Todos os Clientes</option>
            {clients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <select value={storeRespFilter} onChange={e => setStoreRespFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500">
            <option value="">👤 Qualquer Resp. (Loja)</option>
            {storeResps.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <select value={taskRespFilter} onChange={e => setTaskRespFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500">
            <option value="">📋 Qualquer Resp. (Tarefa)</option>
            {taskResps.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <select value={mktFilter} onChange={e => setMktFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500">
            <option value="">🛍️ Todos os Marketplaces</option>
            {mkts.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        <div className="bg-red-900/10 p-3 rounded-xl border border-red-900/30 flex flex-col gap-3 min-h-[500px]">
          <h3 className="text-xs font-bold text-red-400 uppercase flex items-center gap-1 mb-2"><AlertCircle size={14} /> Atrasadas ({groupedTasks.atrasadas.length})</h3>
          {groupedTasks.atrasadas.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
        <div className="bg-blue-900/10 p-3 rounded-xl border border-blue-900/30 flex flex-col gap-3 min-h-[500px]">
          <h3 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1 mb-2"><Clock size={14} /> Para Hoje ({groupedTasks.hoje.length})</h3>
          {groupedTasks.hoje.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700 flex flex-col gap-3 min-h-[500px]">
          <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-2" title="Ordenadas da mais esquecida para a mais recente"><CalendarDays size={14} /> Sem Data / Ociosas ({groupedTasks.semData.length})</h3>
          {groupedTasks.semData.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
        <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-700/50 flex flex-col gap-3 min-h-[500px]">
          <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-2"><CalendarDays size={14} /> Agendadas ({groupedTasks.futuro.length})</h3>
          {groupedTasks.futuro.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
      </div>
    </div>
  );
}

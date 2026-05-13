import React, { useMemo, useState } from 'react';
import { CalendarDays, AlertCircle, Clock, CheckCircle2, MoreHorizontal, Filter, User } from 'lucide-react';

export default function TaskView({ stores, openTaskModal }) {
  // Estados dos Filtros
  const [clientFilter, setClientFilter] = useState('');
  const [storeRespFilter, setStoreRespFilter] = useState('');
  const [taskRespFilter, setTaskRespFilter] = useState('');

  // Extrair listas únicas para preencher os selects (Dropdowns)
  const clients = [...new Set(stores.map(s => s.client))].filter(Boolean).sort();
  const storeResps = [...new Set(stores.map(s => s.responsavel))].filter(Boolean).sort();
  const taskResps = [...new Set(stores.flatMap(s => (s.checklists || []).map(c => c.responsavel)))].filter(Boolean).sort();

  const groupedTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const groups = { atrasadas: [], hoje: [], semData: [], futuro: [] };

    stores.forEach(store => {
      // Aplicar Filtros
      if (clientFilter && store.client !== clientFilter) return;
      if (storeRespFilter && store.responsavel !== storeRespFilter) return;
      if (taskRespFilter) {
        const hasAssignedTask = store.checklists?.some(c => c.responsavel === taskRespFilter);
        if (!hasAssignedTask) return;
      }

      // Agrupamento por Data
      if (!store.dataProximoAcesso) {
        groups.semData.push(store);
      } else if (store.dataProximoAcesso < today) {
        groups.atrasadas.push(store);
      } else if (store.dataProximoAcesso === today) {
        groups.hoje.push(store);
      } else {
        groups.futuro.push(store);
      }
    });

    // Ordenação
    groups.semData.sort((a, b) => new Date(a.dataUltimoAcesso || 0) - new Date(b.dataUltimoAcesso || 0));
    groups.atrasadas.sort((a, b) => new Date(a.dataProximoAcesso) - new Date(b.dataProximoAcesso));
    groups.futuro.sort((a, b) => new Date(a.dataProximoAcesso) - new Date(b.dataProximoAcesso));

    return groups;
  }, [stores, clientFilter, storeRespFilter, taskRespFilter]);

  const TaskCard = ({ store }) => (
    <div 
      onClick={() => openTaskModal(store)}
      className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm cursor-pointer hover:bg-gray-750 hover:border-blue-500/50 transition-all group"
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-bold text-gray-200 text-sm">{store.client}</h4>
        <MoreHorizontal size={16} className="text-gray-500 group-hover:text-blue-400" />
      </div>
      <p className="text-xs text-gray-400 mb-2">{store.store}</p>
      
      {/* Exibe o responsável da loja, se houver */}
      {store.responsavel && (
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

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="text-indigo-500" /> Gestão de Contas (Workflow)
          </h2>
          <p className="text-gray-400 text-sm mt-1">Gerencie checklists, responsáveis e agendamentos das contas.</p>
        </div>
      </div>

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

import React, { useMemo } from 'react';
import { CalendarDays, AlertCircle, Clock, CheckCircle2, MoreHorizontal } from 'lucide-react';

export default function TaskView({ stores, openTaskModal }) {
  const groupedTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const groups = { atrasadas: [], hoje: [], semData: [], futuro: [] };

    stores.forEach(store => {
      // Se não for do TikTok ou se quiser filtrar por usuário, a lógica entraria aqui futuramente
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

    // ORDENAÇÃO: Lojas sem data ordenadas da que tem o ACESSO MAIS ANTIGO para o mais recente
    groups.semData.sort((a, b) => new Date(a.dataUltimoAcesso || 0) - new Date(b.dataUltimoAcesso || 0));
    groups.atrasadas.sort((a, b) => new Date(a.dataProximoAcesso) - new Date(b.dataProximoAcesso));
    groups.futuro.sort((a, b) => new Date(a.dataProximoAcesso) - new Date(b.dataProximoAcesso));

    return groups;
  }, [stores]);

  const TaskCard = ({ store }) => (
    <div 
      onClick={() => openTaskModal(store)}
      className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm cursor-pointer hover:bg-gray-750 hover:border-blue-500/50 transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-gray-200 text-sm">{store.client}</h4>
        <MoreHorizontal size={16} className="text-gray-500 group-hover:text-blue-400" />
      </div>
      <p className="text-xs text-gray-400 mb-3">{store.store}</p>
      
      <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-700/50 pt-2 mt-2">
        <span className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-green-500/70" /> 
          {store.checklists?.filter(c => c.feita).length || 0}/{store.checklists?.length || 0} Tarefas
        </span>
        <span>
          Últ. Acesso: {store.dataUltimoAcesso ? new Date(store.dataUltimoAcesso).toLocaleDateString('pt-BR') : 'Nunca'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarDays className="text-indigo-500" /> Gestão de Contas (Workflow)
        </h2>
        <p className="text-gray-400 text-sm mt-1">Gerencie checklists, logins e agendamentos das contas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {/* COLUNA: ATRASADAS */}
        <div className="bg-red-900/10 p-3 rounded-xl border border-red-900/30 flex flex-col gap-3 min-h-[500px]">
          <h3 className="text-xs font-bold text-red-400 uppercase flex items-center gap-1 mb-2">
            <AlertCircle size={14} /> Atrasadas ({groupedTasks.atrasadas.length})
          </h3>
          {groupedTasks.atrasadas.map(s => <TaskCard key={s.id} store={s} />)}
        </div>

        {/* COLUNA: HOJE */}
        <div className="bg-blue-900/10 p-3 rounded-xl border border-blue-900/30 flex flex-col gap-3 min-h-[500px]">
          <h3 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1 mb-2">
            <Clock size={14} /> Para Hoje ({groupedTasks.hoje.length})
          </h3>
          {groupedTasks.hoje.map(s => <TaskCard key={s.id} store={s} />)}
        </div>

        {/* COLUNA: SEM DATA (A SUA REGRA DE OURO) */}
        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700 flex flex-col gap-3 min-h-[500px]">
          <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-2" title="Ordenadas da mais esquecida para a mais recente">
            <CalendarDays size={14} /> Sem Data / Ociosas ({groupedTasks.semData.length})
          </h3>
          {groupedTasks.semData.map(s => <TaskCard key={s.id} store={s} />)}
        </div>

        {/* COLUNA: FUTURO */}
        <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-700/50 flex flex-col gap-3 min-h-[500px]">
          <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-2">
            <CalendarDays size={14} /> Agendadas ({groupedTasks.futuro.length})
          </h3>
          {groupedTasks.futuro.map(s => <TaskCard key={s.id} store={s} />)}
        </div>
      </div>
    </div>
  );
}

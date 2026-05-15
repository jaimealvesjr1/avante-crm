import React from 'react';
import { X, TrendingUp, ShoppingCart, Bell, ClipboardList, History } from 'lucide-react';

export default function ClientFileModal({ clientGroup, onClose, openTaskModal, formatCurrency }) {
  if (!clientGroup) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* CABEÇALHO */}
        <div className="p-6 border-b border-gray-800 bg-gray-950 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">{clientGroup.client}</h2>
              <span className="bg-blue-900/40 text-blue-400 text-xs px-2 py-1 rounded border border-blue-800">
                {clientGroup.feeType === 'fixed' ? `Fixo: ${formatCurrency(clientGroup.fixedFee)}` : `Fee: ${clientGroup.feePercent}%`}
              </span>
            </div>
            <p className="text-gray-500 text-sm italic">Visão consolidada de todas as operações deste cliente.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* 1. KPIs CONSOLIDADOS (3 COLUNAS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Faturamento Total</span>
              <p className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(clientGroup.totalCurrentRevenue)}</p>
              <p className="text-[10px] text-gray-500 mt-1">Meta: {formatCurrency(clientGroup.totalGmvTarget)}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Investimento Ads</span>
              <p className="text-xl font-bold text-amber-500 mt-1">{formatCurrency(clientGroup.totalAds)}</p>
              <p className="text-[10px] text-gray-500 mt-1">ROAS Médio: {clientGroup.roas}x</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pacing de Metas</span>
              <p className={`text-xl font-bold mt-1 ${clientGroup.percentReached >= 95 ? 'text-green-500' : 'text-red-500'}`}>
                {clientGroup.percentReached.toFixed(1)}%
              </p>
              <div className="w-full bg-gray-900 h-1.5 rounded-full mt-2 overflow-hidden border border-gray-800">
                <div className="bg-blue-500 h-full rounded-full transition-all" style={{width: `${Math.min(clientGroup.percentReached, 100)}%`}}></div>
              </div>
            </div>
          </div>

          {/* 2. DADOS OPERACIONAIS (AGORA EM 3 COLUNAS) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUNA 1: LOJAS ATIVAS */}
            <div className="flex flex-col bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider pb-2 border-b border-gray-700">
                <ShoppingCart size={16} className="text-blue-400" /> Lojas Ativas
              </h3>
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">
                {clientGroup.stores.map(store => (
                  <div key={store.id} onClick={() => { onClose(); openTaskModal(store); }} className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-gray-200 group-hover:text-blue-300 transition-colors">{store.store}</p>
                      <p className="text-[10px] font-bold text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded">{formatCurrency(store.currentRevenue)}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">{store.marketplace || 'Marketplace'}</p>
                      <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Tier {store.tier}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUNA 2: TAREFAS PENDENTES */}
            <div className="flex flex-col bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider pb-2 border-b border-gray-700">
                <ClipboardList size={16} className="text-indigo-400" /> Pendências
              </h3>
              <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">
                {clientGroup.stores.flatMap(s => (s.checklists || []).map(t => ({...t, storeName: s.store}))).filter(t => !t.feita).map(task => (
                  <div key={task.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-xs text-gray-300 flex items-start gap-3 shadow-sm hover:border-indigo-500/50 transition-colors">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-200 leading-snug">{task.texto}</p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-700/50">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold truncate max-w-[100px]">{task.storeName}</span>
                        <span className="text-[9px] bg-gray-900 text-gray-400 px-1.5 py-0.5 rounded flex items-center gap-1"><Bell size={8}/> {task.responsavel || 'Equipe'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {clientGroup.stores.every(s => !s.checklists?.some(t => !t.feita)) && (
                  <div className="text-center p-6 border border-dashed border-gray-700 rounded-lg">
                    <p className="text-gray-500 text-xs italic font-medium">Nenhuma tarefa pendente.</p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA 3: HISTÓRICO CONSOLIDADO */}
            <div className="flex flex-col bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider pb-2 border-b border-gray-700">
                <History size={16} className="text-emerald-400" /> Atividade
              </h3>
              <div className="space-y-4 border-l border-gray-700 ml-2 pl-5 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">
                {clientGroup.stores.flatMap(s => (s.taskLogs || []).map(l => ({...l, store: s.store})))
                  .sort((a,b) => b.id - a.id).slice(0, 15).map(log => (
                  <div key={log.id} className="relative group">
                    <div className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 bg-gray-800 rounded-full border-2 border-emerald-500 group-hover:bg-emerald-500 transition-colors"></div>
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-[10px] text-emerald-400 font-bold">{log.data}</p>
                      <p className="text-[9px] text-gray-500 italic bg-gray-900 px-1.5 rounded">{log.author}</p>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{log.store}</p>
                    <p className="text-xs text-gray-300 leading-relaxed bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">{log.texto}</p>
                  </div>
                ))}
                {clientGroup.stores.every(s => !s.taskLogs || s.taskLogs.length === 0) && (
                   <p className="text-gray-500 text-xs italic font-medium -ml-5 pl-5">Nenhum registro de atividade recente.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

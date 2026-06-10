import React, { useMemo } from 'react';
import { History, X, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StoreHistoryModal({ isOpen, onClose, store, formatCurrency, formatNumber, canEdit, onDeleteDayEntry }) {
  
  // Se o modal não estiver marcado como aberto, não renderiza absolutamente nada na árvore do DOM
  if (!isOpen || !store) return null;

  // LÓGICA DE ORDENAÇÃO: Garante que o dia mais recente apareça primeiro na auditoria
  const sortedHistory = useMemo(() => {
    if (!store.history || store.history.length === 0) return [];
    // Clonamos o array com [...] para não mutar o estado original diretamente
    return [...store.history].sort((a, b) => b.day - a.day);
  }, [store.history]);

  // Handler para exclusão de um dia específico lançado errado
  const handleDeleteDay = (dayRecorded) => {
    if (!canEdit) return toast.error("Você não possui permissão para excluir registros.");
    
    if (window.confirm(`🚨 EXCLUSÃO DE REGISTRO\n\nDeseja realmente apagar o lançamento do Dia ${dayRecorded} da loja ${store.store}? Isso reajustará os totais do mês.`)) {
      onDeleteDayEntry(store.id, dayRecorded);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="p-5 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Auditoria de Lançamentos</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">{store.store} • {store.marketplace || 'Marketplace'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* CORPO / TABELA DE HISTÓRICO */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {sortedHistory.length > 0 ? (
            <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/40 text-gray-400 text-[10px] uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="p-3 text-center w-16">Dia</th>
                    <th className="p-3 text-blue-400">Faturamento Diário</th>
                    <th className="p-3 text-emerald-400">Pedidos</th>
                    <th className="p-3 text-purple-400">Unidades</th>
                    <th className="p-3 text-amber-400">Ads</th>
                    {canEdit && <th className="p-3 text-right pr-6">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                  {sortedHistory.map((row) => (
                    <tr key={row.day} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-3 font-bold text-white text-center bg-white/[0.01]">
                        {row.day}
                      </td>
                      <td className="p-3 font-bold text-blue-400">
                        {formatCurrency(row.dailyRevenue)}
                      </td>
                      <td className="p-3 font-medium text-emerald-400">
                        {formatNumber(row.dailyOrders)} ped
                      </td>
                      <td className="p-3 font-medium text-purple-400">
                        {formatNumber(row.dailyUnits)} un
                      </td>
                      <td className="p-3 font-medium text-amber-500">
                        {formatCurrency(row.dailyAds)}
                      </td>
                      {canEdit && (
                        <td className="p-3 text-right pr-6">
                          <button 
                            onClick={() => handleDeleteDay(row.day)}
                            className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                            title="Excluir este dia"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-gray-500 text-sm">
              <History size={32} className="mx-auto mb-3 opacity-30 text-gray-400" />
              Nenhum dado diário registrado para esta loja na competência atual. 📈
            </div>
          )}
        </div>

        {/* RODAPÉ INFORMATIVO */}
        <div className="p-4 border-t border-white/5 bg-black/10 text-[10px] text-gray-500 text-center shrink-0">
          Os dados acima refletem as inserções parciais acumuladas na nuvem para o mês vigente.
        </div>
      </div>
    </div>
  );
}

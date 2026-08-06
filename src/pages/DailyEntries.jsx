import React, { useMemo } from 'react';
import { Zap } from 'lucide-react';
import StoreEntryRow from '../features/clients/components/StoreEntryRow';

export default function DailyEntries({ 
    filteredStores, 
    handleSaveIndividualEntry, 
    formatCurrency, 
    openTaskModal, 
    openHistoryModal 
}) {
    
    // 1. Lógica matemática para calcular os totais acumulados e do dia de hoje
    const summaryMetrics = useMemo(() => {
        const todayDay = new Date().getDate();
        
        let fatAcumulado = 0;
        let fatHoje = 0;
        let pedidosHoje = 0;

        filteredStores.forEach(store => {
            // Soma o faturamento acumulado geral da loja
            fatAcumulado += Number(store.currentRevenue) || 0;

            if (store.history && Array.isArray(store.history)) {
                // Filtramos os registros do dia atual
                const registrosHoje = store.history.filter(h => Number(h.day) === todayDay);
                
                registrosHoje.forEach(h => {
                    // Puxa diretamente a propriedade nativa. O fallback (|| 0) previne retornos NaN.
                    fatHoje += Number(h.dailyRevenue) || 0;
                    pedidosHoje += Number(h.dailyOrders) || 0;
                });
            }
        });

        return { fatAcumulado, fatHoje, pedidosHoje };
    }, [filteredStores]);

    // Ordenação inteligente das lojas (mantida igual)
    const sortedStores = useMemo(() => {
        const today = new Date();
        
        return [...filteredStores].sort((a, b) => {
            const dateA = a.dataUltimoAcesso ? new Date(a.dataUltimoAcesso) : new Date(0);
            const dateB = b.dataUltimoAcesso ? new Date(b.dataUltimoAcesso) : new Date(0);
            
            const daysOutdatedA = Math.floor(Math.abs(today - dateA) / (1000 * 60 * 60 * 24));
            const daysOutdatedB = Math.floor(Math.abs(today - dateB) / (1000 * 60 * 60 * 24));

            if (daysOutdatedA !== daysOutdatedB) {
                return daysOutdatedB - daysOutdatedA; 
            }
            return (a.client || '').localeCompare(b.client || '');
        });
    }, [filteredStores]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* CABEÇALHO COM OS NOVOS INFORMATIVOS */}
            <div className="bg-gradient-to-r from-indigo-900/40 to-black/20 p-6 rounded-3xl border border-indigo-500/30 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 shadow-lg">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-2">
                        <Zap className="text-indigo-400" size={28} /> Lançamento Dinâmico Global
                    </h2>
                    <p className="text-sm text-gray-400">
                        A lista obedece ao filtro global do topo da página. Lojas mais desatualizadas aparecem primeiro.
                    </p>
                </div>

                {/* Cards de Resumo Atualizados: Fat. Acumulado, Fat. Hoje e Pedidos Hoje */}
                <div className="flex flex-wrap items-center gap-4">
                    
                    <div className="bg-black/40 border border-white/10 p-4 rounded-2xl shadow-inner min-w-[150px]">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Faturamento Acumulado</span>
                        <p className="text-xl font-black text-blue-600 mt-1">
                            {formatCurrency(summaryMetrics.fatAcumulado)}
                        </p>
                    </div>

                    <div className="bg-black/40 border border-white/10 p-4 rounded-2xl shadow-inner min-w-[120px]">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pedidos Totais</span>
                        <p className="text-xl font-black text-blue-600 mt-1">
                            {filteredStores.reduce((acc, s) => acc + (Number(s.orders) || 0), 0)}
                        </p>
                    </div>

                    <div className="bg-black/40 border border-white/10 p-4 rounded-2xl shadow-inner min-w-[130px]">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Faturamento Hoje</span>
                        <p className="text-xl font-black text-blue-400 mt-1">
                            {formatCurrency(summaryMetrics.fatHoje)}
                        </p>
                    </div>

                    <div className="bg-black/40 border border-white/10 p-4 rounded-2xl shadow-inner min-w-[120px]">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pedidos Hoje</span>
                        <p className="text-xl font-black text-blue-400 mt-1">
                            {summaryMetrics.pedidosHoje}
                        </p>
                    </div>

                </div>
            </div>

            {/* TABELA DE LANÇAMENTOS */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-black/40 text-gray-400 text-[10px] uppercase tracking-wider border-b border-white/5">
                        <tr>
                            <th className="p-4 w-[28%]">Loja / Canal</th>
                            <th className="p-4 w-[20%]">Dia & Modo</th>
                            <th className="p-4 w-[13%] text-blue-400">Faturamento</th>
                            <th className="p-4 w-[10%] text-emerald-400">Pedidos</th>
                            <th className="p-4 w-[10%] text-purple-400">Unidades</th>
                            <th className="p-4 w-[13%] text-amber-400">Ads</th>
                            <th className="p-4 w-[16%] text-right pr-6">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedStores.map(store => (
                            <StoreEntryRow 
                                key={store.id} 
                                store={store} 
                                handleSaveIndividualEntry={handleSaveIndividualEntry} 
                                formatCurrency={formatCurrency} 
                                openTaskModal={openTaskModal}
                                openHistoryModal={openHistoryModal}
                            />
                        ))}
                        
                        {sortedStores.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-gray-500 text-sm">
                                    Nenhuma loja encontrada com os filtros atuais do topo da página.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

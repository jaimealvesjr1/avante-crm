import React from 'react';
import { History, Plus, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, MessageCircle, ShoppingBag, Edit2, Save, Trash2, X, TrendingUp, ArchiveRestore } from 'lucide-react';

const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

export default function OperationalTable({
  canEdit, dashboardData, expandedClients, toggleClientExpansion, 
  addNewStoreToClient, openHistoryModal, openClientFile, formatCurrency, 
  showValues, generateClientWhatsAppLink, generateStoreWhatsAppLink,
  clientGrowthMap, updateGlobalSettings,
  startEditingStore, editingStoreId, setEditingStoreId, storeEditData, setStoreEditData, saveStoreEdit, deleteStore, offboardClient,
  openTaskModal, competenceMonth
}) {

  const filteredGroups = dashboardData.groupedClients;

  const [compYear, compMonthNum] = competenceMonth.split('-').map(Number);
  const dataMesPassado = new Date(compYear, compMonthNum - 2, 1);
  
  const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const mesPassadoExato = `${mesesNomes[dataMesPassado.getMonth()]}/${String(dataMesPassado.getFullYear()).slice(-2)}`;

  const getStatusColor = (status) => {
    if (status === 'success') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (status === 'warning') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  const getStatusGradient = (status) => {
    if (status === 'success') return 'bg-gradient-to-r from-emerald-500 to-green-400';
    if (status === 'warning') return 'bg-gradient-to-r from-amber-500 to-yellow-400';
    return 'bg-gradient-to-r from-red-500 to-rose-400';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[2000px]:grid-cols-5 gap-6 items-start animate-in fade-in duration-500">
      {filteredGroups.length > 0 ? filteredGroups.map((group) => {
        const isExpanded = expandedClients.includes(group.client);
        const clientStatusClass = getStatusColor(group.status);
        const clientGradient = getStatusGradient(group.status);

        return (
          <div key={group.client} 
          className={`flex flex-col bg-white/[0.02] backdrop-blur-md rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'col-span-full border-white/15 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'col-span-1 border-white/5 hover:border-white/10'}`}>
            
            {/* CABEÇALHO DO CLIENTE */}
            <div 
              onClick={() => toggleClientExpansion(group.client)}
              className="group p-5 flex flex-col gap-5 cursor-pointer relative overflow-hidden h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.00] via-white/[0.04] to-white/[0.00] translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 pointer-events-none"></div>

              {/* Topo do Card: Nome, Status e Botões */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border shadow-inner shrink-0 ${clientStatusClass}`}>
                    {group.status === 'success' ? <CheckCircle size={22} /> : group.status === 'warning' ? <Clock size={22} /> : <AlertTriangle size={22} />}
                  </div>
                  
                  <div>
                    <h3 onClick={(e) => { e.stopPropagation(); openClientFile(group.client); }} className="text-xl font-black text-white hover:text-indigo-400 transition-colors truncate">
                      {group.client}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] text-gray-400 font-medium shadow-sm">
                        {group.stores.length} Lojas
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-md text-[10px] font-bold shadow-sm">
                        {group.feeType === 'fixed' || group.fixedFee > 0 ? `Fixo: R$ ${showValues ? group.fixedFee : '***'}` : `Fee: ${showValues ? (group.feePercent || 0) : '***'}%`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações Rápidas (WhatsApp, Add Loja) agrupadas no canto superior direito */}
                <div className="flex items-center gap-2 z-10" onClick={e => e.stopPropagation()}>
                  {canEdit && (
                      <button 
                          onClick={(e) => { e.stopPropagation(); addNewStoreToClient(group.client); }}
                          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl transition-all shadow-sm flex items-center justify-center"
                          title="Adicionar Nova Loja"
                      >
                          <Plus size={16} />
                      </button>
                  )}
                  
                  <a href={generateClientWhatsAppLink(group)} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-xl transition-all border shadow-sm text-white flex items-center justify-center ${group.status === 'danger' ? 'bg-red-500/20 border-red-500/30 hover:bg-red-500/40 text-red-300' : group.status === 'warning' ? 'bg-amber-500/20 border-amber-500/30 hover:bg-amber-500/40 text-amber-300' : 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/40 text-emerald-300'}`} title="Gerar Relatório WhatsApp">
                    <MessageCircle size={16} />
                  </a>
                </div>
              </div>

              {/* Métricas do Card */}
              <div className="flex flex-col gap-4 mt-2">
                <div className="grid grid-cols-2 gap-4 bg-black/20 p-3.5 rounded-xl border border-white/5">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Atual / Meta</p>
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-white leading-tight">{formatCurrency(group.totalCurrentRevenue)}</span>
                      <span className="text-[11px] text-gray-400 font-medium mt-0.5">Alvo: {formatCurrency(group.totalGmvTarget)}</span>
                    </div>
                  </div>
                  
                  {/* Projeção e ROAS alinhados à direita */}
                  <div className="flex flex-col items-end text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Projeção ({showValues ? group.percentReached.toFixed(1) : '***'}%)</p>
                    <span className={`text-lg font-bold leading-tight ${group.status === 'success' ? 'text-emerald-400' : group.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                      {formatCurrency(group.totalProjectedGmv)}
                    </span>
                    <span className="text-[11px] bg-white/5 px-2 py-0.5 rounded-md text-gray-300 border border-white/10 mt-1 shadow-sm">
                      ROAS: <strong className="text-white">{showValues ? group.roas : '***'}x</strong>
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full bg-black/40 rounded-full h-2 border border-white/5 overflow-hidden shadow-inner">
                  <div className={`h-full rounded-full ${clientGradient} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(group.percentReached, 100)}%` }}></div>
                </div>
              </div>

              {/* Indicador visual de expansão (setinha) */}
              <div className="absolute bottom-2 right-2 p-1 text-gray-500 flex items-center justify-center opacity-50 pointer-events-none">
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            </div>

            {/* LOJAS DO CLIENTE EM GRID COM NOVOS CARDS (E EDIÇÃO INLINE) */}
            {isExpanded && (
            <div className="bg-black/20 border-t border-white/5 p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[2000px]:grid-cols-6 gap-4">
              {[...group.stores].sort((a, b) => a.store.localeCompare(b.store, undefined, { numeric: true, sensitivity: 'base' })).map((row) => {
                const isEditing = editingStoreId === row.id;

                return (
                  <div key={row.id} className="group/store flex flex-col justify-between bg-white/[0.03] hover:bg-white/[0.06] p-5 rounded-xl border border-white/5 transition-all shadow-sm relative overflow-hidden gap-4">
                      
                    {/* Status Line Lateral */}
                    <div className={`absolute top-0 left-0 w-1 md:w-1.5 h-full md:h-full ${row.status === 'success' ? 'bg-emerald-500' : row.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}></div>

                    {isEditing ? (
                      // MODO DE EDIÇÃO INLINE (Mantido em formato flexível)
                      <div className="flex flex-col w-full gap-4 animate-in fade-in py-2">
                        <div className="flex items-center gap-2">
                          <Edit2 size={18} className="text-indigo-400" />
                          <h4 className="text-base font-bold text-white">Editando Loja: {row.store}</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Loja</label>
                            <input 
                              type="text" 
                              value={storeEditData.store || ''} 
                              onChange={e => setStoreEditData({...storeEditData, store: e.target.value})} 
                              className="w-full bg-black/40 border border-white/10 text-white rounded-lg p-2.5 outline-none focus:border-indigo-500 text-sm font-bold uppercase" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Marketplace</label>
                            <select 
                              value={storeEditData.marketplace?.toLowerCase() || ''} 
                              onChange={e => setStoreEditData({...storeEditData, marketplace: e.target.value.toUpperCase()})} 
                              className="w-full bg-black/40 border border-white/10 text-indigo-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-sm font-bold uppercase cursor-pointer"
                            >
                              <option value="" className="bg-gray-900 text-gray-400">Selecione...</option>
                              {ALL_MARKETPLACES.map(mkt => (
                                <option key={mkt} value={mkt} className="bg-gray-900 text-white">{mkt.toUpperCase()}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-amber-500 uppercase">Tipo de Meta</label>
                            {storeEditData.targetType === 'fixed' ? (
                              <input 
                                type="number" 
                                placeholder="Valor Fixo (Ex: 50000)"
                                value={storeEditData.fixedGmvTarget !== undefined && storeEditData.fixedGmvTarget !== null ? storeEditData.fixedGmvTarget : ''} 
                                onChange={e => setStoreEditData({...storeEditData, fixedGmvTarget: e.target.value})} 
                                className="w-full bg-black/40 border border-amber-500/30 text-amber-400 rounded-lg p-2.5 outline-none text-sm font-bold" 
                              />
                            ) : (
                              <input 
                                type="number" 
                                placeholder="% Crescimento (Ex: 15)"
                                value={storeEditData.customGrowth !== undefined && storeEditData.customGrowth !== null ? storeEditData.customGrowth : ''} 
                                onChange={e => setStoreEditData({...storeEditData, customGrowth: e.target.value})} 
                                className="w-full bg-black/40 border border-amber-500/30 text-amber-400 rounded-lg p-2.5 outline-none text-sm font-bold" 
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <button onClick={() => deleteStore(row.id, row.store)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Excluir/Arquivar Loja">
                            <Trash2 size={16} />
                          </button>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingStoreId(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-lg transition-colors">Cancelar</button>
                            <button onClick={() => saveStoreEdit(row.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-md"><Save size={14} /> Salvar</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* CABEÇALHO DO CARD: Minimalista e direto ao ponto */}
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="flex flex-col items-start gap-1.5 flex-1 pr-2">
                            <span 
                              onClick={(e) => { e.stopPropagation(); if(openTaskModal) openTaskModal(row); }}
                              className="font-bold text-white hover:text-indigo-400 text-[15px] cursor-pointer transition-colors leading-tight"
                              title="Abrir Tarefas e Senhas"
                            >
                              {row.store}
                            </span>
                            {row.marketplace && <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded text-[9px] uppercase font-bold tracking-widest w-fit">{row.marketplace}</span>}
                          </div>

                          {/* Botões simplificados, sem bordas pesadas e fundos brigando por atenção */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => openHistoryModal(row)} className="p-1.5 hover:bg-white/10 text-gray-400 rounded-md transition-colors" title="Ver Histórico">
                              <History size={14} />
                            </button>
                            {canEdit && (
                              <button onClick={() => startEditingStore(row)} className="p-1.5 hover:bg-white/10 text-gray-400 rounded-md transition-colors" title="Editar">
                                <Edit2 size={14} />
                              </button>
                            )}
                            <a href={generateStoreWhatsAppLink(row)} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded-md transition-colors" title="WhatsApp">
                              <MessageCircle size={14} />
                            </a>
                          </div>
                        </div>

                        {/* CORPO DO CARD: Respirável, sem background interno, alinhamento restrito */}
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-2 w-full">
                          
                          {/* Barra de Progresso simplificada */}
                          <div className="col-span-2 flex flex-col gap-1">
                            <div className="flex justify-between items-end text-[10px]">
                              <span className="text-gray-400 leading-none">Atual: <strong className="text-white">{formatCurrency(row.currentRevenue)}</strong></span>
                              <span className="font-bold text-white leading-none">{showValues ? row.percentReached?.toFixed(1) : '***'}%</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-1000 ease-out ${row.status === 'success' ? 'bg-emerald-500' : row.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(row.percentReached || 0, 100)}%` }}></div>
                            </div>
                          </div>

                          {/* Ads e Volume */}
                          <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Ads & ROAS</span>
                            <span className="font-bold text-amber-400 text-sm leading-none mb-0.5">{formatCurrency(row.adsInvestment)}</span>
                            <span className="text-[10px] text-gray-400 leading-none">{showValues ? (row.adsInvestment > 0 ? (row.currentRevenue / row.adsInvestment).toFixed(1) : 0) : '***'}x</span>
                          </div>

                          <div className="flex flex-col text-right">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Volume</span>
                            <span className="font-bold text-emerald-400 text-sm leading-none mb-0.5">{showValues ? (row.orders || 0) : '***'} pedidos</span>
                            <span className="text-[10px] text-gray-400 leading-none">{showValues ? (row.units || 0) : '***'} unidades</span>
                          </div>

                          {/* Histórico e Projeção separados por linhas sutis independentes */}
                          <div className="flex flex-col justify-end pt-2 border-t border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">{mesPassadoExato}</span>
                            <span className="text-xs font-bold text-gray-400 leading-none">
                              {(() => {
                                const histAnterior = (row.monthlyHistory || []).find(h => h.month === mesPassadoExato);
                                return formatCurrency(histAnterior ? Number(histAnterior.gmv) : 0);
                              })()}
                            </span>
                          </div>

                          <div className="flex flex-col items-end justify-end text-right pt-2 border-t border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Projeção</span>
                            <span className={`font-black text-[15px] leading-none ${row.status === 'success' ? 'text-emerald-400' : row.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                              {formatCurrency(row.projectedGmv)}
                            </span>
                          </div>

                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        );
      }) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/5 rounded-2xl border-dashed">
          <ShoppingBag size={48} className="text-gray-600 mb-4" />
          <p className="text-gray-400 text-sm font-medium">Nenhum cliente ou loja corresponde aos filtros atuais.</p>
        </div>
      )}
    </div>
  );
}

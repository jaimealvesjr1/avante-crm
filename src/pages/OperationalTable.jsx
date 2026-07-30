import React from 'react';
import { History, Plus, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, MessageCircle, ShoppingBag, Edit2, Save, Trash2, X, TrendingUp, ArchiveRestore } from 'lucide-react';

const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

export default function OperationalTable({
  canEdit, dashboardData, expandedClients, toggleClientExpansion, 
  addNewStoreToClient, openHistoryModal, openClientFile, formatCurrency, 
  showValues, generateClientWhatsAppLink, generateStoreWhatsAppLink,
  clientGrowthMap, updateGlobalSettings,
  startEditingStore, editingStoreId, setEditingStoreId, storeEditData, setStoreEditData, saveStoreEdit, deleteStore, offboardClient,
  openTaskModal
}) {

  const filteredGroups = dashboardData.groupedClients;

  const dataAtual = new Date();
  dataAtual.setMonth(dataAtual.getMonth() - 1);
  const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const mesPassadoExato = `${mesesNomes[dataAtual.getMonth()]}/${String(dataAtual.getFullYear()).slice(-2)}`;

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
    <div className="space-y-6 animate-in fade-in duration-500">

      {filteredGroups.length > 0 ? filteredGroups.map((group) => {
        const isExpanded = expandedClients.includes(group.client);
        const clientStatusClass = getStatusColor(group.status);
        const clientGradient = getStatusGradient(group.status);

        return (
          <div key={group.client} className={`flex flex-col bg-white/[0.02] backdrop-blur-md rounded-2xl border ${isExpanded ? 'border-white/15 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'border-white/5 hover:border-white/10'} transition-all duration-300 overflow-hidden`}>
            
            {/* CABEÇALHO DO CLIENTE */}
            <div 
              onClick={() => toggleClientExpansion(group.client)}
              className="group p-4 md:p-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/[0.00] via-white/[0.03] to-white/[0.00] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>

              <div className="flex items-center gap-4 flex-[1.5] min-w-[250px]">
                <div className={`p-2 rounded-xl border shadow-inner shrink-0 ${clientStatusClass}`}>
                  {group.status === 'success' ? <CheckCircle size={20} /> : group.status === 'warning' ? <Clock size={20} /> : <AlertTriangle size={20} />}
                </div>
                
                <div className="flex-1">
                  <h3 onClick={(e) => { e.stopPropagation(); openClientFile(group.client); }} className="text-lg font-bold text-white hover:text-indigo-300 transition-colors truncate">
                    {group.client}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] text-gray-400 font-medium shadow-sm">
                      {group.stores.length} Lojas Ativas
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-md text-[10px] font-bold shadow-sm">
                      {group.feeType === 'fixed' || group.fixedFee > 0 ? `Fixo: R$ ${showValues ? group.fixedFee : '***'}` : `Fee: ${showValues ? (group.feePercent || 0) : '***'}%`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex flex-col flex-1">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Cenário Global</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white">{formatCurrency(group.totalCurrentRevenue)}</span>
                  <span className="text-xs text-gray-400 font-medium">/ {formatCurrency(group.totalGmvTarget)}</span>
                </div>
                {(() => {
                // Calcula a soma do mês anterior para todas as lojas deste cliente
                const gmvAnteriorGrupo = group.stores.reduce((acc, store) => {
                    const hist = (store.monthlyHistory || []).find(h => h.month === mesPassadoExato);
                    return acc + (hist ? Number(hist.gmv) : 0);
                }, 0);

                return (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Mês Anterior: <span className="text-gray-300">{formatCurrency(gmvAnteriorGrupo)}</span> | Ads: <span className="text-amber-400 font-medium">{formatCurrency(group.totalAds)}</span>
                  </p>
                );
              })()}
              </div>

              <div className="flex flex-col flex-1 min-w-[200px]">
                <div className="flex justify-between items-end mb-1.5">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Projeção ({showValues ? group.percentReached.toFixed(1) : '***'}%)</p>
                    <p className={`text-lg font-bold leading-none mt-1 ${group.status === 'success' ? 'text-emerald-400' : group.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                      {formatCurrency(group.totalProjectedGmv)}
                    </p>
                  </div>
                  <span className="text-[11px] bg-white/5 px-2 py-1 rounded-md text-gray-300 border border-white/10">ROAS: <strong className="text-white">{showValues ? group.roas : '***'}x</strong></span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2 border border-white/5 overflow-hidden shadow-inner">
                  <div className={`h-full rounded-full ${clientGradient} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(group.percentReached, 100)}%` }}></div>
                </div>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-3 flex-[0.5]" onClick={e => e.stopPropagation()}>
                <div className="flex gap-2">
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
                <div className="p-1 text-gray-500 flex items-center justify-center">
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>
            </div>

            {/* LOJAS DO CLIENTE EM GRID COM NOVOS CARDS (E EDIÇÃO INLINE) */}
            {isExpanded && (
              <div className="bg-black/20 border-t border-white/5 p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                {[...group.stores].sort((a, b) => a.store.localeCompare(b.store, undefined, { numeric: true, sensitivity: 'base' })).map((row) => {
                  const isEditing = editingStoreId === row.id;

                  return (
                    <div key={row.id} className="group/store flex flex-col bg-white/[0.03] hover:bg-white/[0.06] p-5 rounded-2xl border border-white/5 transition-all shadow-sm relative overflow-hidden min-h-[320px]">
                        
                      {/* Status Line */}
                      <div className={`absolute top-0 left-0 w-full h-1.5 ${row.status === 'success' ? 'bg-emerald-500' : row.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}></div>

                      {isEditing ? (
                        // MODO DE EDIÇÃO INLINE
                        <div className="flex flex-col h-full justify-between animate-in fade-in">
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <Edit2 size={18} className="text-indigo-400" />
                              <h4 className="text-base font-bold text-white">Editando Loja</h4>
                            </div>
                            
                            <div className="space-y-3">
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
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] font-bold text-amber-500 uppercase">Tipo de Meta</label>
                                  <select 
                                    value={storeEditData.targetType || 'percent'} 
                                    onChange={e => setStoreEditData({...storeEditData, targetType: e.target.value})} 
                                    className="bg-transparent text-gray-400 text-[10px] font-bold outline-none cursor-pointer"
                                  >
                                    <option value="percent">% Acumulativo</option>
                                    <option value="fixed">R$ Fixo Absoluto</option>
                                  </select>
                                </div>
                                {storeEditData.targetType === 'fixed' ? (
                                  <input 
                                    type="number" 
                                    placeholder="Valor Financeiro Fixo (Ex: 50000)"
                                    value={storeEditData.fixedGmvTarget !== undefined && storeEditData.fixedGmvTarget !== null ? storeEditData.fixedGmvTarget : ''} 
                                    onChange={e => setStoreEditData({...storeEditData, fixedGmvTarget: e.target.value})} 
                                    className="w-full bg-black/40 border border-amber-500/30 text-amber-400 rounded-lg p-2.5 outline-none focus:border-amber-500 text-sm font-bold placeholder:text-gray-600" 
                                  />
                                ) : (
                                  <input 
                                    type="number" 
                                    placeholder="% Adicional (Ex: 15)"
                                    value={storeEditData.customGrowth !== undefined && storeEditData.customGrowth !== null ? storeEditData.customGrowth : ''} 
                                    onChange={e => setStoreEditData({...storeEditData, customGrowth: e.target.value})} 
                                    className="w-full bg-black/40 border border-amber-500/30 text-amber-400 rounded-lg p-2.5 outline-none focus:border-amber-500 text-sm font-bold placeholder:text-gray-600" 
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                            <button 
                              onClick={() => deleteStore(row.id, row.store)} 
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" 
                              title="Excluir/Arquivar Loja"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setEditingStoreId(null)} 
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-lg transition-colors"
                              >
                                Cancelar
                              </button>
                              <button 
                                onClick={() => saveStoreEdit(row.id)} 
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-md"
                              >
                                <Save size={14} /> Salvar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Header */}
                          <div className="flex justify-between items-start mb-4 mt-1">
                              <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                      <span 
                                        onClick={(e) => { e.stopPropagation(); if(openTaskModal) openTaskModal(row); }}
                                        className="font-bold text-gray-100 hover:text-indigo-400 text-lg cursor-pointer transition-colors"
                                        title="Abrir Tarefas e Senhas"
                                      >
                                        {row.store}
                                      </span>
                                      {row.marketplace && <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-xs uppercase font-bold tracking-wider">{row.marketplace}</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-400 font-medium">{row.client}</span>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                      {/* NOVO BOTÃO DE HISTÓRICO ADICIONADO AQUI */}
                                      <button 
                                        onClick={() => openHistoryModal(row)} 
                                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl transition-all shadow-sm"
                                        title="Ver Histórico Mensal e Diário"
                                      >
                                        <History size={16} />
                                      </button>
                                      
                                      {canEdit && (
                                        <button 
                                          onClick={() => startEditingStore(row)} 
                                          className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-xl transition-all shadow-sm"
                                          title="Editar Loja"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                      )}
                                      <a href={generateStoreWhatsAppLink(row)} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl transition-all shadow-sm"><MessageCircle size={16} /></a>
                                  </div>
                          </div>

                          {/* Progress Section */}
                          <div className="mb-5 bg-black/30 p-3.5 rounded-xl border border-white/5">
                              <div className="flex justify-between text-xs mb-2.5">
                                  <span className="text-gray-400 font-medium">Progresso da Meta</span>
                                  <span className="font-bold text-white">{showValues ? row.percentReached?.toFixed(1) : '***'}%</span>
                              </div>
                              <div className="w-full bg-black/50 rounded-full h-3 shadow-inner">
                                  <div className={`h-full rounded-full transition-all duration-1000 ${row.status === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : row.status === 'warning' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} style={{ width: `${Math.min(row.percentReached || 0, 100)}%` }}></div>
                              </div>
                              <div className="flex justify-between mt-2.5">
                                  <span className="text-xs text-gray-400">Atual: <strong className="text-white">{formatCurrency(row.currentRevenue)}</strong></span>
                                  <span className="text-xs text-gray-400 flex flex-col items-end">
                                    <span>Meta: <strong className="text-gray-300">{formatCurrency(row.gmvTarget)}</strong></span>
                                    <span className="text-[9px] text-indigo-400/70 mt-0.5" title={`Regra aplicada: ${row.appliedGrowthType}`}>
                                      {row.targetType === 'fixed' ? '(Meta Absoluta)' : `(${row.growthRate}% - Acumulado)`}
                                    </span>
                                  </span>
                              </div>
                          </div>

                          {/* Ads and Orders Metrics */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="flex flex-col gap-1 border-r border-white/10 pr-2">
                                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Ads & ROAS</span>
                                  <span className="font-bold text-amber-400 text-sm">{formatCurrency(row.adsInvestment)}</span>
                                  <span className="text-xs text-gray-400">ROAS: {showValues ? (row.adsInvestment > 0 ? (row.currentRevenue / row.adsInvestment).toFixed(1) : 0) : '***'}x</span>
                              </div>
                              <div className="flex flex-col gap-1 pl-2">
                                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Tração e Volume</span>
                                  <span className="font-bold text-emerald-400 text-sm">{showValues ? (row.orders || 0) : '***'} ped</span>
                                  <span className="text-xs text-gray-400">{showValues ? (row.units || 0) : '***'} unidades</span>
                              </div>
                          </div>

                          {/* Footer */}
                          <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/10">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Fechamento ({mesPassadoExato})</span>
                                <span className="text-sm font-bold text-gray-400">
                                    {(() => {
                                        const histAnterior = (row.monthlyHistory || []).find(h => h.month === mesPassadoExato);
                                        return formatCurrency(histAnterior ? Number(histAnterior.gmv) : 0);
                                    })()}
                                </span>
                              </div>
                              <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Projeção Final</span>
                                  <span className={`font-bold text-xl leading-none tracking-tight ${row.status === 'success' ? 'text-emerald-400' : row.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
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

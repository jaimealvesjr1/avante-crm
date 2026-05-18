import React, { useState } from 'react';
import { Search, Plus, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, Edit2, Check, X, MessageCircle, Trash2, BarChart2, Filter, Target, TrendingUp, ShoppingBag } from 'lucide-react';

export default function OperationalTable({
  canEdit, searchTerm, setSearchTerm, addNewStore, sortBy, setSortBy, currentDay, updateGlobalSettings, globalGrowth,
  dashboardData, expandedClients, toggleClientExpansion, editingClient, setEditingClient, clientEditData, setClientEditData,
  saveClientEdit, startEditingClient, addNewStoreToClient, deleteClient,
  editingStoreId, storeEditData, setStoreEditData,
  openHistoryModal, formatCurrency, generateStoreWhatsAppLink, startEditingStore, saveStoreEdit, deleteStore, setEditingStoreId, generateClientWhatsAppLink, handleStoreChange, openClientFile
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [respFilter, setRespFilter] = useState('all'); 
  const [mktFilter, setMktFilter] = useState('all');

  const uniqueResps = [...new Set(dashboardData.groupedClients.flatMap(g => g.stores.map(s => s.responsavel)))].filter(Boolean).sort();
  const uniqueMkts = [...new Set(dashboardData.groupedClients.flatMap(g => g.stores.map(s => s.marketplace)))].filter(Boolean).sort();

  const filteredGroups = dashboardData.groupedClients.map(group => {
    const matchingStores = group.stores.filter(s => {
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchTier = tierFilter === 'all' || s.tier === tierFilter;
      const matchResp = respFilter === 'all' || s.responsavel === respFilter;
      const matchMkt = mktFilter === 'all' || s.marketplace === mktFilter;
      return matchStatus && matchTier && matchResp && matchMkt;
    });
    if (matchingStores.length > 0) return { ...group, stores: matchingStores };
    return null;
  }).filter(Boolean);

  // Auxiliares de cor Glass
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
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 🌟 CABEÇALHO DE CONTROLES (GLASSMORPHISM) */}
      <div className="bg-white/[0.02] backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por conta ou loja..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-sm transition-all shadow-inner" 
              />
            </div>
      
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)} 
              className="bg-black/20 border border-white/10 text-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium outline-none cursor-pointer hover:bg-white/5 transition-all shadow-inner"
            >
              {/* As Options agora têm o fundo cinza escuro para poderem ser lidas ao clicar */}
              <option value="gmv" className="bg-gray-900 text-white font-medium">Maior Faturamento</option>
              <option value="status" className="bg-gray-900 text-white font-medium">Por Status</option>
              <option value="name" className="bg-gray-900 text-white font-medium">Por Nome (A-Z)</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10 shadow-inner w-full md:w-auto">
            <div className="flex gap-1 border-r border-white/10 pr-2">
                {['all', 'danger', 'warning', 'success'].map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)} className={`p-1.5 rounded-lg transition-all ${statusFilter === f ? 'bg-white/10 text-white shadow-md' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                    {f === 'all' ? <Filter size={16}/> : f === 'danger' ? <AlertTriangle size={16}/> : f === 'warning' ? <Clock size={16}/> : <CheckCircle size={16}/>}
                  </button>
                ))}
            </div>

            <select value={mktFilter} onChange={e => setMktFilter(e.target.value)} className="bg-transparent text-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer hover:bg-white/5 transition-colors border-r border-white/10">
              <option value="all" className="bg-gray-900 text-white font-medium">🛍️ CANAIS</option>
              {uniqueMkts.map(m => <option key={m} value={m} className="bg-gray-900 text-white font-medium">{m}</option>)}
            </select>
             
            <select value={respFilter} onChange={e => setRespFilter(e.target.value)} className="bg-transparent text-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer hover:bg-white/5 transition-colors">
              <option value="all" className="bg-gray-900 text-white font-medium">👤 EQUIPE</option>
              {uniqueResps.map(r => <option key={r} value={r} className="bg-gray-900 text-white font-medium">{r}</option>)}
            </select>
          </div>
          
          <div className="flex w-full md:w-auto">
            {canEdit && (
              <button onClick={addNewStore} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-6 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all shadow-md">
                <Plus size={16} /> Nova Conta
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🌟 LISTA DE CLIENTES (CARDS) */}
      <div className="space-y-4">
        {filteredGroups.length > 0 ? filteredGroups.map((group) => {
          const isExpanded = expandedClients.includes(group.client);
          const clientStatusClass = getStatusColor(group.status);
          const clientGradient = getStatusGradient(group.status);

          return (
            <div key={group.client} className={`flex flex-col bg-white/[0.02] backdrop-blur-md rounded-2xl border ${isExpanded ? 'border-white/15 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'border-white/5 hover:border-white/10'} transition-all duration-300 overflow-hidden`}>
              
              {/* CARD HEADER (CLIENTE) */}
              <div 
                onClick={() => toggleClientExpansion(group.client)}
                className="group p-4 md:p-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 cursor-pointer relative overflow-hidden"
              >
                {/* Efeito de brilho no hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.00] via-white/[0.03] to-white/[0.00] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>

                {/* Coluna 1: Nome e Status */}
                <div className="flex items-center gap-4 flex-[1.5] min-w-[250px]">
                  <div className={`p-2 rounded-xl border shadow-inner shrink-0 ${clientStatusClass}`}>
                    {group.status === 'success' ? <CheckCircle size={20} /> : group.status === 'warning' ? <Clock size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  
                  {editingClient === group.client ? (
                    <div onClick={e => e.stopPropagation()} className="flex flex-wrap items-center gap-2 w-full bg-black/40 p-2 rounded-xl border border-white/10 shadow-inner z-10">
                      <input type="text" value={clientEditData.name} onChange={e => setClientEditData({...clientEditData, name: e.target.value.toUpperCase()})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 outline-none text-white font-bold w-full max-w-[180px] text-sm" placeholder="Nome" autoFocus />
                      <select value={clientEditData.feeType} onChange={(e) => setClientEditData({...clientEditData, feeType: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-1.5 outline-none text-xs font-semibold text-gray-300 cursor-pointer">
                        <option value="percent" className="bg-gray-900 text-white font-medium">% Fee</option>
                        <option value="fixed" className="bg-gray-900 text-white font-medium">R$ Fixo</option>
                      </select>
                      <input type="number" step="0.1" value={clientEditData.feeType === 'fixed' ? clientEditData.fixedFee : clientEditData.feePercent} onChange={(e) => clientEditData.feeType === 'fixed' ? setClientEditData({...clientEditData, fixedFee: e.target.value}) : setClientEditData({...clientEditData, feePercent: e.target.value})} className="w-20 bg-white/5 border border-white/10 text-white rounded-lg p-1.5 outline-none font-bold text-sm" placeholder="Valor" />
                      <div className="flex gap-1 ml-auto">
                        <button onClick={() => saveClientEdit(group.client)} className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg"><Check size={16}/></button>
                        {/* Agora o setEditingClient(null) vai funcionar perfeitamente */}
                        <button onClick={() => setEditingClient(null)} className="p-1.5 bg-white/10 text-gray-400 hover:bg-white/20 rounded-lg"><X size={16}/></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 onClick={(e) => { e.stopPropagation(); openClientFile(group.client); }} className="text-lg font-bold text-white hover:text-indigo-300 transition-colors truncate">
                          {group.client}
                        </h3>
                        {canEdit && <button onClick={(e) => { e.stopPropagation(); startEditingClient(group); }} className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14}/></button>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] text-gray-400 font-medium shadow-sm">
                          {group.stores.length} Lojas
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-md text-[10px] font-bold shadow-sm">
                          {group.feeType === 'fixed' || group.fixedFee > 0 ? `Fixo: R$ ${group.fixedFee}` : `Fee: ${group.feePercent || 0}%`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna 2: Faturamento vs Meta (Desktop) */}
                <div className="hidden md:flex flex-col flex-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Cenário Global</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">{formatCurrency(group.totalCurrentRevenue)}</span>
                    <span className="text-xs text-gray-400 font-medium">/ {formatCurrency(group.totalGmvTarget)}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">Base: <span className="text-gray-300">{formatCurrency(group.totalGmvBase)}</span> | Ads: <span className="text-amber-400 font-medium">{formatCurrency(group.totalAds)}</span></p>
                </div>

                {/* Coluna 3: Pacing e Projeção */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                  <div className="flex justify-between items-end mb-1.5">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Projeção ({group.percentReached.toFixed(1)}%)</p>
                      <p className={`text-lg font-bold leading-none mt-1 ${group.status === 'success' ? 'text-emerald-400' : group.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                        {formatCurrency(group.totalProjectedGmv)}
                      </p>
                    </div>
                    <span className="text-[11px] bg-white/5 px-2 py-1 rounded-md text-gray-300 border border-white/10">ROAS: <strong className="text-white">{group.roas}x</strong></span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-2 border border-white/5 overflow-hidden shadow-inner">
                    <div className={`h-full rounded-full ${clientGradient} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(group.percentReached, 100)}%` }}></div>
                  </div>
                </div>

                {/* Coluna 4: Ações Rápidas e Chevron */}
                <div className="flex items-center justify-between lg:justify-end gap-3 flex-[0.5]" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    {canEdit && <button onClick={() => addNewStoreToClient(group.client)} className="p-2 bg-white/5 hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400 rounded-xl transition-all border border-white/5 hover:border-indigo-500/30" title="Adicionar Loja"><Plus size={16} /></button>}
                    <a href={generateClientWhatsAppLink(group)} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-xl transition-all border shadow-sm text-white flex items-center justify-center ${group.status === 'danger' ? 'bg-red-500/20 border-red-500/30 hover:bg-red-500/40 text-red-300' : group.status === 'warning' ? 'bg-amber-500/20 border-amber-500/30 hover:bg-amber-500/40 text-amber-300' : 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/40 text-emerald-300'}`} title="Gerar Relatório WhatsApp">
                      <MessageCircle size={16} />
                    </a>
                    {canEdit && <button onClick={() => deleteClient(group.client)} className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-all border border-white/5 hover:border-red-500/30" title="Excluir Cliente"><Trash2 size={16} /></button>}
                  </div>
                  <div className="p-1 text-gray-500 flex items-center justify-center">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </div>
              </div>

              {/* CARD BODY (LOJAS DO CLIENTE) */}
              {isExpanded && (
                <div className="bg-black/20 border-t border-white/5 p-4 md:p-6 space-y-3">
                  {group.stores.map((row) => (
                    <div key={row.id} className="group/store flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.03] hover:bg-white/[0.06] p-4 rounded-xl border border-white/5 transition-all shadow-sm">
                      
                      {/* Loja Info */}
                      <div className="flex items-center gap-3 flex-[1.5]">
                        <div className={`w-2 h-8 rounded-full ${row.status === 'success' ? 'bg-emerald-500' : row.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'} shadow-[0_0_10px_rgba(255,255,255,0.1)]`}></div>
                        
                        {editingStoreId === row.id && canEdit ? (
                          <div className="flex flex-col gap-2 w-full max-w-[200px]">
                            <input type="text" value={storeEditData.store} onChange={(e) => setStoreEditData({...storeEditData, store: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-white font-semibold outline-none text-sm w-full" placeholder="Nome Loja" autoFocus />
                            <input type="text" value={storeEditData.marketplace || ''} onChange={(e) => setStoreEditData({...storeEditData, marketplace: e.target.value.toUpperCase()})} className="bg-black/40 border border-indigo-500/30 rounded-lg p-1.5 text-indigo-300 font-semibold outline-none text-xs w-full" placeholder="Marketplace" />
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-200 text-sm">{row.store}</span>
                              {row.marketplace && <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md text-[9px] uppercase tracking-wider font-bold">{row.marketplace}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase border ${row.tier === 'A' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                                Tier {row.tier}
                              </span>
                              {row.responsavel && <span className="text-[10px] text-gray-500 font-medium">👤 {row.responsavel}</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Crescimento & Base */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Cresc. Diário</span>
                          {canEdit ? (
                            <input type="number" value={row.customGrowth !== undefined ? row.customGrowth : ''} placeholder={globalGrowth.toString()} onChange={(e) => handleStoreChange(row.id, 'customGrowth', e.target.value)} className={`w-14 border rounded-md p-1 text-center outline-none focus:border-indigo-500 font-bold text-xs transition-colors ${row.customGrowth !== undefined && row.customGrowth !== '' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-black/40 border-white/10 text-gray-400'}`} />
                          ) : (
                            <span className="text-gray-300 font-bold text-sm bg-black/20 px-2 py-1 rounded-md border border-white/5">{row.customGrowth !== undefined ? row.customGrowth : globalGrowth}%</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {editingStoreId === row.id && canEdit ? (
                            <div className="text-[10px] text-indigo-400 flex items-center gap-1 font-bold">Base: <input type="number" value={storeEditData.gmvBase} onChange={(e) => setStoreEditData({...storeEditData, gmvBase: e.target.value})} className="w-16 bg-black/40 border border-white/10 rounded-md p-1 outline-none text-white font-bold" /></div>
                          ) : (
                            <span className="text-[11px] text-gray-500 font-medium">Base: {formatCurrency(row.gmvBase)}</span>
                          )}
                          <span className="font-bold text-gray-300 text-sm">Meta: {formatCurrency(row.gmvTarget)}</span>
                        </div>
                      </div>

                      {/* Faturamento Atual vs Projeção */}
                      <div className="flex flex-col flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-white text-base">{formatCurrency(row.currentRevenue)}</span>
                          <span className="text-[10px] text-gray-500 font-bold uppercase">Atual</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5 text-[9px] text-gray-400 font-medium">Ads: <span className="text-amber-400">{formatCurrency(row.adsInvestment)}</span></span>
                          <span className="bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5 text-[9px] text-gray-400 font-medium">Ped: <span className="text-white">{row.orders || 0}</span></span>
                        </div>
                      </div>

                      {/* Projeção */}
                      <div className="flex flex-col flex-1">
                        <span className={`font-bold text-sm ${row.status === 'success' ? 'text-emerald-400' : row.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                          {formatCurrency(row.projectedGmv)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium mt-0.5 uppercase tracking-wider">Projeção Final</span>
                        <span className="text-[10px] text-gray-400 mt-1">ROAS: <strong className="text-white">{row.adsInvestment > 0 ? (row.currentRevenue / row.adsInvestment).toFixed(1) : 0}x</strong></span>
                      </div>

                      {/* Ações da Loja */}
                      <div className="flex items-center gap-1.5 flex-[0.5] justify-end">
                        <button onClick={() => openHistoryModal(row)} className={`p-2 rounded-xl transition-all shadow-sm ${row.history?.length > 0 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30' : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'}`} title="Dashboard e Diário">
                          <BarChart2 size={16} />
                        </button>
                        <a href={generateStoreWhatsAppLink(row)} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl transition-all shadow-sm">
                          <MessageCircle size={16} />
                        </a>
                        
                        {canEdit && (
                          <>
                            {editingStoreId === row.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => saveStoreEdit(row.id)} className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl border border-emerald-500/30"><Check size={14}/></button>
                                <button onClick={() => setEditingStoreId(null)} className="p-2 bg-white/10 text-gray-400 hover:bg-white/20 rounded-xl border border-white/10"><X size={14}/></button>
                              </div>
                            ) : (
                              <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover/store:opacity-100 transition-opacity">
                                <button onClick={() => startEditingStore(row)} className="p-2 bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/30 text-gray-500 rounded-xl border border-transparent transition-all"><Edit2 size={14} /></button>
                                <button onClick={() => deleteStore(row.id, row.store)} className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-gray-500 rounded-xl border border-transparent transition-all"><Trash2 size={14} /></button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
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
    </div>
  );
}

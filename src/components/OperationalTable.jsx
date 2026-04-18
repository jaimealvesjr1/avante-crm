import React, { useState } from 'react';
import { Search, Plus, Activity, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, Edit2, Check, X, MessageCircle, Trash2, BarChart2, Filter } from 'lucide-react';

export default function OperationalTable({
  canEdit,
  searchTerm, setSearchTerm, addNewStore, sortBy, setSortBy, currentDay, updateGlobalSettings, globalGrowth,
  dashboardData, expandedClients, toggleClientExpansion, editingClient, clientEditData, setClientEditData,
  saveClientEdit, startEditingClient, addNewStoreToClient, deleteClient,
  editingStoreId, storeEditData, setStoreEditData,
  openHistoryModal,
  formatCurrency, generateStoreWhatsAppLink, startEditingStore, saveStoreEdit, deleteStore, setEditingStoreId, generateClientWhatsAppLink, handleStoreChange
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  // Filtros combinados de Status e Tier
  const filteredGroups = dashboardData.groupedClients.map(group => {
    const matchingStores = group.stores.filter(s => {
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchTier = tierFilter === 'all' || s.tier === tierFilter;
      return matchStatus && matchTier;
    });

    if (matchingStores.length > 0) {
      return { ...group, stores: matchingStores };
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* CABEÇALHO UNIFICADO E ORGANIZADO */}
      <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md">
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-center">
          
          {/* Lado Esquerdo: Busca, Ordenação, Controles Globais e Botão Add Conta */}
          <div className="flex flex-1 gap-4 flex-wrap md:flex-nowrap w-full items-center">
            
            {/* Busca */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-[11px] text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por conta ou loja..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 pl-10 outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10" 
              />
            </div>
            
            {/* Ordenar */}
            <div className="flex flex-col min-w-[160px]">
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)} 
                className="h-10 bg-gray-900 border border-gray-700 text-white rounded-lg px-3 font-bold text-sm outline-none cursor-pointer"
              >
                <option value="gmv">Por Faturamento</option>
                <option value="status">Por Status</option>
                <option value="name">Por Nome</option>
              </select>
            </div>

            {/* Controles Globais de Projeção (Dia e Crescimento) */}
            <div className="flex items-center gap-3 bg-gray-900/80 p-1.5 rounded-lg border border-gray-700 h-10 px-3">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Dia:</label>
                <input 
                  type="number" 
                  value={currentDay} 
                  onChange={(e) => updateGlobalSettings('day', e.target.value)} 
                  className="w-12 bg-gray-800 border border-gray-600 text-white rounded p-1 text-center font-bold outline-none text-xs" 
                />
              </div>
              <div className="w-px h-5 bg-gray-600"></div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Cresc.:</label>
                <input 
                  type="number" 
                  value={globalGrowth} 
                  onChange={(e) => updateGlobalSettings('growth', e.target.value)} 
                  className="w-14 bg-blue-900/40 border border-blue-600 text-blue-200 rounded p-1 text-center font-bold outline-none text-xs" 
                />%
              </div>
            </div>
          </div>

          {/* Lado Direito: Filtros Rápidos (Status e Tier) */}
          <div className="flex flex-wrap items-center gap-3 bg-gray-900/50 p-1.5 rounded-lg border border-gray-700 shrink-0">
             <div className="flex gap-1 border-r border-gray-700 pr-3">
                {['all', 'danger', 'warning', 'success'].map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)} title={`Filtrar Status: ${f}`} className={`p-2 rounded-md transition-all ${statusFilter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}>
                    {f === 'all' ? <Filter size={16}/> : f === 'danger' ? <AlertTriangle size={16}/> : f === 'warning' ? <Clock size={16}/> : <CheckCircle size={16}/>}
                  </button>
                ))}
             </div>
             <div className="flex gap-1 pl-1">
                {['all', 'A', 'B', 'C'].map(t => (
                  <button key={t} onClick={() => setTierFilter(t)} className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all shadow-sm ${tierFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {t === 'all' ? 'TODOS' : `TIER ${t}`}
                  </button>
                ))}
             </div>
          </div>
          
            
            {canEdit && (
              <button onClick={addNewStore} className="h-10 bg-green-600 hover:bg-green-500 text-white px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm ml-auto">
                <Plus size={18} /> Add Conta
              </button>
            )}          
        </div>
      </div>

      {/* TABELA ACCORDION */}
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              {/* DISTRIBUIÇÃO EM PORCENTAGEM (Soma: 100%) */}
              <tr className="bg-gray-900 text-gray-400 text-sm uppercase tracking-wider border-b border-gray-700">
                <th className="py-5 px-4 font-semibold w-[22%]">Conta / Cliente</th>
                <th className="py-5 px-4 font-semibold text-center w-[10%]">Lojas / Tier</th>
                <th className="py-5 px-4 font-semibold text-center w-[10%]">Cresc. (%)</th>
                <th className="py-5 px-4 font-semibold w-[13%]">Base / Meta</th>
                <th className="py-5 px-4 font-semibold text-blue-400 w-[18%]">Métricas</th>
                <th className="py-5 px-4 font-semibold text-purple-400 w-[15%]">Pacing / Projeção</th>
                <th className="py-5 px-4 font-semibold text-center w-[12%]">Ações / Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50 text-base">
              {filteredGroups.length > 0 ? filteredGroups.map((group) => {
                const isExpanded = expandedClients.includes(group.client);
                return (
                  <React.Fragment key={group.client}>
                    {/* LINHA DO CLIENTE (PAI) */}
                    <tr className="bg-gray-800 hover:bg-gray-750 transition-colors cursor-pointer group" onClick={() => toggleClientExpansion(group.client)}>
                      <td className="py-5 px-4 border-l-4 border-blue-500">
                        <div className="flex items-center gap-4">
                          <div className="text-gray-400 group-hover:text-white transition-colors">{isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}</div>
                          <div className="mt-1">
                            {group.status === 'success' && <CheckCircle className="text-green-500" size={22} />}
                            {group.status === 'warning' && <Clock className="text-amber-500" size={22} />}
                            {group.status === 'danger' && <AlertTriangle className="text-red-500" size={22} />}
                          </div>
                          <div onClick={e => e.stopPropagation()} className="flex-1">
                            {editingClient === group.client ? (
                              <div className="flex flex-wrap items-center gap-2 w-full bg-gray-950 p-2 rounded-lg border border-blue-900 shadow-xl z-10 relative">
                                <input type="text" value={clientEditData.name} onChange={e => setClientEditData({...clientEditData, name: e.target.value.toUpperCase()})} className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 outline-none text-white font-bold w-48 text-sm" placeholder="Nome do Cliente" autoFocus />
                                <div className="h-6 w-px bg-gray-700 mx-1"></div>
                                <span className="text-xs text-gray-400 font-medium">Cobrança:</span>
                                <select value={clientEditData.feeType} onChange={(e) => setClientEditData({...clientEditData, feeType: e.target.value})} className="bg-gray-800 border border-gray-600 rounded p-1.5 outline-none text-xs font-semibold text-white cursor-pointer">
                                  <option value="percent">% Fee</option>
                                  <option value="fixed">R$ Fixo</option>
                                </select>
                                {clientEditData.feeType === 'fixed' ? (
                                  <input type="number" value={clientEditData.fixedFee} onChange={(e) => setClientEditData({...clientEditData, fixedFee: e.target.value})} className="w-24 bg-gray-800 border border-gray-600 text-white rounded p-1.5 outline-none font-bold text-sm" placeholder="Valor R$" />
                                ) : (
                                  <input type="number" step="0.1" value={clientEditData.feePercent} onChange={(e) => setClientEditData({...clientEditData, feePercent: e.target.value})} className="w-20 bg-gray-800 border border-gray-600 text-white rounded p-1.5 outline-none font-bold text-sm" placeholder="%" />
                                )}
                                <div className="flex gap-1 ml-auto">
                                  <button onClick={() => saveClientEdit(group.client)} className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded shadow-sm"><Check size={16}/></button>
                                  <button onClick={() => setEditingClient(null)} className="p-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded shadow-sm"><X size={16}/></button>
                                </div>
                              </div>
                            ) : (
                              <div className="font-bold text-gray-100 text-lg flex items-center gap-3 group-hover:text-blue-100">
                                {group.client}
                                <span className="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs text-gray-400 font-medium whitespace-nowrap shadow-sm">
                                  {group.feeType === 'fixed' || group.fixedFee > 0 ? `Fixo: R$ ${group.fixedFee}` : `Fee: ${group.feePercent || 0}%`}
                                </span>
                                {canEdit && <button onClick={() => startEditingClient(group)} className="text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={16}/></button>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* WHITESPACE-NOWRAP APLICADO AQUI PARA "7 LOJAS" */}
                      <td className="py-5 px-4 text-center">
                        <span className="px-3 py-1.5 rounded text-sm font-bold bg-gray-900 text-gray-400 border border-gray-700 shadow-sm whitespace-nowrap">
                          {group.stores.length} Lojas
                        </span>
                      </td>
                      <td className="py-5 px-4 text-center text-gray-500">-</td>
                      <td className="py-5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm text-gray-500 font-medium whitespace-nowrap">Base: {formatCurrency(group.totalGmvBase)}</div>
                          <div className="font-bold text-gray-300 text-base whitespace-nowrap">Meta: {formatCurrency(group.totalGmvTarget)}</div>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <div className="font-bold text-blue-400 text-xl leading-none mb-2">{formatCurrency(group.totalCurrentRevenue)}</div>
                        <div className="text-xs text-gray-500 font-medium">Ads: <span className="text-amber-400 whitespace-nowrap">{formatCurrency(group.totalAds)}</span></div>
                      </td>
                      <td className="py-5 px-4">
                        <div className={`font-bold text-xl leading-none mb-2 ${group.status === 'success' ? 'text-green-400' : group.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>{formatCurrency(group.totalProjectedGmv)}</div>
                        <div className="w-full bg-gray-900 rounded-full h-2 mt-2 border border-gray-700 overflow-hidden shadow-inner">
                          <div className={`h-2 rounded-full ${group.status === 'success' ? 'bg-green-500' : group.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(group.percentReached, 100)}%` }}></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1.5 flex justify-between font-medium">
                          <span>{group.percentReached.toFixed(1)}%</span>
                          <span>ROAS: <span className="font-bold text-gray-300">{group.roas}x</span></span>
                        </div>
                      </td>
                      <td className="py-5 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-3">
                          {canEdit && <button onClick={() => addNewStoreToClient(group.client)} className="p-2.5 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors" title="Add Loja"><Plus size={18} /></button>}
                          <a href={generateClientWhatsAppLink(group)} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-sm font-bold py-2 px-4 rounded-lg shadow-md transition-transform hover:scale-105 ${group.status === 'danger' ? 'bg-red-600' : group.status === 'warning' ? 'bg-amber-600' : 'bg-green-600'} text-white`}>
                            <MessageCircle size={16} /> Relatório
                          </a>
                          {canEdit && <button onClick={() => deleteClient(group.client)} className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-gray-700 rounded-lg transition-colors" title="Apagar Cliente"><Trash2 size={18} /></button>}
                        </div>
                      </td>
                    </tr>

                    {/* LINHAS DAS LOJAS (FILHOS) */}
                    {isExpanded && group.stores.map((row) => (
                      <tr key={row.id} className="bg-gray-900/40 hover:bg-gray-800/80 transition-colors group/row">
                        <td className="py-3 px-4 pl-14 relative">
                          <div className="absolute left-7 top-0 bottom-0 w-px bg-gray-700"></div>
                          <div className="absolute left-7 top-1/2 w-5 h-px bg-gray-700"></div>
                          <div className="flex items-center gap-3">
                            <div>
                              {row.status === 'success' && <CheckCircle className="text-green-500/70" size={16} />}
                              {row.status === 'warning' && <Clock className="text-amber-500/70" size={16} />}
                              {row.status === 'danger' && <AlertTriangle className="text-red-500/70" size={16} />}
                            </div>
                            {editingStoreId === row.id && canEdit ? (
                              <div className="flex flex-col gap-2 w-full bg-gray-950 p-2 rounded-lg border border-blue-900 shadow-xl z-10 relative">
                                <input type="text" value={storeEditData.store} onChange={(e) => setStoreEditData({...storeEditData, store: e.target.value})} className="bg-gray-800 border border-gray-600 rounded p-1 text-white font-semibold outline-none text-sm w-full" placeholder="Nome Loja" autoFocus />
                              </div>
                            ) : (
                              <div className="flex flex-col w-full">
                                <span className="font-semibold text-gray-300 text-sm">{row.store}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-sm whitespace-nowrap ${row.tier === 'A' ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700' : row.tier === 'B' ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-gray-900 text-gray-500 border-gray-700'}`}>
                            Tier {row.tier}
                          </span>
                        </td>
                        
                        <td className="py-3 px-4 text-center">
                          {canEdit ? (
                            <input type="number" value={row.customGrowth !== undefined ? row.customGrowth : ''} placeholder={globalGrowth.toString()} onChange={(e) => handleStoreChange(row.id, 'customGrowth', e.target.value)} className={`w-14 border rounded p-1 text-center focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-xs transition-colors ${row.customGrowth !== undefined && row.customGrowth !== '' ? 'bg-blue-900/40 border-blue-500 text-blue-200' : 'bg-gray-800 border-gray-700 text-gray-300'}`} />
                          ) : (
                            <span className="text-gray-400 font-bold text-xs">{row.customGrowth !== undefined ? row.customGrowth : globalGrowth}%</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            {editingStoreId === row.id && canEdit ? (
                              <div className="text-[11px] text-blue-400 flex items-center gap-2 font-medium">Base: <input type="number" value={storeEditData.gmvBase} onChange={(e) => setStoreEditData({...storeEditData, gmvBase: e.target.value})} className="w-20 bg-gray-800 border border-gray-600 rounded p-1 outline-none text-white font-bold" /></div>
                            ) : (
                              <div className="text-[11px] text-gray-400 font-medium whitespace-nowrap">Base: {formatCurrency(row.gmvBase)}</div>
                            )}
                            <div className="font-bold text-gray-300 text-sm whitespace-nowrap">Meta: {formatCurrency(row.gmvTarget)}</div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-blue-300 text-base mb-1">{formatCurrency(row.currentRevenue)}</div>
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-300">
                            <span className="bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700 shadow-sm whitespace-nowrap">Ads: <span className="text-amber-400 font-bold">{formatCurrency(row.adsInvestment)}</span></span>
                            <span className="bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700 shadow-sm whitespace-nowrap">Ped: <span className="text-green-400 font-bold">{row.orders || 0}</span></span>
                            <span className="bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700 shadow-sm whitespace-nowrap">Unid: <span className="text-purple-400 font-bold">{row.units || 0}</span></span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className={`font-bold text-sm leading-none mb-1 ${row.status === 'success' ? 'text-green-400/90' : row.status === 'warning' ? 'text-amber-400/90' : 'text-red-400/90'}`}>
                            {formatCurrency(row.projectedGmv)}
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">ROAS: <span className="font-bold text-gray-300">{row.adsInvestment > 0 ? (row.currentRevenue / row.adsInvestment).toFixed(1) : 0}x</span></div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openHistoryModal(row)} className={`p-1.5 rounded-lg transition-colors relative shadow-sm ${row.history?.length > 0 ? 'bg-blue-900/60 text-blue-300 hover:bg-blue-700' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`} title="Dashboard e Diário">
                              <BarChart2 size={16} />
                            </button>
                            <a href={generateStoreWhatsAppLink(row)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-800 hover:bg-green-600/30 text-green-500 rounded-lg transition-colors shadow-sm">
                              <MessageCircle size={16} />
                            </a>
                            
                            {canEdit && (
                              <>
                                {editingStoreId === row.id ? (
                                  <div className="flex gap-1.5">
                                    <button onClick={() => saveStoreEdit(row.id)} className="p-1.5 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-500"><Check size={14}/></button>
                                    <button onClick={() => setEditingStoreId(null)} className="p-1.5 bg-gray-600 text-white rounded-lg shadow-sm hover:bg-gray-500"><X size={14}/></button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1.5 opacity-20 group-hover/row:opacity-100 transition-opacity">
                                    <button onClick={() => startEditingStore(row)} className="p-1.5 bg-gray-800 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg shadow-sm transition-colors"><Edit2 size={14} /></button>
                                    <button onClick={() => deleteStore(row.id, row.store)} className="p-1.5 bg-gray-800 hover:text-red-400 hover:bg-red-900/30 rounded-lg shadow-sm transition-colors"><Trash2 size={14} /></button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              }) : (
                <tr><td colSpan="7" className="p-12 text-center text-gray-500 text-base font-medium">Nenhuma conta encontrada ou os filtros não retornaram resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

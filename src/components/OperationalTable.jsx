import React, { useState } from 'react';
import { Search, Plus, Activity, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, Edit2, Check, X, MessageCircle, Trash2, BarChart2, Filter } from 'lucide-react';

export default function OperationalTable({
  canEdit,
  searchTerm, setSearchTerm, addNewStore, sortBy, setSortBy, currentDay, setCurrentDay, globalGrowth, setGlobalGrowth,
  dashboardData, expandedClients, toggleClientExpansion, editingClient, clientEditValue, setClientEditValue,
  saveClientEdit, startEditingClient, setEditingClient, addNewStoreToClient, generateClientWhatsAppLink, deleteClient,
  editingStoreId, storeEditData, setStoreEditData, handleStoreChange, autoSaveHistory, openHistoryModal,
  formatCurrency, generateStoreWhatsAppLink, startEditingStore, saveStoreEdit, deleteStore, setEditingStoreId
}) {
  // Estado local para os filtros rápidos de Status
  const [statusFilter, setStatusFilter] = useState('all');

  // Função para dar cor ao Marketplace
  const getMarketplaceBadge = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('shopee')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (lower.includes('meli') || lower.includes('mercado')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (lower.includes('shein')) return 'bg-gray-800 text-gray-200 border-gray-600';
    if (lower.includes('tiktok')) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    return 'bg-gray-700 text-gray-300 border-gray-600';
  };

  // Aplica o filtro rápido sobre os dados que vêm do App.jsx
  const filteredGroups = dashboardData.groupedClients.map(group => {
    if (statusFilter === 'all') return group;
    
    // Filtra as lojas dentro do grupo que correspondem ao status
    const matchingStores = group.stores.filter(s => s.status === statusFilter);
    
    // Se o grupo todo tem o status ou tem lojas com o status, mostra-o
    if (group.status === statusFilter || matchingStores.length > 0) {
      return { ...group, stores: statusFilter === 'all' ? group.stores : matchingStores };
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Controles Principais */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Activity className="text-green-500" /> CRM Avante - Operação</h1>
          <p className="text-gray-400 mt-1 text-sm">Atualização diária de GMV, Ads e Diário de Bordo</p>
        </div>
        
        <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
          <div className="flex flex-col grow xl:grow-0">
            <label className="text-xs font-semibold text-gray-400 uppercase mb-1">Buscar Conta / Loja</label>
            <div className="relative flex gap-2">
              <div className="relative grow">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full xl:w-48 bg-gray-900 border border-gray-600 text-white rounded-lg p-2 pl-9 focus:ring-2 focus:ring-blue-500 outline-none h-[42px]" />
              </div>
              {canEdit && (
                <button onClick={addNewStore} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors h-[42px] whitespace-nowrap"><Plus size={18} /> Add Loja</button>
              )}
            </div>
          </div>
          
          <div className="flex gap-4 bg-gray-900 p-3 rounded-lg border border-gray-700">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-400 uppercase mb-1">Ordenar</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-gray-800 border border-gray-600 text-white rounded p-1 font-bold outline-none h-[30px] text-xs">
                <option value="gmv">Maior GMV</option>
                <option value="status">Status (Críticos)</option>
                <option value="name">Alfabética</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-400 uppercase mb-1">Dia Atual</label>
              <input type="number" value={currentDay} onChange={(e) => setCurrentDay(Number(e.target.value))} className="w-16 bg-gray-800 border border-gray-600 text-white rounded p-1 text-center font-bold outline-none h-[30px]" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-400 uppercase mb-1">Cresc. %</label>
              <input type="number" value={globalGrowth} onChange={(e) => setGlobalGrowth(Number(e.target.value))} className="w-16 bg-blue-900 border border-blue-600 text-blue-200 rounded p-1 text-center font-bold outline-none h-[30px]" />
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS RÁPIDOS */}
      <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-xl border border-gray-700 overflow-x-auto shadow-sm">
        <div className="flex items-center gap-2 text-gray-400 border-r border-gray-700 pr-4 mr-1">
          <Filter size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Filtros Rápidos</span>
        </div>
        <button onClick={() => setStatusFilter('all')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${statusFilter === 'all' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'}`}>
          Todas as Lojas
        </button>
        <button onClick={() => setStatusFilter('danger')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border flex items-center gap-1 ${statusFilter === 'danger' ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-red-400'}`}>
          <AlertTriangle size={12} /> Crítico (&lt;80%)
        </button>
        <button onClick={() => setStatusFilter('warning')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border flex items-center gap-1 ${statusFilter === 'warning' ? 'bg-amber-900/50 border-amber-500 text-amber-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-amber-400'}`}>
          <Clock size={12} /> Alerta (80-94%)
        </button>
        <button onClick={() => setStatusFilter('success')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border flex items-center gap-1 ${statusFilter === 'success' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-green-400'}`}>
          <CheckCircle size={12} /> No Ritmo (≥95%)
        </button>
      </div>

      {/* TABELA ACCORDION */}
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                <th className="p-4 font-semibold w-1/4">Conta / Cliente</th>
                <th className="p-4 font-semibold text-center w-24">Lojas/Tier</th>
                <th className="p-4 font-semibold text-center w-24">Cresc. (%)</th>
                <th className="p-4 font-semibold">Base / Meta (Mês)</th>
                <th className="p-4 font-semibold text-blue-400">Faturado & Ads</th>
                <th className="p-4 font-semibold text-purple-400 w-48">Pacing / Projeção Final</th>
                <th className="p-4 font-semibold w-1/4 text-center">Ações / Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50 text-sm">
              {filteredGroups.length > 0 ? filteredGroups.map((group) => {
                const isExpanded = expandedClients.includes(group.client);
                return (
                  <React.Fragment key={group.client}>
                    {/* LINHA DO CLIENTE (PAI) */}
                    <tr className="bg-gray-800 hover:bg-gray-750 transition-colors cursor-pointer group" onClick={() => toggleClientExpansion(group.client)}>
                      <td className="p-4 border-l-4 border-blue-500">
                        <div className="flex items-center gap-3">
                          <div className="text-gray-400 group-hover:text-white transition-colors">{isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</div>
                          <div className="mt-1">
                            {group.status === 'success' && <CheckCircle className="text-green-500" size={18} />}
                            {group.status === 'warning' && <Clock className="text-amber-500" size={18} />}
                            {group.status === 'danger' && <AlertTriangle className="text-red-500" size={18} />}
                          </div>
                          <div onClick={e => e.stopPropagation()} className="flex-1">
                            {editingClient === group.client ? (
                              <div className="flex items-center gap-2">
                                <input type="text" value={clientEditValue} onChange={e => setClientEditValue(e.target.value.toUpperCase())} className="bg-gray-900 border border-blue-500 rounded px-2 py-1 outline-none text-white font-bold w-full" autoFocus />
                                <button onClick={() => saveClientEdit(group.client)} className="p-1 bg-green-600 hover:bg-green-500 text-white rounded"><Check size={16}/></button>
                                <button onClick={() => setEditingClient(null)} className="p-1 bg-gray-600 hover:bg-gray-500 text-white rounded"><X size={16}/></button>
                              </div>
                            ) : (
                              <div className="font-bold text-gray-100 text-base flex items-center gap-2 group-hover:text-blue-100">
                                {group.client}
                                <button onClick={() => startEditingClient(group.client)} className="text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14}/></button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center"><span className="px-2 py-1 rounded text-xs font-bold bg-gray-900 text-gray-400 border border-gray-700">{group.stores.length} Lojas</span></td>
                      <td className="p-4 text-center text-gray-500">-</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="text-xs text-gray-500">Base: {formatCurrency(group.totalGmvBase)}</div>
                          <div className="font-bold text-gray-300">Meta: {formatCurrency(group.totalGmvTarget)}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-blue-400 text-lg leading-none mb-1">{formatCurrency(group.totalCurrentRevenue)}</div>
                        <div className="text-[10px] text-gray-500">Ads: {formatCurrency(group.totalAds)}</div>
                      </td>
                      <td className="p-4">
                        <div className={`font-bold text-lg leading-none mb-1 ${group.status === 'success' ? 'text-green-400' : group.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>{formatCurrency(group.totalProjectedGmv)}</div>
                        {/* BARRA DE PROGRESSO DO CLIENTE */}
                        <div className="w-full bg-gray-900 rounded-full h-1.5 mt-1.5 border border-gray-700 overflow-hidden">
                          <div className={`h-1.5 rounded-full ${group.status === 'success' ? 'bg-green-500' : group.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(group.percentReached, 100)}%` }}></div>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                          <span>{group.percentReached.toFixed(1)}%</span>
                          <span>ROAS: <span className="font-bold text-gray-400">{group.roas}x</span></span>
                        </div>
                      </td>
                      <td className="p-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          {canEdit && <button onClick={() => addNewStoreToClient(group.client)} className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded transition-colors" title="Add Loja"><Plus size={16} /></button>}
                          <a href={generateClientWhatsAppLink(group)} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition-transform hover:scale-105 ${group.status === 'danger' ? 'bg-red-600' : group.status === 'warning' ? 'bg-amber-600' : 'bg-green-600'} text-white`}>
                            <MessageCircle size={14} /> Relatório
                          </a>
                          {canEdit && <button onClick={() => deleteClient(group.client)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-700 rounded transition-colors" title="Apagar Cliente"><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    </tr>

                    {/* LINHAS DAS LOJAS (FILHOS) */}
                    {isExpanded && group.stores.map((row) => (
                      <tr key={row.id} className="bg-gray-900/50 hover:bg-gray-800/80 transition-colors group/row border-b border-gray-800/50">
                        <td className="p-4 pl-12 relative">
                          <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-700"></div><div className="absolute left-6 top-1/2 w-4 h-px bg-gray-700"></div>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {row.status === 'success' && <CheckCircle className="text-green-500/70" size={16} />}
                              {row.status === 'warning' && <Clock className="text-amber-500/70" size={16} />}
                              {row.status === 'danger' && <AlertTriangle className="text-red-500/70" size={16} />}
                            </div>
                            {editingStoreId === row.id ? (
                              <div className="flex flex-col gap-1 w-full bg-gray-950 p-2 rounded border border-blue-900">
                                <input type="text" value={storeEditData.store} onChange={(e) => setStoreEditData({...storeEditData, store: e.target.value})} className="bg-gray-800 border border-gray-600 rounded px-1 outline-none text-white text-sm font-semibold" placeholder="Nome da Loja" />
                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                  Fee: <input type="number" step="0.1" value={storeEditData.feePercent} onChange={(e) => setStoreEditData({...storeEditData, feePercent: e.target.value})} className="w-12 bg-gray-800 border border-gray-600 rounded px-1 outline-none text-center" />%
                                  Canal: 
                                  <select value={storeEditData.marketplace || ''} onChange={(e) => setStoreEditData({...storeEditData, marketplace: e.target.value})} className="bg-gray-800 border border-gray-600 rounded px-1 outline-none text-[9px] py-0.5">
                                    <option value="">Outro</option><option value="Shopee">Shopee</option><option value="Meli">Meli</option><option value="Shein">Shein</option><option value="TikTok">TikTok</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 w-full">
                                <div className="font-semibold text-gray-300 flex items-center flex-wrap gap-2">
                                  {row.store} 
                                  {/* BADGE DO MARKETPLACE */}
                                  {row.marketplace && <span className={`px-1.5 py-0.5 rounded border text-[9px] uppercase tracking-wider font-bold ${getMarketplaceBadge(row.marketplace)}`}>{row.marketplace}</span>}
                                </div>
                                <span className="text-[10px] text-gray-500">Fee: {row.feePercent}% {row.fixedFee > 0 && `| Fixo: R$${row.fixedFee}`}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${row.tier === 'A' ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-800' : row.tier === 'B' ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-900 text-gray-600 border border-gray-800'}`}>Tier {row.tier}</span></td>
                        <td className="p-4 text-center">
                          {canEdit ? (
                            <input type="number" value={row.customGrowth !== undefined ? row.customGrowth : ''} placeholder={globalGrowth.toString()} onChange={(e) => handleStoreChange(row.id, 'customGrowth', e.target.value)} className={`w-14 border rounded p-1 text-center font-medium text-xs ${row.customGrowth !== undefined && row.customGrowth !== '' ? 'bg-blue-900/30 border-blue-600 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400 outline-none focus:border-blue-500'}`} />
                          ) : (
                            <span className="text-gray-400 font-medium text-xs">{row.customGrowth !== undefined && row.customGrowth !== '' ? row.customGrowth : globalGrowth}%</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {editingStoreId === row.id && canEdit ? (
                              <div className="text-[11px] text-blue-400 flex items-center gap-1">Base: <input type="number" value={storeEditData.gmvBase} onChange={(e) => setStoreEditData({...storeEditData, gmvBase: e.target.value})} className="w-20 bg-gray-800 border border-gray-600 rounded px-1 outline-none text-white text-center" /></div>
                            ) : (
                              <div className="text-[11px] text-gray-500">Base: {formatCurrency(row.gmvBase)}</div>
                            )}
                            <div className="font-medium text-gray-300 text-sm">Meta: {formatCurrency(row.gmvTarget)}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-start gap-2">
                            {canEdit ? (
                              <div className="flex flex-col gap-1.5">
                                <input type="number" value={row.currentRevenue || ''} onChange={(e) => handleStoreChange(row.id, 'currentRevenue', e.target.value)} onBlur={(e) => autoSaveHistory(row.id, e.target.value)} className="w-24 bg-gray-950 border border-gray-700 text-blue-300 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-sm" placeholder="R$ Atual" />
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] text-gray-500">Ads:</span>
                                  <input type="number" value={row.adsInvestment || ''} onChange={(e) => handleStoreChange(row.id, 'adsInvestment', e.target.value)} className="w-16 bg-gray-800 border border-gray-700 text-gray-300 rounded p-1 focus:outline-none focus:border-amber-500 text-xs" placeholder="0" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <div className="font-bold text-blue-300 text-sm">{formatCurrency(row.currentRevenue)}</div>
                                <div className="text-[10px] text-gray-500">Ads: {formatCurrency(row.adsInvestment)}</div>
                              </div>
                            )}
                            <button onClick={() => openHistoryModal(row)} className={`p-1.5 mt-1 rounded transition-colors relative group border ${row.history?.length > 0 ? 'bg-blue-900/30 border-blue-800 text-blue-400 hover:bg-blue-800' : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700'}`} title="Abrir Dashboard da Loja"><BarChart2 size={16} /></button>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`font-bold text-sm leading-none mb-1 ${row.status === 'success' ? 'text-green-400/80' : row.status === 'warning' ? 'text-amber-400/80' : 'text-red-400/80'}`}>{formatCurrency(row.projectedGmv)}</div>
                          {/* BARRA DE PROGRESSO INDIVIDUAL DA LOJA */}
                          <div className="w-full bg-gray-950 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div className={`h-1 rounded-full ${row.status === 'success' ? 'bg-green-500' : row.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(row.percentReached, 100)}%` }}></div>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                            <span>{row.percentReached.toFixed(1)}%</span>
                            <span>ROAS: <span className="font-bold text-gray-400">{row.adsInvestment > 0 ? (row.currentRevenue / row.adsInvestment).toFixed(1) : 0}x</span></span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 text-[10px] p-1.5 rounded bg-gray-900 border border-gray-800 text-gray-400 leading-tight italic line-clamp-2" title={row.recommendation}>{row.recommendation}</div>
                            {editingStoreId === row.id && canEdit ? (
                              <div className="flex flex-col gap-1">
                                <button onClick={() => saveStoreEdit(row.id)} className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded"><Check size={14}/></button>
                                <button onClick={() => setEditingStoreId(null)} className="p-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded"><X size={14}/></button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 opacity-30 group-hover/row:opacity-100 transition-opacity">
                                <div className="flex gap-1"><a href={generateStoreWhatsAppLink(row)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-800 hover:bg-green-600/20 text-green-500 rounded transition-colors"><MessageCircle size={14} /></a></div>
                                {canEdit && (
                                  <div className="flex gap-1">
                                    <button onClick={() => startEditingStore(row)} className="p-1.5 bg-gray-800 hover:bg-blue-900/40 text-gray-400 hover:text-blue-400 rounded transition-colors"><Edit2 size={14} /></button>
                                    <button onClick={() => deleteStore(row.id, row.store)} className="p-1.5 bg-gray-800 hover:bg-red-900/40 text-gray-500 hover:text-red-400 rounded transition-colors"><Trash2 size={14} /></button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              }) : (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Nenhuma conta encontrada ou os filtros não retornaram resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

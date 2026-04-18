import React, { useState } from 'react';
import { Search, Plus, Activity, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, Edit2, Check, X, MessageCircle, Trash2, BarChart2, Filter } from 'lucide-react';

export default function OperationalTable({
  canEdit,
  searchTerm, setSearchTerm, addNewStore, sortBy, setSortBy, currentDay, setCurrentDay, globalGrowth, setGlobalGrowth,
  dashboardData, expandedClients, toggleClientExpansion, editingClient, clientEditValue, setClientEditValue,
  saveClientEdit, startEditingClient, addNewStoreToClient, deleteClient,
  editingStoreId, storeEditData, setStoreEditData,
  openHistoryModal,
  formatCurrency, generateStoreWhatsAppLink, startEditingStore, saveStoreEdit, deleteStore, setEditingStoreId, generateClientWhatsAppLink, updateGlobalSettings, handleStoreChange
}) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredGroups = dashboardData.groupedClients.map(group => {
    if (statusFilter === 'all') return group;
    const matchingStores = group.stores.filter(s => s.status === statusFilter);
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
            <label className="text-sm font-semibold text-gray-400 uppercase mb-1">Buscar Conta / Loja</label>
            <div className="relative flex gap-2">
              <div className="relative grow">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full xl:w-64 bg-gray-900 border border-gray-600 text-white rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              {canEdit && (
                <button onClick={addNewStore} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"><Plus size={20} /> Add Loja</button>
              )}
            </div>
          </div>
          
          <div className="flex gap-5 bg-gray-900 p-3.5 rounded-lg border border-gray-700">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-400 uppercase mb-1">Ordenar</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-gray-800 border border-gray-600 text-white rounded p-1.5 font-bold outline-none text-sm">
                <option value="gmv">Maior GMV</option>
                <option value="status">Status (Críticos)</option>
                <option value="name">Alfabética</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-400 uppercase mb-1">Dia Atual</label>
              <input type="number" value={currentDay} onChange={(e) => updateGlobalSettings('day', e.target.value)} className="w-20 bg-gray-800 border border-gray-600 text-white rounded p-1.5 text-center font-bold outline-none text-sm" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-400 uppercase mb-1">Cresc. %</label>
              <input type="number" value={globalGrowth} onChange={(e) => updateGlobalSettings('growth', e.target.value)} className="w-20 bg-blue-900 border border-blue-600 text-blue-200 rounded p-1.5 text-center font-bold outline-none text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS RÁPIDOS */}
      <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700 overflow-x-auto shadow-sm">
        <div className="flex items-center gap-2 text-gray-400 border-r border-gray-700 pr-5 mr-1">
          <Filter size={18} />
          <span className="text-sm font-bold uppercase tracking-wider">Filtros</span>
        </div>
        <button onClick={() => setStatusFilter('all')} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors border ${statusFilter === 'all' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'}`}>
          Todas as Lojas
        </button>
        <button onClick={() => setStatusFilter('danger')} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors border flex items-center gap-2 ${statusFilter === 'danger' ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-red-400'}`}>
          <AlertTriangle size={16} /> Crítico (&lt;80%)
        </button>
        <button onClick={() => setStatusFilter('warning')} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors border flex items-center gap-2 ${statusFilter === 'warning' ? 'bg-amber-900/50 border-amber-500 text-amber-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-amber-400'}`}>
          <Clock size={16} /> Alerta (80-94%)
        </button>
        <button onClick={() => setStatusFilter('success')} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors border flex items-center gap-2 ${statusFilter === 'success' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-green-400'}`}>
          <CheckCircle size={16} /> No Ritmo (≥95%)
        </button>
      </div>

      {/* TABELA ACCORDION */}
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-sm uppercase tracking-wider border-b border-gray-700">
                <th className="py-5 px-4 font-semibold w-1/4">Conta / Cliente</th>
                <th className="py-5 px-4 font-semibold text-center w-28">Lojas/Tier</th>
                <th className="py-5 px-4 font-semibold text-center w-28">Cresc. (%)</th>
                <th className="py-5 px-4 font-semibold">Base / Meta (Mês)</th>
                <th className="py-5 px-4 font-semibold text-blue-400 w-64">Faturamento & Métricas</th>
                <th className="py-5 px-4 font-semibold text-purple-400 w-56">Pacing / Projeção</th>
                <th className="py-5 px-4 font-semibold w-1/4 text-center">Ações / Gestão</th>
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
                              <div className="flex items-center gap-2">
                                <input type="text" value={clientEditValue} onChange={e => setClientEditValue(e.target.value.toUpperCase())} className="bg-gray-900 border border-blue-500 rounded px-3 py-1.5 outline-none text-white font-bold w-full text-lg" autoFocus />
                                <button onClick={() => saveClientEdit(group.client)} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded"><Check size={18}/></button>
                                <button onClick={() => setEditingClient(null)} className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded"><X size={18}/></button>
                              </div>
                            ) : (
                              <div className="font-bold text-gray-100 text-lg flex items-center gap-3 group-hover:text-blue-100">
                                {group.client}
                                {canEdit && <button onClick={() => startEditingClient(group.client)} className="text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={16}/></button>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4 text-center"><span className="px-3 py-1.5 rounded text-sm font-bold bg-gray-900 text-gray-400 border border-gray-700 shadow-sm">{group.stores.length} Lojas</span></td>
                      <td className="py-5 px-4 text-center text-gray-500">-</td>
                      <td className="py-5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm text-gray-500 font-medium">Base: {formatCurrency(group.totalGmvBase)}</div>
                          <div className="font-bold text-gray-300 text-base">Meta: {formatCurrency(group.totalGmvTarget)}</div>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <div className="font-bold text-blue-400 text-xl leading-none mb-2">{formatCurrency(group.totalCurrentRevenue)}</div>
                        <div className="text-xs text-gray-500 font-medium">Ads: <span className="text-amber-400">{formatCurrency(group.totalAds)}</span></div>
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
                        <td className="py-5 px-4 pl-14 relative">
                          <div className="absolute left-7 top-0 bottom-0 w-px bg-gray-700"></div><div className="absolute left-7 top-1/2 w-5 h-px bg-gray-700"></div>
                          <div className="flex items-center gap-4">
                            <div>
                              {row.status === 'success' && <CheckCircle className="text-green-500/70" size={18} />}
                              {row.status === 'warning' && <Clock className="text-amber-500/70" size={18} />}
                              {row.status === 'danger' && <AlertTriangle className="text-red-500/70" size={18} />}
                            </div>
                            {editingStoreId === row.id && canEdit ? (
                              <div className="flex flex-col gap-2 w-full bg-gray-950 p-3 rounded-lg border border-blue-900 shadow-xl z-10">
                                <input type="text" value={storeEditData.store} onChange={(e) => setStoreEditData({...storeEditData, store: e.target.value})} className="bg-gray-800 border border-gray-600 rounded p-1.5 text-white font-semibold outline-none text-sm" placeholder="Nome Loja" />
                                
                                <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                  <span className="font-medium">Comissão:</span>
                                  <select value={storeEditData.feeType} onChange={(e) => setStoreEditData({...storeEditData, feeType: e.target.value})} className="bg-gray-800 border border-gray-600 rounded p-1.5 outline-none text-xs font-semibold text-white">
                                    <option value="percent">% Fee</option>
                                    <option value="fixed">R$ Fixo</option>
                                  </select>
                                  {storeEditData.feeType === 'fixed' ? (
                                    <input type="number" value={storeEditData.fixedFee} onChange={(e) => setStoreEditData({...storeEditData, fixedFee: e.target.value})} className="w-20 bg-gray-800 border border-gray-600 text-white rounded p-1.5 outline-none font-bold text-sm" placeholder="Valor R$" />
                                  ) : (
                                    <input type="number" step="0.1" value={storeEditData.feePercent} onChange={(e) => setStoreEditData({...storeEditData, feePercent: e.target.value})} className="w-16 bg-gray-800 border border-gray-600 text-white rounded p-1.5 outline-none font-bold text-sm" placeholder="%" />
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 w-full">
                                <span className="font-semibold text-gray-200 text-base">{row.store}</span>
                                <span className="text-xs text-gray-500 font-medium">
                                  {row.feeType === 'fixed' || row.fixedFee > 0 ? `Fee: R$ ${row.fixedFee}` : `Fee: ${row.feePercent}%`}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="py-5 px-4 text-center">
                          <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border shadow-sm ${row.tier === 'A' ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700' : row.tier === 'B' ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-gray-900 text-gray-500 border-gray-700'}`}>Tier {row.tier}</span>
                        </td>
                        
                        <td className="py-5 px-4 text-center">
                          {canEdit ? (
                            <input type="number" value={row.customGrowth !== undefined ? row.customGrowth : ''} placeholder={globalGrowth.toString()} onChange={(e) => handleStoreChange(row.id, 'customGrowth', e.target.value)} className={`w-16 border rounded-lg p-1.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm transition-colors ${row.customGrowth !== undefined && row.customGrowth !== '' ? 'bg-blue-900/40 border-blue-500 text-blue-200' : 'bg-gray-800 border-gray-700 text-gray-300'}`} />
                          ) : (
                            <span className="text-gray-300 font-bold text-sm">{row.customGrowth !== undefined ? row.customGrowth : globalGrowth}%</span>
                          )}
                        </td>

                        <td className="py-5 px-4">
                          <div className="flex flex-col gap-1.5">
                            {editingStoreId === row.id && canEdit ? (
                              <div className="text-xs text-blue-400 flex items-center gap-2 font-medium">Base: R$ <input type="number" value={storeEditData.gmvBase} onChange={(e) => setStoreEditData({...storeEditData, gmvBase: e.target.value})} className="w-24 bg-gray-800 border border-gray-600 rounded p-1 outline-none text-white font-bold" /></div>
                            ) : (
                              <div className="text-xs text-gray-400 font-medium">Base: {formatCurrency(row.gmvBase)}</div>
                            )}
                            <div className="font-bold text-gray-200 text-sm">Meta: {formatCurrency(row.gmvTarget)}</div>
                          </div>
                        </td>

                        {/* NOVO LAYOUT DE MÉTRICAS - BADGES E TEXTO MAIOR */}
                        <td className="py-5 px-4">
                          <div className="font-bold text-blue-300 text-lg mb-2">{formatCurrency(row.currentRevenue)}</div>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                            <span className="bg-gray-950 px-2 py-1 rounded-md border border-gray-800 shadow-sm flex items-center gap-1">Ads: <span className="text-amber-400 font-bold">{formatCurrency(row.adsInvestment)}</span></span>
                            <span className="bg-gray-950 px-2 py-1 rounded-md border border-gray-800 shadow-sm flex items-center gap-1">Ped: <span className="text-green-400 font-bold">{row.orders || 0}</span></span>
                            <span className="bg-gray-950 px-2 py-1 rounded-md border border-gray-800 shadow-sm flex items-center gap-1">Unid: <span className="text-purple-400 font-bold">{row.units || 0}</span></span>
                          </div>
                        </td>

                        <td className="py-5 px-4">
                          <div className={`font-bold text-base leading-none mb-1.5 ${row.status === 'success' ? 'text-green-400/90' : row.status === 'warning' ? 'text-amber-400/90' : 'text-red-400/90'}`}>
                            {formatCurrency(row.projectedGmv)}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">ROAS: <span className="font-bold text-gray-300">{row.adsInvestment > 0 ? (row.currentRevenue / row.adsInvestment).toFixed(1) : 0}x</span></div>
                        </td>

                        {/* Botões de Ação da Loja (Aumentados) */}
                        <td className="py-5 px-4">
                          <div className="flex items-center gap-2 justify-center">
                            <button onClick={() => openHistoryModal(row)} className={`p-2 rounded-lg transition-colors relative shadow-sm ${row.history?.length > 0 ? 'bg-blue-900/60 text-blue-300 hover:bg-blue-700' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`} title="Dashboard e Diário">
                              <BarChart2 size={18} />
                            </button>
                            <a href={generateStoreWhatsAppLink(row)} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 hover:bg-green-600/30 text-green-500 rounded-lg transition-colors shadow-sm">
                              <MessageCircle size={18} />
                            </a>
                            
                            {canEdit && (
                              <>
                                {editingStoreId === row.id ? (
                                  <div className="flex gap-2">
                                    <button onClick={() => saveStoreEdit(row.id)} className="p-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-500"><Check size={16}/></button>
                                    <button onClick={() => setEditingStoreId(null)} className="p-2 bg-gray-600 text-white rounded-lg shadow-sm hover:bg-gray-500"><X size={16}/></button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2 opacity-20 group-hover/row:opacity-100 transition-opacity">
                                    <button onClick={() => startEditingStore(row)} className="p-2 bg-gray-800 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg shadow-sm transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => deleteStore(row.id, row.store)} className="p-2 bg-gray-800 hover:text-red-400 hover:bg-red-900/30 rounded-lg shadow-sm transition-colors"><Trash2 size={16} /></button>
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

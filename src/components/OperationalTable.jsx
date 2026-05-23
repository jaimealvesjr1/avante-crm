import React from 'react';
import { Plus, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, MessageCircle, BarChart2, ShoppingBag, Briefcase } from 'lucide-react';

export default function OperationalTable({
  canEdit, dashboardData, expandedClients, toggleClientExpansion, 
  addNewStoreToClient, openHistoryModal, openClientFile, globalGrowth, formatCurrency, 
  generateClientWhatsAppLink, generateStoreWhatsAppLink
}) {

  const filteredGroups = dashboardData.groupedClients;

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
      
      <div className="bg-white/[0.02] backdrop-blur-xl p-6 md:p-5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-6 flex items-center gap-4">
        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 shadow-inner">
          <Briefcase size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Portfólio Operacional</h2>
          <p className="text-sm text-gray-400 mt-0.5">Visão consolidada e leitura dinâmica do cenário atual.</p>
        </div>
      </div>

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
                      {group.feeType === 'fixed' || group.fixedFee > 0 ? `Fixo: R$ ${group.fixedFee}` : `Fee: ${group.feePercent || 0}%`}
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
                <p className="text-[11px] text-gray-400 mt-0.5">Base: <span className="text-gray-300">{formatCurrency(group.totalGmvBase)}</span> | Ads: <span className="text-amber-400 font-medium">{formatCurrency(group.totalAds)}</span></p>
              </div>

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

              <div className="flex items-center justify-between lg:justify-end gap-3 flex-[0.5]" onClick={e => e.stopPropagation()}>
                <div className="flex gap-2">
                  {canEdit && <button onClick={() => addNewStoreToClient(group.client)} className="p-2 bg-white/5 hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400 rounded-xl transition-all border border-white/5 hover:border-indigo-500/30" title="Adicionar Loja"><Plus size={16} /></button>}
                  <a href={generateClientWhatsAppLink(group)} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-xl transition-all border shadow-sm text-white flex items-center justify-center ${group.status === 'danger' ? 'bg-red-500/20 border-red-500/30 hover:bg-red-500/40 text-red-300' : group.status === 'warning' ? 'bg-amber-500/20 border-amber-500/30 hover:bg-amber-500/40 text-amber-300' : 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/40 text-emerald-300'}`} title="Gerar Relatório WhatsApp">
                    <MessageCircle size={16} />
                  </a>
                </div>
                <div className="p-1 text-gray-500 flex items-center justify-center">
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>
            </div>

            {/* LOJAS DO CLIENTE */}
            {isExpanded && (
              <div className="bg-black/20 border-t border-white/5 p-4 md:p-6 space-y-3">
                {group.stores.map((row) => (
                  <div key={row.id} className="group/store flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.03] hover:bg-white/[0.06] p-4 rounded-xl border border-white/5 transition-all shadow-sm">
                    
                    <div className="flex items-center gap-3 flex-[1.5]">
                      <div className={`w-2 h-8 rounded-full ${row.status === 'success' ? 'bg-emerald-500' : row.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'} shadow-[0_0_10px_rgba(255,255,255,0.1)]`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-200 text-sm">{row.store}</span>
                          {row.marketplace && <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md text-[9px] uppercase tracking-wider font-bold">{row.marketplace}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase border ${row.tier === 'A' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                            Tier {row.tier}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Cresc. Diário</span>
                        <span className="text-gray-300 font-bold text-sm bg-black/20 px-2 py-1 rounded-md border border-white/5">{row.customGrowth !== undefined ? row.customGrowth : globalGrowth}%</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-gray-500 font-medium">Base: {formatCurrency(row.gmvBase)}</span>
                        <span className="font-bold text-gray-300 text-sm">Meta: {formatCurrency(row.gmvTarget)}</span>
                      </div>
                    </div>

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

                    <div className="flex flex-col flex-1">
                      <span className={`font-bold text-sm ${row.status === 'success' ? 'text-emerald-400' : row.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                        {formatCurrency(row.projectedGmv)}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium mt-0.5 uppercase tracking-wider">Projeção Final</span>
                      <span className="text-[10px] text-gray-400 mt-1">ROAS: <strong className="text-white">{row.adsInvestment > 0 ? (row.currentRevenue / row.adsInvestment).toFixed(1) : 0}x</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-[0.5] justify-end">
                      <button onClick={() => openHistoryModal(row)} className={`p-2 rounded-xl transition-all shadow-sm ${row.history?.length > 0 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30' : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'}`} title="Dashboard e Diário">
                        <BarChart2 size={16} />
                      </button>
                      <a href={generateStoreWhatsAppLink(row)} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl transition-all shadow-sm">
                        <MessageCircle size={16} />
                      </a>
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
  );
}

import React, { useState, useMemo } from 'react';
import { Clock, X, CheckSquare, ClipboardList, History, PieChart as PieChartIcon, Zap, Target, Save, CopyPlus, Settings } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast';
import BulkTaskModal from './BulkTaskModal';
import StoreManagementModal from './StoreManagementModal';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];
const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

export default function ClientFileModal({ 
  clientGroup, onClose, openTaskModal, formatCurrency, stores, setStores, updateStoreInCloud, currentDay, currentUserData, user, canUseBatchEntry, canEdit, teamMembers, allNotes, clientStores, onUpdateStore, addNewStoreToClient
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBulkTaskModalOpen, setIsBulkTaskModalOpen] = useState(false);
  const [isStoreManagementModalOpen, setIsStoreManagementModalOpen] = useState(false);
  
  const INTERNAL_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const [batchDay, setBatchDay] = useState(currentDay || 1);

  const handleBulkTaskSave = (selectedStoreIds, taskData) => {
    const username = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Usuário';

    const updatedStores = stores.map(store => {
      if (selectedStoreIds.includes(store.id)) {
        let updatedStore = { ...store };
        const newTask = {
          id: Date.now() + Math.random(),
          texto: taskData.text,
          feita: false,
          responsavel: taskData.resp?.trim() || '',
          criadoPor: username,
          dataCriacao: new Date().toLocaleDateString('pt-BR'),
          data: taskData.data || '',
          hora: taskData.hora || '',
          recurrence: taskData.recorrencia || 'none'
        };
        updatedStore.checklists = [...(store.checklists || []), newTask];
        updatedStore.dataUltimoAcesso = new Date().toISOString();
        updateStoreInCloud(updatedStore);
        return updatedStore;
      }
      return store;
    });

    setStores(updatedStores);
    setIsBulkTaskModalOpen(false);
    toast.success(`Tarefa replicada em ${selectedStoreIds.length} loja(s)!`);
  };

  const [formData, setFormData] = useState(() => {
    const initial = {};
    if (clientGroup) {
      clientGroup.stores.forEach(s => {
        initial[s.id] = {
          currentRevenue: s.currentRevenue || '',
          adsInvestment: s.adsInvestment || '',
          orders: s.orders || '',
          units: s.units || ''
        };
      });
    }
    return initial;
  });

  const clientOpenTasks = useMemo(() => {
    if (!clientGroup || !clientGroup.stores) return [];
    const open = [];
    clientGroup.stores.forEach(store => {
      if (store.checklists && !store.arquivada) { // <-- Ignora tarefas de lojas arquivadas
        store.checklists.forEach(task => {
          if (!task.feita) {
            open.push({ ...task, storeName: store.store, storeId: store.id });
          }
        });
      }
    });
    return open.sort((a, b) => {
      const dateA = new Date(`${a.data || '2099-01-01'}T${a.hora || '00:00'}`);
      const dateB = new Date(`${b.data || '2099-01-01'}T${b.hora || '00:00'}`);
      return dateA - dateB;
    });
  }, [clientGroup, stores]);

  const handleToggleTask = (storeId, taskId) => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return;
    
    const updatedChecklists = store.checklists.map(c => 
      c.id === taskId ? { ...c, feita: true, dataConclusao: new Date().toISOString() } : c
    );
    
    const updatedStore = { ...store, checklists: updatedChecklists };
    updateStoreInCloud(updatedStore); 
    setStores(stores.map(s => s.id === storeId ? updatedStore : s)); 
    toast.success("Tarefa concluída!");
  };

  if (!clientGroup) return null;

  // <-- LÓGICA REATIVA: Agora filtramos as lojas arquivadas (Soft Delete)
  const liveStores = useMemo(() => {
    return stores.filter(s => s.client === clientGroup.client && !s.arquivada);
  }, [stores, clientGroup.client]);

  const activeMarketplaces = useMemo(() => {
    const active = new Set();
    liveStores.forEach(s => {
      if (s.marketplace) {
        let mkt = s.marketplace.toLowerCase().trim();
        if (mkt === 'tiktok') mkt = 'tiktok shop';
        active.add(mkt);
      }
    });
    return active;
  }, [liveStores]);

  const clientMktData = useMemo(() => {
    if (!liveStores) return [];
    const mktMap = {};
    
    liveStores.forEach(s => {
      const mkt = s.marketplace ? s.marketplace.toUpperCase() : 'N/A';
      if (!mktMap[mkt]) mktMap[mkt] = { name: mkt, revenue: 0 };
      mktMap[mkt].revenue += (Number(s.currentRevenue) || 0);
    });
    
    return Object.values(mktMap).sort((a, b) => b.revenue - a.revenue);
  }, [liveStores]);

  const clientHistoryLogs = useMemo(() => {
    if (!liveStores) return [];
    const allLogs = [];
    liveStores.forEach(store => {
      if (store.taskLogs) {
        store.taskLogs.forEach(log => {
          allLogs.push({ ...log, storeName: store.store, storeId: store.id });
        });
      }
    });
    return allLogs.sort((a, b) => b.id - a.id);
  }, [liveStores]);

  const glassTooltipStyle = {
    backgroundColor: 'rgba(11, 15, 25, 0.9)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
  };

  const potentialMarketplaces = useMemo(() => {
    return liveStores[0]?.potentialMarketplaces || [];
  }, [liveStores]);

  const togglePotentialMarketplace = (mkt) => {
    if (!canUseBatchEntry) return; 
    if (activeMarketplaces.has(mkt)) return; 

    let newPotentials = [...potentialMarketplaces];
    if (newPotentials.includes(mkt)) {
      newPotentials = newPotentials.filter(p => p !== mkt); 
    } else {
      newPotentials.push(mkt); 
    }

    let updatedStoresGlobal = [...stores];
    liveStores.forEach(store => {
      const updatedStore = { ...store, potentialMarketplaces: newPotentials };
      updateStoreInCloud(updatedStore);
      updatedStoresGlobal = updatedStoresGlobal.map(globalStore => globalStore.id === store.id ? updatedStore : globalStore);
    });

    setStores(updatedStoresGlobal);
  };

  const pieData = useMemo(() => 
    liveStores.map(s => ({ name: s.store, value: s.currentRevenue || 0 })).filter(s => s.value > 0)
  , [liveStores]);

  const roasData = useMemo(() => 
    liveStores.map(s => ({ 
      name: s.store, 
      roas: s.adsInvestment > 0 ? Number((s.currentRevenue / s.adsInvestment).toFixed(1)) : 0 
    })).sort((a, b) => b.roas - a.roas)
  , [liveStores]);

  const handleFormChange = (id, field, value) => {
    setFormData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSaveBatch = () => {
    if (!canUseBatchEntry) return toast.error("Acesso negado. Apenas Supervisores ou Admins realizam lançamentos.");
    if (!batchDay || batchDay < 1 || batchDay > 31) return toast.error("Dia inválido.");

    const dayVal = Number(batchDay);
    
    const parseSafeNumber = (val) => Number(String(val).replace(/\./g, '').replace(',', '.')) || 0;
    const parseSafeInt = (val) => {
       if (!val) return 0;
       const cleanStr = String(val).replace(/\./g, '');
       return parseInt(cleanStr, 10) || 0;
    };
    
    let updatedStoresGlobal = [...stores];

    liveStores.forEach(s => {
      const data = formData[s.id];
      if (!data || (!data.currentRevenue && !data.adsInvestment && !data.orders && !data.units)) return;

      const cumRev = parseSafeNumber(data.currentRevenue);
      const cumAds = parseSafeNumber(data.adsInvestment);
      const cumOrd = parseSafeInt(data.orders);
      const cumUni = parseSafeInt(data.units);

      let prevRev = 0, prevAds = 0;
      const pastEntries = [...(s.history || [])].filter(h => h.day < dayVal).sort((a, b) => b.day - a.day);
      if (pastEntries.length > 0) {
        prevRev = pastEntries[0].revenue || 0;
        prevAds = pastEntries[0].ads || 0;
      }

      const dailyRev = cumRev - prevRev;

      const histEntry = {
        id: Date.now() + s.id + Math.random(),
        day: dayVal,
        dailyRevenue: dailyRev > 0 ? dailyRev : 0,
        revenue: cumRev,
        ads: cumAds,
        orders: cumOrd,
        units: cumUni,
        date: new Date().toLocaleDateString('pt-BR')
      };

      let newHistory = [...(s.history || [])];
      const existingIndex = newHistory.findIndex(h => h.day === dayVal);
      if (existingIndex >= 0) {
        histEntry.id = newHistory[existingIndex].id;
        newHistory[existingIndex] = histEntry;
      } else {
        newHistory.push(histEntry);
      }

      const finalStore = { 
        ...s, 
        history: newHistory.sort((a, b) => a.day - b.day)
      };

      const maxDay = Math.max(...finalStore.history.map(h => h.day));
      if (dayVal === maxDay) {
          finalStore.currentRevenue = cumRev;
          finalStore.adsInvestment = cumAds;
          finalStore.orders = cumOrd;
          finalStore.units = cumUni;
      }

      updateStoreInCloud(finalStore);
      updatedStoresGlobal = updatedStoresGlobal.map(gs => gs.id === s.id ? finalStore : gs);
    });

    setStores(updatedStoresGlobal);
    toast.success(`Lançamentos do dia ${dayVal} salvos com sucesso!`);
  };

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* CABEÇALHO */}
        <div className="p-6 border-b border-white/5 bg-black/20 flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white uppercase tracking-wide">{clientGroup.client}</h2>
              <span className="bg-indigo-500/10 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-md border border-indigo-500/20 shadow-sm">
                {clientGroup.feeType === 'fixed' ? `Fixo: ${formatCurrency(clientGroup.fixedFee)}` : `Fee: ${clientGroup.feePercent}%`}
              </span>
            </div>
            <p className="text-gray-400 text-sm italic">Central de Inteligência e Lançamentos do Cliente.</p>
          </div>

          <div className="flex bg-black/20 p-1 rounded-full border border-white/10 shadow-inner">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-gray-400 hover:text-white'}`}><PieChartIcon size={16}/> Dashboard</button>
            {canUseBatchEntry && (
              <button onClick={() => setActiveTab('apuracao')} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'apuracao' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-gray-400 hover:text-white'}`}><Zap size={16}/> Lançamentos</button>
            )}
            <button onClick={() => setActiveTab('historico')} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'historico' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-gray-400 hover:text-white'}`}><ClipboardList size={16}/> Histórico & Notas</button>
          </div>

          {/* BOTÕES DE AÇÃO DO CABEÇALHO */}
          <div className="flex items-center gap-2">
            {currentUserData?.role !== 'Visitante' && (
              <button onClick={() => setIsStoreManagementModalOpen(true)} className="px-3 py-2 bg-slate-700 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-gray-300 flex items-center transition-colors">
                <Settings size={16} /> <span className="hidden md:inline"></span>
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 border border-transparent rounded-xl text-gray-400 transition-colors"><X size={20}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-transparent">
          
          {/* ABA 1: DASHBOARD E RADAR */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-black/20 rounded-2xl p-5 border border-white/5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Target size={14}/> Radar de Expansão (Marketplaces)</h3>
                <div className="flex flex-wrap gap-2">
                  {ALL_MARKETPLACES.map(mkt => {
                    const isActive = activeMarketplaces.has(mkt);
                    const isPotential = potentialMarketplaces.includes(mkt);
                    let btnStyle = 'bg-black/20 text-gray-600 border-white/5'; 
                    if (isActive) btnStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
                    else if (isPotential) btnStyle = 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]';

                    const canClick = canUseBatchEntry && !isActive;

                    return (
                      <span key={mkt} onClick={() => togglePotentialMarketplace(mkt)} className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors select-none ${btnStyle} ${canClick ? 'cursor-pointer hover:border-amber-500' : 'cursor-default'}`}>
                        {mkt}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Faturamento Total do Grupo</span>
                  <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(clientGroup.totalCurrentRevenue)}</p>
                  <p className="text-xs text-gray-400 mt-1">Meta Global: {formatCurrency(clientGroup.totalGmvTarget)}</p>
                </div>
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Investimento Total Ads</span>
                  <p className="text-2xl font-bold text-amber-500 mt-1">{formatCurrency(clientGroup.totalAds)}</p>
                  <p className="text-xs text-gray-400 mt-1">ROAS Global Médio: {clientGroup.roas}x</p>
                </div>
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pacing de Metas Global</span>
                  <p className={`text-2xl font-bold mt-1 ${clientGroup.percentReached >= 95 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {clientGroup.percentReached.toFixed(1)}%
                  </p>
                  <div className="w-full bg-black/40 h-2 rounded-full mt-2 overflow-hidden border border-white/5">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{width: `${Math.min(clientGroup.percentReached, 100)}%`}}></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-sm">
                  <h3 className="text-sm font-bold text-white mb-4">Participação por Loja (Share)</h3>
                  <div className="h-64">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-gray-500 text-center mt-20 text-sm">Sem faturamento registrado.</p>}
                  </div>
                </div>

                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-sm">
                  <h3 className="text-sm font-bold text-white mb-4">Eficiência de Ads (ROAS por Loja)</h3>
                  <div className="h-64">
                    {roasData.filter(d => d.roas > 0).length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={roasData} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={80} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.01)' }} contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} formatter={(value) => `${value}x`} />
                          <Bar dataKey="roas" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-gray-500 text-center mt-20 text-sm">Sem dados de Ads registrados.</p>}
                  </div>
                </div>

                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-sm">
                  <h3 className="text-sm font-bold text-white mb-4">Market Share (Canais)</h3>
                  <div className="h-64">
                    {clientMktData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={clientMktData} layout="vertical" margin={{ left: 0, right: 15, top: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} vertical={true} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={80} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={glassTooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value) => formatCurrency(value)} />
                          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={16}>
                            {clientMktData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={INTERNAL_COLORS[index % INTERNAL_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-gray-500 text-center mt-20 text-sm">Sem faturamento registrado.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: LANÇAMENTOS DIÁRIOS */}
          {activeTab === 'apuracao' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2"><Zap className="text-amber-400" size={16}/> Lançamento Rápido</h3>
                  <p className="text-xs text-gray-400 mt-1">Insira os dados atualizados das lojas ativas deste cliente.</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dia Ref.</label>
                  <input type="number" value={batchDay} onChange={(e) => setBatchDay(e.target.value)} className="w-16 bg-black/40 border border-white/10 text-white rounded-xl p-2 text-center font-bold outline-none focus:border-amber-500 transition-colors shadow-inner" min="1" max="31" />
                  <button onClick={handleSaveBatch} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-5 rounded-xl flex items-center gap-2 shadow-md transition-all">
                    <Save size={16} /> Salvar Dados
                  </button>
                </div>
              </div>

              <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-black/40 text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="p-4">Loja / Canal</th>
                      <th className="p-4 text-blue-400">Fat. Acumulado</th>
                      <th className="p-4 text-amber-400">Ads Acum.</th>
                      <th className="p-4 text-emerald-400">Pedidos</th>
                      <th className="p-4 text-purple-400">Unidades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {liveStores.map(store => (
                      <tr key={store.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-200 cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => { onClose(); openTaskModal(store); }}>{store.store}</div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{store.marketplace || 'Marketplace'}</div>
                        </td>
                        <td className="p-4">
                          <input type="text" value={formData[store.id]?.currentRevenue || ''} onChange={(e) => handleFormChange(store.id, 'currentRevenue', e.target.value)} className="w-full bg-black/40 border border-white/10 text-blue-300 rounded-xl p-2 focus:border-indigo-500 outline-none text-sm font-bold shadow-inner" placeholder="0,00" />
                        </td>
                        <td className="p-4">
                          <input type="text" value={formData[store.id]?.adsInvestment || ''} onChange={(e) => handleFormChange(store.id, 'adsInvestment', e.target.value)} className="w-full bg-black/40 border border-white/10 text-amber-300 rounded-xl p-2 focus:border-indigo-500 outline-none text-sm font-bold shadow-inner" placeholder="0,00" />
                        </td>
                        <td className="p-4">
                          <input type="text" value={formData[store.id]?.orders || ''} onChange={(e) => handleFormChange(store.id, 'orders', e.target.value)} className="w-full bg-black/40 border border-white/10 text-emerald-300 rounded-xl p-2 focus:border-indigo-500 outline-none text-sm font-bold shadow-inner" placeholder="0" />
                        </td>
                        <td className="p-4">
                          <input type="text" value={formData[store.id]?.units || ''} onChange={(e) => handleFormChange(store.id, 'units', e.target.value)} className="w-full bg-black/40 border border-white/10 text-purple-300 rounded-xl p-2 focus:border-indigo-500 outline-none text-sm font-bold shadow-inner" placeholder="0" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 3: HISTÓRICO E TAREFAS */}
          {activeTab === 'historico' && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mt-4 animate-in fade-in duration-300">
              <div className="xl:col-span-3 bg-white/[0.02] p-5 rounded-3xl border border-white/5 flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-500/10 rounded-xl border border-gray-500/20">
                      <History size={16} className="text-gray-400"/>
                    </div>
                    <h4 className="text-sm font-bold text-white tracking-wide">Linha do Tempo de Ocorrências</h4>
                  </div>
                  <span className="bg-white/5 text-gray-400 font-bold px-2 py-0.5 rounded text-xs">{clientHistoryLogs.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[600px] custom-scrollbar border-l-2 border-gray-800 ml-2 pl-4">
                  {clientHistoryLogs.length > 0 ? clientHistoryLogs.map(log => (
                    <div key={log.id} className="relative group">
                      <div className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                      <div className="flex flex-col mb-1.5">
                        <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1.5">
                          {log.storeName}
                        </span>
                        <span className="text-[9px] text-gray-500 font-medium">
                          {log.data} por <span className="text-gray-400">{log.author}</span>
                        </span>
                      </div>
                      <div className="bg-gray-900/80 p-3 rounded-xl border border-white/5 text-xs text-gray-300 leading-relaxed shadow-sm">
                        {log.texto}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm ml-[-16px]">
                      Nenhum registro histórico para este cliente.
                    </div>
                  )}
                </div>
              </div>

              <div className="xl:col-span-2 bg-white/[0.02] p-5 rounded-3xl border border-white/5 flex flex-col shadow-sm">
                <div className="flex flex-col gap-4 mb-4 border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <CheckSquare size={16} className="text-amber-400"/>
                      </div>
                      <h4 className="text-sm font-bold text-white tracking-wide">Tarefas Pendentes</h4>
                    </div>
                    <span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded text-xs">{clientOpenTasks.length}</span>
                  </div>
                  
                  <button 
                    onClick={() => setIsBulkTaskModalOpen(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <CopyPlus size={16}/> Criar Tarefa em Massa
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[500px] custom-scrollbar">
                  {clientOpenTasks.length > 0 ? clientOpenTasks.map(task => (
                    <div key={task.id} className="bg-gray-900/50 p-3 rounded-xl border border-white/5 flex gap-3 group transition-colors hover:border-white/10">
                      <button 
                        onClick={() => handleToggleTask(task.storeId, task.id)} 
                        className="mt-0.5 text-gray-500 hover:text-emerald-400 transition-colors shrink-0"
                        title="Concluir Tarefa"
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-gray-500 group-hover:border-emerald-400 flex items-center justify-center transition-colors"></div>
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {task.storeName}
                          </span>
                          {(task.data || task.hora) && (
                            <span className="text-[9px] text-gray-400 flex items-center gap-1">
                              <Clock size={10} /> 
                              {task.data && new Date(task.data + 'T12:00:00').toLocaleDateString('pt-BR')} {task.hora}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-300 mb-1.5 leading-snug">{task.texto}</p>
                        {task.responsavel && (
                          <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                            Para: <span className="text-indigo-400">{task.responsavel}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                      Tudo limpo! Nenhuma pendência para este cliente. 🎉
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <BulkTaskModal 
        isOpen={isBulkTaskModalOpen} 
        onClose={() => setIsBulkTaskModalOpen(false)} 
        stores={liveStores} 
        onSave={handleBulkTaskSave} 
        teamMembers={teamMembers} 
      />

      {/* RENDERIZAÇÃO DO NOVO MODAL */}
      <StoreManagementModal
        isOpen={isStoreManagementModalOpen}
        onClose={() => setIsStoreManagementModalOpen(false)}
        clientGroup={clientGroup}
        stores={stores}
        setStores={setStores}
        updateStoreInCloud={updateStoreInCloud}
        currentUserData={currentUserData}
        onAddNewStore={addNewStoreToClient}
      />
    </div>
  );
}

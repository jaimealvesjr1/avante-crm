import React, { useState, useMemo } from 'react';
import { Clock, X, CheckSquare, ClipboardList, History, PieChart as PieChartIcon, Zap, Target, Save, CopyPlus, TrendingUp, TrendingDown, Edit2, Briefcase } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast';
import BulkTaskModal from './BulkTaskModal';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];
const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

const StoreEntryRow = ({ store, handleSaveIndividualEntry, formatCurrency }) => {
    const lastDayRecorded = store.history && store.history.length > 0 
        ? Math.max(...store.history.map(h => h.day)) 
        : 0;
    
    const [day, setDay] = useState(lastDayRecorded < 31 ? lastDayRecorded + 1 : 31);
    const [rev, setRev] = useState(store.currentRevenue || '');
    const [ord, setOrd] = useState(store.orders || '');
    const [uni, setUni] = useState(store.units || '');
    const [ads, setAds] = useState(store.adsInvestment || '');
    const [isSaving, setIsSaving] = useState(false);

    const onSave = async () => {
        if (!day || rev === '') return toast.error("Dia e Faturamento são obrigatórios.");
        setIsSaving(true);

        const numRev = Number(String(rev).replace(',', '.'));
        const numAds = Number(String(ads).replace(',', '.')) || 0;
        const numOrd = Number(ord) || 0;
        const numUni = Number(uni) || 0;

        await handleSaveIndividualEntry(store.id, day, numRev, numAds, numOrd, numUni);
        setDay(prev => prev < 31 ? Number(prev) + 1 : 31);
        setIsSaving(false);
    };

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <td className="p-4">
                <div className="flex items-center gap-2">
                    <div>
                        <div className="font-bold text-gray-200 truncate max-w-[150px]" title={store.store}>{store.store}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{store.marketplace || 'Marketplace'}</div>
                    </div>
                </div>
            </td>
            <td className="p-3">
                <input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className="w-16 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white text-center font-bold outline-none focus:border-amber-500 shadow-inner" />
            </td>
            <td className="p-3">
                <input type="text" value={rev} onChange={e => setRev(e.target.value)} placeholder="0.00" className="w-24 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-blue-400 font-bold outline-none focus:border-blue-500 shadow-inner" />
            </td>
            <td className="p-3">
                <input type="number" value={ord} onChange={e => setOrd(e.target.value)} placeholder="0" className="w-16 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500 shadow-inner" />
            </td>
            <td className="p-3">
                <input type="number" value={uni} onChange={e => setUni(e.target.value)} placeholder="0" className="w-16 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-purple-400 font-bold outline-none focus:border-purple-500 shadow-inner" />
            </td>
            <td className="p-3">
                <input type="text" value={ads} onChange={e => setAds(e.target.value)} placeholder="0.00" className="w-24 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-amber-400 font-bold outline-none focus:border-amber-500 shadow-inner" />
            </td>
            <td className="p-4 text-right">
                <button onClick={onSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors">
                    {isSaving ? '⏳' : 'Salvar'}
                </button>
            </td>
        </tr>
    );
};

export default function ClientFileModal({ 
  clientGroup, onClose, openTaskModal, formatCurrency, stores, setStores, updateStoreInCloud, currentDay, currentUserData, user, canUseBatchEntry, canEdit, teamMembers, allNotes, clientStores, onUpdateStore, addNewStoreToClient, handleSaveIndividualEntry, dashboardData 
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBulkTaskModalOpen, setIsBulkTaskModalOpen] = useState(false);

  const liveStores = useMemo(() => {
    return stores.filter(s => s.client === clientGroup.client && !s.arquivada);
  }, [stores, clientGroup.client]);

  const mesPassadoExato = useMemo(() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      return `${meses[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
  }, []);

  const allTimeTotalGmv = useMemo(() => {
    return liveStores.reduce((acc, s) => {
        let storeTotal = Number(s.currentRevenue) || 0; 
        if (s.monthlyHistory) {
            s.monthlyHistory.forEach(h => storeTotal += (Number(h.gmv) || 0)); 
        }
        return acc + storeTotal;
    }, 0);
  }, [liveStores]);

  const lastMonthTotalGmv = useMemo(() => {
    return liveStores.reduce((acc, s) => {
        if (s.monthlyHistory && s.monthlyHistory.length > 0) {
            const prevData = s.monthlyHistory.find(h => h.month === mesPassadoExato);
            return acc + (prevData ? Number(prevData.gmv) : 0);
        }
        return acc;
    }, 0);
  }, [liveStores, mesPassadoExato]);

  const momGrowth = lastMonthTotalGmv > 0 
    ? ((clientGroup.totalProjectedGmv - lastMonthTotalGmv) / lastMonthTotalGmv) * 100 
    : 0;

  const shareEvolucao = useMemo(() => {
      // 1. Share Atual (Mês em andamento até hoje)
      const faturamentoGlobalAtual = dashboardData?.totalCurrentRevenue || 1; // Evita divisão por zero
      const faturamentoClienteAtual = clientGroup.totalCurrentRevenue || 0;
      const currentShare = (faturamentoClienteAtual / faturamentoGlobalAtual) * 100;

      // 2. Share do Mês Passado (Fechado)
      const pastGlobalData = dashboardData?.historicalChartData?.find(h => h.month === mesPassadoExato);
      const faturamentoGlobalPassado = pastGlobalData ? (pastGlobalData.ReceitaGlobal || 1) : 1;
      const faturamentoClientePassado = lastMonthTotalGmv || 0;
      const pastShare = faturamentoGlobalPassado > 1 ? (faturamentoClientePassado / faturamentoGlobalPassado) * 100 : 0;
      
      // 3. Evolução (Diferença em pontos percentuais)
      const evolution = currentShare - pastShare;

      return { currentShare, pastShare, evolution };
  }, [dashboardData, clientGroup, lastMonthTotalGmv, mesPassadoExato]);

  const [isEditingContract, setIsEditingContract] = useState(false);
  const [contractForm, setContractForm] = useState({
    feeType: clientGroup?.feeType || 'percent',
    feePercent: clientGroup?.feePercent || 0,
    fixedFee: clientGroup?.fixedFee || 0
  });

  const handleSaveContract = () => {
    if (!canEdit) return toast.error("Sem permissão.");
    
    let updatedStoresGlobal = [...stores];
    liveStores.forEach(store => {
      const updatedStore = {
        ...store,
        feeType: contractForm.feeType,
        feePercent: Number(contractForm.feePercent) || 0,
        fixedFee: contractForm.feeType === 'percent' ? 0 : (Number(contractForm.fixedFee) || 0)
      };
      updateStoreInCloud(updatedStore);
      updatedStoresGlobal = updatedStoresGlobal.map(globalStore => globalStore.id === store.id ? updatedStore : globalStore);
    });

    setStores(updatedStoresGlobal);
    setIsEditingContract(false);
    toast.success("Contrato da agência atualizado com sucesso!");
  };

  // 4. RESTANTE DAS CONFIGURAÇÕES (Tarefas, Gráficos, etc)
  const INTERNAL_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

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

  const clientOpenTasks = useMemo(() => {
    if (!clientGroup || !clientGroup.stores) return [];
    const open = [];
    
    liveStores.forEach(store => {
      if (store.checklists) {
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
  }, [clientGroup, liveStores]);

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

  const consolidatedHistory = useMemo(() => {
    if (!clientGroup || !clientGroup.stores) return [];
    
    const historyMap = {};
    
    clientGroup.stores.forEach(store => {
      (store.monthlyHistory || []).forEach(h => {
        if (!historyMap[h.month]) {
          historyMap[h.month] = { 
            month: h.month, 
            gmv: 0, 
            ads: 0, 
            orders: 0, 
            units: 0, 
            agencyRevenue: 0 
          };
        }
        historyMap[h.month].gmv += Number(h.gmv) || 0;
        historyMap[h.month].ads += Number(h.adsInvestment) || 0;
        historyMap[h.month].orders += Number(h.orders) || 0;
        historyMap[h.month].units += Number(h.units) || 0;
        historyMap[h.month].agencyRevenue += Number(h.agencyRevenue) || 0;
      });
    });

    const monthsOrder = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    
    return Object.values(historyMap).sort((a, b) => {
      const [mA, yA] = a.month.split('/');
      const [mB, yB] = b.month.split('/');
      return (parseInt(yB, 10) * 100 + monthsOrder.indexOf(mB)) - (parseInt(yA, 10) * 100 + monthsOrder.indexOf(mA));
    });
  }, [clientGroup]);

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col relative">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="p-6 border-b border-white/10 bg-black/20 flex flex-col gap-5 shrink-0">
          <div className="flex justify-between items-start">           
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-inner shrink-0">
                  <Briefcase size={28} className="text-indigo-400" />
                </div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h2 className="text-2xl font-bold text-white uppercase tracking-wide">{clientGroup.client}</h2>
                    
                    {isEditingContract ? (
                      <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-indigo-500/30 animate-in fade-in">
                        <select 
                          value={contractForm.feeType} 
                          onChange={e => setContractForm({...contractForm, feeType: e.target.value})}
                          className="bg-gray-800 text-white text-xs rounded p-1.5 outline-none border border-gray-600 focus:border-indigo-500"
                        >
                          <option value="percent">Percentual (%)</option>
                          <option value="fixed">Fixo Mensal (R$)</option>
                        </select>
                        
                        {contractForm.feeType === 'percent' ? (
                          <div className="flex items-center gap-1">
                            <input type="number" value={contractForm.feePercent} onChange={e => setContractForm({...contractForm, feePercent: e.target.value})} className="bg-gray-800 text-white text-xs rounded p-1.5 w-16 outline-none border border-gray-600 focus:border-indigo-500" step="0.1" />
                            <span className="text-gray-400 text-xs font-bold">%</span>
                          </div>
                        ) : (
                          <input type="number" value={contractForm.fixedFee} onChange={e => setContractForm({...contractForm, fixedFee: e.target.value})} className="bg-gray-800 text-white text-xs rounded p-1.5 w-24 outline-none border border-gray-600 focus:border-indigo-500" placeholder="R$" />
                        )}
                        
                        <button onClick={handleSaveContract} className="bg-green-600 hover:bg-green-500 text-white p-1.5 rounded transition-colors shadow-sm ml-1" title="Salvar Contrato">
                          <Save size={14} />
                        </button>
                        <button onClick={() => setIsEditingContract(false)} className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded transition-colors" title="Cancelar">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="bg-indigo-500/10 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-md border border-indigo-500/20 shadow-sm">
                          {clientGroup.feeType === 'fixed' ? `Fixo: ${formatCurrency(clientGroup.fixedFee)}` : `Fee: ${clientGroup.feePercent}%`}
                        </span>
                        {canEdit && (
                          <button 
                            onClick={() => {
                              setContractForm({ feeType: clientGroup.feeType || 'percent', feePercent: clientGroup.feePercent || 0, fixedFee: clientGroup.fixedFee || 0 });
                              setIsEditingContract(true);
                            }} 
                            className="opacity-0 group-hover:opacity-100 p-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-indigo-400 rounded-md transition-all"
                            title="Editar Regra de Contrato"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
              </div>
            </div>

            {/* Botão Fechar */}
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors ml-4 shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* ABAS DE NAVEGAÇÃO */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <PieChartIcon size={16} /> Visão Geral
            </button>
            <button onClick={() => setActiveTab('historico')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'historico' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <History size={16} /> Histórico & Tarefas
            </button>
            <button onClick={() => setActiveTab('apuracao')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'apuracao' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <Zap size={16} /> Lançamento Parcial
            </button>
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

              {/* Grid de Cartões */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                
                {/* CARTÃO: FATURAMENTO HISTÓRICO + FATURAMENTO DO GRUPO */}
                <div className="sm:col-span-2 bg-gradient-to-r from-indigo-900/20 to-black/20 p-5 rounded-2xl border border-indigo-500/20 shadow-sm flex flex-col justify-center">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                    
                    <div className="flex-1 w-full">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Faturamento Histórico</span>
                      <p className="text-2xl font-bold text-indigo-300 mt-1">{formatCurrency(allTimeTotalGmv)}</p>
                      <p className="text-xs text-gray-400 mt-1">Acumulado de todos os meses</p>
                    </div>
                    
                    <div className="w-px h-12 bg-white/10 hidden sm:block"></div>
                    <div className="w-full h-px bg-white/10 sm:hidden my-1"></div>
                    
                    <div className="flex-1 w-full sm:pl-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Neste mês</span>
                      <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(clientGroup.totalCurrentRevenue)}</p>
                      <p className="text-xs text-gray-400 mt-1">Meta Global: {formatCurrency(clientGroup.totalGmvTarget)}</p>
                    </div>

                  </div>
                </div>

                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Evolução Mensal</span>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-2xl font-bold ${momGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {momGrowth > 0 ? '+' : ''}{momGrowth.toFixed(1)}%
                    </p>
                    {momGrowth >= 0 ? <TrendingUp size={20} className="text-emerald-400" /> : <TrendingDown size={20} className="text-rose-400" />}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Mês anterior: {formatCurrency(lastMonthTotalGmv)}</p>
                </div>

                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Investimento Ads & Eficiência</span>
                  <p className="text-2xl font-bold text-amber-500 mt-1">{formatCurrency(clientGroup.totalAds)}</p>
                  
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                        ROAS: <span className="text-white text-xs">{clientGroup.roas} x</span>
                     </p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                        CPA: <span className="text-rose-400 text-xs">
                          {formatCurrency(clientGroup.totalUnits > 0 ? clientGroup.totalAds / clientGroup.totalUnits : 0)}
                        </span>
                     </p>
                  </div>
                </div>

                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider" title="Participação no Faturamento Global da Agência">Share na Carteira</span>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-2xl font-bold ${shareEvolucao.evolution >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                      {shareEvolucao.currentShare.toFixed(1)}%
                    </p>
                    {shareEvolucao.evolution >= 0 ? <TrendingUp size={20} className="text-indigo-400" /> : <TrendingDown size={20} className="text-rose-400" />}
                  </div>
                  
                  <div className="flex flex-col mt-3 pt-3 border-t border-white/10 gap-1.5">
                    <p className="text-[10px] text-gray-400 flex justify-between">
                      Mês passado (Fechado): 
                      <span className="text-gray-300 font-bold">{shareEvolucao.pastShare.toFixed(1)}%</span>
                    </p>
                    <p className="text-[10px] text-gray-400 flex justify-between">
                      Evolução de espaço: 
                      <span className={`font-bold ${shareEvolucao.evolution >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                        {shareEvolucao.evolution > 0 ? '+' : ''}{shareEvolucao.evolution.toFixed(1)} pp
                      </span>
                    </p>
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

          {/* === ABA 2: LANÇAMENTOS INTELIGENTES === */}
          {activeTab === 'apuracao' && (
            <div className="space-y-6 animate-in fade-in">

              <div className="bg-black/20 rounded-2xl border border-white/5 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-black/40 text-gray-400 text-[10px] uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="p-4">Loja / Canal</th>
                      <th className="p-4">Dia Final</th>
                      <th className="p-4 text-blue-400">Fat. Acumulado</th>
                      <th className="p-4 text-emerald-400">Pedidos</th>
                      <th className="p-4 text-purple-400">Unidades</th>
                      <th className="p-4 text-amber-400">Ads Acumulado</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {liveStores.map(store => (
                      <StoreEntryRow 
                        key={store.id} 
                        store={store} 
                        handleSaveIndividualEntry={handleSaveIndividualEntry}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

{activeTab === 'historico' && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mt-4 animate-in fade-in">
              
              {/* COLUNA ESQUERDA: Fechamentos + Timeline (Ocupa 3 colunas) */}
              <div className="xl:col-span-3 flex flex-col gap-6">
                
                {/* Tabela de Fechamentos */}
                <div className="bg-black/20 border border-white/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-white/5 bg-black/40 font-bold text-xs text-gray-400 uppercase tracking-widest">
                    Fechamentos Mensais Consolidado
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="text-[10px] text-gray-500 uppercase">
                        <tr>
                          <th className="p-4 pl-6">Competência</th>
                          <th className="p-4 text-emerald-400">GMV Consolidado</th>
                          <th className="p-4 text-amber-400">Ads Investido</th>
                          <th className="p-4 text-rose-400">Custo p/ Conv</th>
                          <th className="p-4 text-blue-400">ROAS Médio</th>
                          <th className="p-4">Pedidos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                        {consolidatedHistory.map(hist => {
                          const roas = hist.ads > 0 ? (hist.gmv / hist.ads).toFixed(2) : '-';
                          const cpa = hist.units > 0 ? (hist.ads / hist.units) : 0;
                          return (
                            <tr key={hist.month} className="hover:bg-white/[0.02] transition-colors">
                              <td className="p-4 pl-6 font-bold text-white">{hist.month}</td>
                              <td className="p-4 text-emerald-400 font-bold">{formatCurrency(hist.gmv)}</td>
                              <td className="p-4 text-amber-500 font-bold">{formatCurrency(hist.ads)}</td>
                              <td className="p-4 text-rose-400 font-bold">{formatCurrency(cpa)}</td>
                              <td className="p-4 text-blue-400 font-bold">{roas}</td>
                              <td className="p-4 text-gray-300 font-bold">{hist.orders} <span className="text-[10px] font-normal text-gray-500">ped</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Timeline de Ocorrências (Logo abaixo da tabela) */}
                <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/5 flex flex-col shadow-sm flex-1">
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                    <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                       <History size={16} className="text-gray-400"/> Linha do Tempo
                    </h4>
                    <span className="text-[10px] bg-white/5 text-gray-400 font-bold px-2 py-0.5 rounded">{clientHistoryLogs.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar border-l-2 border-gray-800 ml-2 pl-4 space-y-4">
                    {clientHistoryLogs.map(log => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                        <div className="text-[10px] font-bold text-indigo-400">{log.storeName}</div>
                        <div className="text-[9px] text-gray-500 mb-1">{log.data} por {log.author}</div>
                        <div className="bg-gray-900/80 p-3 rounded-xl border border-white/5 text-xs text-gray-300">{log.texto}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: Tarefas Pendentes (Ocupa 2 colunas) */}
              <div className="xl:col-span-2 bg-white/[0.02] p-5 rounded-3xl border border-white/5 flex flex-col shadow-sm max-h-[900px]">
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
    </div>
  );
}

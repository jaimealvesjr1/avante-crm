import React, { useState, useMemo } from 'react';
import { Clock, X, CheckSquare, ClipboardList, History, PieChart as PieChartIcon, Zap, Target, Save, CopyPlus, Settings, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast';
import BulkTaskModal from './BulkTaskModal';
import StoreManagementModal from './StoreManagementModal';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];
const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

// === COMPONENTE: LINHA DE APURAÇÃO INDIVIDUAL ===
const StoreEntryRow = ({ store, handleSaveIndividualEntry }) => {
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
                <div className="font-bold text-gray-200 truncate max-w-[150px]" title={store.store}>{store.store}</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{store.marketplace || 'Marketplace'}</div>
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
                <button 
                    onClick={onSave} 
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                    {isSaving ? '⏳' : 'Salvar'}
                </button>
            </td>
        </tr>
    );
};

export default function ClientFileModal({ 
  clientGroup, onClose, openTaskModal, formatCurrency, stores, setStores, updateStoreInCloud, currentDay, currentUserData, user, canUseBatchEntry, canEdit, teamMembers, allNotes, clientStores, onUpdateStore, addNewStoreToClient, 
  handleSaveIndividualEntry, handleSaveRetroactiveMonth, handleDeleteRetroactiveMonth 
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBulkTaskModalOpen, setIsBulkTaskModalOpen] = useState(false);
  const [isStoreManagementModalOpen, setIsStoreManagementModalOpen] = useState(false);
  
  // Estados para o Formulário Retroativo
  const [retroStoreId, setRetroStoreId] = useState('');
  const [retroMonth, setRetroMonth] = useState('');
  const [retroGmv, setRetroGmv] = useState('');
  const [retroAds, setRetroAds] = useState('');
  const [isSavingRetro, setIsSavingRetro] = useState(false);

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

  const formatMonthYear = (yyyyMm) => {
    if (!yyyyMm) return '';
    const [year, month] = yyyyMm.split('-');
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const shortYear = year.slice(-2);
    // Transforma "2026-04" em "ABR/26"
    return `${months[parseInt(month, 10) - 1]}/${shortYear}`;
  };

  const onSaveRetro = async () => {
    if (!retroStoreId || !retroMonth || !retroGmv) return toast.error('Preencha a loja, o mês e o faturamento.');
    setIsSavingRetro(true);
    
    // Padroniza a data antes de mandar para o banco de dados
    const formattedMonth = formatMonthYear(retroMonth);

    // Chama a função que adicionamos no App.jsx usando o mês formatado
    await handleSaveRetroactiveMonth(Number(retroStoreId), formattedMonth, retroGmv, retroAds);
    
    // Limpa os campos após salvar
    setRetroStoreId('');
    setRetroMonth('');
    setRetroGmv('');
    setRetroAds('');
    setIsSavingRetro(false);
  };

  const clientOpenTasks = useMemo(() => {
    if (!clientGroup || !clientGroup.stores) return [];
    const open = [];
    clientGroup.stores.forEach(store => {
      if (store.checklists && !store.arquivada) {
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

  const liveStores = useMemo(() => {
    return stores.filter(s => s.client === clientGroup.client && !s.arquivada);
  }, [stores, clientGroup.client]);

  const allTimeTotalGmv = useMemo(() => {
    return liveStores.reduce((acc, s) => {
        let storeTotal = Number(s.currentRevenue) || 0;
        if (s.monthlyHistory) {
            s.monthlyHistory.forEach(h => storeTotal += (Number(h.gmv) || 0));
        }
        return acc + storeTotal;
    }, 0);
  }, [liveStores]);

  // === MOTOR DE CÁLCULO MoM (Month-over-Month) ===
  const lastMonthTotalGmv = useMemo(() => {
    return liveStores.reduce((acc, s) => {
        if (s.monthlyHistory && s.monthlyHistory.length > 0) {
            return acc + (Number(s.monthlyHistory[s.monthlyHistory.length - 1].gmv) || 0);
        }
        return acc + (Number(s.gmvBase) || 0);
    }, 0);
  }, [liveStores]);

  const momGrowth = lastMonthTotalGmv > 0 
    ? ((clientGroup.totalProjectedGmv - lastMonthTotalGmv) / lastMonthTotalGmv) * 100 
    : 0;

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

          <div className="flex bg-black/20 p-1 rounded-full border border-white/10 shadow-inner overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-gray-400 hover:text-white'}`}><PieChartIcon size={16}/> Dashboard</button>
            {canUseBatchEntry && (
              <button onClick={() => setActiveTab('apuracao')} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'apuracao' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-gray-400 hover:text-white'}`}><Zap size={16}/> Lançamentos</button>
            )}
            <button onClick={() => setActiveTab('historico')} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'historico' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-gray-400 hover:text-white'}`}><ClipboardList size={16}/> Histórico & Notas</button>
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

              {/* === ATUALIZADO: Grid de Cartões === */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                
                {/* NOVO CARTÃO DUPLO: FATURAMENTO HISTÓRICO + FATURAMENTO DO MÊS */}
                <div className="sm:col-span-2 bg-gradient-to-r from-indigo-900/20 to-black/20 p-5 rounded-2xl border border-indigo-500/20 shadow-sm flex flex-col justify-center">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                    
                    {/* Metade Esquerda: Histórico Total */}
                    <div className="flex-1 w-full">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Faturamento Histórico</span>
                      <p className="text-2xl font-bold text-indigo-300 mt-1">{formatCurrency(allTimeTotalGmv)}</p>
                      <p className="text-xs text-gray-400 mt-1">Acumulado de todos os meses</p>
                    </div>
                    
                    {/* Divisor Visual */}
                    <div className="w-px h-12 bg-white/10 hidden sm:block"></div>
                    <div className="w-full h-px bg-white/10 sm:hidden my-1"></div>
                    
                    {/* Metade Direita: Faturamento Atual do Grupo */}
                    <div className="flex-1 w-full sm:pl-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Faturamento do Grupo</span>
                      <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(clientGroup.totalCurrentRevenue)}</p>
                      <p className="text-xs text-gray-400 mt-1">Meta Global: {formatCurrency(clientGroup.totalGmvTarget)}</p>
                    </div>

                  </div>
                </div>

                {/* Os 3 Cartões restantes */}
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Evolução (MoM)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-2xl font-bold ${momGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {momGrowth > 0 ? '+' : ''}{momGrowth.toFixed(1)}%
                    </p>
                    {momGrowth >= 0 ? <TrendingUp size={20} className="text-emerald-400" /> : <TrendingDown size={20} className="text-rose-400" />}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Base passada: {formatCurrency(lastMonthTotalGmv)}</p>
                </div>

                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Investimento Ads</span>
                  <p className="text-2xl font-bold text-amber-500 mt-1">{formatCurrency(clientGroup.totalAds)}</p>
                  <p className="text-xs text-gray-400 mt-1">ROAS Médio: {clientGroup.roas}x</p>
                </div>

                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pacing de Metas</span>
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

          {/* === ABA 2: LANÇAMENTOS INTELIGENTES E RETROATIVOS === */}
          {activeTab === 'apuracao' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2"><Zap className="text-amber-400" size={16}/> Lançamentos Individuais</h3>
                  <p className="text-xs text-gray-400 mt-1">O sistema calculará automaticamente a média diária entre o último lançamento e o dia informado.</p>
                </div>
              </div>

              <div className="bg-black/20 rounded-2xl border border-white/5 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-black/40 text-gray-400 text-[10px] uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="p-4">Loja / Canal</th>
                      <th className="p-4">Dia Ref.</th>
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
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* === MÓDULO UNIFICADO: GESTÃO DE HISTÓRICO PASSADO === */}
              <div className="mt-8 bg-black/20 p-6 rounded-2xl border border-white/5 shadow-sm">
                  
                  {/* Cabeçalho do Módulo */}
                  <div className="mb-5">
                      <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                          <History className="text-indigo-400" size={18}/> Gestão de Fechamentos Anteriores
                      </h4>
                      <p className="text-xs text-gray-400">Insira e gerencie os fechamentos passados de cada loja para estabelecer a base de cálculo de crescimento (MoM).</p>
                  </div>
                  
                  {/* Formulário de Inserção */}
                  <div className="flex flex-col md:flex-row gap-4 items-end bg-gray-900/40 p-4 rounded-xl border border-white/5 mb-6">
                      <div className="flex-1 w-full">
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Loja</label>
                          <select value={retroStoreId} onChange={e => setRetroStoreId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer transition-colors">
                              <option value="">Selecione a loja...</option>
                              {liveStores.map(s => <option key={s.id} value={s.id}>{s.store} {s.marketplace ? `- ${s.marketplace}` : ''}</option>)}
                          </select>
                      </div>
                      <div className="w-full md:w-32">
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Mês/Ano</label>
                          <input 
                              type="month" 
                              value={retroMonth} 
                              onChange={e => setRetroMonth(e.target.value)} 
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors cursor-pointer" 
                          />
                      </div>
                      <div className="w-full md:w-32">
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Fat. Fechado</label>
                          <input type="text" placeholder="0.00" value={retroGmv} onChange={e => setRetroGmv(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-blue-400 font-bold outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div className="w-full md:w-32">
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Ads Investido</label>
                          <input type="text" placeholder="0.00" value={retroAds} onChange={e => setRetroAds(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-amber-400 font-bold outline-none focus:border-amber-500 transition-colors" />
                      </div>
                      <button 
                          onClick={onSaveRetro} 
                          disabled={isSavingRetro}
                          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-md transition-colors"
                      >
                          {isSavingRetro ? 'Salvando...' : 'Registrar'}
                      </button>
                  </div>
                  
                  {/* Linha Divisória */}
                  <hr className="border-white/5 mb-6" />

                  {/* Lista de Histórico Salvo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {liveStores.map(store => {
                          if (!store.monthlyHistory || store.monthlyHistory.length === 0) return null;
                          return (
                              <div key={`hist-${store.id}`} className="bg-gray-900/40 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                  <h5 className="text-xs font-bold text-gray-300 mb-3 truncate flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                      {store.store} {store.marketplace ? `- ${store.marketplace}` : ''}
                                  </h5>
                                  <div className="space-y-2">
                                      {store.monthlyHistory.map(hist => (
                                          <div key={hist.id} className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-white/5">
                                              <div>
                                                  <p className="text-[10px] font-bold text-white tracking-wide">{hist.month}</p>
                                                  <p className="text-[9px] text-blue-400 font-medium mt-0.5">GMV: {formatCurrency(hist.gmv)}</p>
                                              </div>
                                              <button 
                                                  onClick={() => handleDeleteRetroactiveMonth(store.id, hist.id)}
                                                  className="p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors"
                                                  title="Excluir Mês"
                                              >
                                                  <X size={14}/>
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
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

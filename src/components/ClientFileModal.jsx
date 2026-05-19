import React, { useState, useMemo } from 'react';
import { X, ShoppingCart, Bell, ClipboardList, History, PieChart as PieChartIcon, Zap, Target, Save, Plus } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];
const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

export default function ClientFileModal({ 
  clientGroup, onClose, openTaskModal, formatCurrency, stores, setStores, updateStoreInCloud, currentDay, currentUserData, user, canUseBatchEntry, canEdit           
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [batchDay, setBatchDay] = useState(currentDay || 1);
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

  const [newNoteText, setNewNoteText] = useState('');

  if (!clientGroup) return null;

  // Lógica reativa das lojas
  const liveStores = useMemo(() => {
    return stores.filter(s => s.client === clientGroup.client);
  }, [stores, clientGroup.client]);

  // Radar de Marketplaces Ativos (Verdes)
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

  // Radar de Marketplaces Potenciais (Laranjas)
  const potentialMarketplaces = useMemo(() => {
    return liveStores[0]?.potentialMarketplaces || [];
  }, [liveStores]);

  // Alterar potencial do canal
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

  // Gráficos
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
        history: newHistory.sort((a, b) => a.day - b.day) // Ordenação matemática corrigida
      };

      // Só atualiza os valores gerais da loja se for o último dia lançado
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

  const handleSaveNote = () => {
    if (!newNoteText.trim()) return;
    const firstStore = liveStores[0];
    if (!firstStore) return toast.error("Este cliente não possui lojas.");

    const username = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Usuário';
    const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: newNoteText, author: username };
    
    const updatedStore = { ...firstStore, taskLogs: [...(firstStore.taskLogs || []), log], dataUltimoAcesso: new Date().toISOString() };
    updateStoreInCloud(updatedStore);
    setStores(stores.map(s => s.id === firstStore.id ? updatedStore : s));
    setNewNoteText('');
    toast.success('Nota registrada no histórico do cliente!');
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

          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 border border-transparent rounded-full text-gray-400 transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-transparent">
          
          {/* ABA 1: DASHBOARD E RADAR */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
              {/* RADAR DE MARKETPLACES */}
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

              {/* KPIs GERAIS */}
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

              {/* GRÁFICOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-sm">
                  <h3 className="text-sm font-bold text-white mb-4">Participação por Loja (Share)</h3>
                  <div className="h-64">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
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
                      <ResponsiveContainer width="100%" height="100%">
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
              </div>
            </div>
          )}

          {/* ABA 2: LANÇAMENTOS DIÁRIOS */}
          {activeTab === 'apuracao' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2"><Zap className="text-amber-400" size={16}/> Lançamento Rápido</h3>
                  <p className="text-xs text-gray-400 mt-1">Insira os dados atualizados das lojas deste cliente.</p>
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

          {/* ABA 3: HISTÓRICO E NOTAS */}
          {activeTab === 'historico' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in h-full">
              
              {/* TAREFAS */}
              <div className="flex flex-col bg-black/20 rounded-2xl p-5 border border-white/5 h-[55vh]">
                <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider pb-2 border-b border-white/5">
                  <ClipboardList size={14} className="text-indigo-400" /> Tarefas Pendentes
                </h3>
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                  {liveStores.flatMap(s => (s.checklists || []).map(t => ({...t, storeName: s.store}))).filter(t => !t.feita).map(task => (
                    <div key={task.id} className="bg-white/[0.02] p-3.5 rounded-xl border border-white/5 text-sm text-gray-300 flex items-start gap-3 shadow-sm">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-200">{task.texto}</p>
                        <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-white/5 text-[10px] text-gray-500">
                          <span className="font-bold uppercase tracking-wider">{task.storeName}</span>
                          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">Resp: {task.responsavel || 'Equipe'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {liveStores.every(s => !s.checklists?.some(t => !t.feita)) && (
                    <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl h-full flex items-center justify-center">
                      <p className="text-gray-500 text-xs italic font-medium">Nenhuma tarefa pendente cadastrada.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* TIMELINE */}
              <div className="flex flex-col bg-black/20 rounded-2xl p-5 border border-white/5 h-[55vh]">
                <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider pb-2 border-b border-white/5">
                  <History size={14} className="text-emerald-400" /> Histórico & Bloco de Notas
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar border-l border-white/10 ml-2 pl-4 mb-4 space-y-4">
                  {liveStores.flatMap(s => (s.taskLogs || []).map(l => ({...l, store: s.store})))
                    .sort((a,b) => b.id - a.id).map(log => (
                    <div key={log.id} className="relative group">
                      <div className="absolute -left-[21px] top-1.5 w-1.5 h-1.5 bg-[#0B0F19] rounded-full border border-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                      <div className="flex justify-between items-start mb-1 text-[10px]">
                        <p className="text-emerald-400 font-bold">{log.data}</p>
                        <p className="text-gray-500 italic bg-black/20 px-1.5 py-0.5 rounded-md border border-white/5">Por: {log.author}</p>
                      </div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">{log.store}</p>
                      <p className="text-sm text-gray-300 leading-relaxed bg-white/[0.01] p-3 rounded-xl border border-white/5">{log.texto}</p>
                    </div>
                  ))}
                  {liveStores.every(s => !s.taskLogs || s.taskLogs.length === 0) && (
                     <div className="h-full flex items-center text-gray-500 text-xs italic font-medium">Nenhum registro de atividade na timeline.</div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <input type="text" value={newNoteText} onChange={e => setNewNoteText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveNote()} placeholder="Adicionar nota para este cliente..." className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500 transition-colors shadow-inner" />
                  <button onClick={handleSaveNote} className="bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 px-4 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs"><Plus size={14} /> Salvar</button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

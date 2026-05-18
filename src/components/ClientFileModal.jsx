import React, { useState, useMemo } from 'react';
import { X, ShoppingCart, Bell, ClipboardList, History, PieChart as PieChartIcon, Zap, Target, Save, Plus } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

// Lista oficial padronizada para checagem do Radar
const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

export default function ClientFileModal({ 
  clientGroup, 
  onClose, 
  openTaskModal, 
  formatCurrency,
  stores, 
  setStores,
  updateStoreInCloud,
  currentDay,
  currentUserData,
  user,
  canUseBatchEntry,
  canEdit
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Estados para o Lançamento Diário (Aba Apuração)
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

  // Estado para nova anotação
  const [newNoteText, setNewNoteText] = useState('');

  if (!clientGroup) return null;

  // 1. RADAR DE EXPANSÃO COM UNIFICAÇÃO INTELIGENTE
  const activeMarketplaces = useMemo(() => {
    const active = new Set();
    clientGroup.stores.forEach(s => {
      if (s.marketplace) {
        let mkt = s.marketplace.toLowerCase().trim();
        
        // REPASSADA/UNIFICAÇÃO: Se o registro antigo for apenas 'tiktok', padroniza para 'tiktok shop'
        if (mkt === 'tiktok') {
          mkt = 'tiktok shop';
        }
        
        active.add(mkt);
      }
    });
    return active;
  }, [clientGroup]);

  // 2. Dados para os Gráficos
  const pieData = useMemo(() => 
    clientGroup.stores.map(s => ({ name: s.store, value: s.currentRevenue || 0 })).filter(s => s.value > 0)
  , [clientGroup]);

  const roasData = useMemo(() => 
    clientGroup.stores.map(s => ({ 
      name: s.store, 
      roas: s.adsInvestment > 0 ? Number((s.currentRevenue / s.adsInvestment).toFixed(1)) : 0 
    })).sort((a, b) => b.roas - a.roas)
  , [clientGroup]);

  // 3. Funções de Salvamento de Apuração
  const handleFormChange = (id, field, value) => {
    setFormData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSaveBatch = () => {
    // Trava de segurança extra no código
    if (!canUseBatchEntry) {
      return toast.error("Acesso negado. Apenas Supervisores ou Admins podem fazer apuração financeira.");
    }
    
    if (!batchDay || batchDay < 1 || batchDay > 31) return toast.error("Dia inválido.");

    const dayVal = Number(batchDay);
    const parseSafeNumber = (val) => Number(String(val).replace(/\./g, '').replace(',', '.')) || 0;
    
    let updatedStoresGlobal = [...stores];

    clientGroup.stores.forEach(s => {
      const data = formData[s.id];
      if (!data || (!data.currentRevenue && !data.adsInvestment && !data.orders && !data.units)) return;

      const cumRev = parseSafeNumber(data.currentRevenue);
      const cumAds = parseSafeNumber(data.adsInvestment);
      const cumOrd = parseInt(data.orders, 10) || 0;
      const cumUni = parseInt(data.units, 10) || 0;

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
      if (existingIndex >= 0) newHistory[existingIndex] = histEntry;
      else newHistory.push(histEntry);

      const finalStore = {
        ...s,
        currentRevenue: cumRev,
        adsInvestment: cumAds,
        orders: cumOrd,
        units: cumUni,
        history: newHistory.sort((a, b) => a.day - b.day)
      };

      updateStoreInCloud(finalStore);
      updatedStoresGlobal = updatedStoresGlobal.map(globalStore => globalStore.id === s.id ? finalStore : globalStore);
    });

    setStores(updatedStoresGlobal);
    toast.success(`Apuração salva com sucesso!`);
  };

  const handleSaveNote = () => {
    if (!newNoteText.trim()) return;
    const firstStore = clientGroup.stores[0];
    if (!firstStore) return toast.error("Este cliente não tem lojas.");

    const username = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Usuário';
    const log = { id: Date.now(), data: new Date().toLocaleString('pt-BR'), texto: newNoteText, author: username };
    
    const updatedStore = { 
      ...firstStore, 
      taskLogs: [...(firstStore.taskLogs || []), log], 
      dataUltimoAcesso: new Date().toISOString() 
    };

    updateStoreInCloud(updatedStore);
    setStores(stores.map(s => s.id === firstStore.id ? updatedStore : s));
    setNewNoteText('');
    toast.success('Nota registrada no histórico do cliente!');
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* CABEÇALHO */}
        <div className="p-6 border-b border-gray-800 bg-gray-950 flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white uppercase tracking-wide">{clientGroup.client}</h2>
              <span className="bg-blue-900/40 text-blue-400 text-xs font-bold px-2 py-1 rounded border border-blue-800">
                {clientGroup.feeType === 'fixed' ? `Fee Fixo: ${formatCurrency(clientGroup.fixedFee)}` : `Fee: ${clientGroup.feePercent}%`}
              </span>
            </div>
            <p className="text-gray-500 text-sm italic">Central de Inteligência e Lançamentos do Cliente.</p>
          </div>

          <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><PieChartIcon size={16}/> Dashboard</button>
            {canUseBatchEntry && (
              <button onClick={() => setActiveTab('apuracao')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'apuracao' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><Zap size={16}/> Apuração</button>
            )}
            <button onClick={() => setActiveTab('historico')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'historico' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><ClipboardList size={16}/> Histórico & Notas</button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-900">
          
          {/* ABA 1: DASHBOARD E RADAR */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
              {/* RADAR DE MARKETPLACES */}
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Target size={14}/> Radar de Expansão (Marketplaces)</h3>
                <div className="flex flex-wrap gap-2">
                  {ALL_MARKETPLACES.map(mkt => {
                    const isActive = activeMarketplaces.has(mkt);
                    return (
                      <span key={mkt} className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border ${isActive ? 'bg-green-900/30 text-green-400 border-green-800 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-gray-900 text-gray-600 border-gray-800'}`}>
                        {mkt}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* KPIs GERAIS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Faturamento Total do Grupo</span>
                  <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(clientGroup.totalCurrentRevenue)}</p>
                  <p className="text-xs text-gray-500 mt-1">Meta Global: {formatCurrency(clientGroup.totalGmvTarget)}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Investimento Total Ads</span>
                  <p className="text-2xl font-bold text-amber-500 mt-1">{formatCurrency(clientGroup.totalAds)}</p>
                  <p className="text-xs text-gray-500 mt-1">ROAS Global Médio: {clientGroup.roas}x</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pacing de Metas Global</span>
                  <p className={`text-2xl font-bold mt-1 ${clientGroup.percentReached >= 95 ? 'text-green-500' : 'text-red-500'}`}>
                    {clientGroup.percentReached.toFixed(1)}%
                  </p>
                  <div className="w-full bg-gray-900 h-2 rounded-full mt-2 overflow-hidden border border-gray-800">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{width: `${Math.min(clientGroup.percentReached, 100)}%`}}></div>
                  </div>
                </div>
              </div>

              {/* GRÁFICOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                  <h3 className="text-sm font-bold text-white mb-4">Participação por Loja (Share)</h3>
                  <div className="h-64">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-gray-500 text-center mt-20 text-sm">Sem faturamento registrado.</p>}
                  </div>
                </div>

                <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                  <h3 className="text-sm font-bold text-white mb-4">Eficiência de Ads (ROAS por Loja)</h3>
                  <div className="h-64">
                    {roasData.filter(d => d.roas > 0).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={roasData} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={80} />
                          <Tooltip cursor={{ fill: '#374151' }} contentStyle={{ backgroundColor: '#111827', border: 'none', color: '#fff' }} formatter={(value) => `${value}x`} />
                          <Bar dataKey="roas" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-gray-500 text-center mt-20 text-sm">Sem dados de Ads registrados.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: APURAÇÃO DIÁRIA E LOJAS */}
          {activeTab === 'apuracao' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2"><Zap className="text-amber-400"/> Apuração Rápida</h3>
                  <p className="text-xs text-gray-400 mt-1">Insira os dados atualizados das lojas deste cliente.</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-gray-400 uppercase">Dia Ref.</label>
                  <input type="number" value={batchDay} onChange={(e) => setBatchDay(e.target.value)} className="w-16 bg-gray-950 border border-gray-600 text-white rounded p-2 text-center font-bold outline-none focus:border-amber-500" min="1" max="31" />
                  <button onClick={handleSaveBatch} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 shadow-lg transition-transform hover:scale-105">
                    <Save size={16} /> Salvar Lançamentos
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="p-3 border-b border-gray-700">Loja / Canal</th>
                      <th className="p-3 border-b border-gray-700 w-40 text-blue-400">Fat. Acumulado</th>
                      <th className="p-3 border-b border-gray-700 w-32 text-amber-400">Ads Acum.</th>
                      <th className="p-3 border-b border-gray-700 w-28 text-green-400">Pedidos</th>
                      <th className="p-3 border-b border-gray-700 w-28 text-purple-400">Unidades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {clientGroup.stores.map(store => (
                      <tr key={store.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-gray-200 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => { onClose(); openTaskModal(store); }}>{store.store}</div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{store.marketplace || 'Marketplace'}</div>
                        </td>
                        <td className="p-3">
                          <input type="text" value={formData[store.id].currentRevenue} onChange={(e) => handleFormChange(store.id, 'currentRevenue', e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-blue-300 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-bold" placeholder="0,00" />
                        </td>
                        <td className="p-3">
                          <input type="text" value={formData[store.id].adsInvestment} onChange={(e) => handleFormChange(store.id, 'adsInvestment', e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-amber-300 rounded p-2 focus:ring-1 focus:ring-amber-500 outline-none text-sm font-bold" placeholder="0,00" />
                        </td>
                        <td className="p-3">
                          <input type="number" value={formData[store.id].orders} onChange={(e) => handleFormChange(store.id, 'orders', e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-green-300 rounded p-2 focus:ring-1 focus:ring-green-500 outline-none text-sm font-bold" placeholder="0" />
                        </td>
                        <td className="p-3">
                          <input type="number" value={formData[store.id].units} onChange={(e) => handleFormChange(store.id, 'units', e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-purple-300 rounded p-2 focus:ring-1 focus:ring-purple-500 outline-none text-sm font-bold" placeholder="0" />
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
              
              {/* TAREFAS PENDENTES */}
              <div className="flex flex-col bg-gray-800 rounded-xl p-5 border border-gray-700 h-[60vh]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider pb-2 border-b border-gray-700">
                  <ClipboardList size={16} className="text-indigo-400" /> Tarefas Pendentes nas Lojas
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                  {clientGroup.stores.flatMap(s => (s.checklists || []).map(t => ({...t, storeName: s.store}))).filter(t => !t.feita).map(task => (
                    <div key={task.id} className="bg-gray-900 p-3 rounded-lg border border-gray-700 text-sm text-gray-300 flex items-start gap-3 shadow-sm">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-200">{task.texto}</p>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-800">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{task.storeName}</span>
                          <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded flex items-center gap-1"><Bell size={10}/> {task.responsavel || 'Equipe'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {clientGroup.stores.every(s => !s.checklists?.some(t => !t.feita)) && (
                    <div className="text-center p-8 border border-dashed border-gray-700 rounded-lg h-full flex items-center justify-center">
                      <p className="text-gray-500 text-sm italic font-medium">Nenhuma tarefa pendente registrada.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* TIMELINE DE ATIVIDADES E BLOCO DE NOTAS */}
              <div className="flex flex-col bg-gray-800 rounded-xl p-5 border border-gray-700 h-[60vh]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider pb-2 border-b border-gray-700">
                  <History size={16} className="text-emerald-400" /> Histórico & Bloco de Notas
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border-l-2 border-gray-700 ml-2 pl-4 mb-4 space-y-4">
                  {clientGroup.stores.flatMap(s => (s.taskLogs || []).map(l => ({...l, store: s.store})))
                    .sort((a,b) => b.id - a.id).map(log => (
                    <div key={log.id} className="relative group">
                      <div className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 bg-gray-900 rounded-full border-2 border-emerald-500"></div>
                      <div className="flex justify-between items-start mb-0.5">
                        <p className="text-[10px] text-emerald-400 font-bold">{log.data}</p>
                        <p className="text-[9px] text-gray-500 italic bg-gray-900 px-1.5 rounded">{log.author}</p>
                      </div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">{log.store}</p>
                      <p className="text-sm text-gray-300 leading-relaxed bg-gray-900 p-3 rounded-lg border border-gray-700">{log.texto}</p>
                    </div>
                  ))}
                  {clientGroup.stores.every(s => !s.taskLogs || s.taskLogs.length === 0) && (
                     <div className="h-full flex items-center text-gray-500 text-sm italic font-medium -ml-4 pl-4">Nenhum registro de atividade.</div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <input 
                    type="text" 
                    value={newNoteText} 
                    onChange={e => setNewNoteText(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveNote(); }}
                    placeholder="Adicionar nota para este cliente..." 
                    className="flex-1 bg-gray-950 border border-gray-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-purple-500 transition-colors" 
                  />
                  <button 
                    onClick={handleSaveNote} 
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-lg font-bold flex items-center gap-2 transition-colors"
                  >
                    <Plus size={16} /> Salvar Nota
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingUp, DollarSign, Target, Activity, MessageCircle, Search, Download, Upload, Save, Plus, X, Trash2, PieChart as PieChartIcon, Zap, ArchiveRestore, CalendarDays, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { db, auth, secondaryAuth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc } from "firebase/firestore";
import { Toaster, toast } from 'react-hot-toast';

import ActionModal from './components/ActionModal';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import OperationalTable from './components/OperationalTable';
import BatchEntry from './components/BatchEntry';

const initialStores = []; 
const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

export default function App() {
  const [stores, setStores] = useState(initialStores);
  const [isDbLoading, setIsDbLoading] = useState(true);

  const [activeView, setActiveView] = useState('operacional'); 
  const [globalGrowth, setGlobalGrowth] = useState(10);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [currentDay, setCurrentDay] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('gmv');
  const [expandedClients, setExpandedClients] = useState([]);
  
  const [editingClient, setEditingClient] = useState(null);
  const [clientEditValue, setClientEditValue] = useState('');
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [storeEditData, setStoreEditData] = useState({});

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [chartTab, setChartTab] = useState('pacing'); 
  const [newHistoryDay, setNewHistoryDay] = useState('');
  const [newHistoryRevenue, setNewHistoryRevenue] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  
  const [isBatchMode, setIsBatchMode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', isPrompt: false, onConfirm: () => {} });

  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('Visualizador');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "equipe", currentUser.email.toLowerCase());
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setUserRole(docSnap.data().role || 'Visualizador');
        } catch (e) { console.error("Erro ao buscar cargo", e); }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === 'jaimejunior.ide@gmail.com';
  const canEdit = userRole === 'Gerente' || isAdmin;

  useEffect(() => {
    if (!user) return;
    const unsubStores = onSnapshot(collection(db, "stores"), (snapshot) => {
      if (!snapshot.empty) setStores(snapshot.docs.map(doc => doc.data()).sort((a, b) => b.id - a.id));
      setIsDbLoading(false);
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if(data.currentDay) setCurrentDay(data.currentDay);
        if(data.globalGrowth) setGlobalGrowth(data.globalGrowth);
      }
    });
    return () => { unsubStores(); unsubSettings(); };
  }, [user]);

  const updateStoreInCloud = (updatedStore) => {
    if (!canEdit) return;
    setDoc(doc(db, "stores", updatedStore.id.toString()), updatedStore).catch(e => console.error("Erro ao salvar:", e));
  };

  const updateGlobalSettings = async (field, value) => {
    if (!canEdit) return;
    const newVal = Number(value);
    field === 'day' ? setCurrentDay(newVal) : setGlobalGrowth(newVal);
    await setDoc(doc(db, "settings", "global"), { 
      currentDay: field === 'day' ? newVal : currentDay,
      globalGrowth: field === 'growth' ? newVal : globalGrowth
    }, { merge: true });
  };

  const handleLogin = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, password); setAuthError(''); } catch (e) { setAuthError('E-mail ou senha incorretos.'); } };
  const handleLogout = () => signOut(auth);

  const handleStoreChange = (id, field, value) => {
    let finalValue = value;
    if (typeof value === 'string' && (field === 'currentRevenue' || field === 'adsInvestment' || field === 'gmvBase' || field === 'customGrowth')) {
      finalValue = value.replace(/\./g, '').replace(',', '.');
    }
    const numericValue = finalValue !== '' ? Number(finalValue) : 0;
    const updatedStores = stores.map(s => {
      if (s.id === id) {
        const novaLoja = { ...s, [field]: numericValue };
        updateStoreInCloud(novaLoja);
        return novaLoja;
      }
      return s;
    });
    setStores(updatedStores);
  };

  const addNewStore = () => {
    const name = prompt("Nome do Novo Cliente:");
    if (!name) return;
    const newStore = { id: Date.now(), client: name.toUpperCase(), store: 'NOVA LOJA', gmvBase: 0, feeType: 'percent', feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, orders: 0, units: 0, history: [], notes: [], monthlyHistory: [] };
    updateStoreInCloud(newStore);
    setStores(prev => [newStore, ...prev]);
  };

  const addNewStoreToClient = (clientName) => {
    const newStore = { id: Date.now(), client: clientName, store: 'NOVA LOJA', gmvBase: 0, feeType: 'percent', feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, orders: 0, units: 0, history: [], notes: [], monthlyHistory: [] };
    updateStoreInCloud(newStore);
    setStores(prev => [newStore, ...prev]);
    if(!expandedClients.includes(clientName)) toggleClientExpansion(clientName);
  };

  const handleSaveBatch = (updatedStores) => {
    const finalUpdates = updatedStores.map(s => {
      let newHistory = [...(s.history || [])];
      const existingIndex = newHistory.findIndex(h => h.day === currentDay);
      const histEntry = {
        id: existingIndex >= 0 ? newHistory[existingIndex].id : Date.now() + Math.random(),
        day: currentDay, revenue: s.currentRevenue, ads: s.adsInvestment, orders: s.orders, units: s.units, date: new Date().toLocaleDateString('pt-BR')
      };
      if (existingIndex >= 0) newHistory[existingIndex] = histEntry; else newHistory.push(histEntry);
      
      const finalStore = { ...s, history: newHistory.sort((a, b) => a.day - b.day) };
      updateStoreInCloud(finalStore);
      return finalStore;
    });
    setStores(finalUpdates);
  };

  const exportBackup = () => {
    const dataStr = JSON.stringify(stores, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `avante_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const importBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileReader = new FileReader();
    fileReader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          imported.forEach(s => updateStoreInCloud(s));
          setStores(imported);
          toast.success("✅ Dados restaurados na nuvem com sucesso!");
        } else toast.error("Formato inválido.");
      } catch (err) { toast.error("Erro ao ler o arquivo JSON."); } finally { e.target.value = null; }
    };
    fileReader.readAsText(file, "UTF-8");
  };

  const toggleClientExpansion = (c) => setExpandedClients(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const startEditingClient = (name) => { setEditingClient(name); setClientEditValue(name); };
  const saveClientEdit = (oldName) => {
    const upperNewName = clientEditValue.toUpperCase();
    stores.forEach(s => { if(s.client === oldName) updateStoreInCloud({...s, client: upperNewName}); });
    setEditingClient(null);
  };
  const startEditingStore = (store) => { setEditingStoreId(store.id); setStoreEditData({ store: store.store, feeType: store.feeType || 'percent', feePercent: store.feePercent, fixedFee: store.fixedFee || 0, gmvBase: store.gmvBase, marketplace: store.marketplace || '' }); };
  const saveStoreEdit = (id) => {
    const target = stores.find(s => s.id === id);
    if(target) updateStoreInCloud({...target, store: storeEditData.store.toUpperCase(), feeType: storeEditData.feeType, feePercent: Number(storeEditData.feePercent), fixedFee: Number(storeEditData.fixedFee), gmvBase: Number(storeEditData.gmvBase), marketplace: storeEditData.marketplace});
    setEditingStoreId(null);
  };

  const deleteStore = async (id, storeName) => { if(window.confirm(`Apagar a loja ${storeName}?`)){ await deleteDoc(doc(db, "stores", id.toString())); setStores(stores.filter(s => s.id !== id)); } };
  const deleteClient = async (clientName) => { if(window.confirm(`🚨 Apagar o cliente ${clientName} e TODAS as suas lojas?`)){ stores.forEach(s => { if(s.client===clientName) deleteDoc(doc(db, "stores", s.id.toString())); }); setStores(stores.filter(s => s.client !== clientName)); } };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);

  // FUNÇÕES WHATSAPP E MODAL (AS QUE CAUSARAM O ERRO)
  const generateStoreWhatsAppLink = (row) => `https://wa.me/?text=${encodeURIComponent(`Olá, equipe da *${row.client}*!\nAvaliamos a loja *${row.store}* até o dia ${currentDay}.\nProjeção: ${formatCurrency(row.projectedGmv)} / Meta: ${formatCurrency(row.gmvTarget)}.\n${row.status === 'danger' ? 'Precisamos alinhar ações urgentes de Ads/Estoque.' : row.status === 'warning' ? 'Podemos otimizar as campanhas da semana?' : 'Vocês estão voando! Vamos manter a tração.'}`)}`;
  
  const generateClientWhatsAppLink = (group) => {
    let text = `Olá, equipe da *${group.client}*! Aqui é a Equipe Avante - B2X.\n\nSegue o resumo do nosso desempenho até o dia ${currentDay}:\n\n`;
    group.stores.forEach(store => {
      text += `🏪 *${store.store}*\n`;
      text += `Faturado: ${formatCurrency(store.currentRevenue)}\n`;
      text += `Projeção: ${formatCurrency(store.projectedGmv)} (Meta: ${formatCurrency(store.gmvTarget)})\n\n`;
    });
    text += `📊 *RESUMO GERAL*\nFaturado Total: *${formatCurrency(group.totalCurrentRevenue)}*\nProjeção Total: *${formatCurrency(group.totalProjectedGmv)}*\nMeta Global: *${formatCurrency(group.totalGmvTarget)}*\n\n`;
    if (group.status === 'danger') text += `🚨 Como estamos abaixo da meta agrupada, precisamos alinhar urgentemente ações conjuntas.`;
    else if (group.status === 'warning') text += `⚠️ Estamos um pouquinho abaixo do ritmo esperado. Sugerimos aplicar otimizações.`;
    else text += `✅ Vocês estão voando! 🚀 Vamos manter a estratégia.`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const openHistoryModal = (store) => { setActiveStoreId(store.id); setNewHistoryDay(currentDay); setNewHistoryRevenue(store.currentRevenue || ''); setChartTab('pacing'); setHistoryModalOpen(true); };

  const dashboardData = useMemo(() => {
    let totalTarget = 0, totalProjected = 0, totalAgencyRevenue = 0, totalGlobalAds = 0;
    const filteredRows = stores.filter(row => !searchTerm || row.client.toLowerCase().includes(searchTerm.toLowerCase()) || row.store.toLowerCase().includes(searchTerm.toLowerCase()));

    const processedStores = filteredRows.map(store => {
      const growthRate = store.customGrowth !== undefined ? Number(store.customGrowth) : globalGrowth;
      const gmvTarget = (Number(store.gmvBase) || 0) * (1 + (growthRate / 100));
      const projectedGmv = currentDay > 0 ? ((Number(store.currentRevenue) || 0) / currentDay) * daysInMonth : 0;
      const isFixed = store.feeType === 'fixed' || store.fixedFee > 0;
      const projectedAgencyRevenue = isFixed ? Number(store.fixedFee) : projectedGmv * (Number(store.feePercent) / 100);
      const percentReached = gmvTarget > 0 ? (projectedGmv / gmvTarget) * 100 : 0;
      
      let status = percentReached >= 95 ? 'success' : percentReached >= 80 ? 'warning' : 'danger';
      totalTarget += gmvTarget; totalProjected += projectedGmv; totalAgencyRevenue += projectedAgencyRevenue; totalGlobalAds += (store.adsInvestment || 0);
      return { ...store, gmvTarget, projectedGmv, projectedAgencyRevenue, percentReached, status, tier: (store.gmvBase >= 80000 ? 'A' : store.gmvBase >= 30000 ? 'B' : 'C') };
    });

    const groups = {};
    processedStores.forEach(s => {
      if (!groups[s.client]) groups[s.client] = { client: s.client, stores: [], totalGmvBase: 0, totalGmvTarget: 0, totalCurrentRevenue: 0, totalProjectedGmv: 0, totalAds: 0 };
      groups[s.client].stores.push(s);
      groups[s.client].totalGmvBase += s.gmvBase || 0; groups[s.client].totalGmvTarget += s.gmvTarget;
      groups[s.client].totalCurrentRevenue += s.currentRevenue || 0; groups[s.client].totalProjectedGmv += s.projectedGmv;
      groups[s.client].totalAds += s.adsInvestment || 0;
    });

    const groupedClients = Object.values(groups).map(g => {
      const p = g.totalGmvTarget > 0 ? (g.totalProjectedGmv / g.totalGmvTarget) * 100 : 0;
      return { ...g, percentReached: p, status: p >= 95 ? 'success' : p >= 80 ? 'warning' : 'danger', roas: g.totalAds > 0 ? (g.totalCurrentRevenue / g.totalAds).toFixed(1) : 0 };
    }).sort((a, b) => b.totalGmvBase - a.totalGmvBase);

    return { groupedClients, totalTarget, totalProjected, totalAgencyRevenue, totalGlobalAds, globalRoas: totalGlobalAds > 0 ? (totalProjected / totalGlobalAds).toFixed(1) : 0 };
  }, [stores, globalGrowth, daysInMonth, currentDay, searchTerm]);

  const pieData = useMemo(() => dashboardData.groupedClients.map(g => ({ name: g.client, value: g.totalProjectedGmv })).filter(g => g.value > 0), [dashboardData]);
  const roasData = useMemo(() => dashboardData.groupedClients.filter(g => g.totalAds > 0).map(g => ({ name: g.client, roas: Number(g.roas) })).sort((a, b) => b.roas - a.roas), [dashboardData]);

  const activeStore = useMemo(() => stores.find(s => s.id === activeStoreId), [stores, activeStoreId]);
  const activeStorePacingData = useMemo(() => {
    if (!activeStore) return [];
    const data = [], historyMap = {};
    [...(activeStore.history || [])].sort((a, b) => a.day - b.day).forEach(h => historyMap[h.day] = h.revenue);
    if (activeStore.currentRevenue > 0) historyMap[currentDay] = activeStore.currentRevenue;
    const gmvTarget = (Number(activeStore.gmvBase) || 0) * (1 + ((activeStore.customGrowth !== undefined ? Number(activeStore.customGrowth) : globalGrowth) / 100));
    let lastActual = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      if (i <= currentDay && historyMap[i] !== undefined) lastActual = historyMap[i];
      data.push({ day: i, ideal: Math.round((gmvTarget / daysInMonth) * i), actual: i <= currentDay && lastActual > 0 ? Math.round(lastActual) : null });
    }
    return data;
  }, [activeStore, daysInMonth, currentDay, globalGrowth]);

  const activeStoreMonthlyData = useMemo(() => (!activeStore || !activeStore.monthlyHistory) ? [] : activeStore.monthlyHistory.map(h => ({ month: h.month, revenue: Math.round(h.gmv) })), [activeStore]);

  if (authLoading || !user) return <AuthScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleLogin={handleLogin} authError={authError} authLoading={authLoading} />;

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8 font-sans text-gray-200 pb-24">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700 gap-4 shadow-md">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsBatchMode(true)} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all">
              <Zap size={16} /> Lançamento em Lote
            </button>
          </div>
          
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700 mx-auto md:mx-0">
            <button onClick={() => setActiveView('operacional')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${activeView === 'operacional' ? 'bg-blue-600 text-white shadow' : 'text-gray-400'}`}>Operacional</button>
            <button onClick={() => setActiveView('dashboard')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${activeView === 'dashboard' ? 'bg-purple-600 text-white shadow' : 'text-gray-400'}`}>Visão Executiva</button>
            {isAdmin && <button onClick={() => setActiveView('admin')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${activeView === 'admin' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400'}`}>Equipe</button>}
          </div>

          <div className="flex gap-3">
            <button onClick={exportBackup} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-600"><Upload size={14} /> Exportar</button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={importBackup} className="hidden" />
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium"><Download size={14} /> Importar Base</button>
          </div>
        </div>

        {activeView === 'dashboard' && <ExecutiveDashboard dashboardData={dashboardData} formatCurrency={formatCurrency} pieData={pieData} roasData={roasData} COLORS={COLORS} />}
        {activeView === 'admin' && isAdmin && <AdminPanel handleCreateUser={()=>{}} newUserEmail={newUserEmail} setNewUserEmail={setNewUserEmail} newUserPassword={newUserPassword} setNewUserPassword={setNewUserPassword} />}

        {activeView === 'operacional' && (
          <OperationalTable 
            canEdit={canEdit} searchTerm={searchTerm} setSearchTerm={setSearchTerm} dashboardData={dashboardData} expandedClients={expandedClients} 
            setExpandedClients={setExpandedClients} formatCurrency={formatCurrency} currentDay={currentDay} setCurrentDay={setCurrentDay} globalGrowth={globalGrowth} setGlobalGrowth={setGlobalGrowth} updateGlobalSettings={updateGlobalSettings}
            addNewStore={addNewStore} addNewStoreToClient={addNewStoreToClient} deleteStore={deleteStore} deleteClient={deleteClient}
            startEditingClient={startEditingClient} editingClient={editingClient} clientEditValue={clientEditValue} setClientEditValue={setClientEditValue} saveClientEdit={saveClientEdit}
            startEditingStore={startEditingStore} editingStoreId={editingStoreId} setEditingStoreId={setEditingStoreId} storeEditData={storeEditData} setStoreEditData={setStoreEditData} saveStoreEdit={saveStoreEdit}
            toggleClientExpansion={toggleClientExpansion}
            stores={stores} sortBy={sortBy} setSortBy={setSortBy}
            handleStoreChange={handleStoreChange}
            openHistoryModal={openHistoryModal}
            generateStoreWhatsAppLink={generateStoreWhatsAppLink}
            generateClientWhatsAppLink={generateClientWhatsAppLink}
          />
        )}
      </div>

      {isBatchMode && (
        <BatchEntry stores={stores} currentDay={currentDay} onSaveBatch={handleSaveBatch} onClose={() => setIsBatchMode(false)} />
      )}

      {/* MODAL DE HISTÓRICO RESTAURADO */}
      {historyModalOpen && activeStore && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-3xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900">
              <div className="flex items-center gap-6">
                <div><h3 className="text-lg font-bold text-white">Dashboard Analítico</h3><p className="text-xs text-gray-400 mt-1">{activeStore.client} - {activeStore.store}</p></div>
                <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 ml-4">
                  <button onClick={() => setChartTab('pacing')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${chartTab === 'pacing' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Pacing</button>
                  <button onClick={() => setChartTab('monthly')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${chartTab === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Mensal</button>
                  <button onClick={() => setChartTab('notes')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${chartTab === 'notes' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                    Diário {activeStore.notes?.length > 0 && `(${activeStore.notes.length})`}
                  </button>
                </div>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="p-1 hover:bg-gray-700 rounded-lg transition-colors"><X size={20} className="text-gray-400 hover:text-white" /></button>
            </div>
            <div className="p-5">
              {chartTab === 'pacing' && (
                <div className="flex flex-col md:flex-row gap-5">
                  <div className="flex-1 flex flex-col">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex justify-between"><span>Curva de Velocidade</span></h4>
                    <div className="h-64 w-full bg-gray-900 rounded-lg p-3 border border-gray-700">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activeStorePacingData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                          <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} tickMargin={10} />
                          <YAxis stroke="#9CA3AF" fontSize={10} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} formatter={(value) => formatCurrency(value)} />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                          <Line type="monotone" dataKey="ideal" name="Meta Ideal" stroke="#6B7280" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                          <Line type="monotone" dataKey="actual" name="Realizado" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: '#10B981' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="w-full md:w-64 flex flex-col gap-4">
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Novo Ponto</h4>
                      <div className="flex gap-2 items-end">
                        <div className="w-16"><label className="text-[10px] text-gray-500 mb-1 block">Dia</label><input type="number" value={newHistoryDay} onChange={e => setNewHistoryDay(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-1.5 text-white outline-none text-sm" /></div>
                        <div className="flex-1"><label className="text-[10px] text-gray-500 mb-1 block">R$ Acumulado</label><input type="number" value={newHistoryRevenue} onChange={e => setNewHistoryRevenue(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-1.5 text-white outline-none text-sm" /></div>
                        <button onClick={() => {
                          const entry = { id: Date.now(), day: Number(newHistoryDay), revenue: Number(newHistoryRevenue), date: new Date().toLocaleDateString('pt-BR') };
                          updateStoreInCloud({...activeStore, history: [...(activeStore.history||[]), entry]});
                          setStores(stores.map(s => s.id === activeStore.id ? {...s, history: [...(s.history||[]), entry].sort((a,b)=>a.day-b.day)} : s));
                        }} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded text-sm h-[34px]"><Plus size={16}/></button>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Arquivo</h4>
                      <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-40">
                        {activeStore.history?.length > 0 ? activeStore.history.map(h => (
                          <div key={h.id} className="flex justify-between items-center bg-gray-700/30 p-2 rounded border border-gray-700">
                            <div className="font-bold text-gray-200 text-xs">Dia {h.day}</div>
                            <div className="flex items-center gap-3"><span className="font-bold text-green-400 text-xs">{formatCurrency(h.revenue)}</span><button onClick={() => setStores(stores.map(s => s.id === activeStore.id ? {...s, history: s.history.filter(x => x.id !== h.id)} : s))} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14}/></button></div>
                          </div>
                        )) : <div className="text-center p-4 border border-dashed border-gray-700 rounded text-gray-500 text-xs">Sem lançamentos.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {chartTab === 'monthly' && (
                <div className="h-72 w-full bg-gray-900 rounded-lg p-4 border border-gray-700 flex flex-col justify-center items-center">
                  {activeStoreMonthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeStoreMonthlyData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="month" stroke="#9CA3AF" tickMargin={10} />
                        <YAxis stroke="#9CA3AF" tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                        <RechartsTooltip cursor={{ fill: '#374151', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} formatter={(value) => [formatCurrency(value), 'Faturamento']} />
                        <Bar dataKey="revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="text-gray-500 text-center"><ArchiveRestore size={32} className="opacity-50 mx-auto" /><p>Nenhum histórico.</p></div>}
                </div>
              )}
              {chartTab === 'notes' && (
                <div className="flex flex-col h-72">
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4">
                    {activeStore.notes && activeStore.notes.length > 0 ? activeStore.notes.map(note => (
                      <div key={note.id} className="bg-gray-900 p-3 rounded-lg border border-gray-700 relative group">
                        <div className="text-[10px] font-bold text-indigo-400 mb-1">{note.date}</div>
                        <p className="text-sm text-gray-300">{note.text}</p>
                        <button onClick={() => setStores(stores.map(s => s.id === activeStore.id ? { ...s, notes: s.notes.filter(n => n.id !== note.id) } : s))} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                      </div>
                    )) : <div className="h-full flex items-center justify-center text-gray-500 text-sm">Nenhuma anotação.</div>}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newNoteText} onChange={e => setNewNoteText(e.target.value)} onKeyDown={e => {
                        if(e.key === 'Enter' && newNoteText.trim()) {
                            setStores(stores.map(s => s.id === activeStore.id ? { ...s, notes: [...(s.notes || []), { id: Date.now(), date: new Date().toLocaleDateString('pt-BR'), text: newNoteText }] } : s));
                            setNewNoteText('');
                        }
                    }} placeholder="Escreva algo..." className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white outline-none" />
                    <button onClick={() => {
                        if(!newNoteText.trim()) return;
                        setStores(stores.map(s => s.id === activeStore.id ? { ...s, notes: [...(s.notes || []), { id: Date.now(), date: new Date().toLocaleDateString('pt-BR'), text: newNoteText }] } : s));
                        setNewNoteText('');
                    }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg font-bold">Salvar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingUp, DollarSign, Target, Activity, MessageCircle, Search, Download, Upload, Save, Plus, X, Trash2, PieChart as PieChartIcon, Zap, ArchiveRestore } from 'lucide-react';
import { db, auth, secondaryAuth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc } from "firebase/firestore";
import { Toaster, toast } from 'react-hot-toast';

import ActionModal from './components/ActionModal';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import OperationalTable from './components/OperationalTable';
import HistoryModal from './components/HistoryModal';
import BatchEntry from './components/BatchEntry';

// BANCO DE DADOS LIMPO PARA VOCÊ SUBIR O SEU BACKUP!
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
  const [activeNoteStoreId, setActiveNoteStoreId] = useState(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
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

  // --- AUTENTICAÇÃO E PERMISSÕES ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "equipe", currentUser.email.toLowerCase());
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserRole(docSnap.data().role || 'Visualizador');
          }
        } catch (e) { console.error("Erro ao buscar cargo", e); }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === 'jaimejunior.ide@gmail.com';
  const canEdit = userRole === 'Gerente' || isAdmin;

  // --- CARREGAMENTO DE DADOS (STORES E CONFIGURAÇÕES) ---
  useEffect(() => {
    if (!user) return;
    const unsubStores = onSnapshot(collection(db, "stores"), (snapshot) => {
      if (!snapshot.empty) {
        setStores(snapshot.docs.map(doc => doc.data()).sort((a, b) => b.id - a.id));
      }
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

  // --- FUNÇÕES DE LÓGICA CORE ---
  const handleLogin = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, password); setAuthError(''); } catch (e) { setAuthError('E-mail ou senha incorretos.'); } };
  const handleLogout = () => signOut(auth);

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

  // ... Funcionalidades de Backup ...
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

  const getTier = (gmv) => { if (gmv >= 80000) return 'A'; if (gmv >= 30000) return 'B'; return 'C'; };
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);

  // DASHBOARD CALCULATIONS
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
      return { ...store, gmvTarget, projectedGmv, projectedAgencyRevenue, percentReached, status, tier: getTier(store.gmvBase) };
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

  if (authLoading || !user) return <AuthScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleLogin={handleLogin} authError={authError} authLoading={authLoading} />;

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8 font-sans text-gray-200 pb-24">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabecalho Principal */}
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

        {/* VISÃO OPERACIONAL (Tabela) */}
        {activeView === 'operacional' && (
          <OperationalTable 
            canEdit={canEdit} searchTerm={searchTerm} setSearchTerm={setSearchTerm} dashboardData={dashboardData} expandedClients={expandedClients} 
            setExpandedClients={setExpandedClients} formatCurrency={formatCurrency} currentDay={currentDay} globalGrowth={globalGrowth} updateGlobalSettings={updateGlobalSettings}
            addNewStore={addNewStore} addNewStoreToClient={addNewStoreToClient} deleteStore={deleteStore} deleteClient={deleteClient}
            startEditingClient={startEditingClient} editingClient={editingClient} clientEditValue={clientEditValue} setClientEditValue={setClientEditValue} saveClientEdit={saveClientEdit}
            startEditingStore={startEditingStore} editingStoreId={editingStoreId} setEditingStoreId={setEditingStoreId} storeEditData={storeEditData} setStoreEditData={setStoreEditData} saveStoreEdit={saveStoreEdit}
            toggleClientExpansion={toggleClientExpansion}
            stores={stores}
          />
        )}
      </div>

      {isBatchMode && (
        <BatchEntry stores={stores} currentDay={currentDay} onSaveBatch={handleSaveBatch} onClose={() => setIsBatchMode(false)} />
      )}
    </div>
  );
}

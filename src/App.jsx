import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingUp, DollarSign, Target, AlertTriangle, CheckCircle, Clock, Activity, MessageCircle, Search, Download, Upload, Save, Plus, History, X, Trash2, ChevronDown, ChevronRight, BarChart2, CalendarDays, ArchiveRestore, Edit2, Check, BookOpen, PieChart as PieChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { db } from './firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";

// Base de Dados Completa: 14 Clientes, 42 Lojas (Jan, Fev, Mar extraídos da planilha)
const initialStores = [
  { id: 1, client: 'AMAIA', store: 'SHOPEE', gmvBase: 11967, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 14861}, {month: 'Fev', gmv: 8729}, {month: 'Mar', gmv: 11967}] },
  { id: 2, client: 'AMAIA', store: 'SHEIN', gmvBase: 13288, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 10463}, {month: 'Fev', gmv: 11589}, {month: 'Mar', gmv: 13288}] },
  { id: 3, client: 'AMAIA', store: 'MELI', gmvBase: 6340, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 2454}, {month: 'Fev', gmv: 1550}, {month: 'Mar', gmv: 6340}] },
  { id: 4, client: 'ASZUZ', store: 'SHOPEE', gmvBase: 30168, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 23689}, {month: 'Fev', gmv: 29766}, {month: 'Mar', gmv: 30168}] },
  { id: 5, client: 'ASZUZ', store: 'SHEIN', gmvBase: 6169, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 8164}, {month: 'Fev', gmv: 5656}, {month: 'Mar', gmv: 6169}] },
  { id: 6, client: 'ASZUZ', store: 'MELI', gmvBase: 7773, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 2401}, {month: 'Fev', gmv: 5314}, {month: 'Mar', gmv: 7773}] },
  { id: 7, client: 'DANIELE', store: 'SHOPEE PJ', gmvBase: 20405, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 12866}, {month: 'Fev', gmv: 15869}, {month: 'Mar', gmv: 20405}] },
  { id: 8, client: 'DANIELE', store: 'SHOPEE CPF', gmvBase: 16683, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 8532}, {month: 'Fev', gmv: 11520}, {month: 'Mar', gmv: 16683}] },
  { id: 9, client: 'DAYANE', store: 'SHOPEE', gmvBase: 12544, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 0}, {month: 'Fev', gmv: 0}, {month: 'Mar', gmv: 12544}] },
  { id: 10, client: 'DIEGO', store: 'SHOPEE', gmvBase: 35395, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 23639}, {month: 'Fev', gmv: 16919}, {month: 'Mar', gmv: 35395}] },
  { id: 11, client: 'DIEGO', store: 'MELI', gmvBase: 150476, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 83019}, {month: 'Fev', gmv: 164097}, {month: 'Mar', gmv: 150476}] },
  { id: 12, client: 'EDSON', store: 'SHOPEE', gmvBase: 5748, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 0}, {month: 'Fev', gmv: 0}, {month: 'Mar', gmv: 5748}] },
  { id: 13, client: 'EDSON', store: 'MELI', gmvBase: 4105, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 0}, {month: 'Fev', gmv: 0}, {month: 'Mar', gmv: 4105}] },
  { id: 14, client: 'FREONES', store: 'PÉ ESQUERDO', gmvBase: 8121, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 7359}, {month: 'Fev', gmv: 6270}, {month: 'Mar', gmv: 8121}] },
  { id: 15, client: 'FREONES', store: 'BRUNO', gmvBase: 21588, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 18425}, {month: 'Fev', gmv: 23850}, {month: 'Mar', gmv: 21588}] },
  { id: 16, client: 'FREONES', store: 'VICTOR', gmvBase: 4963, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 2916}, {month: 'Fev', gmv: 2484}, {month: 'Mar', gmv: 4963}] },
  { id: 17, client: 'FREONES', store: 'ZUNO', gmvBase: 5436, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 164}, {month: 'Fev', gmv: 663}, {month: 'Mar', gmv: 5436}] },
  { id: 18, client: 'GUILHERME', store: 'SHOPEE', gmvBase: 11048, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 8964}, {month: 'Fev', gmv: 15538}, {month: 'Mar', gmv: 11048}] },
  { id: 19, client: 'JR', store: 'SHOPEE DEVAIR', gmvBase: 10496, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 32893}, {month: 'Fev', gmv: 55844}, {month: 'Mar', gmv: 10496}] },
  { id: 20, client: 'JR', store: 'SHEIN JR', gmvBase: 25852, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 8373}, {month: 'Fev', gmv: 17884}, {month: 'Mar', gmv: 25852}] },
  { id: 21, client: 'JR', store: 'SHOPEE JACO', gmvBase: 22581, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 56016}, {month: 'Fev', gmv: 73310}, {month: 'Mar', gmv: 22581}] },
  { id: 22, client: 'JR', store: 'TIKTOK', gmvBase: 15789, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 31366}, {month: 'Fev', gmv: 14959}, {month: 'Mar', gmv: 15789}] },
  { id: 23, client: 'JR', store: 'SHEIN JACO', gmvBase: 7606, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 554}, {month: 'Fev', gmv: 6676}, {month: 'Mar', gmv: 7606}] },
  { id: 24, client: 'JR', store: 'SHOPEE THALIA', gmvBase: 13957, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 24041}, {month: 'Fev', gmv: 27061}, {month: 'Mar', gmv: 13957}] },
  { id: 25, client: 'JR', store: 'SHOPEE MAIRA', gmvBase: 189, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 0}, {month: 'Fev', gmv: 499}, {month: 'Mar', gmv: 189}] },
  { id: 26, client: 'NL', store: 'SHOPEE PJ', gmvBase: 82611, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 118005}, {month: 'Fev', gmv: 65281}, {month: 'Mar', gmv: 82611}] },
  { id: 27, client: 'NL', store: 'SHOPEE CPF', gmvBase: 14612, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 21048}, {month: 'Fev', gmv: 37185}, {month: 'Mar', gmv: 14612}] },
  { id: 28, client: 'PH', store: 'SHOPEE MARCOS', gmvBase: 39300, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 55757}, {month: 'Fev', gmv: 43131}, {month: 'Mar', gmv: 39300}] },
  { id: 29, client: 'PH', store: 'SHOPEE PH', gmvBase: 13753, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 0}, {month: 'Fev', gmv: 3841}, {month: 'Mar', gmv: 13753}] },
  { id: 30, client: 'PEDRO', store: 'GALO', gmvBase: 71010, feePercent: 0, fixedFee: 539.35, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 82644}, {month: 'Fev', gmv: 69297}, {month: 'Mar', gmv: 71010}] },
  { id: 31, client: 'PEDRO', store: 'BRILHO NOS PÉS', gmvBase: 114550, feePercent: 0, fixedFee: 870.05, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 52369}, {month: 'Fev', gmv: 73075}, {month: 'Mar', gmv: 114550}] },
  { id: 32, client: 'PEDRO', store: 'LUZ NOS PES 3', gmvBase: 65782, feePercent: 0, fixedFee: 499.64, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 58672}, {month: 'Fev', gmv: 46499}, {month: 'Mar', gmv: 65782}] },
  { id: 33, client: 'PEDRO', store: 'HP SHOES', gmvBase: 6645, feePercent: 0, fixedFee: 50.47, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 9218}, {month: 'Fev', gmv: 8156}, {month: 'Mar', gmv: 6645}] },
  { id: 34, client: 'PEDRO', store: 'LUZ NOS PÉS 1', gmvBase: 181068, feePercent: 0, fixedFee: 1375.28, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 178047}, {month: 'Fev', gmv: 83186}, {month: 'Mar', gmv: 181068}] },
  { id: 35, client: 'PEDRO', store: 'MODA ATUAL 1', gmvBase: 167557, feePercent: 0, fixedFee: 1272.65, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 188988}, {month: 'Fev', gmv: 112089}, {month: 'Mar', gmv: 167557}] },
  { id: 36, client: 'PEDRO', store: 'MODA ATUAL 2', gmvBase: 51683, feePercent: 0, fixedFee: 392.55, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 84299}, {month: 'Fev', gmv: 69476}, {month: 'Mar', gmv: 51683}] },
  { id: 37, client: 'WALMIR', store: 'RESERVA 1', gmvBase: 43658, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 18598}, {month: 'Fev', gmv: 21322}, {month: 'Mar', gmv: 43658}] },
  { id: 38, client: 'WALMIR', store: 'RESERVA 2', gmvBase: 3702, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 2322}, {month: 'Fev', gmv: 3411}, {month: 'Mar', gmv: 3702}] },
  { id: 39, client: 'WALMIR', store: 'SIMONE', gmvBase: 6717, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 11641}, {month: 'Fev', gmv: 5679}, {month: 'Mar', gmv: 6717}] },
  { id: 40, client: 'WASHINGTON', store: 'SHEIN ANDREIA', gmvBase: 31314, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 50238}, {month: 'Fev', gmv: 21710}, {month: 'Mar', gmv: 31314}] },
  { id: 41, client: 'WASHINGTON', store: 'SHEIN WASH', gmvBase: 5078, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 9852}, {month: 'Fev', gmv: 6129}, {month: 'Mar', gmv: 5078}] },
  { id: 42, client: 'WASHINGTON', store: 'MELI ANDREIA', gmvBase: 1850, feePercent: 1.0, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [{month: 'Jan', gmv: 0}, {month: 'Fev', gmv: 3989}, {month: 'Mar', gmv: 1850}] },
];

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#84CC16', '#F43F5E'];

export default function App() {
  const [stores, setStores] = useState(initialStores);

// Use este useEffect para buscar os dados uma única vez ao iniciar
useEffect(() => {
  const loadStores = async () => {
    const querySnapshot = await getDocs(collection(db, "stores"));
    const storesFromFirebase = querySnapshot.docs.map(doc => doc.data());
    
    if (storesFromFirebase.length > 0) {
      setStores(storesFromFirebase);
    }
  };
  loadStores();
}, []);

  const [activeView, setActiveView] = useState('operacional'); // 'operacional' | 'dashboard'
  const [globalGrowth, setGlobalGrowth] = useState(10);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [currentDay, setCurrentDay] = useState(11);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('gmv');
  const [expandedClients, setExpandedClients] = useState([]);
  
  const [editingClient, setEditingClient] = useState(null);
  const [clientEditValue, setClientEditValue] = useState('');
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [storeEditData, setStoreEditData] = useState({});

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [newHistoryDay, setNewHistoryDay] = useState('');
  const [newHistoryRevenue, setNewHistoryRevenue] = useState('');
  const [chartTab, setChartTab] = useState('pacing'); 
  
  const [activeNoteStoreId, setActiveNoteStoreId] = useState(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('avante_gestao_data_v4', JSON.stringify(stores));
  }, [stores]);

  const toggleClientExpansion = (clientName) => {
    setExpandedClients(prev => prev.includes(clientName) ? prev.filter(c => c !== clientName) : [...prev, clientName]);
  };

  const startEditingClient = (name) => { setEditingClient(name); setClientEditValue(name); };
  const saveClientEdit = (oldName) => {
    if (clientEditValue.trim() === '') return;
    const upperNewName = clientEditValue.toUpperCase();
    setStores(stores.map(s => s.client === oldName ? { ...s, client: upperNewName } : s));
    if (expandedClients.includes(oldName)) setExpandedClients(prev => [...prev.filter(c => c !== oldName), upperNewName]);
    setEditingClient(null);
  };

  const startEditingStore = (store) => { setEditingStoreId(store.id); setStoreEditData({ store: store.store, feePercent: store.feePercent, gmvBase: store.gmvBase, marketplace: store.marketplace || '' }); };
  const saveStoreEdit = (id) => {
    setStores(stores.map(s => s.id === id ? { ...s, store: storeEditData.store.toUpperCase(), feePercent: Number(storeEditData.feePercent), gmvBase: Number(storeEditData.gmvBase), marketplace: storeEditData.marketplace } : s));
    setEditingStoreId(null);
  };

  const autoSaveHistory = (storeId, revenue) => {
    if (!revenue || Number(revenue) <= 0) return;
    setStores(stores.map(s => {
      if (s.id === storeId) {
        const existingIndex = (s.history || []).findIndex(h => h.day === currentDay);
        let newHistory = [...(s.history || [])];
        if (existingIndex >= 0) newHistory[existingIndex].revenue = Number(revenue);
        else newHistory.push({ id: Date.now(), day: currentDay, revenue: Number(revenue), date: new Date().toLocaleDateString('pt-BR') });
        return { ...s, history: newHistory.sort((a, b) => a.day - b.day) };
      }
      return s;
    }));
  };

  const handleStoreChange = (id, field, value) => {
    const finalValue = value !== '' ? Number(value) : value;
    setStores(stores.map(s => s.id === id ? { ...s, [field]: finalValue } : s));
  };

  const addNewStore = () => {
    const newStore = { id: Date.now(), client: 'NOVO CLIENTE', store: 'NOVA LOJA', gmvBase: 0, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [] };
    setStores([newStore, ...stores]);
    setSearchTerm(''); 
    if(!expandedClients.includes('NOVO CLIENTE')) toggleClientExpansion('NOVO CLIENTE');
  };

  const addNewStoreToClient = (clientName) => {
    const newStore = { id: Date.now(), client: clientName, store: 'NOVA LOJA', gmvBase: 0, feePercent: 1.5, fixedFee: 0, currentRevenue: 0, adsInvestment: 0, history: [], notes: [], monthlyHistory: [] };
    setStores(prev => [newStore, ...prev]);
    if(!expandedClients.includes(clientName)) toggleClientExpansion(clientName);
  };

  const deleteStore = (id, storeName) => { if(window.confirm(`Apagar permanentemente a loja ${storeName}?`)) setStores(stores.filter(s => s.id !== id)); };
  const deleteClient = (clientName) => { if(window.confirm(`🚨 Apagar o cliente ${clientName} e TODAS as suas lojas?`)) setStores(stores.filter(s => s.client !== clientName)); };

  const closeMonth = () => {
    const monthName = prompt("MÊS DE FECHAMENTO\n\nDigite o nome do mês que está sendo fechado agora (Ex: Abr/26):");
    if(!monthName) return;
    if(window.confirm(`Isso salvará o histórico mensal e zerará os lançamentos do painel para o próximo mês.\nDeseja continuar?`)) {
      setStores(stores.map(s => {
        const finalRevenue = s.currentRevenue || 0;
        return { ...s, monthlyHistory: [...(s.monthlyHistory || []), { month: monthName, gmv: finalRevenue }], gmvBase: finalRevenue > 0 ? finalRevenue : s.gmvBase, currentRevenue: 0, adsInvestment: 0, history: [] };
      }));
      setCurrentDay(1);
      alert("✅ Mês fechado com sucesso!");
    }
  };

  // Diário de Bordo Functions
  const openNotesModal = (store) => { setActiveNoteStoreId(store.id); setNotesModalOpen(true); };
  const addNote = () => {
    if (!newNoteText.trim()) return;
    setStores(stores.map(s => {
      if (s.id === activeNoteStoreId) {
        const note = { id: Date.now(), date: new Date().toLocaleDateString('pt-BR'), text: newNoteText };
        return { ...s, notes: [...(s.notes || []), note] };
      }
      return s;
    }));
    setNewNoteText('');
  };
  const deleteNote = (storeId, noteId) => { setStores(stores.map(s => s.id === storeId ? { ...s, notes: (s.notes || []).filter(n => n.id !== noteId) } : s)); };

  const openHistoryModal = (store) => { setActiveStoreId(store.id); setNewHistoryDay(currentDay); setNewHistoryRevenue(store.currentRevenue || ''); setChartTab('pacing'); setHistoryModalOpen(true); };
  const addHistoryEntry = () => {
    if (!newHistoryDay || !newHistoryRevenue) return;
    setStores(stores.map(s => {
      if (s.id === activeStoreId) {
        const entry = { id: Date.now(), day: Number(newHistoryDay), revenue: Number(newHistoryRevenue), date: new Date().toLocaleDateString('pt-BR') };
        return { ...s, history: [...(s.history || []), entry].sort((a, b) => a.day - b.day), currentRevenue: Number(newHistoryRevenue) };
      }
      return s;
    }));
    setNewHistoryRevenue('');
  };
  const deleteHistoryEntry = (storeId, entryId) => { setStores(stores.map(s => s.id === storeId ? { ...s, history: (s.history || []).filter(h => h.id !== entryId) } : s)); };

  const getTier = (gmv) => { if (gmv >= 80000) return 'A'; if (gmv >= 30000) return 'B'; return 'C'; };
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);

const dashboardData = useMemo(() => {
    let totalTarget = 0, totalProjected = 0, totalAgencyRevenue = 0, totalGlobalAds = 0;
    const filteredRows = stores.filter(row => {
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      return row.client.toLowerCase().includes(lowerSearch) || row.store.toLowerCase().includes(lowerSearch);
    });

    const processedStores = filteredRows.map(store => {
      const growthRate = store.customGrowth !== undefined && store.customGrowth !== '' ? Number(store.customGrowth) : globalGrowth;
      const safeGmvBase = Number(store.gmvBase) || 0;
      const gmvTarget = safeGmvBase * (1 + (growthRate / 100));
      const actualDaily = currentDay > 0 ? (Number(store.currentRevenue) || 0) / currentDay : 0;
      const projectedGmv = actualDaily * daysInMonth;
      const revenueTarget = store.fixedFee > 0 ? store.fixedFee : gmvTarget * (store.feePercent / 100);
      const projectedAgencyRevenue = store.fixedFee > 0 ? store.fixedFee : projectedGmv * (store.feePercent / 100);
      const percentReached = gmvTarget > 0 ? (projectedGmv / gmvTarget) * 100 : 0;
      
      let status = 'danger', recommendation = 'Aplicar cupons agressivos.';
      if (percentReached >= 95) { status = 'success'; recommendation = 'Monitorar. Manter Ads.'; }
      else if (percentReached >= 80) { status = 'warning'; recommendation = getTier(safeGmvBase) === 'A' ? 'Auditoria Estoque. Otimizar Custo Ads.' : 'Aumentar lances Ads.'; }
      else if (getTier(safeGmvBase) === 'A') recommendation = 'URGENTE: Reunião. Injetar Verba Extra Ads.';

      totalTarget += gmvTarget; totalProjected += projectedGmv; totalAgencyRevenue += projectedAgencyRevenue;
      totalGlobalAds += (store.adsInvestment || 0);

      return { ...store, gmvTarget, projectedGmv, projectedAgencyRevenue, percentReached, status, tier: getTier(safeGmvBase), recommendation };
    });

    const groups = {};
    processedStores.forEach(store => {
      if (!groups[store.client]) groups[store.client] = { client: store.client, stores: [], totalGmvBase: 0, totalGmvTarget: 0, totalCurrentRevenue: 0, totalProjectedGmv: 0, totalAds: 0 };
      groups[store.client].stores.push(store);
      groups[store.client].totalGmvBase += store.gmvBase || 0; groups[store.client].totalGmvTarget += store.gmvTarget;
      groups[store.client].totalCurrentRevenue += store.currentRevenue || 0; groups[store.client].totalProjectedGmv += store.projectedGmv;
      groups[store.client].totalAds += store.adsInvestment || 0;
    });

    const groupedClients = Object.values(groups).map(group => {
      const percentReached = group.totalGmvTarget > 0 ? (group.totalProjectedGmv / group.totalGmvTarget) * 100 : 0;
      const roas = group.totalAds > 0 ? (group.totalCurrentRevenue / group.totalAds).toFixed(1) : 0;
      return { ...group, percentReached, status: percentReached >= 95 ? 'success' : percentReached >= 80 ? 'warning' : 'danger', roas };
    }).sort((a, b) => {
      if (sortBy === 'name') return a.client.localeCompare(b.client);
      if (sortBy === 'status') {
        const weight = { danger: 1, warning: 2, success: 3 };
        return weight[a.status] - weight[b.status];
      }
      return b.totalGmvBase - a.totalGmvBase;
    });

    const globalRoas = totalGlobalAds > 0 ? (processedStores.reduce((acc, s) => acc + (s.currentRevenue || 0), 0) / totalGlobalAds).toFixed(1) : 0;
    
    const totalAgencyLastMonth = processedStores.reduce((acc, s) => {
      const lastGmv = s.monthlyHistory && s.monthlyHistory.length > 0 ? s.monthlyHistory[s.monthlyHistory.length - 1].gmv : 0;
      return acc + (s.fixedFee > 0 ? s.fixedFee : lastGmv * (s.feePercent / 100));
    }, 0);
    
    const totalAgencyCurrent = processedStores.reduce((acc, s) => {
      if (s.fixedFee > 0) {
        const dailyFixedFee = s.fixedFee / daysInMonth;
        return acc + (dailyFixedFee * currentDay);
      } else {
        return acc + ((s.currentRevenue || 0) * (s.feePercent / 100));
      }
    }, 0);
    
    return { groupedClients, totalTarget, totalProjected, totalAgencyRevenue, totalGlobalAds, globalRoas, totalAgencyLastMonth, totalAgencyCurrent };
  }, [stores, globalGrowth, daysInMonth, currentDay, searchTerm, sortBy]);

  // Dados para o Gráfico de Pizza (Dashboard Global)
  const pieData = useMemo(() => {
    return dashboardData.groupedClients.map(g => ({ name: g.client, value: g.totalProjectedGmv })).filter(g => g.value > 0).sort((a, b) => b.value - a.value);
  }, [dashboardData]);

  // Dados para o Gráfico de ROAS (Dashboard Global)
  const roasData = useMemo(() => {
    return dashboardData.groupedClients.filter(g => g.totalAds > 0).map(g => ({ name: g.client, roas: Number(g.roas) })).sort((a, b) => b.roas - a.roas);
  }, [dashboardData]);

  const generateStoreWhatsAppLink = (row) => `https://wa.me/?text=${encodeURIComponent(`Olá, equipe da *${row.client}*!\nAvaliamos a loja *${row.store}* até o dia ${currentDay}.\nProjeção: ${formatCurrency(row.projectedGmv)} / Meta: ${formatCurrency(row.gmvTarget)}.\n${row.status === 'danger' ? 'Precisamos alinhar ações urgentes de Ads/Estoque.' : row.status === 'warning' ? 'Podemos otimizar as campanhas da semana?' : 'Vocês estão voando! Vamos manter a tração.'}`)}`;
  
  const generateClientWhatsAppLink = (group) => {
    let text = `Olá, equipe da *${group.client}*! Aqui é a Equipe Avante - B2X.\n\nSegue o resumo do nosso desempenho até o dia ${currentDay}:\n\n`;
    
    group.stores.forEach(store => {
      text += `🏪 *${store.store}*\n`;
      text += `Faturado: ${formatCurrency(store.currentRevenue)}\n`;
      text += `Projeção: ${formatCurrency(store.projectedGmv)} (Meta: ${formatCurrency(store.gmvTarget)})\n\n`;
    });

    text += `📊 *RESUMO GERAL*\n`;
    text += `Faturado Total: *${formatCurrency(group.totalCurrentRevenue)}*\n`;
    text += `Projeção Total: *${formatCurrency(group.totalProjectedGmv)}*\n`;
    text += `Meta Global: *${formatCurrency(group.totalGmvTarget)}*\n\n`;
    
    if (group.status === 'danger') {
        text += `🚨 Como estamos abaixo da meta agrupada, precisamos alinhar urgentemente algumas ações conjuntas. Podemos falar hoje?`;
    } else if (group.status === 'warning') {
        text += `⚠️ Estamos um pouquinho abaixo do ritmo esperado na visão geral. Sugerimos aplicar algumas otimizações. Tudo bem?`;
    } else {
        text += `✅ Vocês estão voando! 🚀 Vamos ultrapassar a meta global! Vamos manter a estratégia.`;
    }

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };
  const activeStore = useMemo(() => stores.find(s => s.id === activeStoreId), [stores, activeStoreId]);
  const activeNoteStore = useMemo(() => stores.find(s => s.id === activeNoteStoreId), [stores, activeNoteStoreId]);
  
  const activeStorePacingData = useMemo(() => {
    if (!activeStore) return [];
    const data = [], historyMap = {};
    [...(activeStore.history || [])].sort((a, b) => a.day - b.day).forEach(h => historyMap[h.day] = h.revenue);
    if (activeStore.currentRevenue > 0) historyMap[currentDay] = activeStore.currentRevenue;
    const gmvTarget = (Number(activeStore.gmvBase) || 0) * (1 + ((activeStore.customGrowth !== undefined && activeStore.customGrowth !== '' ? Number(activeStore.customGrowth) : globalGrowth) / 100));
    let lastActual = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      if (i <= currentDay && historyMap[i] !== undefined) lastActual = historyMap[i];
      data.push({ day: i, ideal: Math.round((gmvTarget / daysInMonth) * i), actual: i <= currentDay && lastActual > 0 ? Math.round(lastActual) : null });
    }
    return data;
  }, [activeStore, daysInMonth, currentDay, globalGrowth]);
  const activeStoreMonthlyData = useMemo(() => (!activeStore || !activeStore.monthlyHistory) ? [] : activeStore.monthlyHistory.map(h => ({ month: h.month, revenue: Math.round(h.gmv) })), [activeStore]);

  const exportBackup = () => {
    try {
      const dataStr = JSON.stringify(stores, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avante_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Erro ao gerar o arquivo de exportação.");
    }
  };

  const importBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileReader = new FileReader();
    fileReader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          // Garante que todas as chaves existam para evitar quebras de renderização
          setStores(imported.map(s => ({
            ...s, 
            history: s.history || [], 
            notes: s.notes || [], 
            monthlyHistory: s.monthlyHistory || []
          })));
          alert("✅ Dados restaurados com sucesso!");
        } else {
          alert("❌ Formato de arquivo inválido.");
        }
      } catch (err) { 
        alert("❌ Erro ao ler o arquivo JSON."); 
      } finally {
        e.target.value = null; // Limpa o input APÓS a leitura
      }
    };
    fileReader.readAsText(file, "UTF-8");
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8 font-sans text-gray-200 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabecalho Principal e Switcher de Visão */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700 gap-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-500 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
              <Save size={16} /> <span className="text-sm font-semibold">Salvo Local</span>
            </div>
            <button onClick={closeMonth} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg transition-transform hover:scale-105">
              <ArchiveRestore size={16} /> Fechar Mês Atual
            </button>
          </div>
          
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700 mx-auto md:mx-0">
            <button onClick={() => setActiveView('operacional')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'operacional' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Gestão Operacional</button>
            <button onClick={() => setActiveView('dashboard')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${activeView === 'dashboard' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
              <PieChartIcon size={16}/> Visão Executiva
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={exportBackup} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-gray-600">
              <Upload size={14} /> Exportar
            </button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={importBackup} className="hidden" />
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              <Download size={14} /> Importar
            </button>
          </div>
        </div>

        {/* VISÃO DASHBOARD EXECUTIVO */}
        {activeView === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-blue-900/50 rounded-lg text-blue-400"><Target size={24} /></div>
                <div><p className="text-sm font-medium text-gray-400">Meta Global</p><h3 className="text-xl font-bold text-white">{formatCurrency(dashboardData.totalTarget)}</h3></div>
              </div>
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-purple-900/50 rounded-lg text-purple-400"><TrendingUp size={24} /></div>
                <div><p className="text-sm font-medium text-gray-400">Projeção Final</p><h3 className="text-xl font-bold text-white">{formatCurrency(dashboardData.totalProjected)}</h3></div>
              </div>
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-amber-900/50 rounded-lg text-amber-400"><Activity size={24} /></div>
                <div><p className="text-sm font-medium text-gray-400">Investimento Ads</p><h3 className="text-xl font-bold text-white">{formatCurrency(dashboardData.totalGlobalAds)}</h3></div>
              </div>
              <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center gap-4">
                <div className="p-3 bg-green-900/50 rounded-lg text-green-400"><DollarSign size={24} /></div>
                <div><p className="text-sm font-medium text-gray-400">ROAS Global (Médio)</p><h3 className="text-xl font-bold text-green-400">{dashboardData.globalRoas}x</h3></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Gráfico 1: Receita da equipe Avante */}
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-[350px] flex flex-col">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><DollarSign size={16} className="text-green-400"/> Faturamento Equipe Avante</h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Mês Passado', valor: dashboardData.totalAgencyLastMonth, fill: '#6B7280' },
                      { name: 'Atual (Hoje)', valor: dashboardData.totalAgencyCurrent, fill: '#3B82F6' },
                      { name: 'Projeção (Fim do Mês)', valor: dashboardData.totalAgencyRevenue, fill: '#8B5CF6' },
                      { name: 'Meta Global', valor: dashboardData.totalAgencyRevenue * (dashboardData.totalTarget / dashboardData.totalProjected), fill: '#10B981' }
                    ]} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} interval={0} />
                      <YAxis stroke="#9CA3AF" fontSize={10} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                      <RechartsTooltip cursor={{ fill: '#374151', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }} formatter={(value) => [formatCurrency(value), 'Faturamento Equipe Avante']} />
                      <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                        { [0,1,2,3].map(i => <Cell key={`cell-${i}`} fill={['#6B7280', '#3B82F6', '#8B5CF6', '#10B981'][i]} />) }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Representatividade */}
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-[350px] flex flex-col">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><PieChartIcon size={16} className="text-blue-400"/> Dependência por Cliente</h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 3: ROAS */}
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-[350px] flex flex-col">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Activity size={16} className="text-amber-400"/> Ranking ROAS (Ads)</h3>
                <div className="flex-1">
                  {roasData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roasData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                        <XAxis type="number" stroke="#9CA3AF" fontSize={10} tickFormatter={(val) => `${val}x`} />
                        <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={80} fontSize={10} />
                        <RechartsTooltip cursor={{ fill: '#374151', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }} formatter={(value) => [`${value}x`, 'ROAS']} />
                        <Bar dataKey="roas" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs">Nenhum investimento registrado.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISÃO OPERACIONAL (Tabela) */}
        {activeView === 'operacional' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Controles Principais */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Activity className="text-green-500" /> CRM Avante - Operação</h1>
                <p className="text-gray-400 mt-1">Gestão de Contas, Diário de Bordo e Ads</p>
              </div>
              <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
                <div className="flex flex-col grow xl:grow-0">
                  <label className="text-xs font-semibold text-gray-400 uppercase mb-1">Buscar Conta / Loja</label>
                  <div className="relative flex gap-2">
                    <div className="relative grow">
                      <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                      <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full xl:w-48 bg-gray-900 border border-gray-600 text-white rounded-lg p-2 pl-9 focus:ring-2 focus:ring-blue-500 outline-none h-[42px]" />
                    </div>
                    <button onClick={addNewStore} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors h-[42px] whitespace-nowrap"><Plus size={18} /> Add Loja</button>
                  </div>
                </div>
                <div className="flex gap-4 bg-gray-900 p-3 rounded-lg border border-gray-700">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Ordenar</label>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-gray-800 border border-gray-600 text-white rounded p-1 font-bold outline-none h-[30px] text-xs">
                      <option value="gmv">Tamanho (GMV)</option>
                      <option value="status">Status (Críticos)</option>
                      <option value="name">Alfabética</option>
                    </select>
                  </div>
                  <div className="flex flex-col"><label className="text-xs font-semibold text-gray-400 uppercase">Dia Atual</label><input type="number" value={currentDay} onChange={(e) => setCurrentDay(Number(e.target.value))} className="w-16 bg-gray-800 border border-gray-600 text-white rounded p-1 text-center font-bold outline-none h-[30px]" /></div>
                  <div className="flex flex-col"><label className="text-xs font-semibold text-gray-400 uppercase">Cresc. %</label><input type="number" value={globalGrowth} onChange={(e) => setGlobalGrowth(Number(e.target.value))} className="w-16 bg-blue-900 border border-blue-600 text-blue-200 rounded p-1 text-center font-bold outline-none h-[30px]" /></div>
                </div>
              </div>
            </div>

            {/* TABELA ACCORDION */}
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                      <th className="p-4 font-semibold w-1/4">Conta / Cliente (Expandir)</th>
                      <th className="p-4 font-semibold text-center w-24">Lojas/Tier</th>
                      <th className="p-4 font-semibold text-center w-24">Cresc. (%)</th>
                      <th className="p-4 font-semibold">Base / Meta (Mês)</th>
                      <th className="p-4 font-semibold text-blue-400">Faturado & Ads</th>
                      <th className="p-4 font-semibold text-purple-400">Projeção Final</th>
                      <th className="p-4 font-semibold w-1/4">Ações / Relacionamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50 text-sm">
                    {dashboardData.groupedClients.length > 0 ? (
                      dashboardData.groupedClients.map((group) => {
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
                                        <button onClick={() => startEditingClient(group.client)} className="text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Editar Nome"><Edit2 size={14}/></button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-center"><span className="px-2 py-1 rounded text-xs font-bold bg-gray-900 text-gray-400 border border-gray-700">{group.stores.length} Loja{group.stores.length > 1 ? 's' : ''}</span></td>
                              <td className="p-4 text-center text-gray-500">-</td>
                              <td className="p-4"><div className="flex flex-col gap-0.5"><div className="text-xs text-gray-500">Base: {formatCurrency(group.totalGmvBase)}</div><div className="font-bold text-gray-300">Meta: {formatCurrency(group.totalGmvTarget)}</div></div></td>
                              <td className="p-4">
                                <div className="font-bold text-blue-400 text-lg leading-none mb-1">{formatCurrency(group.totalCurrentRevenue)}</div>
                                <div className="text-[10px] text-gray-500">Ads: {formatCurrency(group.totalAds)}</div>
                              </td>
                              <td className="p-4">
                                <div className={`font-bold text-lg leading-none mb-1 ${group.status === 'success' ? 'text-green-400' : group.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>{formatCurrency(group.totalProjectedGmv)}</div>
                                <div className="text-[10px] text-gray-500">{group.percentReached.toFixed(1)}% Meta | ROAS: <span className="font-bold text-gray-400">{group.roas}x</span></div>
                              </td>
                              <td className="p-4" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  {/* NOVO BOTÃO: Adicionar Loja Específica */}
                                  <button onClick={() => addNewStoreToClient(group.client)} className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded transition-colors" title="Adicionar Nova Loja a este Cliente">
                                    <Plus size={16} />
                                  </button>
                                  
                                  <a href={generateClientWhatsAppLink(group)} target="_blank" rel="noopener noreferrer" className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2 px-2 rounded-lg shadow-sm transition-transform hover:scale-105 ${group.status === 'danger' ? 'bg-red-600 text-white' : group.status === 'warning' ? 'bg-amber-600 text-white' : 'bg-green-600 text-white'}`}>
                                    <MessageCircle size={14} /> Resumo Conta
                                  </a>
                                  <button onClick={() => deleteClient(group.client)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-700 rounded transition-colors" title="Apagar Cliente Inteiro">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* LINHAS DAS LOJAS (FILHOS) */}
                            {isExpanded && group.stores.map((row) => (
                              <tr key={row.id} className="bg-gray-900/50 hover:bg-gray-800/80 transition-colors group/row">
                                <td className="p-4 pl-12 relative">
                                  <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-700"></div><div className="absolute left-6 top-1/2 w-4 h-px bg-gray-700"></div>
                                  <div className="flex items-center gap-3">
                                    <div>
                                      {row.status === 'success' && <CheckCircle className="text-green-500/70" size={16} />}
                                      {row.status === 'warning' && <Clock className="text-amber-500/70" size={16} />}
                                      {row.status === 'danger' && <AlertTriangle className="text-red-500/70" size={16} />}
                                    </div>
                                    {editingStoreId === row.id ? (
                                      <div className="flex flex-col gap-1 w-full bg-gray-950 p-2 rounded border border-blue-900">
                                        <input type="text" value={storeEditData.store} onChange={(e) => setStoreEditData({...storeEditData, store: e.target.value})} className="bg-gray-800 border border-gray-600 rounded px-1 outline-none text-white text-sm font-semibold" placeholder="Nome da Loja" />
                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                          Fee: <input type="number" step="0.1" value={storeEditData.feePercent} onChange={(e) => setStoreEditData({...storeEditData, feePercent: e.target.value})} className="w-12 bg-gray-800 border border-gray-600 rounded px-1 outline-none" />%
                                          Canal: <select value={storeEditData.marketplace || ''} onChange={(e) => setStoreEditData({...storeEditData, marketplace: e.target.value})} className="bg-gray-800 border border-gray-600 rounded px-1 outline-none text-[9px]"><option value="">N/A</option><option value="Shopee">Shopee</option><option value="Meli">Meli</option><option value="Shein">Shein</option><option value="TikTok">TikTok</option></select>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-1 w-full">
                                        <span className="font-semibold text-gray-300">{row.store} {row.marketplace && <span className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[8px] ml-1">{row.marketplace}</span>}</span>
                                        <span className="text-[10px] text-gray-500">Fee: {row.feePercent}%</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${row.tier === 'A' ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-800' : row.tier === 'B' ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-900 text-gray-600 border border-gray-800'}`}>Tier {row.tier}</span></td>
                                <td className="p-4 text-center">
                                  <input type="number" value={row.customGrowth !== undefined ? row.customGrowth : ''} placeholder={globalGrowth.toString()} onChange={(e) => handleStoreChange(row.id, 'customGrowth', e.target.value)} className={`w-14 border rounded p-1 text-center focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-xs ${row.customGrowth !== undefined && row.customGrowth !== '' ? 'bg-blue-900/30 border-blue-600 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`} />
                                </td>
                                <td className="p-4">
                                  <div className="flex flex-col gap-1">
                                    {editingStoreId === row.id ? (
                                      <div className="text-[11px] text-blue-400 flex items-center gap-1">Base: R$ <input type="number" value={storeEditData.gmvBase} onChange={(e) => setStoreEditData({...storeEditData, gmvBase: e.target.value})} className="w-20 bg-gray-800 border border-gray-600 rounded px-1 outline-none text-white" /></div>
                                    ) : (
                                      <div className="text-[11px] text-gray-500">Base: {formatCurrency(row.gmvBase)}</div>
                                    )}
                                    <div className="font-medium text-gray-300 text-sm">Meta: {formatCurrency(row.gmvTarget)}</div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-start gap-2">
                                    <div className="flex flex-col gap-1.5">
                                      {/* AUTO-SAVE ADICIONADO NO onBlur */}
                                      <input type="number" value={row.currentRevenue || ''} onChange={(e) => handleStoreChange(row.id, 'currentRevenue', e.target.value)} onBlur={(e) => autoSaveHistory(row.id, e.target.value)} className="w-24 bg-gray-950 border border-gray-700 text-blue-300 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-sm" placeholder="R$ Atual" />
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-gray-500">Ads R$:</span>
                                        <input type="number" value={row.adsInvestment || ''} onChange={(e) => handleStoreChange(row.id, 'adsInvestment', e.target.value)} className="w-16 bg-gray-800 border border-gray-700 text-gray-300 rounded p-1 focus:outline-none focus:border-amber-500 text-xs" placeholder="0" />
                                      </div>
                                    </div>
                                    <button onClick={() => openHistoryModal(row)} className={`p-1.5 mt-1 rounded transition-colors relative group ${row.history?.length > 0 ? 'bg-blue-900/50 text-blue-400 hover:bg-blue-800' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`} title="Dashboard e Diário">
                                      <BarChart2 size={16} />
                                    </button>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className={`font-bold text-sm leading-none mb-1 ${row.status === 'success' ? 'text-green-400/80' : row.status === 'warning' ? 'text-amber-400/80' : 'text-red-400/80'}`}>
                                    {formatCurrency(row.projectedGmv)}
                                  </div>
                                  <div className="text-[10px] text-gray-500">ROAS: <span className="font-bold text-gray-400">{row.adsInvestment > 0 ? (row.currentRevenue / row.adsInvestment).toFixed(1) : 0}x</span></div>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 text-[11px] p-1.5 rounded bg-gray-900 border border-gray-800 text-gray-400 leading-tight">{row.recommendation}</div>
                                    {editingStoreId === row.id ? (
                                      <div className="flex flex-col gap-1">
                                        <button onClick={() => saveStoreEdit(row.id)} className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded"><Check size={14}/></button>
                                        <button onClick={() => setEditingStoreId(null)} className="p-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded"><X size={14}/></button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-1 opacity-20 group-hover/row:opacity-100 transition-opacity">
                                        <div className="flex gap-1">
                                          <a href={generateStoreWhatsAppLink(row)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-800 hover:bg-green-600/20 text-green-500 rounded transition-colors"><MessageCircle size={14} /></a>
                                        </div>
                                        <div className="flex gap-1">
                                          <button onClick={() => startEditingStore(row)} className="p-1.5 bg-gray-800 hover:bg-blue-900/40 text-gray-400 hover:text-blue-400 rounded transition-colors"><Edit2 size={14} /></button>
                                          <button onClick={() => deleteStore(row.id, row.store)} className="p-1.5 bg-gray-800 hover:bg-red-900/40 text-gray-500 hover:text-red-400 rounded transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr><td colSpan="7" className="p-8 text-center text-gray-500">Nenhuma conta encontrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL COM ABAS: PACING vs MENSAL */}
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
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex justify-between"><span>Curva de Velocidade</span><span className="text-xs font-normal text-gray-500">Meta: {formatCurrency(activeStore.gmvTarget)}</span></h4>
                    <div className="h-64 w-full bg-gray-900 rounded-lg p-3 border border-gray-700">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activeStorePacingData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                          <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} tickMargin={10} />
                          <YAxis stroke="#9CA3AF" fontSize={10} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} formatter={(value) => formatCurrency(value)} labelFormatter={(label) => `Dia ${label}`} />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                          <Line type="monotone" dataKey="ideal" name="Meta Ideal" stroke="#6B7280" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                          <Line type="monotone" dataKey="actual" name="Realizado" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 6 }} connectNulls />
                          <ReferenceLine x={currentDay} stroke="#3B82F6" strokeDasharray="3 3" label={{ position: 'top', value: 'Hoje', fill: '#3B82F6', fontSize: 10 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="w-full md:w-64 flex flex-col gap-4">
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Check-in Diário</h4>
                      <div className="flex gap-2 items-end">
                        <div className="w-16"><label className="text-[10px] text-gray-500 mb-1 block">Dia</label><input type="number" value={newHistoryDay} onChange={e => setNewHistoryDay(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-1.5 text-white outline-none text-sm" /></div>
                        <div className="flex-1"><label className="text-[10px] text-gray-500 mb-1 block">R$ Acumulado</label><input type="number" value={newHistoryRevenue} onChange={e => setNewHistoryRevenue(e.target.value)} placeholder="15000" className="w-full bg-gray-800 border border-gray-600 rounded p-1.5 text-white outline-none text-sm" /></div>
                        <button onClick={addHistoryEntry} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded text-sm h-[34px]"><Plus size={16}/></button>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Arquivo</h4>
                      <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-40">
                        {activeStore.history?.length > 0 ? activeStore.history.map(h => (
                          <div key={h.id} className="flex justify-between items-center bg-gray-700/30 p-2 rounded border border-gray-700">
                            <div className="font-bold text-gray-200 text-xs">Dia {h.day}</div>
                            <div className="flex items-center gap-3"><span className="font-bold text-green-400 text-xs">{formatCurrency(h.revenue)}</span><button onClick={() => deleteHistoryEntry(activeStore.id, h.id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14}/></button></div>
                          </div>
                        )) : <div className="text-center p-4 border border-dashed border-gray-700 rounded text-gray-500 text-xs">Sem lançamentos.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {chartTab === 'monthly' && (
                <div className="flex flex-col">
                  <div className="flex justify-between items-end mb-4">
                    <h4 className="text-sm font-semibold text-gray-300">Fechamentos Anteriores</h4>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><CalendarDays size={14} /> Dados históricos da loja</div>
                  </div>
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
                    ) : (
                      <div className="text-gray-500 text-center flex flex-col items-center gap-2"><ArchiveRestore size={32} className="opacity-50" /><p>Nenhum histórico mensal.</p></div>
                    )}
                  </div>
                </div>
              )}
              {chartTab === 'notes' && (
                <div className="flex flex-col h-72">
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4">
                    {activeStore.notes && activeStore.notes.length > 0 ? (
                      activeStore.notes.map(note => (
                        <div key={note.id} className="bg-gray-900 p-3 rounded-lg border border-gray-700 relative group">
                          <div className="text-[10px] font-bold text-indigo-400 mb-1">{note.date}</div>
                          <p className="text-sm text-gray-300">{note.text}</p>
                          <button onClick={() => setStores(stores.map(s => s.id === activeStore.id ? { ...s, notes: s.notes.filter(n => n.id !== note.id) } : s))} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500 text-sm border border-dashed border-gray-700 rounded-lg">Nenhuma anotação registrada.</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newNoteText || ''} onChange={e => setNewNoteText(e.target.value)} onKeyDown={e => {
                        if(e.key === 'Enter' && newNoteText.trim()) {
                            setStores(stores.map(s => s.id === activeStore.id ? { ...s, notes: [...(s.notes || []), { id: Date.now(), date: new Date().toLocaleDateString('pt-BR'), text: newNoteText }] } : s));
                            setNewNoteText('');
                        }
                    }} placeholder="Registre ocorrências de estoque, conversas sobre ads..." className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white outline-none focus:border-indigo-500" />
                    <button onClick={() => {
                        if(!newNoteText.trim()) return;
                        setStores(stores.map(s => s.id === activeStore.id ? { ...s, notes: [...(s.notes || []), { id: Date.now(), date: new Date().toLocaleDateString('pt-BR'), text: newNoteText }] } : s));
                        setNewNoteText('');
                    }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg font-bold transition-colors">Salvar</button>
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

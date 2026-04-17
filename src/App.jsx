import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingUp, DollarSign, Target, AlertTriangle, CheckCircle, Clock, Activity, MessageCircle, Search, Download, Upload, Save, Plus, History, X, Trash2, ChevronDown, ChevronRight, BarChart2, CalendarDays, ArchiveRestore, Edit2, Check, BookOpen, PieChart as PieChartIcon, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { db, auth, secondaryAuth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import { Toaster, toast } from 'react-hot-toast';

import ActionModal from './components/ActionModal';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import OperationalTable from './components/OperationalTable';
import HistoryModal from './components/HistoryModal';

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
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: '', message: '', isPrompt: false, promptValue: '', promptPlaceholder: '', confirmText: '', isDanger: false, onConfirm: () => {}
  });
  
  const [stores, setStores] = useState(initialStores);
  const [isDbLoading, setIsDbLoading] = useState(true); 

  const [userRole, setUserRole] = useState('Visualizador');

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
        } catch (e) {
          console.error("Erro ao buscar cargo", e);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === 'jaimejunior.ide@gmail.com';
  const canEdit = userRole === 'Gerente' || isAdmin; // A CHAVE MESTRA!

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      
      await setDoc(doc(db, "equipe", newUserEmail.toLowerCase()), {
        email: newUserEmail.toLowerCase(),
        role: 'Visualizador', // Agora o padrão é Visualizador
        createdAt: new Date().toLocaleDateString('pt-BR')
      });

      await signOut(secondaryAuth); 
      setAdminMessage('✅ Acesso criado! O membro já pode fazer login.');
      setNewUserEmail(''); setNewUserPassword('');
    } catch (error) {
      setAdminMessage('❌ Erro: A senha deve ter no mínimo 6 caracteres ou o e-mail já existe.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, "stores"), (snapshot) => {
      try {
        if (!snapshot.empty) {
          const storesFromFirebase = snapshot.docs.map(doc => doc.data());
          setStores(storesFromFirebase.sort((a, b) => b.id - a.id));
        } else {
          setStores(initialStores);
        }
      } catch (error) {
        console.error("Erro ao processar dados em tempo real:", error);
      } finally {
        setIsDbLoading(false);
      }
    }, (error) => {
      console.error("Erro na conexão em tempo real:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const updateStoreInCloud = (updatedStore) => {
    if (!user) return;
    setDoc(doc(db, "stores", updatedStore.id.toString()), updatedStore).catch(e => console.error("Erro ao salvar:", e));
  };

  const [activeView, setActiveView] = useState('operacional'); 
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
    const updatedStores = stores.map(s => {
      if (s.id === id) {
        const novaLoja = { ...s, [field]: finalValue };
        updateStoreInCloud(novaLoja);
        return novaLoja;
      }
      return s;
    });
    setStores(updatedStores);
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

  const deleteStore = (id, storeName) => {
    setModalConfig({
      isOpen: true, title: 'Apagar Loja', isDanger: true, confirmText: 'Apagar Loja',
      message: `Tem a certeza que deseja apagar permanentemente a loja ${storeName}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "stores", id.toString()));
          toast.success(`Loja ${storeName} apagada.`);
          setModalConfig({ isOpen: false });
        } catch (e) { toast.error("Erro ao apagar na base de dados."); }
      }
    });
  };

  const deleteClient = (clientName) => {
    setModalConfig({
      isOpen: true, title: 'Apagar Cliente', isDanger: true, confirmText: 'Apagar Tudo',
      message: `🚨 Atenção! Tem a certeza que deseja apagar o cliente ${clientName} e TODAS as suas lojas?`,
      onConfirm: async () => {
        try {
          const clientStores = stores.filter(s => s.client === clientName);
          for (const s of clientStores) {
            await deleteDoc(doc(db, "stores", s.id.toString()));
          }
          toast.success(`Cliente ${clientName} removido do CRM.`);
          setModalConfig({ isOpen: false });
        } catch (e) { toast.error("Erro ao apagar o cliente."); }
      }
    });
  };

  const closeMonth = () => {
    setModalConfig({
      isOpen: true, title: 'Fechar Mês Atual', isDanger: false, confirmText: 'Processar Fecho', isPrompt: true, promptPlaceholder: 'Ex: Abr/26',
      message: 'Isto guardará o histórico mensal atual e irá zerar os faturamentos do painel para iniciar o próximo mês.\n\nDigite o nome do mês que está a ser fechado:',
      onConfirm: async (monthName) => {
        if (!monthName) { toast.error("É obrigatório digitar o nome do mês."); return; }
        
        try {
          const updatedStores = stores.map(s => {
            const finalRevenue = s.currentRevenue || 0;
            return {
              ...s,
              monthlyHistory: [...(s.monthlyHistory || []), { month: monthName, gmv: finalRevenue }],
              gmvBase: finalRevenue > 0 ? finalRevenue : s.gmvBase,
              currentRevenue: 0, adsInvestment: 0, history: []
            };
          });

          for (const store of updatedStores) {
            await setDoc(doc(db, "stores", store.id.toString()), store);
          }

          setCurrentDay(1);
          toast.success(`Mês de ${monthName} fechado com sucesso!`);
          setModalConfig({ isOpen: false });
        } catch (e) { toast.error("Erro ao processar o fecho do mês."); }
      }
    });
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

// LÓGICA DE DADOS E RECOMENDAÇÕES ASSERTIVAS
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
      const currentRoas = store.adsInvestment > 0 ? (store.currentRevenue / store.adsInvestment) : 0;
      
      let status = 'danger', recommendation = '';
      
      // NOVA LÓGICA DE RECOMENDAÇÕES (CRUZAMENTO DE MÉTRICAS)
      if (percentReached >= 100) {
        status = 'success';
        recommendation = (currentRoas > 0 && currentRoas < 5) ? 'Meta batida, mas ROAS baixo. Reduzir Ads e focar na margem.' : 'Excelente tração. Escalar verba para superar a meta.';
      } else if (percentReached >= 85) {
        status = 'success';
        recommendation = 'Ritmo bom. Aplicar cupons ou ofertas relâmpago para garantir os 100%.';
      } else if (percentReached >= 70) {
        status = 'warning';
        if (currentRoas > 8) recommendation = `ROAS alto (${currentRoas.toFixed(1)}x) mas ritmo lento. Aumentar orçamento de Ads URGENTE!`;
        else if (store.adsInvestment === 0) recommendation = 'Queda de tráfego. Necessário iniciar campanhas de Ads imediatamente.';
        else recommendation = 'Auditar competitividade (Preço/Frete) e otimizar campanhas estagnadas.';
      } else {
        status = 'danger';
        if (currentRoas > 0 && currentRoas < 4) recommendation = 'Pausar campanhas ineficientes. Revisar curva A, precificação e estoque.';
        else if (store.adsInvestment === 0) recommendation = 'Sem oxigênio na loja. Injetar tráfego pago ou revisar o catálogo urgente.';
        else recommendation = 'ALERTA: Agendar reunião com o cliente para realinhamento total de estratégia.';
      }

      totalTarget += gmvTarget; totalProjected += projectedGmv; totalAgencyRevenue += projectedAgencyRevenue;
      totalGlobalAds += (store.adsInvestment || 0);

      return { ...store, gmvTarget, projectedGmv, projectedAgencyRevenue, percentReached, status, tier: getTier(safeGmvBase), recommendation, currentRoas };
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
      return { ...group, percentReached, status: percentReached >= 90 ? 'success' : percentReached >= 75 ? 'warning' : 'danger', roas };
    }).sort((a, b) => {
      if (sortBy === 'name') return a.client.localeCompare(b.client);
      if (sortBy === 'status') {
        const weight = { danger: 1, warning: 2, success: 3 };
        return weight[a.status] - weight[b.status];
      }
      return b.totalGmvBase - a.totalGmvBase;
    });

    const globalRoas = totalGlobalAds > 0 ? (processedStores.reduce((acc, s) => acc + (s.currentRevenue || 0), 0) / totalGlobalAds).toFixed(1) : 0;
    
    // ... [As variáveis totalAgencyLastMonth e totalAgencyCurrent continuam aqui sem alteração] ...
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


  const pieData = useMemo(() => {
    return dashboardData.groupedClients.map(g => ({ name: g.client, value: g.totalProjectedGmv })).filter(g => g.value > 0).sort((a, b) => b.value - a.value);
  }, [dashboardData]);

  const roasData = useMemo(() => {
    return dashboardData.groupedClients.filter(g => g.totalAds > 0).map(g => ({ name: g.client, roas: Number(g.roas) })).sort((a, b) => b.roas - a.roas);
  }, [dashboardData]);


  const generateStoreWhatsAppLink = (row) => {
    const diasRestantes = daysInMonth - currentDay;
    const gap = row.gmvTarget - row.currentRevenue;
    
    let text = `Olá, equipe da *${row.client}*!\n\nSegue o status da loja *${row.store}* atualizado até o dia ${currentDay}:\n\n`;
    text += `💰 *Faturado:* ${formatCurrency(row.currentRevenue)}\n`;
    text += `📈 *Projeção de Fechamento:* ${formatCurrency(row.projectedGmv)}\n`;
    text += `🎯 *Meta do Mês:* ${formatCurrency(row.gmvTarget)}\n`;
    if (gap > 0) text += `⏳ *Faltam:* ${formatCurrency(gap)} em ${diasRestantes} dias.\n`;
    else text += `✅ *Meta Batida!*\n`;
    
    if (row.adsInvestment > 0) {
      text += `\n📊 *Performance Ads:*\nInvestido: ${formatCurrency(row.adsInvestment)} | ROAS: ${row.currentRoas.toFixed(1)}x\n`;
    }

    text += `\n*Análise Avante:* ${row.recommendation}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };
  
  const generateClientWhatsAppLink = (group) => {
    const diasRestantes = daysInMonth - currentDay;
    let text = `Olá, equipe da *${group.client}*! Aqui é o Jaime da Avante - B2X.\n`;
    text += `Resumo da nossa operação (Dia ${currentDay}/${daysInMonth}):\n\n`;
    
    group.stores.forEach(store => {
      const gap = store.gmvTarget - store.currentRevenue;
      text += `🏪 *${store.store}* ${store.marketplace ? `(${store.marketplace})` : ''}\n`;
      text += `▪️ Atual: ${formatCurrency(store.currentRevenue)} | Projeção: ${formatCurrency(store.projectedGmv)}\n`;
      text += `▪️ Meta: ${formatCurrency(store.gmvTarget)} ${gap > 0 ? `(Faltam ${formatCurrency(gap)})` : '(Meta Batida ✅)'}\n`;
      if (store.adsInvestment > 0) {
         text += `▪️ Ads: ${formatCurrency(store.adsInvestment)} | ROAS: ${(store.currentRevenue / store.adsInvestment).toFixed(1)}x\n`;
      }
      text += `\n`;
    });

    const gapGlobal = group.totalGmvTarget - group.totalCurrentRevenue;
    text += `📊 *VISÃO GLOBAL DO GRUPO*\n`;
    text += `Faturado: *${formatCurrency(group.totalCurrentRevenue)}*\n`;
    text += `Projeção: *${formatCurrency(group.totalProjectedGmv)}*\n`;
    text += `Meta: *${formatCurrency(group.totalGmvTarget)}*\n`;
    if (group.totalAds > 0) {
      text += `Investimento Global: ${formatCurrency(group.totalAds)} (ROAS: ${group.roas}x)\n`;
    }
    
    text += `\n`;
    if (group.status === 'danger') {
        text += `🚨 *Atenção:* Nosso ritmo global de vendas exige ação imediata nestes ${diasRestantes} dias restantes. Precisamos alinhar uma estratégia mais agressiva (verbas ou campanhas) o quanto antes.`;
    } else if (group.status === 'warning') {
        text += `⚠️ *Aviso:* Nosso ritmo está levemente abaixo do necessário. Se fizermos otimizações de campanhas e estoque nesta semana, conseguimos reverter e bater a meta final.`;
    } else {
        text += `✅ *Excelente:* A operação global está com uma ótima tração! A meta está muito bem encaminhada. Vamos manter a estratégia e otimizar as margens.`;
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
      toast.error("Erro ao gerar o ficheiro de exportação.");
    }
  };

  const importBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileReader = new FileReader();
    fileReader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          
          const formattedStores = imported.map(s => ({
            ...s, 
            history: s.history || [], 
            notes: s.notes || [], 
            monthlyHistory: s.monthlyHistory || []
          }));

          setStores(formattedStores);

          if (user) {
            for (const store of formattedStores) {
              await setDoc(doc(db, "stores", store.id.toString()), store);
            }
          }

          toast.success("Dados restaurados e salvos na nuvem com sucesso!");
        } else {
          toast.error("Formato de ficheiro inválido.");
        }
      } catch (err) { 
        toast.error("Erro ao ler o ficheiro JSON."); 
      } finally {
        e.target.value = null;
      }
    };
    fileReader.readAsText(file, "UTF-8");
  };

  if (authLoading || !user) {
    return (
      <AuthScreen 
        email={email} 
        setEmail={setEmail} 
        password={password} 
        setPassword={setPassword} 
        handleLogin={handleLogin} 
        authError={authError} 
        authLoading={authLoading} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8 font-sans text-gray-200 pb-24">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1F2937', color: '#fff', border: '1px solid #374151' } }} />
      
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700 gap-4 shadow-md">
          <div className="flex items-center gap-4">
            {canEdit && (
              <button onClick={closeMonth} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg transition-transform hover:scale-105">
                <ArchiveRestore size={16} /> Fechar Mês Atual
              </button>
            )}
          </div>
          
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700 mx-auto md:mx-0">
            <button onClick={() => setActiveView('operacional')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'operacional' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Gestão Operacional</button>
            <button onClick={() => setActiveView('dashboard')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${activeView === 'dashboard' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
              <PieChartIcon size={16}/> Visão Executiva
            </button>
            {/* NOVO BOTÃO DE ADMIN APARECE SÓ PRA VOCÊ */}
            {isAdmin && (
              <button onClick={() => setActiveView('admin')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${activeView === 'admin' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                <Users size={16}/> Equipe
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={exportBackup} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-gray-600">
              <Upload size={14} /> Exportar
            </button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={importBackup} className="hidden" />
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              <Download size={14} /> Importar
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg transition-transform hover:scale-105">
              <X size={16} /> Sair
            </button>
          </div>
        </div>

        {/* VISÃO ADMIN */}
        {activeView === 'admin' && isAdmin && (
          <AdminPanel 
            handleCreateUser={handleCreateUser}
            newUserEmail={newUserEmail}
            setNewUserEmail={setNewUserEmail}
            newUserPassword={newUserPassword}
            setNewUserPassword={setNewUserPassword}
            adminMessage={adminMessage}
          />
        )}

        {/* VISÃO DASHBOARD EXECUTIVO */}
        {activeView === 'dashboard' && (
          <ExecutiveDashboard 
            dashboardData={dashboardData} 
            formatCurrency={formatCurrency} 
            pieData={pieData} 
            roasData={roasData} 
            COLORS={COLORS} 
          />
        )}

        {/* VISÃO OPERACIONAL */}
        {activeView === 'operacional' && (
          <OperationalTable 
            canEdit={canEdit}
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            addNewStore={addNewStore} sortBy={sortBy} setSortBy={setSortBy}
            currentDay={currentDay} setCurrentDay={setCurrentDay}
            globalGrowth={globalGrowth} setGlobalGrowth={setGlobalGrowth}
            dashboardData={dashboardData} expandedClients={expandedClients}
            toggleClientExpansion={toggleClientExpansion} editingClient={editingClient}
            clientEditValue={clientEditValue} setClientEditValue={setClientEditValue}
            saveClientEdit={saveClientEdit} startEditingClient={startEditingClient}
            setEditingClient={setEditingClient} addNewStoreToClient={addNewStoreToClient}
            generateClientWhatsAppLink={generateClientWhatsAppLink} deleteClient={deleteClient}
            editingStoreId={editingStoreId} storeEditData={storeEditData}
            setStoreEditData={setStoreEditData} handleStoreChange={handleStoreChange}
            autoSaveHistory={autoSaveHistory} openHistoryModal={openHistoryModal}
            formatCurrency={formatCurrency} generateStoreWhatsAppLink={generateStoreWhatsAppLink}
            startEditingStore={startEditingStore} saveStoreEdit={saveStoreEdit}
            deleteStore={deleteStore} setEditingStoreId={setEditingStoreId}
          />
        )}
      </div>

      {/* MODAL ANALÍTICO (HISTÓRICO E DIÁRIO) */}
      <HistoryModal 
        canEdit={canEdit}
        historyModalOpen={historyModalOpen} setHistoryModalOpen={setHistoryModalOpen}
        activeStore={activeStore} chartTab={chartTab} setChartTab={setChartTab}
        formatCurrency={formatCurrency} activeStorePacingData={activeStorePacingData}
        currentDay={currentDay} newHistoryDay={newHistoryDay} setNewHistoryDay={setNewHistoryDay}
        newHistoryRevenue={newHistoryRevenue} setNewHistoryRevenue={setNewHistoryRevenue}
        addHistoryEntry={addHistoryEntry} deleteHistoryEntry={deleteHistoryEntry}
        activeStoreMonthlyData={activeStoreMonthlyData} newNoteText={newNoteText}
        setNewNoteText={setNewNoteText} addNote={addNote} deleteNote={deleteNote}
      />
      <ActionModal config={modalConfig} setConfig={setModalConfig} />
    </div>
  );
}

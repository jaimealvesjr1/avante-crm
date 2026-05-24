import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingUp, DollarSign, Target, Activity, MessageCircle, Search,
  Download, Upload, Save, Plus, X, Trash2, PieChart as PieChartIcon, Zap, ArchiveRestore, CalendarDays,
  Eraser, BarChart2, LogOut, Key, Briefcase, Filter, AlertTriangle, Clock, CheckCircle, Shield, Check, Bell, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { db, auth, secondaryAuth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, updatePassword } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, writeBatch, deleteField } from "firebase/firestore";
import { Toaster, toast } from 'react-hot-toast';
import ClientFileModal from './components/ClientFileModal';

import ActionModal from './components/ActionModal';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import OperationalTable from './components/OperationalTable';
import BatchEntry from './components/BatchEntry';
import TaskView from './components/TaskView';
import TaskModal from './components/TaskModal';
import CreateStoreModal from './components/CreateStoreModal';
import BulkTaskModal from './components/BulkTaskModal';
import { useAvanteData } from './hooks/useAvanteData';
import TeamFeedView from './components/TeamFeedView';

const initialStores = []; 
const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

export const getVisualRole = (role) => {
  if (role === 'Admin' || role === 'admin' || role === 'manager') return 'Analista';
  if (role === 'Supervisor') return 'Gestor';
  if (role === 'Visitante') return 'Visitante';
  return 'Estrategista';
};

export default function App() {
  const [user, setUser] = useState(null);
  const { stores, setStores, isDbLoading, setIsDbLoading, updateStoreInCloud } = useAvanteData(user);
  const [currentUserData, setCurrentUserData] = useState(null);

  const [realUserData, setRealUserData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const myName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Membro';
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('avante_tela_atual') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('avante_tela_atual', activeView);
  }, [activeView]);

  const [globalGrowth, setGlobalGrowth] = useState(10);
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [currentDay, setCurrentDay] = useState(new Date().getDate());
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mktFilter, setMktFilter] = useState('all');
  const [respFilter, setRespFilter] = useState('all');

  const [expandedClients, setExpandedClients] = useState([]);
  const [bulkTaskModalOpen, setBulkTaskModalOpen] = useState(false);

  const [clientFileOpen, setClientFileOpen] = useState(false);
  const [activeClientGroup, setActiveClientGroup] = useState(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalClient, setCreateModalClient] = useState('');
  
  const [editingClient, setEditingClient] = useState(null);
  const [clientEditData, setClientEditData] = useState({ name: '', feeType: 'percent', feePercent: 3, fixedFee: 0 });
  
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [activeTaskStoreId, setActiveTaskStoreId] = useState(null);

  const [editingStoreId, setEditingStoreId] = useState(null);
  const [storeEditData, setStoreEditData] = useState({});

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [chartTab, setChartTab] = useState('pacing'); 
  const [newHistoryDay, setNewHistoryDay] = useState('');
  const [newHistoryRevenue, setNewHistoryRevenue] = useState('');
  const [newHistoryAds, setNewHistoryAds] = useState('');
  const [newHistoryOrders, setNewHistoryOrders] = useState('');
  const [newHistoryUnits, setNewHistoryUnits] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  
  const [isBatchMode, setIsBatchMode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  
  const [teamMembers, setTeamMembers] = useState([]);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newOwnPassword, setNewOwnPassword] = useState('');

  const fileInputRef = useRef(null);

  const [userRole, setUserRole] = useState('Operacional');
  const [authLoading, setAuthLoading] = useState(true);

  const isManager = currentUserData?.role === 'Admin' || currentUserData?.role === 'admin' || currentUserData?.role === 'manager';
  const canUseBatchEntry = isManager || currentUserData?.role === 'Supervisor';
  const isVisitante = currentUserData?.role === 'Visitante';

  useEffect(() => {
    if (isVisitante && ['dashboard', 'operacional', 'admin'].includes(activeView)) {
      setActiveView('rotinas');
    }
  }, [isVisitante, activeView]);

  const now = new Date();
  const localToday = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const currentTimeStr = now.toTimeString().substring(0, 5);

  const [internalTasks, setInternalTasks] = useState([]);
  
  const updateInternalTasks = async (newTasks) => {
    setInternalTasks(newTasks);
    await setDoc(doc(db, "settings", "internal_tasks"), { tasks: newTasks }, { merge: true });
  };

  const globalPendingTasks = useMemo(() => {
    if (!currentUserData) return 0;
    const myName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0];
    
    return stores.filter(s => !s.arquivada).flatMap(s => s.checklists || []).filter(c => {
      if (c.feita) return false;
      const isAssignedToMe = c.responsavel === myName;
      if (!isAssignedToMe) return false; 
      if (!c.data) return true;
      if (c.data < localToday) return true; 
      if (c.data === localToday) return !c.hora || c.hora <= currentTimeStr;
      return false;
    }).length;
  }, [stores, currentUserData, localToday, currentTimeStr]);

  const uniqueMkts = useMemo(() => [...new Set(stores.map(s => s.marketplace?.toUpperCase()))].filter(Boolean).sort(), [stores]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "equipe", currentUser.email.toLowerCase());
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            if (!isSimulating) {
              setUserRole(data.role === 'Visualizador' ? 'Operacional' : (data.role || 'Operacional'));
              setCurrentUserData(data); 
              setRealUserData(data);
            }
          }
        } catch (e) { console.error("Erro ao buscar cargo", e); }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const startSimulation = (member) => {
    setCurrentUserData(member);
    setUserRole(member.role === 'Visualizador' ? 'Operacional' : (member.role || 'Operacional'));
    setIsSimulating(true);
    toast.success(`Modo simulação ativado! Vendo como ${member.nomeCompleto || member.nome}`);
  };

  const stopSimulation = () => {
    if (realUserData) {
      setCurrentUserData(realUserData);
      setUserRole(realUserData.role === 'Visualizador' ? 'Operacional' : (realUserData.role || 'Operacional'));
      setIsSimulating(false);
      toast.success('Simulação encerrada. Bem-vindo de volta, Admin!');
    }
  };

  const isAdmin = user?.email === 'jaimejunior.ide@gmail.com';
  const canEdit = userRole === 'Admin' || isAdmin;

  useEffect(() => {
    if (!user) return;
    const unsubStores = onSnapshot(collection(db, "stores"), (snapshot) => {
      if (!snapshot.empty) setStores(snapshot.docs.map(doc => doc.data()).sort((a, b) => b.id - a.id));
      setIsDbLoading(false);
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if(data.globalGrowth !== undefined) setGlobalGrowth(data.globalGrowth);
      }
    });

    const unsubEquipe = onSnapshot(collection(db, "equipe"), (snapshot) => {
      if (!snapshot.empty) setTeamMembers(snapshot.docs.map(doc => doc.data()));
    });

    const unsubInternal = onSnapshot(doc(db, "settings", "internal_tasks"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().tasks) {
        setInternalTasks(docSnap.data().tasks);
      }
    });
    return () => { unsubStores(); unsubSettings(); unsubEquipe(); unsubInternal(); };
  }, [user]);

useEffect(() => {
    if (stores.length === 0 || !canEdit) return;

    const cleanOldTasks = async () => {
      const now = new Date();
      // Calcula a data de há exatos 7 dias atrás
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
      const batch = writeBatch(db);
      let hasUpdates = false;

      stores.forEach(store => {
        if (store.checklists && store.checklists.length > 0) {
          const originalLength = store.checklists.length;
          
          // Filtramos as tarefas que queremos MANTÊR
          const validChecklists = store.checklists.filter(task => {
            if (!task.feita) return true;
            
            if (!task.data) return true; 
            
            const taskDate = new Date(task.data);
            // Mantém a tarefa se ela for mais RECENTE que 7 dias atrás
            return taskDate >= sevenDaysAgo;
          });

          if (validChecklists.length !== originalLength) {
            hasUpdates = true;
            const storeRef = doc(db, "stores", store.id.toString());
            batch.update(storeRef, { checklists: validChecklists });
          }
        }
      });

      if (hasUpdates) {
        try {
          await batch.commit();
          console.log("Limpeza de tarefas antigas concluída com sucesso!");
        } catch (error) {
          console.error("Erro ao limpar tarefas antigas:", error);
        }
      }
    };

    cleanOldTasks();
  }, [stores.length, canEdit]);

  const updateGlobalSettings = async (field, value) => {
    if (!canEdit) return;
    const newVal = Number(value);
    if (field === 'day') setCurrentDay(newVal);
    else {
      setGlobalGrowth(newVal);
      await setDoc(doc(db, "settings", "global"), { globalGrowth: newVal }, { merge: true });
    }
  };

  const openClientFile = (clientName) => {
    const group = dashboardData.groupedClients.find(g => g.client === clientName);
    if (group) { setActiveClientGroup(group); setClientFileOpen(true); }
  };

  const handleLogin = async (e) => { 
    e.preventDefault(); 
    try { 
      await signInWithEmailAndPassword(auth, email, password); 
      setAuthError(''); 
      toast.success('Login realizado com sucesso!');
    } catch (e) { 
      setAuthError('E-mail ou senha incorretos.'); 
      toast.error('Erro ao fazer login.');
    } 
  };
  
  const handleLogout = () => { signOut(auth); toast.success('Você saiu do sistema.'); };

  const handleChangeOwnPassword = async (e) => {
    e.preventDefault();
    if(newOwnPassword.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres.");
    try {
      await updatePassword(auth.currentUser, newOwnPassword);
      toast.success("Senha atualizada com sucesso!");
      setPasswordModalOpen(false); setNewOwnPassword('');
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') toast.error("Sua sessão expirou. Por favor, saia do sistema (Logout), entre novamente e tente alterar a senha.");
      else toast.error("Erro ao alterar a senha.");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      const nomeCompleto = newUserName.trim();
      const primeiroNome = nomeCompleto.split(' ')[0];

      await setDoc(doc(db, "equipe", newUserEmail.toLowerCase()), {
        email: newUserEmail.toLowerCase(), nome: primeiroNome, nomeCompleto: nomeCompleto, role: 'Operacional', createdAt: new Date().toLocaleDateString('pt-BR')
      });
      await signOut(secondaryAuth); 
      toast.success('✅ Acesso criado com sucesso!');
      setNewUserEmail(''); setNewUserPassword(''); setNewUserName('');
    } catch (error) { toast.error('❌ Erro ao criar acesso. Verifique a senha ou se o e-mail já existe.'); }
  };

  const handleUpdateUser = async (emailToUpdate, newNameCompleto, newColor) => {
    if (!canEdit) return;
    try {
      const userDocRef = doc(db, "equipe", emailToUpdate.toLowerCase());
      const primeiroNome = newNameCompleto.trim().split(' ')[0];
      const updateData = { nome: primeiroNome, nomeCompleto: newNameCompleto.trim() };
      if (newColor) updateData.avatarColor = newColor;
      await setDoc(userDocRef, updateData, { merge: true });
      toast.success('Usuário atualizado com sucesso!');
    } catch (error) { toast.error('Erro ao atualizar usuário.'); }
  };

  const handleToggleRole = async (email, currentRole) => {
    let newRole = 'Operacional'; // Estrategista
    if (currentRole === 'Operacional' || currentRole === 'Visualizador') newRole = 'Supervisor'; // Gestor
    else if (currentRole === 'Supervisor') newRole = 'Admin'; // Analista
    else if (currentRole === 'Admin') newRole = 'Visitante'; // Visitante
    else if (currentRole === 'Visitante') newRole = 'Operacional';

    try {
      const userDocRef = doc(db, "equipe", email.toLowerCase());
      await setDoc(userDocRef, { role: newRole }, { merge: true });
      setTeamMembers(prevMembers => prevMembers.map(member => member.email === email ? { ...member, role: newRole } : member));
      toast.success(`Cargo atualizado para ${getVisualRole(newRole)}!`);
    } catch (error) { toast.error("Erro ao atualizar cargo. Verifique o console."); }
  };

  const handleDeleteUser = async (emailToDelete) => {
    if (!canEdit) return;

    if (!window.confirm(`🚨 Tem certeza que deseja remover permanentemente o usuário ${emailToDelete} da equipe?\n\nEle perderá o acesso aos dados da plataforma imediatamente.`)) return;
    
    try {
      await deleteDoc(doc(db, "equipe", emailToDelete.toLowerCase()));
      
      setTeamMembers(prevMembers => prevMembers.filter(m => m.email !== emailToDelete));
      toast.success(`Usuário ${emailToDelete} removido com sucesso!`);
    } catch (error) {
      toast.error("Erro ao excluir usuário. Verifique sua conexão.");
      console.error(error);
    }
  };

  const handleStoreChange = (id, field, value) => {
    let finalValue = value;
    if (typeof value === 'string' && (field === 'currentRevenue' || field === 'adsInvestment' || field === 'gmvBase' || field === 'customGrowth')) {
      finalValue = value.trim().replace(',', '.');
    }
    
    const numericValue = finalValue !== '' ? Number(finalValue) : 0;
    
    if (isNaN(numericValue)) return;

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

  const addNewStore = () => { setCreateModalClient(''); setCreateModalOpen(true); };
  const addNewStoreToClient = (clientName) => { setCreateModalClient(clientName); setCreateModalOpen(true); };

  const handleSaveNewStore = (data) => {
    const { client, store, marketplace } = data;
    const existingStore = stores.find(s => s.client === client);
    const feeType = existingStore?.feeType || 'percent';
    const feePercent = existingStore?.feePercent || 1.5;
    const fixedFee = existingStore?.fixedFee || 0;

    const newStore = { 
      id: Date.now(), client, store, marketplace, gmvBase: 0, feeType, feePercent, fixedFee, 
      currentRevenue: 0, adsInvestment: 0, orders: 0, units: 0, history: [], taskLogs: [], checklists: [], monthlyHistory: [] 
    };
    
    updateStoreInCloud(newStore);
    setStores(prev => [newStore, ...prev]);
    
    if (existingStore && !expandedClients.includes(client)) toggleClientExpansion(client);
    toast.success(`Cadastro de ${store} realizado com sucesso!`);
  };

  const handleSaveBulkTasks = (storeIds, taskData) => {
    const { text, resp, data, hora, recorrencia } = taskData;
    const creatorName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Usuário';

    const batchStores = stores.map(store => {
      if (storeIds.includes(store.id)) {
        const newTask = { id: Date.now() + Math.random(), texto: text, feita: false, responsavel: resp.trim(), criadoPor: creatorName, dataCriacao: new Date().toLocaleDateString('pt-BR'), data: data || '', hora: hora || '', recorrencia: recorrencia || 'none' };
        const updatedChecklists = [...(store.checklists || []), newTask];
        let nextAccessStr = store.dataProximoAcesso || '';
        const pendingWithDate = updatedChecklists.filter(t => !t.feita && t.data);
        if (pendingWithDate.length > 0) {
          pendingWithDate.sort((a, b) => new Date(`${a.data}T${a.hora || '00:00'}:00`) - new Date(`${b.data}T${b.hora || '00:00'}:00`));
          nextAccessStr = `${pendingWithDate[0].data}T${pendingWithDate[0].hora || '00:00'}`;
        }
        const updatedStore = { ...store, checklists: updatedChecklists, dataProximoAcesso: nextAccessStr, dataUltimoAcesso: new Date().toISOString() };
        updateStoreInCloud(updatedStore);
        return updatedStore;
      }
      return store;
    });
    
    setStores(batchStores);
    toast.success(`Tarefa replicada em ${storeIds.length} loja(s)!`);
  };

  // === NOVO SISTEMA DE LANÇAMENTO EM MASSA BLINDADO (Resolve o bug do "1.000") ===
  const handleSaveBatch = async (batchDay, formData) => {
    const batch = writeBatch(db);
    let localStores = [...stores];

    Object.keys(formData).forEach(storeIdStr => {
      const storeId = Number(storeIdStr);
      const data = formData[storeId];
      if (!data || (!data.currentRevenue && !data.adsInvestment && !data.orders && !data.units)) return;

      const parseSafeNumber = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return Number(String(val).trim().replace(',', '.')) || 0;
      };

      const parseSafeInt = (val) => {
         if (!val) return 0;
         return parseInt(String(val).trim(), 10) || 0;
      };

      const storeIndex = localStores.findIndex(s => s.id === storeId);
      if (storeIndex === -1) return;
      const s = localStores[storeIndex];

      const cumRev = parseSafeNumber(data.currentRevenue);
      const cumAds = parseSafeNumber(data.adsInvestment);
      const cumOrd = parseSafeInt(data.orders);
      const cumUni = parseSafeInt(data.units);

      let newHistory = [...(s.history || [])];
      const existingIndex = newHistory.findIndex(h => h.day === batchDay);

      let prevRev = 0, prevAds = 0;
      const pastEntries = newHistory.filter(h => h.day < batchDay).sort((a,b) => b.day - a.day);
      if(pastEntries.length > 0) {
        prevRev = pastEntries[0].revenue || 0;
        prevAds = pastEntries[0].ads || 0;
      }

      const dailyRev = cumRev - prevRev;

      const histEntry = {
        id: existingIndex >= 0 ? newHistory[existingIndex].id : Date.now() + storeId + Math.random(),
        day: batchDay,
        dailyRevenue: dailyRev > 0 ? dailyRev : 0,
        revenue: cumRev,
        ads: cumAds,
        orders: cumOrd,
        units: cumUni,
        date: new Date().toLocaleDateString('pt-BR')
      };

      if (existingIndex >= 0) newHistory[existingIndex] = histEntry;
      else newHistory.push(histEntry);

      const finalStore = { 
        ...s, 
        history: newHistory.sort((a, b) => a.day - b.day) 
      };
      
      const maxDay = Math.max(...finalStore.history.map(h => h.day));
      if (batchDay === maxDay) {
          finalStore.currentRevenue = cumRev;
          finalStore.adsInvestment = cumAds;
          finalStore.orders = cumOrd;
          finalStore.units = cumUni;
      }

      localStores[storeIndex] = finalStore;
      batch.set(doc(db, "stores", storeId.toString()), finalStore);
    });
    
    await batch.commit();
    setStores(localStores);
    toast.success(`Apuração do dia ${batchDay} salva na nuvem!`);
  };

  const deleteClient = async (clientName) => { 
    if(window.confirm(`🚨 Apagar o cliente ${clientName} e TODAS as suas lojas?`)){ 
      const batch = writeBatch(db);
      stores.forEach(s => { if(s.client === clientName) batch.delete(doc(db, "stores", s.id.toString())); }); 
      await batch.commit(); 
      toast.success(`Cliente ${clientName} apagado com sucesso.`);
    } 
  };

  const closeMonth = async () => {
    const monthName = prompt("MÊS DE FECHAMENTO\n\nDigite a competência (Ex: Abr/26):");
    if(!monthName) return;

    if(!window.confirm(`⚠️ RISCO ALTO: Isso homologará a competência de ${monthName}.\n\nAs metas serão atualizadas, os Tiers re-ranqueados e o faturamento da agência será travado no histórico.\nDeseja continuar?`)) return;

    setIsDbLoading(true);
    try {
      const batch = writeBatch(db);

      stores.forEach(s => {
        const finalRevenue = s.currentRevenue || 0;

        // 1. Snapshot da Receita da Agência (O Cofre)
        let agencyCut = 0;
        if (s.feeType === 'fixed' || s.fixedFee > 0) {
          agencyCut = Number(s.fixedFee);
        } else {
          agencyCut = finalRevenue * (Number(s.feePercent) / 100);
        }

        // 2. Montagem do Histórico Blindado
        const monthSnapshot = {
          month: monthName,
          gmv: finalRevenue,
          agencyRevenue: agencyCut, // Trava o dinheiro que a agência fez
          feeApplied: s.feeType === 'fixed' ? `Fixo R$${s.fixedFee}` : `${s.feePercent}%`,
          closedAt: new Date().toISOString()
        };

        // 3. Atualização da Loja
        const newGmvBase = finalRevenue > 0 ? finalRevenue : s.gmvBase;

        const storeRef = doc(db, "stores", s.id.toString());
        batch.update(storeRef, {
          monthlyHistory: [...(s.monthlyHistory || []), monthSnapshot],
          gmvBase: newGmvBase, // Isso força a atualização automática de Metas e Tiers
          currentRevenue: 0,
          adsInvestment: 0,
          orders: 0,
          units: 0,
          history: [] // Limpa o operacional diário para o novo mês
        });
      });

      await batch.commit();
      await updateGlobalSettings('day', 1);
      toast.success("✅ Mês fechado! Tiers e Receitas homologados com sucesso.");
      
    } catch (error) {
      console.error("Erro no fechamento do mês:", error);
      toast.error("Falha crítica ao fechar o mês. Contate o suporte.");
    } finally {
      setIsDbLoading(false);
    }
  };

  // === NOVO SISTEMA DE EXPORTAÇÃO COMPLETA ===
  const exportBackup = () => {
    const backupData = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      stores: stores,
      teamMembers: teamMembers,
      settings: { globalGrowth: globalGrowth }
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `avante_crm_completo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success('Backup completo (Lojas e Equipe) exportado com sucesso!');
  };

  // === NOVO SISTEMA DE IMPORTAÇÃO UNIVERSAL ===
  const importBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileReader = new FileReader();
    fileReader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        let storesToImport = [];
        let teamToImport = [];
        let settingsToImport = {};

        // Identifica se é o formato antigo (Array de Lojas) ou o novo Formato Completo (Objeto)
        if (Array.isArray(imported)) {
          storesToImport = imported;
        } else if (imported.stores) {
          storesToImport = imported.stores;
          teamToImport = imported.teamMembers || [];
          settingsToImport = imported.settings || {};
        } else {
          return toast.error("O arquivo não possui um formato reconhecido.");
        }

        const batch = writeBatch(db);
        
        storesToImport.forEach(s => {
          batch.set(doc(db, "stores", s.id.toString()), s);
        });

        teamToImport.forEach(member => {
          if (member.email) {
            batch.set(doc(db, "equipe", member.email.toLowerCase()), member);
          }
        });

        if (settingsToImport.globalGrowth !== undefined) {
          batch.set(doc(db, "settings", "global"), settingsToImport, { merge: true });
        }

        await batch.commit();
        toast.success("✅ Banco de dados restaurado e atualizado com sucesso!");
        
        // Dá um "refresh" local para quem importou ver na hora
        if (storesToImport.length > 0) setStores(storesToImport);
        if (teamToImport.length > 0) setTeamMembers(teamToImport);

      } catch (err) { 
        toast.error("Erro ao ler o arquivo JSON."); 
        console.error(err);
      } finally { 
        e.target.value = null; 
      }
    };
    fileReader.readAsText(file, "UTF-8");
  };

  const toggleClientExpansion = (c) => setExpandedClients(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  
  const startEditingClient = (group) => { 
    setEditingClient(group.client); 
    const sample = group.stores[0] || {};
    setClientEditData({ name: group.client, feeType: sample.feeType || 'percent', feePercent: sample.feePercent || 0, fixedFee: sample.fixedFee || 0 }); 
  };
  
  const saveClientEdit = async (oldName) => {
    const upperNewName = clientEditData.name.toUpperCase();
    const batch = writeBatch(db);
    const updatedStores = stores.map(storeObj => {
      if(storeObj.client === oldName) {
         const updatedStore = { 
           ...storeObj, 
           client: upperNewName, 
           feeType: clientEditData.feeType, 
           feePercent: Number(clientEditData.feePercent) || 0, 
           fixedFee: clientEditData.feeType === 'percent' ? 0 : (Number(clientEditData.fixedFee) || 0) 
         };
         batch.set(doc(db, "stores", storeObj.id.toString()), updatedStore);
         return updatedStore;
      }
      return storeObj;
    });
    await batch.commit().catch(e => { console.error(e); toast.error('Erro ao atualizar cliente.'); });
    setStores(updatedStores);
    setEditingClient(null);
    toast.success('Dados do cliente atualizados!');
  };

  const startEditingStore = (store) => { setEditingStoreId(store.id); setStoreEditData({ store: store.store, marketplace: store.marketplace || '', gmvBase: store.gmvBase }); };
  const saveStoreEdit = (id) => {
    const target = stores.find(s => s.id === id);
    if(target) {
      updateStoreInCloud({...target, store: storeEditData.store.toUpperCase(), marketplace: (storeEditData.marketplace || '').toUpperCase(), gmvBase: Number(storeEditData.gmvBase)});
      toast.success('Loja atualizada com sucesso!');
    }
    setEditingStoreId(null);
  };

  const deleteStore = async (id, storeName) => { 
    if(window.confirm(`Apagar a loja ${storeName}?`)){ 
      await deleteDoc(doc(db, "stores", id.toString())); 
      setStores(stores.filter(s => s.id !== id)); 
      toast.success(`Loja ${storeName} apagada!`);
    } 
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);

  const generateStoreWhatsAppLink = (row) => `https://wa.me/?text=${encodeURIComponent(`Olá, equipe da *${row.client}*!\nAvaliamos a loja *${row.store}* até o dia ${currentDay}.\nProjeção: ${formatCurrency(row.projectedGmv)} / Meta: ${formatCurrency(row.gmvTarget)}.\n${row.status === 'danger' ? 'Precisamos alinhar ações urgentes de Ads/Estoque.' : row.status === 'warning' ? 'Podemos otimizar as campanhas da semana?' : 'Vocês estão voando! Vamos manter a tração.'}`)}`;
  
  const generateClientWhatsAppLink = (group) => {
    let text = `Olá, equipe da *${group.client}*! Aqui é a Equipe Avante - B2X.\n\nSegue o resumo do nosso desempenho até o dia ${currentDay}:\n\n`;
    group.stores.forEach(store => {
      text += `🏪 *${store.store}*\nFaturado: ${formatCurrency(store.currentRevenue)}\nProjeção: ${formatCurrency(store.projectedGmv)} (Meta: ${formatCurrency(store.gmvTarget)})\n\n`;
    });
    text += `📊 *RESUMO GERAL*\nFaturado Total: *${formatCurrency(group.totalCurrentRevenue)}*\nProjeção Total: *${formatCurrency(group.totalProjectedGmv)}*\nMeta Global: *${formatCurrency(group.totalGmvTarget)}*\n\n`;
    if (group.status === 'danger') text += `🚨 Como estamos abaixo da meta agrupada, precisamos alinhar urgentemente ações conjuntas.`;
    else if (group.status === 'warning') text += `⚠️ Estamos um pouquinho abaixo do ritmo esperado. Sugerimos aplicar otimizações.`;
    else text += `✅ Vocês estão voando! 🚀 Vamos manter a estratégia.`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const openHistoryModal = (store) => { 
    setActiveStoreId(store.id); 
    setNewHistoryDay(currentDay); 
    setNewHistoryRevenue(''); 
    setNewHistoryAds('');
    setNewHistoryOrders('');
    setNewHistoryUnits('');
    setChartTab('pacing'); 
    setHistoryModalOpen(true); 
  };

  const dashboardData = useMemo(() => {
    let totalTarget = 0, totalProjected = 0, totalGlobalAds = 0;
    let totalOrders = 0, totalUnits = 0, totalCurrentRevenue = 0;
    let totalAgencyRevenue = 0, totalAgencyRevenueActual = 0, agencyTarget = 0; 
    
    const mktPerformance = {};

    const processedStores = stores.map(store => {
      const growthRate = store.customGrowth !== undefined ? Number(store.customGrowth) : globalGrowth;
      const gmvTarget = (Number(store.gmvBase) || 0) * (1 + (growthRate / 100));
      const projectedGmv = currentDay > 0 ? ((Number(store.currentRevenue) || 0) / currentDay) * daysInMonth : 0;
      const percentReached = gmvTarget > 0 ? (projectedGmv / gmvTarget) * 100 : 0;
      
      return { 
        ...store, 
        gmvTarget, 
        projectedGmv, 
        percentReached, 
        status: percentReached >= 95 ? 'success' : percentReached >= 80 ? 'warning' : 'danger', 
        tier: (store.gmvBase >= 80000 ? 'A' : store.gmvBase >= 30000 ? 'B' : 'C') 
      };
    });

    const filteredStores = processedStores.filter(store => {
      if (store.arquivada) return false;

      const matchSearch = !searchTerm || store.client.toLowerCase().includes(searchTerm.toLowerCase()) || store.store.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || store.status === statusFilter;
      const matchMkt = mktFilter === 'all' || (store.marketplace && store.marketplace.toUpperCase() === mktFilter);
      
      let matchResp = true;
      if (respFilter !== 'all') {
         if (respFilter === 'unassigned') {
            matchResp = store.checklists && store.checklists.some(task => !task.feita && (!task.responsavel || task.responsavel === ''));
         } else {
            const targetName = respFilter.toLowerCase().trim();
            matchResp = store.checklists && store.checklists.some(task => 
               !task.feita && task.responsavel?.toLowerCase().trim() === targetName
            );
         }
      }
      return matchSearch && matchStatus && matchMkt && matchResp;
    });

    const groups = {};
    filteredStores.forEach(s => {
      totalTarget += s.gmvTarget; 
      totalProjected += s.projectedGmv; 
      totalCurrentRevenue += (Number(s.currentRevenue) || 0); 
      totalGlobalAds += (s.adsInvestment || 0);
      totalOrders += (s.orders || 0);
      totalUnits += (s.units || 0);

      const mktName = s.marketplace ? s.marketplace.toUpperCase() : 'N/A';
      if (!mktPerformance[mktName]) mktPerformance[mktName] = { name: mktName, revenue: 0 };
      mktPerformance[mktName].revenue += (Number(s.currentRevenue) || 0);

      if (!groups[s.client]) groups[s.client] = { client: s.client, stores: [], totalGmvBase: 0, totalGmvTarget: 0, totalCurrentRevenue: 0, totalProjectedGmv: 0, totalAds: 0, totalOrders: 0, totalUnits: 0 };
      groups[s.client].stores.push(s);
      groups[s.client].totalGmvBase += s.gmvBase || 0; 
      groups[s.client].totalGmvTarget += s.gmvTarget;
      groups[s.client].totalCurrentRevenue += s.currentRevenue || 0; 
      groups[s.client].totalProjectedGmv += s.projectedGmv;
      groups[s.client].totalAds += s.adsInvestment || 0;
      groups[s.client].totalOrders += s.orders || 0;
      groups[s.client].totalUnits += s.units || 0;
    });

    const groupedClients = Object.values(groups).map(g => {
      const p = g.totalGmvTarget > 0 ? (g.totalProjectedGmv / g.totalGmvTarget) * 100 : 0;
      const sampleStore = g.stores[0];
      const feeType = sampleStore?.feeType || 'percent';
      const feePercent = sampleStore?.feePercent || 0;
      const fixedFee = sampleStore?.fixedFee || 0;
      const isFixed = feeType === 'fixed' || fixedFee > 0;
      
      const groupAgencyTarget = isFixed ? Number(fixedFee) : g.totalGmvTarget * (Number(feePercent) / 100);
      agencyTarget += groupAgencyTarget;
      const actualAgency = isFixed ? Number(fixedFee) : g.totalCurrentRevenue * (Number(feePercent) / 100);
      const projectedAgency = isFixed ? Number(fixedFee) : g.totalProjectedGmv * (Number(feePercent) / 100);
      
      totalAgencyRevenueActual += actualAgency;
      totalAgencyRevenue += projectedAgency;

      return { 
        ...g, 
        percentReached: p, 
        feeType, feePercent, fixedFee, 
        status: p >= 95 ? 'success' : p >= 80 ? 'warning' : 'danger', 
        roas: g.totalAds > 0 ? (g.totalCurrentRevenue / g.totalAds).toFixed(1) : 0,
        stores: g.stores 
      };
    }).sort((a, b) => {
      if (sortBy === 'name') return a.client.localeCompare(b.client);
      if (sortBy === 'status') {
        const weight = { danger: 1, warning: 2, success: 3 };
        return weight[a.status] - weight[b.status];
      }
      return b.totalCurrentRevenue - a.totalCurrentRevenue;
    });

    const rankingMarketplaces = Object.values(mktPerformance).sort((a, b) => b.revenue - a.revenue);

    return { 
      groupedClients, 
      flatFilteredStores: filteredStores, 
      totalTarget, totalProjected, totalCurrentRevenue, 
      totalAgencyRevenue, totalAgencyRevenueActual, agencyTarget, 
      totalGlobalAds, totalOrders, totalUnits,
      globalRoas: totalGlobalAds > 0 ? (totalCurrentRevenue / totalGlobalAds).toFixed(1) : 0,
      rankingMarketplaces: Object.values(mktPerformance).sort((a, b) => b.revenue - a.revenue)
    };
  }, [stores, globalGrowth, daysInMonth, currentDay, searchTerm, sortBy, statusFilter, mktFilter, respFilter, myName]);

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

  const broadcastTaskFocus = async (taskText, action = 'set', storeId = null) => {
    if (!myName) return;
    const updatedStatus = {};
    
    if (action === 'clear') {
      updatedStatus[myName] = deleteField();
    } else {
      updatedStatus[myName] = { 
        texto: taskText, 
        storeId: storeId,
        timestamp: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) 
      };
    }

    await setDoc(doc(db, "settings", "atividades_equipe"), updatedStatus, { merge: true });
    if (action !== 'clear' && !taskText.includes('Pausada')) {
      toast.success(`Sinalizado: ${taskText.replace('▶️ Executando: ', '')}`);
    }
  };

  if (authLoading || !user) return <AuthScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleLogin={handleLogin} authError={authError} authLoading={authLoading} />;

  return (
    <div className="min-h-screen bg-[#0B0F19] font-sans text-gray-200 flex flex-col">
      <Toaster position="top-right" />
      
      {isSimulating && (
        <div className="bg-amber-500 text-black py-2 px-4 flex items-center justify-center gap-4 z-[999] relative font-bold shadow-[0_4px_10px_rgba(245,158,11,0.3)]">
          <span className="text-sm flex items-center gap-2">
            <AlertTriangle size={18} /> MODO SIMULAÇÃO: Você está vendo o sistema como <b>{currentUserData?.nomeCompleto}</b> ({userRole}).
          </span>
          <button 
            onClick={stopSimulation} 
            className="bg-black hover:bg-gray-800 text-white px-4 py-1.5 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            Encerrar Simulação
          </button>
        </div>
      )}      
      
      {/* 🌟 NAVEGAÇÃO PRINCIPAL (HEADER) */}
      <header className="sticky top-0 z-40 bg-[#0B0F19]/50 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="w-full px-4 md:px-8 2xl:px-12 mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Avante HUB" className="h-9 w-auto object-contain rounded-lg shadow-sm" />
              <span className="text-xl font-bold text-white tracking-tight hidden sm:block">Avante<span className="text-yellow-500">HUB</span></span>
            </div>
          </div>

<nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md shadow-inner">
            <button onClick={() => setActiveView('feed_equipe')} className={`relative px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${activeView === 'feed_equipe' ? 'bg-blue-950 text-white shadow-md border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Activity size={16} /> Feed
              {globalPendingTasks > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-red-400/50"></span>
              )}
            </button>
            <button onClick={() => setActiveView('rotinas')} className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${activeView === 'rotinas' ? 'bg-blue-950 text-white shadow-md border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <CalendarDays size={16} /> <span className="hidden md:inline">Workflow</span>
            </button>
            
            {!isVisitante && (
              <>
                <button onClick={() => setActiveView('operacional')} className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${activeView === 'operacional' ? 'bg-blue-950 text-white shadow-md border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <Briefcase size={16} /> <span className="hidden md:inline">Portfólio</span>
                </button>
                <button onClick={() => setActiveView('dashboard')} className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${activeView === 'dashboard' ? 'bg-blue-950 text-white shadow-md border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <PieChartIcon size={16} /> <span className="hidden md:inline">Dashboard</span>
                </button>
              </>
            )}

            {/* Bloqueio Duplo: Precisa poder editar E NÃO PODE ser visitante */}
            {(canEdit && !isVisitante) && (
              <button onClick={() => setActiveView('admin')} className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${activeView === 'admin' ? 'bg-white/10 text-white shadow-md border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Shield size={16} /> <span className="hidden md:inline">Equipe</span>
              </button>
            )}
          </nav>
          <div className="flex items-center gap-4">
            {canEdit && (
              <div className="hidden lg:flex gap-1">
                <button onClick={exportBackup} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all" title="Exportar Backup"><Upload size={16} /></button>
                <input type="file" accept=".json" ref={fileInputRef} onChange={importBackup} className="hidden" />
                <button onClick={() => fileInputRef.current.click()} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all" title="Importar Backup"><Download size={16} /></button>
              </div>
            )}
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="flex items-center gap-2 bg-white/5 py-1 pl-1 pr-4 rounded-full border border-white/10 backdrop-blur-md shadow-inner">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${currentUserData?.avatarColor || 'from-indigo-500 to-purple-600'} flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/20`}>
                  {(currentUserData?.nomeCompleto || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white leading-tight">
                    {currentUserData?.nomeCompleto || 'Usuário'}
                  </p>
                  <p className="text-[9px] text-indigo-300 uppercase tracking-widest leading-tight">
                    {getVisualRole(currentUserData?.role)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPasswordModalOpen(true)} className="p-2 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-full text-gray-400 hover:text-white transition-all shadow-sm" title="Mudar Senha"><Key size={16} /></button>
                <button onClick={handleLogout} className="p-2 bg-white/5 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 rounded-full text-gray-400 hover:text-red-400 transition-all shadow-sm" title="Sair"><LogOut size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full px-4 md:px-8 2xl:px-12 pt-6 relative mx-auto">
 
        {/* 🌟 BARRA DE FILTROS GLOBAL (FIXA E "PRESA") 🌟 */}
        {['dashboard', 'operacional', 'rotinas'].includes(activeView) && (
          <div className="sticky top-20 z-30 bg-[#0B0F19]/80 backdrop-blur-xl p-4 md:p-5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-6 w-full animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-center gap-4 justify-between w-full">
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
                <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar por conta ou loja..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-sm transition-all shadow-inner" 
                  />
                </div>
          
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-black/20 border border-white/10 text-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium outline-none cursor-pointer hover:bg-white/5 transition-all shadow-inner hidden md:flex">
                  <option value="name" className="bg-gray-900 text-white">Por Nome (A-Z)</option>
                  <option value="gmv" className="bg-gray-900 text-white">Maior Faturamento</option>
                  <option value="status" className="bg-gray-900 text-white">Por Status</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10 shadow-inner w-full md:w-auto">
                <div className="flex gap-1 border-r border-white/10 pr-2">
                    {['all', 'danger', 'warning', 'success'].map(f => (
                      <button key={f} onClick={() => setStatusFilter(f)} className={`p-1.5 rounded-lg transition-all ${statusFilter === f ? 'bg-white/10 text-white shadow-md' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                        {f === 'all' ? <Filter size={16}/> : f === 'danger' ? <AlertTriangle size={16}/> : f === 'warning' ? <Clock size={16}/> : <CheckCircle size={16}/>}
                      </button>
                    ))}
                </div>

                <select value={mktFilter} onChange={e => setMktFilter(e.target.value)} className="bg-transparent text-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer hover:bg-white/5 transition-colors border-r border-white/10">
                  <option value="all" className="bg-gray-900 text-white">🛍️ CANAIS</option>
                  {uniqueMkts.map(m => <option key={m} value={m} className="bg-gray-900 text-white">{m}</option>)}
                </select>
                <select value={respFilter} onChange={e => setRespFilter(e.target.value)} className="bg-transparent text-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer hover:bg-white/5 transition-colors">
                  <option value="all" className="bg-gray-900 text-white">👥 TODOS RESP.</option>
                  <option value="unassigned" className="bg-gray-900 text-amber-400">⚠️ SEM RESPONSÁVEL</option>
                  {teamMembers.map(m => <option key={m.email} value={m.nomeCompleto || m.nome} className="bg-gray-900 text-white">{m.nomeCompleto || m.nome}</option>)}
                </select>
              </div>
              
              <div className="flex w-full md:w-auto">
                {currentUserData?.role !== 'Operacional' && !isVisitante && (
                  <button onClick={addNewStore} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-6 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all shadow-md">
                    <Plus size={16} /> Novo Cliente
                  </button>
                )}
              </div>

              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSortBy('name');
                  setStatusFilter('all');
                  setMktFilter('all');
                  setRespFilter('all');
                  toast.success('Filtros resetados!');
                }} 
                className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 p-2.5 rounded-xl transition-colors"
                title="Limpar todos os filtros"
              >
                <Eraser size={16}/>
              </button>

            </div>
          </div>
        )}

        {activeView === 'feed_equipe' && (
          <TeamFeedView 
            currentUserData={currentUserData} 
            user={user} 
            stores={stores} 
            openTaskModal={(store) => { setActiveTaskStoreId(store.id); setTaskModalOpen(true); }}
          />
        )}

        {activeView === 'dashboard' && <ExecutiveDashboard dashboardData={dashboardData} formatCurrency={formatCurrency} pieData={pieData} roasData={roasData} COLORS={COLORS} currentDay={currentDay} daysInMonth={daysInMonth} />}
        
        {activeView === 'admin' && canEdit && (
          <AdminPanel 
            handleCreateUser={handleCreateUser} 
            newUserEmail={newUserEmail} setNewUserEmail={setNewUserEmail} 
            newUserPassword={newUserPassword} setNewUserPassword={setNewUserPassword} 
            newUserName={newUserName} setNewUserName={setNewUserName}
            teamMembers={teamMembers}
            handleUpdateUser={handleUpdateUser}
            handleToggleRole={handleToggleRole}
            handleDeleteUser={handleDeleteUser}
            closeMonth={closeMonth}
            startSimulation={startSimulation}
            isSimulating={isSimulating}
          />
        )}

        {activeView === 'operacional' && (
          <OperationalTable 
            canEdit={canEdit} 
            dashboardData={dashboardData} 
            expandedClients={expandedClients} 
            toggleClientExpansion={toggleClientExpansion}
            formatCurrency={formatCurrency} 
            currentDay={currentDay} 
            globalGrowth={globalGrowth} 
            updateGlobalSettings={updateGlobalSettings}
            addNewStoreToClient={addNewStoreToClient} 
            deleteStore={deleteStore} 
            deleteClient={deleteClient}
            startEditingClient={startEditingClient} 
            editingClient={editingClient} 
            setEditingClient={setEditingClient} 
            clientEditData={clientEditData} 
            setClientEditData={setClientEditData} 
            saveClientEdit={saveClientEdit}
            startEditingStore={startEditingStore} 
            editingStoreId={editingStoreId} 
            setEditingStoreId={setEditingStoreId} 
            storeEditData={storeEditData} 
            setStoreEditData={setStoreEditData} 
            saveStoreEdit={saveStoreEdit}
            handleStoreChange={handleStoreChange}
            openHistoryModal={openHistoryModal}
            generateStoreWhatsAppLink={generateStoreWhatsAppLink}
            generateClientWhatsAppLink={generateClientWhatsAppLink}
            openClientFile={openClientFile}
          />
        )}

{activeView === 'rotinas' && (
          <TaskView 
            stores={
              isVisitante 
                ? dashboardData.flatFilteredStores.map(store => ({
                    ...store,
                    checklists: (store.checklists || []).filter(task => task.responsavel === myName)
                  })).filter(store => store.checklists?.length > 0)
                : dashboardData.flatFilteredStores
            } 
            openTaskModal={(store) => { setActiveTaskStoreId(store.id); setTaskModalOpen(true); }} 
            openBulkTaskModal={() => setBulkTaskModalOpen(true)}
            currentUserData={currentUserData}
            user={user}
            updateStoreInCloud={updateStoreInCloud}
            setStores={setStores}
            openClientFile={openClientFile}
            teamMembers={teamMembers}
            broadcastTaskFocus={broadcastTaskFocus}
          />
        )}
      </main>

      {passwordModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-700 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Key size={18} className="text-indigo-400" /> Mudar Minha Senha
            </h3>
            <p className="text-xs text-gray-400 mb-4">Insira uma nova senha para o seu acesso.</p>
            <form onSubmit={handleChangeOwnPassword}>
              <input 
                type="password" 
                value={newOwnPassword} 
                onChange={e => setNewOwnPassword(e.target.value)} 
                placeholder="Nova senha (mín. 6 caracteres)" 
                required 
                minLength="6"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500 mb-4 transition-colors" 
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setPasswordModalOpen(false)} className="text-gray-400 hover:text-white px-4 py-2 text-sm font-medium">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold shadow-md transition-colors text-sm">Salvar Senha</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBatchMode && (
        <BatchEntry stores={stores} currentDay={currentDay} onSaveBatch={handleSaveBatch} onClose={() => setIsBatchMode(false)} />
      )}

      {taskModalOpen && (
        <TaskModal 
          store={stores.find(s => s.id === activeTaskStoreId)} 
          onClose={() => setTaskModalOpen(false)} 
          updateStoreInCloud={updateStoreInCloud}
          stores={stores}
          setStores={setStores}
          currentUserData={currentUserData}
          isManager={canEdit}
          teamMembers={teamMembers}
          broadcastTaskFocus={broadcastTaskFocus}
        />
      )}

      <CreateStoreModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSave={handleSaveNewStore}
        initialClient={createModalClient}
        existingMkts={[...new Set(stores.map(s => s.marketplace))].filter(Boolean).sort()}
      />

      <BulkTaskModal 
        isOpen={bulkTaskModalOpen}
        onClose={() => setBulkTaskModalOpen(false)}
        stores={stores}
        onSave={handleSaveBulkTasks}
        teamMembers={teamMembers}
      />

      {clientFileOpen && (
        <ClientFileModal 
          clientGroup={activeClientGroup} 
          onClose={() => setClientFileOpen(false)}
          openTaskModal={(store) => { setActiveTaskStoreId(store.id); setTaskModalOpen(true); }}
          formatCurrency={formatCurrency}
          stores={stores}
          setStores={setStores}
          updateStoreInCloud={updateStoreInCloud}
          currentDay={currentDay}
          currentUserData={currentUserData}
          user={user}
          canUseBatchEntry={canUseBatchEntry}
          canEdit={canEdit}
          teamMembers={teamMembers}
          addNewStoreToClient={addNewStoreToClient}
        />
      )}
    </div>
  );
}

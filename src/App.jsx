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
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
import ExportModal from './components/ExportModal';

const initialStores = []; 
const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

export const getVisualRole = (role) => {
  if (role === 'Admin' || role === 'admin' || role === 'manager') return 'Analista';
  if (role === 'Supervisor') return 'Gestor';
  if (role === 'Visitante') return 'Visitante';
  return 'Estrategista';
};

export default function App() {
  const CURRENT_VERSION = '2.4.3';
  
  const [user, setUser] = useState(null);
  const { stores, setStores, isDbLoading, setIsDbLoading, updateStoreInCloud } = useAvanteData(user);
  const [currentUserData, setCurrentUserData] = useState(null);

  const [realUserData, setRealUserData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
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
  const canEdit = userRole === 'Admin' || userRole === 'Supervisor' || (isAdmin && !isSimulating);

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
        
        // --- SISTEMA INTELIGENTE DE VERIFICAÇÃO DE ATUALIZAÇÃO ---
        if (data.versao && data.versao !== CURRENT_VERSION) {
          // Detecta se o CRM está rodando como Aplicativo Instalado (Área de Trabalho ou Celular)
          const isPWA = window.matchMedia('(display-mode: standalone)').matches;

          if (isPWA) {
            // Se for o App instalado, o cache é rígido. Mostramos um alerta fixo para forçar o reload puro.
            toast((t) => (
              <div className="flex flex-col gap-2 p-1">
                <p className="text-xs font-bold text-slate-900  flex items-center gap-1.5">
                  🚀 Nova versão disponível: <span className="text-yellow-400 font-black">{data.versao}</span>
                </p>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Atualize para garantir que os painéis e o ranking diário sincronizem corretamente.
                </p>
                <button 
                  onClick={() => {
                    toast.dismiss(t.id);
                    // Força a limpeza de cache local e recarrega o app instalado do zero
                    window.location.reload(true);
                  }}
                  className="w-full mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-2 px-3 rounded-xl shadow-md transition-colors"
                >
                  Atualizar Agora
                </button>
              </div>
            ), { duration: Infinity, id: 'pwa-update-toast', icon: '🔄' });
          } else {
            // Se for no navegador comum, apenas avisamos discretamente com um toast temporário
            toast.success(`Uma nova atualização (${data.versao}) foi lançada! Recarregue a página caso note instabilidades.`, {
              duration: 10000,
              id: 'web-update-toast'
            });
          }
        }
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

  const handleUpdateUser = async (emailToUpdate, newNameCompleto, newColor, newAvatarUrl) => {
    if (!canEdit) return;
    try {
      const userDocRef = doc(db, "equipe", emailToUpdate.toLowerCase());
      const primeiroNome = newNameCompleto.trim().split(' ')[0];
      const updateData = { nome: primeiroNome, nomeCompleto: newNameCompleto.trim() };
      
      if (newColor) updateData.avatarColor = newColor;
      if (newAvatarUrl !== undefined) updateData.avatarUrl = newAvatarUrl; // Salva a foto

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
    const monthInput = prompt("FECHAMENTO OFICIAL DE MÊS\n\nDigite a competência que está sendo fechada (Ex: MAIO/2026):");
    if (!monthInput) return;

    if (!window.confirm(`ATENÇÃO! Tem certeza que deseja FECHAR O MÊS de ${monthInput.toUpperCase()}?\n\n1. Os relatórios em PDF e Excel serão baixados.\n2. O histórico financeiro será salvo.\n3. O faturamento de TODAS as lojas será zerado.`)) return;

    toast.loading("Processando fechamento do mês e gravando histórico...", { id: 'close-month' });

    try {
      // 1. Gera e baixa os relatórios baseando-se em TODAS as lojas
      await generateReports(stores, monthInput, { pdf: true, excel: true });
      
      // 2. Grava o histórico oficial no Firebase e zera as lojas
      const batch = writeBatch(db);
      stores.forEach(store => {
        const storeRef = doc(db, 'lojas', store.id);
        
        const gmv = Number(store.currentRevenue) || 0;
        const feePercent = Number(store.feePercent) || 0;
        const fixedFee = Number(store.fixedFee) || 0;
        const isFixed = store.feeType === 'fixed' || fixedFee > 0;
        
        const agencyRevenue = isFixed ? fixedFee : gmv * (feePercent / 100);

        // Snapshot salva o "retrato" da loja naquele mês
        const snapshot = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          month: monthInput.toUpperCase(),
          gmv: gmv,
          agencyRevenue: agencyRevenue,
          feeType: store.feeType || 'percent',
          feePercent: feePercent,
          fixedFee: fixedFee,
          closedAt: new Date().toISOString()
        };

        const currentHistory = store.monthlyHistory || [];
        const newMonthlyHistory = [...currentHistory, snapshot];

        batch.update(storeRef, {
          monthlyHistory: newMonthlyHistory, // Salva o novo mês no histórico
          gmvBase: gmv, // O fechado de hoje vira a nova base para calcular evolução mês que vem
          currentRevenue: 0,
          orders: 0,
          units: 0,
          adsInvestment: 0,
          history: [], // Zera o gráfico diário da tela da loja
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      toast.success("Mês fechado com sucesso! Relatórios baixados e histórico atualizado.", { id: 'close-month' });
    } catch (error) {
      console.error(error);
      toast.error("Erro fatal ao fechar o mês: " + error.message, { id: 'close-month' });
    }
  };

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

  // GERADOR CENTRAL DE RELATÓRIOS (V2.2.0)
  const generateReports = async (targetStores, monthInput, formats = { pdf: true, excel: true }) => {
    const periodoApurado = `1 a ${daysInMonth} de ${monthInput.toUpperCase()}`;
    const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    try {
      const parseSafeNumber = (val) => Number(String(val || 0).trim().replace(',', '.')) || 0;
      const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
      const formatPercent = (val) => (val > 0 ? '+' : '') + (val * 100).toFixed(2) + '%';
      const formatRoas = (val) => val > 0 ? val.toFixed(2) + 'x' : '-';

      const clientsGroup = {};
      targetStores.forEach(s => {
        const cName = s.client || 'Sem Cliente';
        if (!clientsGroup[cName]) clientsGroup[cName] = [];
        clientsGroup[cName].push(s);
      });

      const clientNames = Object.keys(clientsGroup).sort();

      // EXCEL
      if (formats.excel) {
        const wb = XLSX.utils.book_new();
        clientNames.forEach(clientName => {
          const clientStores = clientsGroup[clientName].sort((a, b) => parseSafeNumber(b.currentRevenue) - parseSafeNumber(a.currentRevenue));
          let totalGmv = 0, totalBase = 0, totalUnits = 0, totalOrders = 0, totalAds = 0;
          let isFixed = false, avanteFixedFee = 0;
          const canaisAtendidos = new Set();
          
          clientStores.forEach(s => {
            totalGmv += parseSafeNumber(s.currentRevenue);
            totalBase += parseSafeNumber(s.gmvBase);
            totalUnits += parseSafeNumber(s.units);
            totalOrders += parseSafeNumber(s.orders);
            totalAds += parseSafeNumber(s.adsInvestment);
            if (s.marketplace) canaisAtendidos.add(s.marketplace);
            if (s.feeType === 'fixed' || parseSafeNumber(s.fixedFee) > 0) {
              isFixed = true;
              if (avanteFixedFee === 0) avanteFixedFee = parseSafeNumber(s.fixedFee);
            }
          });

          const totalEvolucao = totalBase > 0 ? (totalGmv - totalBase) / totalBase : 0;
          const totalRoas = totalAds > 0 ? totalGmv / totalAds : 0;
          let avanteTotalFee = isFixed ? avanteFixedFee : clientStores.reduce((acc, s) => acc + (parseSafeNumber(s.currentRevenue) * (parseSafeNumber(s.feePercent) / 100)), 0);
          const totalClientPays = avanteTotalFee * 2; 

          const wsData = [
            ['RESUMO FINANCEIRO E PERFORMANCE', clientName], [],
            ['Marketplaces Atendidos', Array.from(canaisAtendidos).join(', ')],
            ['Total Unidades / Pedidos', `${totalUnits} un. / ${totalOrders} ped.`],
            ['Faturamento Base Anterior', totalBase],
            ['Total Faturado Atual (GMV)', totalGmv],
            ['Crescimento Geral (MoM)', formatPercent(totalEvolucao)],
            ['Total ADS', totalAds],
            ['ROAS Médio do Cliente', formatRoas(totalRoas)], [],
            ['Total Faturado Cliente (100%)', totalClientPays],
            ['Comissão B2X (50%)', avanteTotalFee],
            ['Comissão Avante / Gestor (50%)', avanteTotalFee], [],
            ['Rk', 'Loja', 'Canal', 'GMV Base', 'Faturamento (GMV)', 'Evolução', 'Pedidos', 'Unidades', 'Invest. ADS', 'ROAS', 'CPA (Pedido)', 'CPA (Unidade)']
          ];

          clientStores.forEach((s, idx) => {
            const gmv = parseSafeNumber(s.currentRevenue);
            const base = parseSafeNumber(s.gmvBase);
            const ads = parseSafeNumber(s.adsInvestment);
            const orders = parseSafeNumber(s.orders);
            const units = parseSafeNumber(s.units);
            wsData.push([ `${idx + 1}º`, s.store || '-', s.marketplace || '-', base, gmv, formatPercent(base > 0 ? (gmv - base) / base : 0), orders, units, ads, formatRoas(ads > 0 ? gmv / ads : 0), orders > 0 ? ads / orders : 0, units > 0 ? ads / units : 0 ]);
          });

          wsData.push(['-', 'TOTAL GERAL', '-', totalBase, totalGmv, formatPercent(totalEvolucao), totalOrders, totalUnits, totalAds, formatRoas(totalRoas), '-', '-']);
          
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          ws['!cols'] = [{wch: 32}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 15}];
          XLSX.utils.book_append_sheet(wb, ws, clientName.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31) || 'Cliente');
        });
        XLSX.writeFile(wb, `Avante_Fechamento_${monthInput.replace('/', '-')}.xlsx`);
      }

      // PDF
      if (formats.pdf) {
        const docPdf = new jsPDF();
        clientNames.forEach((clientName, index) => {
          if (index > 0) docPdf.addPage();
          const clientStores = clientsGroup[clientName].sort((a, b) => parseSafeNumber(b.currentRevenue) - parseSafeNumber(a.currentRevenue));
          let totalGmv = 0, totalBase = 0, totalOrders = 0, totalUnits = 0, totalAds = 0;
          let isFixed = false, avanteFixedFee = 0;
          const canaisAtendidos = new Set();

          clientStores.forEach(s => {
            totalGmv += parseSafeNumber(s.currentRevenue);
            totalBase += parseSafeNumber(s.gmvBase);
            totalOrders += parseSafeNumber(s.orders);
            totalUnits += parseSafeNumber(s.units);
            totalAds += parseSafeNumber(s.adsInvestment);
            if (s.marketplace) canaisAtendidos.add(s.marketplace);
            if (s.feeType === 'fixed' || parseSafeNumber(s.fixedFee) > 0) { isFixed = true; if (avanteFixedFee === 0) avanteFixedFee = parseSafeNumber(s.fixedFee); }
          });

          const totalEvolucao = totalBase > 0 ? (totalGmv - totalBase) / totalBase : 0;
          const totalRoas = totalAds > 0 ? totalGmv / totalAds : 0;
          let avanteTotalFee = isFixed ? avanteFixedFee : clientStores.reduce((acc, s) => acc + (parseSafeNumber(s.currentRevenue) * (parseSafeNumber(s.feePercent) / 100)), 0);

          docPdf.setFillColor(15, 23, 42); 
          docPdf.rect(0, 0, 210, 40, 'F'); 
          docPdf.setFontSize(24); docPdf.setTextColor(255, 255, 255); docPdf.text(clientName.toUpperCase(), 14, 22);
          docPdf.setFontSize(10); docPdf.setTextColor(156, 163, 175); docPdf.text('RELATÓRIO DE PERFORMANCE B2X', 14, 30); docPdf.text(`Período Apurado: ${periodoApurado}`, 14, 35);
          docPdf.setFontSize(8); docPdf.setTextColor(107, 114, 128); docPdf.text(`Gerado em: ${dataGeracao}`, 196, 35, { align: 'right' });

          docPdf.setFontSize(11); docPdf.setTextColor(75, 85, 99); docPdf.text('Faturamento Consolidado:', 14, 52);
          docPdf.setFontSize(24); docPdf.setTextColor(16, 185, 129); docPdf.text(formatMoney(totalGmv), 14, 62);
          docPdf.setFontSize(11); docPdf.setTextColor(75, 85, 99); docPdf.text('Fatura da Assessoria (B2X):', 120, 52);
          docPdf.setFontSize(24); docPdf.setTextColor(79, 70, 229); docPdf.text(formatMoney(avanteTotalFee * 2), 120, 62);

          const storeRows = [];
          clientStores.forEach((store, idx) => {
            const gmv = parseSafeNumber(store.currentRevenue);
            const ads = parseSafeNumber(store.adsInvestment);
            const orders = parseSafeNumber(store.orders);
            const base = parseSafeNumber(store.gmvBase);
            storeRows.push([ `${idx + 1}º`, store.marketplace || '-', store.store || '-', formatMoney(gmv), formatPercent(base > 0 ? (gmv - base) / base : 0), `${orders} ped.`, formatMoney(ads), formatRoas(ads > 0 ? gmv / ads : 0), formatMoney(orders > 0 ? ads / orders : 0) ]);
          });

          autoTable(docPdf, {
            startY: 75,
            head: [['Rk', 'Canal', 'Loja', 'GMV', 'Evolução', 'Volume', 'ADS', 'ROAS', 'CPA Médio']],
            body: storeRows, theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 7, cellPadding: 4 },
            columnStyles: { 0: { halign: 'center' }, 4: { halign: 'center' }, 7: { halign: 'center' } },
            alternateRowStyles: { fillColor: [249, 250, 251] }
          });

          let finalY = docPdf.lastAutoTable.finalY + 10;
          if (finalY + 55 > docPdf.internal.pageSize.height) { docPdf.addPage(); finalY = 20; }
          
          docPdf.setFillColor(243, 244, 246); docPdf.roundedRect(14, finalY, 182, 50, 3, 3, 'F');
          docPdf.setFontSize(12); docPdf.setTextColor(31, 41, 55); docPdf.text('Resumo Executivo do Período', 20, finalY + 8);
          docPdf.setFontSize(10); docPdf.setTextColor(75, 85, 99);
          docPdf.text(`Canais Atendidos: ${Array.from(canaisAtendidos).join(', ')}`, 20, finalY + 18);
          docPdf.text(`Crescimento do Faturamento (MoM): ${formatPercent(totalEvolucao)}`, 20, finalY + 26);
          docPdf.text(`Total de Unidades Vendidas: ${totalUnits} unidades`, 20, finalY + 34);
          docPdf.text(`Total de Pedidos Gerados: ${totalOrders} pedidos`, 20, finalY + 42);
          docPdf.text(`Investimento Total em ADS: ${formatMoney(totalAds)}`, 110, finalY + 26);
          docPdf.text(`ROAS Médio Consolidado: ${formatRoas(totalRoas)}`, 110, finalY + 34);
          docPdf.text(`CPA Médio Consolidado: ${formatMoney(totalOrders > 0 ? totalAds / totalOrders : 0)} / pedido`, 110, finalY + 42);
        });
        docPdf.save(`Avante_Relatorios_${monthInput.replace('/', '-')}.pdf`);
      }
    } catch (error) {
      console.error(error);
      throw error; 
    }
  };

  // GATILHO DA CENTRAL DE EXPORTAÇÃO
  const handleCustomExport = async ({ json, pdf, excel, monthInput }) => {
    toast.loading("Gerando arquivos solicitados...", { id: 'custom-export' });
    try {
      const dataToExport = dashboardData.flatFilteredStores;

      if (json) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `Avante_Backup_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      }

      if (pdf || excel) {
        await generateReports(dataToExport, monthInput, { pdf, excel });
      }
      
      toast.success("Arquivos gerados com sucesso!", { id: 'custom-export' });
    } catch (error) {
      console.error(error);
      toast.error("Erro durante a exportação: " + error.message, { id: 'custom-export' });
    }
  };

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
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xl font-bold text-white tracking-tight">Avante<span className="text-yellow-500">HUB</span></span>
                <span className="text-[10px] bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-full font-bold tracking-widest shadow-inner">
                  v{CURRENT_VERSION}
                </span>
              </div>
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
              <div className="hidden lg:flex gap-1 items-center">
                {/* EXPORTAR (INDIGO) */}
                <button 
                  onClick={() => setIsExportModalOpen(true)} 
                  className="text-orange-600 hover:text-orange-400 p-2 rounded-full hover:bg-orange-500/10 transition-all border border-transparent hover:border-orange-500/30" 
                  title="Exportar Relatórios"
                >
                  <Download size={18} />
                </button>

                <div className="w-px h-4 bg-white/10 mx-1"></div> {/* Divisor visual */}

                {/* IMPORTAR / RESTAURAR (NEUTRO) */}
                <input type="file" accept=".json" ref={fileInputRef} onChange={importBackup} className="hidden" />
                <button 
                  onClick={() => fileInputRef.current.click()} 
                  className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700/50 transition-all border border-transparent hover:border-gray-600" 
                  title="Restaurar Backup"
                >
                  <ArchiveRestore size={18} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="flex items-center gap-2 bg-white/5 py-1 pl-1 pr-4 rounded-full border border-white/10 backdrop-blur-md shadow-inner">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${currentUserData?.avatarColor || 'from-indigo-500 to-purple-600'} flex items-center justify-center text-sm font-bold text-white shadow-md border border-white/20 overflow-hidden shrink-0`}>
                  {currentUserData?.avatarUrl ? (
                    <img src={currentUserData.avatarUrl} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    (currentUserData?.nomeCompleto || 'U').charAt(0).toUpperCase()
                  )}
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
            teamMembers={teamMembers}
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

      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        onExport={handleCustomExport}
        filterCount={dashboardData.flatFilteredStores.length}
      />
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import { 
  Search, Download, ArchiveRestore, CalendarDays, Eraser, LogOut,
  Key, Briefcase, Filter, AlertTriangle, Clock, CheckCircle, Shield, 
  Eye, EyeOff, Flame, Activity, PieChart as PieChartIcon, 
  TrendingUp, DollarSign, Target, MessageCircle, Upload, Save, Plus, X, Trash2, Zap
} from 'lucide-react';

import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, updatePassword } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, writeBatch, deleteField } from "firebase/firestore";
import { Toaster, toast } from 'react-hot-toast';
import { useAppStore } from './store/useAppStore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

import { db, auth, secondaryAuth } from './services/firebase';

import AuthScreen from './components/AuthScreen';
import ErrorBoundary from './components/ErrorBoundary';

const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));
const OperationalTable = lazy(() => import('./pages/OperationalTable'));
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard'));
const WarRoom = lazy(() => import('./pages/WarRoom'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const TeamFeedView = lazy(() => import('./pages/TeamFeedView'));

import ClientFileModal from './features/clients/ClientFileModal';
import BatchEntry from './features/operations/BatchEntry';
import TaskModal from './features/tasks/TaskModal';
import CreateStoreModal from './features/clients/CreateStoreModal';
import BulkTaskModal from './features/tasks/BulkTaskModal';
import ExportModal from './features/finance/ExportModal';
import GoalsSettingsModal from './features/finance/GoalsSettingsModal';
import CloseMonthModal from './features/finance/CloseMonthModal';
import StoreHistoryModal from './features/clients/StoreHistoryModal';

import { useAvanteData } from './hooks/useAvanteData';
import { normalizeMonthYear } from './utils/dateUtils';
import { formatCurrency, formatNumber } from './utils/financeUtils';
import { generateMonthlyReportPDF } from './utils/pdfGenerator';
import { enrichStoreMetrics } from './utils/calculations';

const initialStores = []; 
const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

export const getVisualRole = (role) => {
  if (role === 'Admin' || role === 'admin' || role === 'manager') return 'Analista';
  if (role === 'Supervisor') return 'Gestor';
  if (role === 'Visitante') return 'Visitante';
  return 'Estrategista';
};

export default function App() {
  const CURRENT_VERSION = '3.0.3';

  const parseSafeNumber = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      return Number(String(val).replace(/\./g, '').replace(',', '.')) || 0;
  };

  const safeFormatCurrency = (val) => showValues ? formatCurrency(val) : 'R$ •••••';
  const safeFormatNumber = (val) => showValues ? formatNumber(val) : '••••';

  const [user, setUser] = useState(null);
  const { stores, setStores, isDbLoading, setIsDbLoading, updateStoreInCloud } = useAvanteData(user);
  const [currentUserData, setCurrentUserData] = useState(null);

  const [realUserData, setRealUserData] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  
  const myName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Membro';

  const [globalGrowth, setGlobalGrowth] = useState(10);
  const [clientGrowthMap, setClientGrowthMap] = useState({});
  const [marketplaceGrowthMap, setMarketplaceGrowthMap] = useState({});
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [currentDay, setCurrentDay] = useState(new Date().getDate());
  
  const [activeEvent, setActiveEvent] = useState(null);
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [scheduledVisits, setScheduledVisits] = useState([]);

  const activeEventStats = useMemo(() => {
    if (!activeEvent) return { gmv: 0, progress: 0 };
    let totalGmv = 0;
    stores.forEach(s => {
      if (s.eventLogs && s.eventLogs[activeEvent.name]) {
        totalGmv += Number(s.eventLogs[activeEvent.name].gmv) || 0;
      }
    });
    const progress = activeEvent.target > 0 ? (totalGmv / activeEvent.target) * 100 : 0;
    return { gmv: totalGmv, progress };
  }, [stores, activeEvent]);

  const [sortBy, setSortBy] = useState(() => localStorage.getItem('avante_sync_sort') || 'name');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('avante_sync_status') || 'all');
  const [mktFilter, setMktFilter] = useState(() => localStorage.getItem('avante_sync_mkt') || 'all');
  const [showArchived, setShowArchived] = useState(false);

  const {
    activeView, setActiveView,
    isSimulating, setIsSimulating,
    searchTerm, setSearchTerm,
    showValues, toggleShowValues
  } = useAppStore();

  useEffect(() => {
    localStorage.setItem('avante_sync_sort', sortBy);
    localStorage.setItem('avante_sync_status', statusFilter);
    localStorage.setItem('avante_sync_mkt', mktFilter);
  }, [sortBy, statusFilter, mktFilter]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'avante_sync_search') setSearchTerm(e.newValue || '');
      if (e.key === 'avante_sync_sort') setSortBy(e.newValue || 'name');
      if (e.key === 'avante_sync_status') setStatusFilter(e.newValue || 'all');
      if (e.key === 'avante_sync_mkt') setMktFilter(e.newValue || 'all');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setClientFileOpen(false);
        setCreateModalOpen(false);
        setTaskModalOpen(false);
        setBulkTaskModalOpen(false);
        setHistoryModalOpen(false);
        setIsCloseMonthModalOpen(false);
        setIsExportModalOpen(false);
        setIsGoalsModalOpen(false);
        setPasswordModalOpen(false);
        setIsBatchMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [expandedClients, setExpandedClients] = useState([]);
  const [bulkTaskModalOpen, setBulkTaskModalOpen] = useState(false);
  const [bulkTaskInitialData, setBulkTaskInitialData] = useState(null);

  const [clientFileOpen, setClientFileOpen] = useState(false);
  const [activeClientGroup, setActiveClientGroup] = useState(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalClient, setCreateModalClient] = useState('');
  
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

  const lastNotificationId = useRef(null);

  const sendGlobalNotification = async (message, type = 'info') => {
    if (!user) return;
    try {
      // Usamos o nome de quem está logado para assinar a mensagem
      const senderName = currentUserData?.nomeCompleto || currentUserData?.nome || user.email.split('@')[0];
      
      await setDoc(doc(db, "settings", "latest_notification"), {
        id: Date.now().toString(), // ID único baseado no tempo
        message: `${senderName}: ${message}`, // Ex: "Jaime: Cadastrou a loja B2X"
        senderEmail: user.email,
        type: type, // 'success', 'alert', ou 'info'
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao emitir notificação global", error);
    }
  };

  const [isCloseMonthModalOpen, setIsCloseMonthModalOpen] = useState(false);

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
  const canAccessWarRoom = currentUserData && !isVisitante; 

  useEffect(() => {
    if (isVisitante && ['dashboard', 'operacional', 'admin'].includes(activeView)) {
      setActiveView('feed_equipe');
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
      setStores(snapshot.docs.map(doc => doc.data()).sort((a, b) => b.id - a.id));
      setIsDbLoading(false);
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if(data.globalGrowth !== undefined) setGlobalGrowth(data.globalGrowth);
        if(data.clientGrowthMap !== undefined) setClientGrowthMap(data.clientGrowthMap);
        if(data.marketplaceGrowthMap !== undefined) setMarketplaceGrowthMap(data.marketplaceGrowthMap);
        
        setActiveEvent(data.activeEvent || null);
        setScheduledEvents(data.scheduledEvents || []);
        setScheduledVisits(data.scheduledVisits || []);
        
        if (data.versao && data.versao !== CURRENT_VERSION) {
          const isPWA = window.matchMedia('(display-mode: standalone)').matches;

          if (isPWA) {
            toast((t) => (
              <div className="flex flex-col gap-2 p-1">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  🚀 Nova versão disponível: <span className="text-yellow-400 font-black">{data.versao}</span>
                </p>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Atualize para garantir que os painéis sincronizem corretamente.
                </p>
                <button 
                  onClick={() => {
                    toast.dismiss(t.id);
                    window.location.reload(true);
                  }}
                  className="w-full mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-2 px-3 rounded-xl shadow-md transition-colors"
                >
                  Atualizar Agora
                </button>
              </div>
            ), { duration: Infinity, id: 'pwa-update-toast', icon: '🔄' });
          } else {
            toast.success(`Uma nova atualização (${data.versao}) foi lançada! Recarregue a página caso note instabilidades.`, {
              duration: 10000,
              id: 'web-update-toast'
            });
          }
        }
      }
    });

    const unsubEquipe = onSnapshot(collection(db, "equipe"), (snapshot) => {
      setTeamMembers(snapshot.docs.map(doc => doc.data()));
    });

    const unsubInternal = onSnapshot(doc(db, "settings", "internal_tasks"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().tasks) {
        setInternalTasks(docSnap.data().tasks);
      }
    });

    const unsubNotifications = onSnapshot(doc(db, "settings", "latest_notification"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.id && data.id !== lastNotificationId.current && data.senderEmail !== user.email) {
          lastNotificationId.current = data.id; // Atualiza a memória
          
          if (data.type === 'success') {
            toast.success(data.message, { id: data.id, duration: 5000 });
          } else if (data.type === 'alert') {
            toast(data.message, { icon: '🚨', id: data.id, duration: 6000 });
          } else {
            toast(data.message, { icon: '📢', id: data.id, duration: 5000 });
          }
        }
      }
    });
    return () => { 
      unsubStores(); 
      unsubSettings(); 
      unsubEquipe(); 
      unsubInternal(); 
      unsubNotifications();
    };
  }, [user]);

  useEffect(() => {
    if (stores.length === 0 || !canEdit) return;

    const cleanOldTasks = async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
      const batch = writeBatch(db);
      let hasUpdates = false;

      stores.forEach(store => {
        if (store.checklists && store.checklists.length > 0) {
          const originalLength = store.checklists.length;
          
          const validChecklists = store.checklists.filter(task => {
            if (!task.feita) return true;
            if (!task.data) return true; 
            
            const taskDate = new Date(task.data);
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

  const handleEventAction = async (action, payload) => {
    if (!canEdit) return;
    const globalRef = doc(db, "settings", "global");
    
    if (action === 'schedule') {
      await setDoc(globalRef, { scheduledEvents: [...scheduledEvents, payload] }, { merge: true });
      toast.success("Evento agendado com sucesso!");
      sendGlobalNotification(`🔥 ${payload.name} agendado!`, 'alert');
    } else if (action === 'start') {
      const updatedScheduled = scheduledEvents.filter(e => e.id !== payload.id);
      await setDoc(globalRef, { activeEvent: payload, scheduledEvents: updatedScheduled }, { merge: true });
      setActiveView('war_room');
      toast.success(`Evento ${payload.name} iniciado! War Room aberta.`);
      sendGlobalNotification(`🔥 Iniciou o evento ${payload.name}! A War Room está aberta!`, 'alert');
    } else if (action === 'end') {
      await setDoc(globalRef, { activeEvent: deleteField() }, { merge: true });
      setActiveView('dashboard');
      toast.success("Evento encerrado! War Room fechada.");
      sendGlobalNotification(`${payload.name} encerrado!`, 'alert');
    } else if (action === 'delete') {
      const updatedScheduled = scheduledEvents.filter(e => e.id !== payload.id);
      await setDoc(globalRef, { scheduledEvents: updatedScheduled }, { merge: true });
      toast.success("Evento removido da agenda.");
    }
  };

  const handleVisitAction = async (action, payload) => {
    if (!canEdit) return;
    const globalRef = doc(db, "settings", "global");
    
    if (action === 'schedule') {
      if (payload.id) {
        // Se tem ID, é uma edição
        const updatedVisits = scheduledVisits.map(v => v.id === payload.id ? payload : v);
        await setDoc(globalRef, { scheduledVisits: updatedVisits }, { merge: true });
        toast.success("Visita atualizada com sucesso!");
      } else {
        // Se não tem ID, é uma visita nova
        const newVisit = { ...payload, id: Date.now().toString() };
        await setDoc(globalRef, { scheduledVisits: [...scheduledVisits, newVisit] }, { merge: true });
        toast.success("Visita agendada com sucesso!");
      }
    } else if (action === 'delete' || action === 'complete') { 
      const updatedVisits = scheduledVisits.filter(v => v.id !== payload.id);
      await setDoc(globalRef, { scheduledVisits: updatedVisits }, { merge: true });
      toast.success(action === 'complete' ? "Visita marcada como realizada!" : "Visita cancelada.");
    }
  };

  const updateGlobalSettings = async (field, value, key = null) => {
    if (!canEdit) return;
    const newVal = value !== '' && value !== null ? Number(value) : null;
    
    if (field === 'day') setCurrentDay(newVal);
    else if (field === 'growth') {
      setGlobalGrowth(newVal);
      await setDoc(doc(db, "settings", "global"), { globalGrowth: newVal }, { merge: true });
    } else if (field === 'clientGrowth') {
      const newMap = { ...clientGrowthMap };
      if (newVal === null) delete newMap[key]; else newMap[key] = newVal;
      setClientGrowthMap(newMap);
      await setDoc(doc(db, "settings", "global"), { clientGrowthMap: newMap }, { merge: true });
    } else if (field === 'marketplaceGrowth') {
      const newMap = { ...marketplaceGrowthMap };
      if (newVal === null) delete newMap[key]; else newMap[key] = newVal;
      setMarketplaceGrowthMap(newMap);
      await setDoc(doc(db, "settings", "global"), { marketplaceGrowthMap: newMap }, { merge: true });
    }
  };

  const openClientFile = (clientName) => {
    const clientStores = stores.filter(s => s.client === clientName && !s.arquivada);
    if (clientStores.length > 0) { 
      const sampleStore = clientStores[0];
      setActiveClientGroup({ 
        client: clientName, 
        feeType: sampleStore.feeType, 
        feePercent: sampleStore.feePercent, 
        fixedFee: sampleStore.fixedFee,
        stores: clientStores
      }); 
      setClientFileOpen(true); 
    }
  };
  
  // Atalho global para que componentes profundos (como TaskModal) consigam chamar
  window.openClientFileGlobal = openClientFile;

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

  const handleUpdateUser = async (emailToUpdate, newNameCompleto, newColor, newAvatarUrl, paymentConfig) => {
    if (!canEdit) return;
    try {
      const userDocRef = doc(db, "equipe", emailToUpdate.toLowerCase());
      const primeiroNome = newNameCompleto.trim().split(' ')[0];
      const updateData = { nome: primeiroNome, nomeCompleto: newNameCompleto.trim() };
      
      if (newColor) updateData.avatarColor = newColor;
      if (newAvatarUrl !== undefined) updateData.avatarUrl = newAvatarUrl;
      if (paymentConfig !== undefined) updateData.paymentConfig = paymentConfig;

      await setDoc(userDocRef, updateData, { merge: true });
      toast.success('Usuário atualizado com sucesso!');
    } catch (error) { toast.error('Erro ao atualizar usuário.'); }
  };

  const handleToggleRole = async (email, currentRole) => {
    let newRole = 'Operacional';
    if (currentRole === 'Operacional' || currentRole === 'Visualizador') newRole = 'Supervisor'; 
    else if (currentRole === 'Supervisor') newRole = 'Admin'; 
    else if (currentRole === 'Admin') newRole = 'Visitante'; 
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
      finalValue = value.trim().replace(/\./g, '').replace(',', '.');
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
      targetType: 'percent', fixedGmvTarget: 0,
      currentRevenue: 0, adsInvestment: 0, orders: 0, units: 0, history: [], taskLogs: [], checklists: [], monthlyHistory: [] 
    };
    
    updateStoreInCloud(newStore);
    setStores(prev => [newStore, ...prev]);
    
    if (existingStore && !expandedClients.includes(client)) toggleClientExpansion(client);
    toast.success(`Cadastro de ${store} realizado com sucesso!`);
    sendGlobalNotification(`Cadastrou uma nova loja (${store}) para o cliente ${client}.`, 'success');
  };

  const handleSaveBulkTasks = (storeIds, taskData) => {
    const { text, resp, data, hora, recorrencia } = taskData;
    const creatorName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Usuário';

    let dataLimpa = data || '';
    if (dataLimpa.includes('NaN')) dataLimpa = '';

    const batchStores = stores.map(store => {
      if (storeIds.includes(store.id)) {
        const newTask = { 
            id: Date.now() + Math.random(), 
            texto: text, 
            feita: false, 
            responsavel: resp.trim(), 
            criadoPor: creatorName, 
            dataCriacao: new Date().toLocaleDateString('pt-BR'), 
            data: dataLimpa,
            hora: hora || '', 
            recorrencia: recorrencia || 'none' 
        };
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
    sendGlobalNotification(`Delegou uma nova tarefa em massa para ${storeIds.length} lojas.`, 'info');
  };

  const handleSaveIndividualEntry = async (storeId, dayStr, cumRev, cumAds, cumOrd, cumUni) => {
    const targetDay = Number(dayStr);
    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    let history = [...(store.history || [])].sort((a,b) => a.day - b.day);
    
    const pastEntries = history.filter(h => h.day < targetDay);
    const prevEntry = pastEntries.length > 0 ? pastEntries[pastEntries.length - 1] : null;

    const startDay = prevEntry ? prevEntry.day + 1 : 1;
    const daysCount = targetDay - startDay + 1;

    if (daysCount <= 0) {
        toast.error(`Para corrigir um dia passado, limpe o histórico primeiro (em breve). O dia ${targetDay} é inválido para progressão.`);
        return;
    }

    const prevRev = prevEntry ? prevEntry.revenue : 0;
    const prevAds = prevEntry ? prevEntry.ads : 0;
    const prevOrd = prevEntry ? prevEntry.orders : 0;
    const prevUni = prevEntry ? prevEntry.units : 0;

    const diffRev = Math.max(0, parseSafeNumber(cumRev) - prevRev);
    const diffAds = Math.max(0, parseSafeNumber(cumAds) - prevAds);
    const diffOrd = Math.max(0, parseSafeNumber(cumOrd) - prevOrd);
    const diffUni = Math.max(0, parseSafeNumber(cumUni) - prevUni);

    const avgRev = diffRev / daysCount;
    const avgAds = diffAds / daysCount;
    const avgOrd = diffOrd / daysCount;
    const avgUni = diffUni / daysCount;

    history = history.filter(h => h.day < startDay || h.day > targetDay);

    for (let d = startDay; d <= targetDay; d++) {
        const step = d - startDay + 1;
        history.push({
            id: Date.now() + Math.random(),
            day: d,
            dailyRevenue: avgRev, 
            revenue: prevRev + (avgRev * step), 
            ads: prevAds + (avgAds * step),
            orders: Math.round(prevOrd + (avgOrd * step)),
            units: Math.round(prevUni + (avgUni * step)),
            date: new Date().toLocaleDateString('pt-BR')
        });
    }

    history.sort((a, b) => a.day - b.day);

    const maxDay = Math.max(...history.map(h => h.day));
    const updates = { history };
    
    if (targetDay >= maxDay) {
        updates.currentRevenue = parseSafeNumber(cumRev);
        updates.adsInvestment = parseSafeNumber(cumAds);
        updates.orders = parseSafeNumber(cumOrd);
        updates.units = parseSafeNumber(cumUni);
        updates.dataUltimoAcesso = new Date().toISOString();
    }

    updateStoreInCloud({ ...store, ...updates });
    const localStores = stores.map(s => s.id === storeId ? { ...s, ...updates } : s);
    setStores(localStores);
    
    toast.success(`Loja atualizada! Dados distribuídos do dia ${startDay} ao ${targetDay} 🚀`);
  };

  const handleSaveRetroactiveMonth = async (storeId, monthStr, gmv, ads, editId = null) => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    const numGmv = parseSafeNumber(gmv);
    const numAds = parseSafeNumber(ads);
    const feePercent = Number(store.feePercent) || 0;
    const fixedFee = Number(store.fixedFee) || 0;
    
    const clientStoresCount = stores.filter(s => s.client === store.client && !s.arquivada).length || 1;
    const agencyRevenue = (store.feeType === 'fixed' || fixedFee > 0) ? (fixedFee / clientStoresCount) : numGmv * (feePercent / 100);

    const standardMonth = normalizeMonthYear(monthStr);

    const isOldStringId = editId && typeof editId === 'string' && editId.includes('/');
    
    const snapshot = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      month: standardMonth,
      gmv: numGmv,
      adsInvestment: numAds,
      orders: Number(store.orders) || 0,
      units: Number(store.units) || 0,
      agencyRevenue: agencyRevenue,
      feeType: store.feeType || 'percent',
      feePercent: feePercent,
      fixedFee: fixedFee,
      closedAt: new Date().toISOString()
    };

    let newMonthlyHistory = [...(store.monthlyHistory || [])];
    
    if (editId) {
        newMonthlyHistory = newMonthlyHistory.map(h => (h.id || h.month) === editId ? snapshot : h);
    } else {
        newMonthlyHistory.push(snapshot);
    }

    const monthsOrder = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    newMonthlyHistory.sort((a, b) => {
        const [mA, yA] = normalizeMonthYear(a.month).split('/');
        const [mB, yB] = normalizeMonthYear(b.month).split('/');
        const valA = parseInt(yA || 0, 10) * 100 + monthsOrder.indexOf(mA);
        const valB = parseInt(yB || 0, 10) * 100 + monthsOrder.indexOf(mB);
        return valA - valB;
    });

    const newBase = newMonthlyHistory.length > 0 ? Number(newMonthlyHistory[newMonthlyHistory.length - 1].gmv) : 0;
    const updatedStore = { ...store, monthlyHistory: newMonthlyHistory, gmvBase: newBase, updatedAt: new Date().toISOString() };

    updateStoreInCloud(updatedStore);
    setStores(stores.map(s => s.id === storeId ? updatedStore : s));
    toast.success(editId ? `Edição de ${standardMonth} salva e padronizada!` : `Fechamento de ${standardMonth} registrado!`);
  };

  const handleDeleteRetroactiveMonth = async (storeId, retroId) => {
    if(!window.confirm("Deseja realmente apagar este fechamento? O Ponto de Partida da loja será recalculado.")) return;
    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    // Filtra pelo ID ou pelo Mês (para dados legados)
    const updatedHistory = (store.monthlyHistory || []).filter(h => (h.id || h.month) !== retroId);
    
    const newBase = updatedHistory.length > 0 ? Number(updatedHistory[updatedHistory.length - 1].gmv) : 0;
    const updatedStore = { ...store, monthlyHistory: updatedHistory, gmvBase: newBase, updatedAt: new Date().toISOString() };

    updateStoreInCloud(updatedStore);
    setStores(stores.map(s => s.id === storeId ? updatedStore : s));
    toast.success("Fechamento removido com sucesso!");
  };

  const deleteClient = async (clientName) => { 
    if(window.confirm(`🚨 Apagar o cliente ${clientName} e TODAS as suas lojas?`)){ 
      const batch = writeBatch(db);
      stores.forEach(s => { if(s.client === clientName) batch.delete(doc(db, "stores", s.id.toString())); }); 
      await batch.commit(); 
      toast.success(`Cliente ${clientName} apagado com sucesso.`);
    } 
  };

  const handleOffboardClient = async (clientName) => {
    if (!window.confirm(`🚨 ENCERRAMENTO DE CONTRATO\n\nTem a certeza que deseja encerrar a operação do cliente ${clientName}?\n\nIsso irá gerar um relatório final em PDF e arquivar todas as lojas (removendo-as dos painéis diários, mas mantendo o histórico).`)) return;

    toast.loading(`Gerando relatório final de ${clientName}...`, { id: 'offboard' });

    try {
      const clientStores = stores.filter(s => s.client === clientName && !s.arquivada);
      if (clientStores.length === 0) throw new Error("Nenhuma loja ativa encontrada para este cliente.");

      const docPdf = new jsPDF();
      let totalAllTimeGmv = 0;
      let totalAllTimeAds = 0;
      let totalAllTimeOrders = 0;

      clientStores.forEach(s => {
        totalAllTimeGmv += parseSafeNumber(s.currentRevenue);
        totalAllTimeAds += parseSafeNumber(s.adsInvestment);
        totalAllTimeOrders += parseSafeNumber(s.orders);
        
        if (s.monthlyHistory) {
          s.monthlyHistory.forEach(h => {
            totalAllTimeGmv += parseSafeNumber(h.gmv);
            totalAllTimeAds += parseSafeNumber(h.adsInvestment || h.ads);
            totalAllTimeOrders += parseSafeNumber(h.orders);
          });
        }
      });

      docPdf.setFillColor(15, 23, 42); 
      docPdf.rect(0, 0, 210, 46, 'F'); 
      docPdf.setFontSize(22); docPdf.setTextColor(255, 255, 255); 
      docPdf.text(clientName.toUpperCase(), 14, 22);
      docPdf.setFontSize(9); docPdf.setTextColor(148, 163, 184); 
      docPdf.text('TERMO DE ENCERRAMENTO E RESULTADOS GLOBAIS', 14, 29); 
      docPdf.setTextColor(16, 185, 129);
      docPdf.text(`Data de Encerramento: ${new Date().toLocaleDateString('pt-BR')}`, 14, 35);

      docPdf.setFontSize(12); docPdf.setTextColor(75, 85, 99); 
      docPdf.text('Resumo de Todo o Período Operado:', 14, 60);
      
      docPdf.setFontSize(24); docPdf.setTextColor(59, 130, 246); 
      docPdf.text(formatCurrency(totalAllTimeGmv), 14, 72);
      
      docPdf.setFontSize(10); docPdf.setTextColor(107, 114, 128); 
      docPdf.text(`Pedidos Entregues: ${formatNumber(totalAllTimeOrders)}`, 14, 80);
      docPdf.text(`Investimento em Ads: ${formatCurrency(totalAllTimeAds)}`, 14, 86);
      docPdf.text(`ROAS Histórico: ${totalAllTimeAds > 0 ? (totalAllTimeGmv / totalAllTimeAds).toFixed(2) : 0}x`, 14, 92);

      docPdf.save(`Avante_Encerramento_${clientName.replace(/\s+/g, '_')}.pdf`);

      const batch = writeBatch(db);
      clientStores.forEach(s => {
        const storeRef = doc(db, 'stores', s.id.toString());
        batch.update(storeRef, {
          arquivada: true,
          dataEncerramento: new Date().toISOString(),
          statusAtendimento: 'encerrado'
        });
      });
      await batch.commit();

      toast.success(`Cliente ${clientName} encerrado e arquivado com sucesso!`, { id: 'offboard' });
    } catch (error) {
      console.error(error);
      toast.error("Erro no encerramento: " + error.message, { id: 'offboard' });
    }
  };

  const handleRestoreClient = async (clientName) => {
    if (!window.confirm(`Deseja reativar o cliente ${clientName}? Ele voltará para a operação ativa.`)) return;

    try {
      const batch = writeBatch(db);
      stores.forEach(s => {
        if (s.client === clientName && s.arquivada) {
          const storeRef = doc(db, 'stores', s.id.toString());
          batch.update(storeRef, {
            arquivada: false,
            statusAtendimento: 'ativo'
          });
        }
      });
      await batch.commit();
      toast.success(`Cliente ${clientName} restaurado para a operação ativa!`);
    } catch (error) {
      toast.error("Erro ao restaurar cliente: " + error.message);
    }
  };

  const closeMonth = () => {
    setIsCloseMonthModalOpen(true);
  };

  const executeCloseMonth = async (selectedMonthValue) => {
    const padronizado = normalizeMonthYear(selectedMonthValue);

    if (!window.confirm(`ATENÇÃO! Tem certeza que deseja FECHAR O MÊS de ${padronizado}?\n\n1. Os relatórios em PDF e Excel serão baixados.\n2. O histórico financeiro será salvo.\n3. O faturamento será zerado.\n4. As faturas de cobrança da agência serão geradas.`)) return;

    setIsCloseMonthModalOpen(false);
    toast.loading("Processando fechamento do mês, gravando histórico e gerando faturas...", { id: 'close-month' });

    try {
      const lojasParaFechar = stores.filter(s => !s.arquivada || (s.arquivada && Number(s.currentRevenue) > 0));

      await generateReports(lojasParaFechar, padronizado, { pdf: true, excel: true });
      
      const batch = writeBatch(db);
      const faturasPorCliente = {};

      const lojasAtivasPorCliente = {};
      lojasParaFechar.forEach(s => {
          lojasAtivasPorCliente[s.client] = (lojasAtivasPorCliente[s.client] || 0) + 1;
      });
      
      lojasParaFechar.forEach(store => {
        const storeRef = doc(db, 'stores', store.id.toString());
        
        const gmv = parseSafeNumber(store.currentRevenue);
        const feePercent = Number(store.feePercent) || 0;
        const fixedFee = Number(store.fixedFee) || 0;
        const isFixed = store.feeType === 'fixed' || fixedFee > 0;
        
        const clientStoresCount = lojasAtivasPorCliente[store.client] || 1;
        const agencyRevenue = isFixed ? (fixedFee / clientStoresCount) : gmv * (feePercent / 100);

        if (!faturasPorCliente[store.client]) {
            faturasPorCliente[store.client] = { valorTotalAgencia: 0 };
        }
        faturasPorCliente[store.client].valorTotalAgencia += agencyRevenue;

        const snapshot = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          month: padronizado, 
          gmv: gmv,
          adsInvestment: parseSafeNumber(store.adsInvestment),
          orders: parseSafeNumber(store.orders),               
          units: parseSafeNumber(store.units),
          agencyRevenue: agencyRevenue,
          feeType: store.feeType || 'percent',
          feePercent: feePercent,
          fixedFee: fixedFee,
          events: store.eventLogs || {},
          closedAt: new Date().toISOString()
        };

        const currentHistory = store.monthlyHistory || [];
        const newMonthlyHistory = [...currentHistory, snapshot];

        batch.update(storeRef, {
          monthlyHistory: newMonthlyHistory, 
          gmvBase: gmv, 
          currentRevenue: 0,
          orders: 0,
          units: 0,
          adsInvestment: 0,
          history: [], 
          eventLogs: deleteField(),
          updatedAt: new Date().toISOString()
        });
      });

      const vencimentoPadrao = new Date();
      vencimentoPadrao.setDate(vencimentoPadrao.getDate() + 10); 

      Object.keys(faturasPorCliente).forEach(clienteNome => {
          const valorFatura = faturasPorCliente[clienteNome].valorTotalAgencia;
          if (valorFatura > 0) {
              const faturaRef = doc(collection(db, 'financeiro_recebimentos'));
              batch.set(faturaRef, {
                  id: faturaRef.id,
                  cliente: clienteNome,
                  mesReferencia: padronizado,
                  valorAgencia: valorFatura,
                  status: 'Pendente',
                  dataEmissao: new Date().toISOString(),
                  dataVencimento: vencimentoPadrao.toISOString()
              });
          }
      });

      await batch.commit();
      toast.success("Mês fechado com sucesso! Relatórios baixados, histórico atualizado e Faturas geradas.", { id: 'close-month' });
      sendGlobalNotification(`Acaba de fechar o mês de ${padronizado} com sucesso! 🏆`, 'success');
    } catch (error) {
      console.error(error);
      toast.error("Erro fatal ao fechar o mês: " + error.message, { id: 'close-month' });
    }
  };

  const cleanStoreData = (store) => {
    const {
      gmvTarget, projectedGmv, percentReached, status, 
      reportGmv, reportAds, reportOrders, reportUnits, reportBase,
      ...pureStoreData
    } = store;
    return pureStoreData;
  };

  const exportBackup = () => {
    const backupData = {
      metadata: {
        version: "4.0",
        exportDate: new Date().toISOString(),
        type: "full_backup"
      },
      data: {
        stores: stores.map(cleanStoreData),
        teamMembers: teamMembers,
        settings: { globalGrowth: globalGrowth },
        internalTasks: internalTasks || []
      }
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `Avante_Backup_Completo_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
    URL.revokeObjectURL(url);
    
    toast.success('Backup completo (Lojas, Equipe e Configs) exportado com sucesso!');
  };

  const generateReports = async (targetStores, monthInput, formats = { pdf: true, excel: true }) => {
    const targetMonth = monthInput.toUpperCase();
    
    const dataGeracao = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

    // Determina o texto do período apurado
    let periodoApurado = `Período: ${targetMonth}`;

    // Agrupa as lojas para que cada cliente tenha seu próprio relatório
    const clientsGroup = {};
    
    const parseSafeNumber = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      
      const cleaned = String(val).replace(/[^\d.,-]/g, '');
      if (!cleaned) return 0;
      
      if (cleaned.includes(',')) {
          return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
      }
      
      return Number(cleaned) || 0;
  };

    const currentMonthBankFormat = normalizeMonthYear(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    const isCurrentMonth = targetMonth === currentMonthBankFormat;

    // Varre todas as lojas e organiza dentro do objeto clientsGroup
    targetStores.forEach(store => {
      const pastData = (store.monthlyHistory || []).find(h => h.month === targetMonth);
      let gmv = 0, ads = 0, orders = 0, units = 0, base = 0;
      let shouldInclude = false; // Flag para ignorar lojas fantasmas
      
      if (pastData) {
          // Cenário A: O mês pedido está salvo no histórico
          gmv = parseSafeNumber(pastData.gmv);
          ads = parseSafeNumber(pastData.adsInvestment || pastData.ads); 
          orders = parseSafeNumber(pastData.orders);
          units = parseSafeNumber(pastData.units);
          const histArray = store.monthlyHistory || [];
          const currentIndex = histArray.findIndex(h => h.id === pastData.id);
          base = currentIndex > 0 ? parseSafeNumber(histArray[currentIndex - 1].gmv) : 0;
          
          if (gmv > 0) shouldInclude = true; // Teve faturamento, vai pro PDF

      } else if (isCurrentMonth && !store.arquivada) {
          // Cenário B: Pediram o mês ATUAL. Lemos os dados em tempo real (apenas de lojas não arquivadas)
          gmv = parseSafeNumber(store.currentRevenue);
          ads = parseSafeNumber(store.adsInvestment);
          orders = parseSafeNumber(store.orders);
          units = parseSafeNumber(store.units);
          base = parseSafeNumber(store.gmvBase);
          
          if (gmv > 0) shouldInclude = true; // Tem faturamento no painel hoje, vai pro PDF
      }
      // Cenário C: Pediram um mês do passado onde a loja não existia. 'shouldInclude' fica false e ela é ignorada.

      if (shouldInclude) {
          const cName = store.client || 'Sem Cliente';
          if (!clientsGroup[cName]) clientsGroup[cName] = [];
          
          clientsGroup[cName].push({
             ...store, reportGmv: gmv, reportAds: ads, reportOrders: orders, reportUnits: units, reportBase: base
          });
      }
    });

    const clientNames = Object.keys(clientsGroup).sort();

    if (clientNames.length === 0) {
        toast.error(`Nenhuma loja registrou faturamento finalizado em ${targetMonth}.`);
        return;
    }

    if (formats.pdf) {
      for (const clientName of clientNames) {
        // Ordena as lojas do cliente da que mais faturou para a que menos faturou
        const clientStores = clientsGroup[clientName].sort((a, b) => b.reportGmv - a.reportGmv);
        
        // CHAMA A FUNÇÃO CORRETA DO ARQUIVO IMPORTADO!
        const docPdf = await generateMonthlyReportPDF(
          clientName, 
          clientStores, 
          periodoApurado, 
          dataGeracao, 
          formatCurrency, 
          formatNumber
        );
        
        // Faz o download do arquivo com o nome da B2X
        docPdf.save(`B2X_${clientName}_Relatorio_${monthInput.replace('/', '-')}.pdf`);
      }
    }
  };

  const handleCustomExport = async ({ json, pdf, excel, monthInput, showAgencyFee }) => {
    toast.loading("Gerando arquivos solicitados...", { id: 'custom-export' });
    try {
      if (json) {
        const customBackupData = {
          metadata: {
            version: "4.0",
            exportDate: new Date().toISOString(),
            type: "full_backup_ondemand"
          },
          data: {
            stores: stores.map(cleanStoreData)
          }
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customBackupData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `Avante_Backup_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      }

      if (pdf || excel) {
        await generateReports(stores, monthInput, { pdf, excel }, { showAgencyFee });
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
        
        // Validação Estrita: Rejeita qualquer coisa que não seja o padrão atual
        if (!imported.metadata || imported.metadata.version !== "4.0") {
          toast.error("O arquivo JSON não é um backup válido da versão atual (V4.0) do Avante HUB.");
          return;
        }

        const storesToImport = imported.data.stores || [];
        const teamToImport = imported.data.teamMembers || [];
        const settingsToImport = imported.data.settings || {};
        const internalTasksToImport = imported.data.internalTasks || [];

        // Confirmação de segurança
        if (storesToImport.length > 0) {
            if (!window.confirm(`ATENÇÃO: Você está prestes a restaurar ${storesToImport.length} lojas. Isso reescreverá o banco de dados atual. Deseja continuar?`)) {
                return e.target.value = null;
            }
        }

        const batch = writeBatch(db);
        
        // 1. Grava as lojas
        storesToImport.forEach(s => {
          const pureStore = cleanStoreData(s);
          batch.set(doc(db, "stores", pureStore.id.toString()), pureStore);
        });

        // 2. Grava a equipe
        teamToImport.forEach(member => {
          if (member.email) {
            batch.set(doc(db, "equipe", member.email.toLowerCase()), member);
          }
        });

        // 3. Grava configurações globais
        if (settingsToImport.globalGrowth !== undefined) {
          batch.set(doc(db, "settings", "global"), settingsToImport, { merge: true });
        }

        // 4. Grava tarefas internas da equipe
        if (internalTasksToImport.length > 0) {
           batch.set(doc(db, "settings", "internal_tasks"), { tasks: internalTasksToImport }, { merge: true });
        }

        // Executa todas as gravações no Firebase
        await batch.commit();
        toast.success("✅ Banco de dados restaurado e atualizado com sucesso!");
        
        // Atualiza a tela imediatamente
        if (storesToImport.length > 0) setStores(storesToImport);
        if (teamToImport.length > 0) setTeamMembers(teamToImport);
        if (internalTasksToImport.length > 0) setInternalTasks(internalTasksToImport);

      } catch (err) { 
        toast.error("Erro ao ler o arquivo JSON. O arquivo pode estar corrompido."); 
        console.error("Erro no importBackup:", err);
      } finally { 
        e.target.value = null; 
      }
    };
    fileReader.readAsText(file, "UTF-8");
  };

  const toggleClientExpansion = (c) => setExpandedClients(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const startEditingStore = (store) => { 
    setEditingStoreId(store.id); 
    setStoreEditData({ 
      store: store.store, 
      marketplace: store.marketplace || '', 
      gmvBase: store.gmvBase || 0,
      targetType: store.targetType || 'percent',
      customGrowth: store.customGrowth !== undefined && store.customGrowth !== null ? store.customGrowth : '',
      fixedGmvTarget: store.fixedGmvTarget || ''
    }); 
  };
  
  const saveStoreEdit = (id) => {
    const target = stores.find(s => s.id === id);
    
    if(target) {
      // 1. Montamos o objeto atualizado garantindo que não há undefined na raiz
      const updatedStore = {
        ...target, 
        store: (storeEditData.store || '').toUpperCase(), 
        marketplace: (storeEditData.marketplace || '').toUpperCase(), 
        gmvBase: Number(storeEditData.gmvBase) || 0,
        targetType: storeEditData.targetType || 'percent'
      };

      // 2. Tratamento seguro para as metas (Fixa ou Percentual)
      if (updatedStore.targetType === 'fixed') {
          updatedStore.fixedGmvTarget = Number(storeEditData.fixedGmvTarget) || 0;
          updatedStore.customGrowth = null; // Se a meta é fixa, anulamos a percentual
      } else {
          updatedStore.customGrowth = storeEditData.customGrowth !== '' ? Number(storeEditData.customGrowth) : null;
          updatedStore.fixedGmvTarget = null; // Se a meta é percentual, anulamos a fixa
      }

      // 3. Filtro de Segurança: Varre o objeto e remove qualquer vestígio de undefined
      Object.keys(updatedStore).forEach(key => {
          if (updatedStore[key] === undefined) {
              delete updatedStore[key];
          }
      });

      // 4. Salva na nuvem
      updateStoreInCloud(updatedStore);
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
    const monthlyByClient = {};

    const dataAtual = new Date();
    dataAtual.setMonth(dataAtual.getMonth() - 1);
    const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const mesPassadoExato = `${mesesNomes[dataAtual.getMonth()]}/${String(dataAtual.getFullYear()).slice(-2)}`;

    const processedStores = stores.map(store => {
      return enrichStoreMetrics(store, currentDay, daysInMonth, globalGrowth, clientGrowthMap, marketplaceGrowthMap);
    });

    const filteredStores = processedStores.filter(store => {
      if (showArchived ? !store.arquivada : store.arquivada) return false;
      
      const term = searchTerm ? searchTerm.toLowerCase() : '';
      const matchSearch = !term || 
        store.client.toLowerCase().includes(term) || 
        store.store.toLowerCase().includes(term) ||
        (store.checklists || []).some(task => task.texto.toLowerCase().includes(term)); // <-- BUSCA NAS TAREFAS!

      const matchStatus = statusFilter === 'all' || store.status === statusFilter;
      const matchMkt = mktFilter === 'all' || (store.marketplace && store.marketplace.toUpperCase() === mktFilter);
      
      return matchSearch && matchStatus && matchMkt; 
    });

    let absoluteCurrentRevenue = 0;
    let absoluteAgencyRevenue = 0;

    const groups = {};
    stores.forEach(s => {
      absoluteCurrentRevenue += Number(s.currentRevenue) || 0;
      const clientStoresCount = stores.filter(x => x.client === s.client).length || 1;
      const isFixed = s.feeType === 'fixed' || (Number(s.fixedFee) > 0);
      absoluteAgencyRevenue += isFixed ? (Number(s.fixedFee) / clientStoresCount) : (Number(s.currentRevenue) * (Number(s.feePercent) / 100));

      if (s.monthlyHistory) {
          s.monthlyHistory.forEach(hist => {
              let stdMonth = normalizeMonthYear(hist.month);
              
              if (!stdMonth.includes('/')) {
                  stdMonth = `${stdMonth}/${String(new Date().getFullYear()).slice(-2)}`;
              }

              if (!monthlyByClient[stdMonth]) monthlyByClient[stdMonth] = {};
              
              if (!monthlyByClient[stdMonth][s.client]) {
                  monthlyByClient[stdMonth][s.client] = { 
                      gmv: 0, 
                      isFixed: s.feeType === 'fixed' || (Number(s.fixedFee) > 0), 
                      fixedFee: Number(s.fixedFee) || 0, 
                      feePercent: Number(s.feePercent) || 0 
                  };
              }
              monthlyByClient[stdMonth][s.client].gmv += Number(hist.gmv) || 0;
          });
      }
    });

    filteredStores.forEach(s => {
      totalTarget += s.gmvTarget; 
      totalProjected += s.projectedGmv; 
      totalCurrentRevenue += (Number(s.currentRevenue) || 0); 
      totalGlobalAds += (s.adsInvestment || 0);
      totalOrders += (s.orders || 0);
      totalUnits += (s.units || 0);

      const mktName = s.marketplace ? s.marketplace.toUpperCase() : 'N/A';
      if (!mktPerformance[mktName]) mktPerformance[mktName] = { name: mktName, atual: 0, passado: 0 };
      
      mktPerformance[mktName].atual += (Number(s.currentRevenue) || 0);
      if (s.monthlyHistory && s.monthlyHistory.length > 0) {
          const prevData = s.monthlyHistory.find(h => h.month === mesPassadoExato);
          if (prevData) mktPerformance[mktName].passado += Number(prevData.gmv) || 0;
      }

      if (!groups[s.client]) groups[s.client] = { client: s.client, stores: [], totalGmvBase: 0, totalGmvTarget: 0, totalCurrentRevenue: 0, totalProjectedGmv: 0, totalAds: 0, totalOrders: 0, totalUnits: 0 };
      groups[s.client].stores.push(s);
      groups[s.client].totalGmvBase += s.gmvBase || 0; 
      groups[s.client].totalGmvTarget += s.gmvTarget;
      groups[s.client].totalCurrentRevenue += s.currentRevenue || 0; 
      groups[s.client].totalProjectedGmv += s.projectedGmv;
      groups[s.client].totalAds += s.adsInvestment || 0;
    });

    const groupedClients = Object.values(groups).map(g => {
      const p = g.totalGmvTarget > 0 ? (g.totalProjectedGmv / g.totalGmvTarget) * 100 : 0;
      const sampleStore = g.stores[0];
      const isFixed = sampleStore?.feeType === 'fixed' || (sampleStore?.fixedFee > 0);
      
      const groupAgencyTarget = isFixed ? Number(sampleStore.fixedFee) : g.totalGmvTarget * (Number(sampleStore.feePercent) / 100);
      agencyTarget += groupAgencyTarget;
      totalAgencyRevenueActual += isFixed ? Number(sampleStore.fixedFee) : g.totalCurrentRevenue * (Number(sampleStore.feePercent) / 100);
      totalAgencyRevenue += isFixed ? Number(sampleStore.fixedFee) : g.totalProjectedGmv * (Number(sampleStore.feePercent) / 100);

      return { ...g, percentReached: p, feeType: sampleStore?.feeType, feePercent: sampleStore?.feePercent, fixedFee: sampleStore?.fixedFee, status: p >= 95 ? 'success' : p >= 80 ? 'warning' : 'danger', roas: g.totalAds > 0 ? (g.totalCurrentRevenue / g.totalAds).toFixed(1) : 0, stores: g.stores };
    }).sort((a, b) => {
      if (sortBy === 'name') return a.client.localeCompare(b.client);
      if (sortBy === 'status') { const w = { danger: 1, warning: 2, success: 3 }; return w[a.status] - w[b.status]; }
      return b.totalCurrentRevenue - a.totalCurrentRevenue;
    });

    const globalHistoryAggregation = {};
    Object.entries(monthlyByClient).forEach(([month, clients]) => {
        let globalGmv = 0;
        let agencyRev = 0;
        
        Object.values(clients).forEach(clientData => {
            globalGmv += clientData.gmv;
            if (clientData.isFixed) {
                agencyRev += clientData.fixedFee; 
            } else {
                agencyRev += clientData.gmv * (clientData.feePercent / 100);
            }
        });
        
        globalHistoryAggregation[month] = { month, ReceitaGlobal: globalGmv, ReceitaAgencia: agencyRev };
    });

    const monthsOrder = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    let historicalChartData = Object.values(globalHistoryAggregation).sort((a, b) => {
        const [mA, yA] = a.month.split('/');
        const [mB, yB] = b.month.split('/');
        
        const yearA = parseInt(yA || String(new Date().getFullYear()).slice(-2), 10);
        const yearB = parseInt(yB || String(new Date().getFullYear()).slice(-2), 10);
        
        return (yearA * 100 + monthsOrder.indexOf(mA)) - (yearB * 100 + monthsOrder.indexOf(mB));
    });

    if (historicalChartData.length > 0) {
        const lastPastMonth = historicalChartData[historicalChartData.length - 1];
        lastPastMonth.ProjecaoGlobal = lastPastMonth.ReceitaGlobal;
        lastPastMonth.MetaGlobal = lastPastMonth.ReceitaGlobal;
        lastPastMonth.ProjecaoAgencia = lastPastMonth.ReceitaAgencia;
        lastPastMonth.MetaAgencia = lastPastMonth.ReceitaAgencia;
    }

    historicalChartData.push({
      month: 'Atual',
      ReceitaGlobal: absoluteCurrentRevenue, // Usa o valor absoluto imune ao arquivamento
      ReceitaAgencia: absoluteAgencyRevenue, // Usa o valor absoluto imune ao arquivamento
      ProjecaoGlobal: totalProjected,
      MetaGlobal: totalTarget,
      ProjecaoAgencia: totalAgencyRevenue,
      MetaAgencia: agencyTarget
    });

    return { 
      groupedClients, flatFilteredStores: filteredStores, totalTarget, totalProjected, totalCurrentRevenue, 
      totalAgencyRevenue, totalAgencyRevenueActual, agencyTarget, totalGlobalAds, totalOrders, totalUnits,
      globalRoas: totalGlobalAds > 0 ? (totalCurrentRevenue / totalGlobalAds).toFixed(1) : 0,
      globalCpa: totalUnits > 0 ? (totalGlobalAds / totalUnits) : 0,
      rankingMarketplaces: Object.values(mktPerformance).sort((a, b) => b.atual - a.atual),
      historicalChartData
    };
  }, [stores, globalGrowth, clientGrowthMap, marketplaceGrowthMap, daysInMonth, currentDay, searchTerm, sortBy, statusFilter, mktFilter, myName]);

  const pieData = useMemo(() => dashboardData.groupedClients.map(g => ({ name: g.client, value: g.totalProjectedGmv })).filter(g => g.value > 0), [dashboardData]);
  const roasData = useMemo(() => dashboardData.groupedClients.filter(g => g.totalAds > 0).map(g => ({ name: g.client, roas: Number(g.roas) })).sort((a, b) => b.roas - a.roas), [dashboardData]);

  const activeStore = useMemo(() => stores.find(s => s.id === activeStoreId), [stores, activeStoreId]);

  const broadcastTaskFocus = async (taskText, action = 'set', storeId = null, taskId = null) => {
    if (!myName) return;
    const updatedStatus = {};
    
    if (action === 'clear') {
      updatedStatus[myName] = deleteField();
    } else {
      updatedStatus[myName] = { 
        texto: taskText, 
        storeId: storeId,
        taskId: taskId, // <-- NOVO: Guardamos o ID exato da tarefa!
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
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: '',
          duration: 4000,
          style: {
            background: 'rgba(11, 15, 25, 0.95)', // Fundo escuro do painel
            backdropFilter: 'blur(10px)', // Efeito de vidro
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '16px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            maxWidth: '400px',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#000' },
            style: { border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 10px 40px rgba(16, 185, 129, 0.1)' }
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
            style: { border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 10px 40px rgba(239, 68, 68, 0.1)' }
          },
          loading: {
            style: { border: '1px solid rgba(99, 102, 241, 0.3)' }
          }
        }} 
      />
      
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
      
      <header className="sticky top-0 z-40 bg-[#0B0F19]/50 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="w-full px-3 md:px-6 2xl:px-12 mx-auto h-16 flex items-center justify-between gap-3 overflow-hidden flex-nowrap">
          
          {/* LOGO - Esconde o texto "AVANTE HUB" em monitores verticais/mobile */}
          <div className="flex items-center gap-3 shrink-0">
            <img src="/logo.jpg" alt="Avante HUB" className="h-8 md:h-9 w-auto object-contain rounded-lg shadow-sm shrink-0" />
            <div className="hidden xl:flex items-center gap-3">
              <span className="text-xl font-black text-white tracking-tighter">
                AVANTE<span className="text-indigo-500">HUB</span>
              </span>
              <span className="text-[10px] bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                v{CURRENT_VERSION}
              </span>
            </div>
          </div>

          {/* NAVEGAÇÃO - Dock centralizada. Textos só aparecem em monitor horizontal (xl) */}
          <nav className="flex items-center gap-1 xl:gap-1.5 bg-white/5 p-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-inner overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-1">
            
            <button onClick={() => setActiveView('feed_equipe')} className={`relative p-2 xl:px-4 xl:py-1.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shrink-0 ${activeView === 'feed_equipe' ? 'bg-blue-950 text-white shadow-md border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`} title="Feed da Equipe">
              <Activity size={18} className="shrink-0" /> <span className="hidden xl:inline">Feed</span>
            </button>

            {!isVisitante && (
              <>
                <button onClick={() => setActiveView('operacional')} className={`p-2 xl:px-4 xl:py-1.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shrink-0 ${activeView === 'operacional' ? 'bg-blue-950 text-white shadow-md border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`} title="Portfólio de Lojas">
                  <Briefcase size={18} className="shrink-0" /> <span className="hidden xl:inline">Portfólio</span>
                </button>
                <button onClick={() => setActiveView('dashboard')} className={`p-2 xl:px-4 xl:py-1.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shrink-0 ${activeView === 'dashboard' ? 'bg-blue-950 text-white shadow-md border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`} title="Dashboard Executivo">
                  <PieChartIcon size={18} className="shrink-0" /> <span className="hidden xl:inline">Dashboard</span>
                </button>
              </>
            )}

            {(!isVisitante && canEdit) && (
              <button 
                onClick={() => setActiveView('financeiro')} 
                className={`p-2 xl:px-4 xl:py-1.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shrink-0 ${activeView === 'financeiro' ? 'bg-green-900 text-green-100 shadow-md border border-green-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                title="Financeiro"
              >
                <DollarSign size={18} className="shrink-0" /> <span className="hidden xl:inline">Financeiro</span>
              </button>
            )}

            {isManager && (
              <button onClick={() => setActiveView('admin')} className={`p-2 xl:px-4 xl:py-1.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shrink-0 ${activeView === 'admin' ? 'bg-white/10 text-white shadow-md border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`} title="Gestão de Equipe">
                <Shield size={18} className="shrink-0" /> <span className="hidden xl:inline">Equipe</span>
              </button>
            )}
            
            {canAccessWarRoom && activeEvent && (() => {
              const evColor = activeEventStats.progress >= 100 ? 'emerald' : activeEventStats.progress >= 80 ? 'amber' : 'orange';
              const colorMap = {
                  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-500', textLight: 'text-emerald-400', hoverBg: 'hover:bg-emerald-500/30', activeBg: 'bg-emerald-600', activeBorder: 'border-emerald-500/50' },
                  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', textLight: 'text-amber-400', hoverBg: 'hover:bg-amber-500/30', activeBg: 'bg-amber-600', activeBorder: 'border-amber-500/50' },
                  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-500', textLight: 'text-orange-400', hoverBg: 'hover:bg-orange-500/30', activeBg: 'bg-orange-600', activeBorder: 'border-orange-500/50' }
              };
              const c = colorMap[evColor];

              return (
                <div className={`flex items-center gap-3 ${c.bg} border ${c.border} rounded-full p-1 pl-4 shadow-inner transition-colors duration-500`}>
                  <div className="hidden sm:flex flex-col justify-center cursor-pointer" onClick={() => setActiveView('war_room')}>
                    <span className={`text-[9px] ${c.text} font-bold uppercase tracking-wider leading-none flex items-center gap-1.5 mb-1`}>
                      <span className={`w-1.5 h-1.5 bg-${evColor}-500 rounded-full animate-pulse`}></span> {activeEvent.name}
                    </span>
                    <span className={`text-xs font-black ${c.textLight} leading-none`}>
                      {safeFormatCurrency(activeEventStats.gmv)}
                    </span>
                  </div>
                  <button onClick={() => setActiveView('war_room')} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeView === 'war_room' ? `${c.activeBg} text-white shadow-md border ${c.activeBorder}` : `${c.bg} ${c.textLight} ${c.hoverBg} border ${c.border}`}`}>
                    <Flame size={16} /> <span className="hidden md:inline">War Room</span>
                  </button>
                </div>
              );
            })()} 
          </nav>

          {/* PERFIL E AÇÕES - Esconde o nome do usuário em telas menores */}
          <div className="flex items-center gap-2 xl:gap-4 shrink-0">
            {canEdit && (
              <div className="hidden xl:flex gap-1 items-center shrink-0">
                <button onClick={() => setIsExportModalOpen(true)} className="text-orange-600 hover:text-orange-400 p-2 rounded-full hover:bg-orange-500/10 transition-all border border-transparent hover:border-orange-500/30" title="Exportar Relatórios">
                  <Download size={18} />
                </button>
                {isManager && (
                  <>
                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                    <input type="file" accept=".json" ref={fileInputRef} onChange={importBackup} className="hidden" />
                    <button onClick={() => fileInputRef.current.click()} className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700/50 transition-all border border-transparent hover:border-gray-600" title="Restaurar Backup">
                      <ArchiveRestore size={18} />
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 md:gap-2 xl:pl-4 xl:border-l border-white/10 shrink-0">
              <div className="flex items-center gap-2 bg-white/5 p-1 xl:py-1 xl:pl-1 xl:pr-4 rounded-full border border-white/10 backdrop-blur-md shadow-inner shrink-0 cursor-pointer">
                <div className={`w-8 h-8 xl:w-10 xl:h-10 rounded-full bg-gradient-to-br ${currentUserData?.avatarColor || 'from-indigo-500 to-purple-600'} flex items-center justify-center text-sm font-bold text-white shadow-md border border-white/20 overflow-hidden shrink-0`}>
                  {currentUserData?.avatarUrl ? (
                    <img src={currentUserData.avatarUrl} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    (currentUserData?.nomeCompleto || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden xl:block">
                  <p className="text-[11px] font-bold text-white leading-tight truncate max-w-[120px]">
                    {currentUserData?.nomeCompleto || 'Usuário'}
                  </p>
                  <p className="text-[9px] text-indigo-300 uppercase tracking-widest leading-tight">
                    {getVisualRole(currentUserData?.role)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={toggleShowValues} className="p-2 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-full text-gray-400 hover:text-white transition-all shadow-sm" title={showValues ? "Ocultar Valores Financeiros" : "Mostrar Valores Financeiros"}>
                  {showValues ? <Eye size={16} /> : <EyeOff size={16} className="text-amber-400" />}
                </button>
                <button onClick={() => setPasswordModalOpen(true)} className="hidden sm:block p-2 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-full text-gray-400 hover:text-white transition-all shadow-sm" title="Mudar Senha">
                  <Key size={16} />
                </button>
                <button onClick={handleLogout} className="p-2 bg-white/5 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 rounded-full text-gray-400 hover:text-red-400 transition-all shadow-sm" title="Sair">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </header>

      <main className="flex-1 w-full px-4 md:px-8 2xl:px-12 pt-6 relative mx-auto">
        <ErrorBoundary>
          {['dashboard', 'operacional', 'feed_equipe', 'financeiro', 'war_room'].includes(activeView) && (
            <div className="sticky top-[70px] md:top-20 z-30 bg-[#0B0F19]/80 backdrop-blur-xl p-3 xl:p-5 rounded-2xl xl:rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-6 w-full animate-in fade-in duration-300">
              <div className="flex items-center gap-3 justify-between w-full flex-nowrap overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar conta ou loja..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="w-full bg-black/20 border border-white/10 text-white rounded-xl py-2 pl-10 pr-4 outline-none focus:border-indigo-500 text-sm shadow-inner transition-all" 
                    />
                  </div>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="hidden md:block bg-black/20 border border-white/10 text-gray-300 rounded-xl py-2 px-3 text-sm font-medium outline-none cursor-pointer hover:bg-white/5 transition-all shadow-inner shrink-0">
                    <option value="name" className="bg-gray-900 text-white">Por Nome (A-Z)</option>
                    <option value="gmv" className="bg-gray-900 text-white">Faturamento</option>
                    <option value="status" className="bg-gray-900 text-white">Status</option>
                  </select>
                </div>

                <div className="flex flex-nowrap items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/10 shadow-inner shrink-0">
                  <div className="flex flex-nowrap gap-1 border-r border-white/10 pr-2 pl-1">
                      {['all', 'danger', 'warning', 'success'].map(f => (
                        <button key={f} onClick={() => setStatusFilter(f)} className={`p-1.5 rounded-lg shrink-0 transition-all ${statusFilter === f ? 'bg-white/10 text-white shadow-md' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                          {f === 'all' ? <Filter size={16}/> : f === 'danger' ? <AlertTriangle size={16}/> : f === 'warning' ? <Clock size={16}/> : <CheckCircle size={16}/>}
                        </button>
                      ))}
                  </div>

                  <select value={mktFilter} onChange={e => setMktFilter(e.target.value)} className="bg-transparent text-gray-300 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer hover:bg-white/5 transition-colors border-r border-white/10 shrink-0">
                    <option value="all" className="bg-gray-900 text-white">🛍️ CANAIS</option>
                    {uniqueMkts.map(m => <option key={m} value={m} className="bg-gray-900 text-white">{m}</option>)}
                  </select>
                </div>
                
                <div className="flex gap-2 items-center shrink-0">
                  <button 
                    onClick={() => { setSearchTerm(''); setSortBy('name'); setStatusFilter('all'); setMktFilter('all'); toast.success('Filtros resetados!'); }} 
                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 p-2 rounded-xl transition-colors shrink-0"
                    title="Limpar todos os filtros"
                  >
                    <Eraser size={16}/>
                  </button>

                  {currentUserData?.role !== 'Operacional' && !isVisitante && (
                    <button onClick={addNewStore} className="bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all shadow-md shrink-0">
                      <Plus size={16} /> <span className="hidden md:inline">Novo Cliente</span>
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}

          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-32 text-indigo-400">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
              <p className="font-bold text-lg animate-pulse">Carregando dados...</p>
            </div>
          }>

            {activeView === 'feed_equipe' && (
              <TeamFeedView 
                currentUserData={currentUserData} 
                user={user} 
                stores={dashboardData.flatFilteredStores}
                teamMembers={teamMembers}
                searchTerm={searchTerm}
                openTaskModal={(store) => { setActiveTaskStoreId(store.id); setTaskModalOpen(true); }}
                openBulkTaskModal={() => setBulkTaskModalOpen(true)}
                updateStoreInCloud={updateStoreInCloud}
                broadcastTaskFocus={broadcastTaskFocus}
                scheduledEvents={scheduledEvents}
                activeEvent={activeEvent}
                formatCurrency={safeFormatCurrency}
                scheduledVisits={scheduledVisits}
                handleVisitAction={handleVisitAction}
                canEdit={canEdit}
              />
            )}

            {activeView === 'dashboard' && (
              <ExecutiveDashboard 
                dashboardData={dashboardData} 
                formatCurrency={safeFormatCurrency} 
                formatNumber={safeFormatNumber}
                pieData={pieData}
                roasData={roasData} 
                COLORS={COLORS} 
                currentDay={currentDay} 
                daysInMonth={daysInMonth} 
                canEdit={canEdit}
                openGoalsModal={() => setIsGoalsModalOpen(true)}
                showValues={showValues}
              />
            )}
            
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
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                handleRestoreClient={handleRestoreClient}
                formatCurrency={safeFormatCurrency}
                formatNumber={safeFormatNumber}
                showValues={showValues} 
                currentDay={currentDay} 
                clientGrowthMap={clientGrowthMap}
                updateGlobalSettings={updateGlobalSettings}
                addNewStoreToClient={addNewStoreToClient}
                deleteStore={deleteStore} 
                deleteClient={deleteClient}
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
                openTaskModal={(storeRow) => { 
                  setActiveTaskStoreId(storeRow.id); 
                  setTaskModalOpen(true); 
                }}
              />
            )}

            {activeView === 'financeiro' && (
              <FinanceDashboard
                db={db} 
                dashboardData={dashboardData} 
                formatCurrency={safeFormatCurrency}
                canEdit={canEdit}
                teamMembers={teamMembers}
              />
            )}

            {activeView === 'war_room' && activeEvent && canAccessWarRoom && (
              <WarRoom 
                stores={dashboardData.flatFilteredStores} 
                setStores={setStores}
                updateStoreInCloud={updateStoreInCloud}
                formatCurrency={safeFormatCurrency}
                formatNumber={safeFormatNumber}
                canEdit={canEdit}
                activeEvent={activeEvent}
                onEndEvent={() => handleEventAction('end')}
                canAccessWarRoom={canAccessWarRoom}
                sortBy={sortBy}
                currentDay={currentDay}
              />
            )}
            
          </Suspense> 
          <br></br>
        </ErrorBoundary>
      </main>

      <footer className="w-full border-t border-white/5 bg-black/40 py-6 mt-auto shrink-0 z-20 relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8 2xl:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Logo completo da Ascentia */}
          <div className="flex items-center hover:cursor-pointer group">
            <img 
              src="/ascentia-icon.png" 
              alt="Ascentia Logo" 
              className="h-5 md:h-6 w-auto opacity-50 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all duration-500 object-contain"
            />
          </div>
          
          {/* Lado Direito: Textos do rodapé */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right">
            <p className="text-[11px] text-gray-500 font-medium">
              &copy; {new Date().getFullYear()} Ascentia Solutions. Todos os direitos reservados.
            </p>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-1">
              Desenvolvido para Alta Performance
            </p>
          </div>
        </div>
      </footer>

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

      <CloseMonthModal 
        isOpen={isCloseMonthModalOpen} 
        onClose={() => setIsCloseMonthModalOpen(false)} 
        onConfirm={executeCloseMonth} 
      />

      {historyModalOpen && (
      <StoreHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          store={activeStore}
          currentDay={currentDay}
          formatCurrency={safeFormatCurrency}
          formatNumber={safeFormatNumber}
          canEdit={canEdit}
        />
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
          sendGlobalNotification={sendGlobalNotification}
          onCopyTaskToBulk={(task) => {
              setBulkTaskInitialData(task);
              setBulkTaskModalOpen(true);
              setTaskModalOpen(false);
          }}
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
        onClose={() => {
            setBulkTaskModalOpen(false);
            setBulkTaskInitialData(null);
        }}
        initialData={bulkTaskInitialData}
        stores={stores.filter(store => !store.arquivada)} 
        onSave={handleSaveBulkTasks}
        teamMembers={teamMembers}
      />

      {clientFileOpen && (
        <ClientFileModal 
          clientGroup={activeClientGroup} 
          onClose={() => setClientFileOpen(false)}
          openTaskModal={(store) => { setActiveTaskStoreId(store.id); setTaskModalOpen(true); }}
          openHistoryModal={openHistoryModal}
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
          handleSaveIndividualEntry={handleSaveIndividualEntry}
          dashboardData={dashboardData}
          offboardClient={handleOffboardClient}
          daysInMonth={daysInMonth}
          globalGrowth={globalGrowth}
          clientGrowthMap={clientGrowthMap}
          marketplaceGrowthMap={marketplaceGrowthMap}
          broadcastTaskFocus={broadcastTaskFocus}
        />
      )}

      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        onExport={handleCustomExport}
        filterCount={dashboardData.flatFilteredStores.length}
        allowJson={isManager} 
      />

      <GoalsSettingsModal 
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        stores={dashboardData.flatFilteredStores}
        globalGrowth={globalGrowth}
        clientGrowthMap={clientGrowthMap}
        marketplaceGrowthMap={marketplaceGrowthMap}
        formatCurrency={formatCurrency}
        db={db}
        activeEvent={activeEvent}
        scheduledEvents={scheduledEvents}
        handleEventAction={handleEventAction}
      />
    </div>
  );
}

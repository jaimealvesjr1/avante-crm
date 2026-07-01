import React, { useState, useMemo } from 'react';
import { Flame, Clock, X, CheckSquare, History, StickyNote,
  PieChart as PieChartIcon, Zap, Target, Save, CopyPlus, TrendingUp, 
  TrendingDown, Edit2, Briefcase, Plus, LogOut, Activity, Package, 
  Image, Trash2, Copy, Eraser, Loader2, AlertCircle, FileText, Eye, EyeOff, Lock } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, 
  YAxis, CartesianGrid, LineChart, Line, ReferenceLine, ComposedChart, Area, Legend } from 'recharts';
import { toast } from 'react-hot-toast';
import BulkTaskModal from '../tasks/BulkTaskModal';
import { enrichStoreMetrics } from '../../utils/calculations';
import { processTaskCompletion, processTaskStart, processTaskPause, calculateNextAccess } from '../../utils/taskEngine';
import ProductDrawer from './components/ProductDrawer';
import ClientSidebar from './components/ClientSidebar';
import StoreEntryRow from './components/StoreEntryRow';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];
const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

export default function ClientFileModal({ 
  clientGroup, onClose, formatCurrency, stores, setStores, updateStoreInCloud, currentDay, 
  currentUserData, user, canUseBatchEntry, canEdit, teamMembers, 
  addNewStoreToClient, handleSaveIndividualEntry, dashboardData, offboardClient,
  daysInMonth, globalGrowth, clientGrowthMap, marketplaceGrowthMap, broadcastTaskFocus,
  openTaskModal, openHistoryModal, splitMode = 'center'
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBulkTaskModalOpen, setIsBulkTaskModalOpen] = useState(false);

  // Estados dos Produtos e Componente da Gaveta
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductData, setEditingProductData] = useState(null);
  const [showProductHistoryId, setShowProductHistoryId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null); 

  // Tarefas e Acessos
  const [newLog, setNewLog] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [newChecklistResp, setNewChecklistResp] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState('none');
  const [newTaskWeight, setNewTaskWeight] = useState('media');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskData, setEditTaskData] = useState({});
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [pendingStartInfo, setPendingStartInfo] = useState(null);

  const myName = currentUserData?.nomeCompleto || currentUserData?.nome;
  const isVisitante = currentUserData?.role === 'Visitante';
  const isAdmin = currentUserData?.role === 'Admin' || currentUserData?.role === 'admin' || currentUserData?.role === 'manager';
  const username = currentUserData?.nomeCompleto || currentUserData?.nome || currentUserData?.email?.split('@')[0] || 'Usuário';
  const teamNames = teamMembers?.map(m => m.nomeCompleto || m.nome || m.email.split('@')[0]).filter(Boolean) || [];

  const masterStore = useMemo(() => stores.find(s => s.client === clientGroup.client), [stores, clientGroup.client]);
  
  const clientProducts = useMemo(() => {
      const productsMap = new Map();
      stores.filter(s => s.client === clientGroup.client).forEach(s => {
          (s.produtos || []).forEach(p => {
              if (!productsMap.has(p.id)) productsMap.set(p.id, p);
          });
      });
      return Array.from(productsMap.values());
  }, [stores, clientGroup.client]);

  const calcularLucroOferta = (precoVenda, custoBase, quantidade) => {
    const venda = Number(precoVenda) || 0;
    const custoUnico = Number(custoBase) || 0;
    const qtdPares = Number(quantidade) || 1;
    if (venda === 0) return { valor: 0, margem: 0 };
    const custoTotal = custoUnico * qtdPares;
    const lucro = venda - custoTotal;
    const margem = (lucro / venda) * 100;
    return { valor: lucro, margem: margem };
  };

  // Funções de Gravação de Produtos chamadas pela ProductDrawer
  const handleSaveProduct = (productData, isEditing) => {
    if (!canEdit) return toast.error("Você não tem permissão para editar produtos.");
    const now = new Date().toLocaleString('pt-BR');
    let updatedProducts = [...clientProducts];
    const historyLog = { data: now, author: username, mudancas: [] };

    if (isEditing) {
      updatedProducts = updatedProducts.map(p => {
        if (p.id === productData.id) {
          if (p.custo !== productData.custo) historyLog.mudancas.push(`Custo alterado de R$${p.custo || '0'} para R$${productData.custo || '0'}`);
          if (JSON.stringify(p.canais) !== JSON.stringify(productData.canais)) historyLog.mudancas.push(`Tabela de preços dos canais foi atualizada`);
          return { ...productData, historico: historyLog.mudancas.length > 0 ? [historyLog, ...(p.historico || [])] : p.historico };
        }
        return p;
      });
      toast.success("Catálogo atualizado com sucesso!");
    } else {
      historyLog.mudancas.push("Produto adicionado ao catálogo.");
      const novoProduto = { ...productData, id: Date.now() + Math.random(), historico: [historyLog] };
      updatedProducts.push(novoProduto);
      toast.success("Produto cadastrado com sucesso!");
    }

    // NOVA LÓGICA DE GRAVAÇÃO: Atualiza TODAS as lojas do cliente para manter a sincronia perfeita no banco
    const clientStores = stores.filter(s => s.client === clientGroup.client);
    clientStores.forEach(s => {
        updateStoreInCloud({ ...s, produtos: updatedProducts });
    });
    setStores(stores.map(s => s.client === clientGroup.client ? { ...s, produtos: updatedProducts } : s));
    
    setProductModalOpen(false);
    setEditingProductData(null);
  };

  const handleDeleteProduct = (productId) => {
    if (!window.confirm("Deseja realmente excluir este produto do catálogo?")) return;
    const updatedProducts = clientProducts.filter(p => p.id !== productId);
    
    const clientStores = stores.filter(s => s.client === clientGroup.client);
    clientStores.forEach(s => {
        updateStoreInCloud({ ...s, produtos: updatedProducts });
    });
    setStores(stores.map(s => s.client === clientGroup.client ? { ...s, produtos: updatedProducts } : s));
    
    toast.success("Produto removido.");
  };

  const handleDuplicateProduct = (prod) => {
    if (!canEdit) return toast.error("Você não tem permissão.");
    let copyName = `${prod.descricao} (Cópia)`;
    let counter = 1;
    while (clientProducts.some(p => p.descricao.trim().toLowerCase() === copyName.toLowerCase())) {
      counter++;
      copyName = `${prod.descricao} (Cópia ${counter})`;
    }
    const historyLog = { data: new Date().toLocaleString('pt-BR'), author: username, mudancas: [`Produto duplicado a partir de "${prod.descricao}"`] };
    const newProduct = { ...prod, id: Date.now() + Math.random(), descricao: copyName, historico: [historyLog] };
    const updatedProducts = [...clientProducts, newProduct];
    
    const clientStores = stores.filter(s => s.client === clientGroup.client);
    clientStores.forEach(s => {
        updateStoreInCloud({ ...s, produtos: updatedProducts });
    });
    setStores(stores.map(s => s.client === clientGroup.client ? { ...s, produtos: updatedProducts } : s));
    
    toast.success("Produto duplicado!");
  };

  const abrirEdicaoProduto = (prod) => {
    let canaisAdaptados = (prod.canais || prod.precosCanais || []).map(c => {
      let ofertasAdaptadas = c.ofertas || [];
      if (ofertasAdaptadas.length === 0) {
        if (c.precoPor || c.preco || c.precoDe || prod.precoDe) {
            ofertasAdaptadas.push({ id: Date.now() + Math.random(), quantidade: 1, precoDe: c.precoDe || prod.precoDe || '', precoPor: c.precoPor || c.preco || '', lucro: c.lucro || '' });
        }
        (c.kits || []).forEach(k => {
            const match = k.descricao?.match(/(\d+)/);
            ofertasAdaptadas.push({ id: k.id || Date.now() + Math.random(), quantidade: match ? parseInt(match[0]) : 2, precoDe: k.precoDe || '', precoPor: k.precoPor || '', lucro: k.lucro || '' });
        });
        if (ofertasAdaptadas.length === 0) ofertasAdaptadas.push({ id: Date.now() + Math.random(), quantidade: 1, precoDe: '', precoPor: '', lucro: '' });
      } else {
        ofertasAdaptadas = ofertasAdaptadas.map(o => ({...o, lucro: o.lucro || ''}));
      }

      let obsDoCanal = c.observacoes || '';
      if (!obsDoCanal && prod.observacoes && (prod.canais || []).indexOf(c) === 0) obsDoCanal = prod.observacoes;

      return { id: c.id || Date.now() + Math.random(), canal: c.canal || 'Shopee', modalidade: c.modalidade || '', observacoes: obsDoCanal, ofertas: ofertasAdaptadas };
    });

    if (canaisAdaptados.length === 0) {
      canaisAdaptados.push({ id: Date.now(), canal: 'Shopee', modalidade: '', observacoes: prod.observacoes || '', ofertas: [{ id: Date.now()+1, quantidade: 1, precoDe: '', precoPor: '', lucro: '' }] });
    }

    let variacoesAdaptadas = prod.variacoes || [];
    if (variacoesAdaptadas.length === 0 && (prod.cores?.length > 0 || prod.tamanhos?.length > 0)) {
      variacoesAdaptadas = (prod.cores || []).map((c, i) => ({ id: Date.now() + i, cor: c, tamanhos: prod.tamanhos || [] }));
    }

    setEditingProductData({ ...prod, variacoes: variacoesAdaptadas, canais: canaisAdaptados });
    setProductModalOpen(true);
  };

  // Funções de Tarefas e Histórico (Mantidas iguaizinhas, ligadas ao masterStore)
  const allUniqueTasks = useMemo(() => {
    const taskSet = new Set();
    stores.forEach(s => {
      if (s.checklists) s.checklists.forEach(t => { if (t.texto && t.texto.trim().length > 3) taskSet.add(t.texto.trim()); });
    });
    return Array.from(taskSet);
  }, [stores]);

  const handleChecklistChange = (e) => {
    const val = e.target.value;
    setNewChecklist(val);
    if (val.trim().length >= 2) {
      const filtered = allUniqueTasks.filter(t => t.toLowerCase().includes(val.toLowerCase()) && t.toLowerCase() !== val.toLowerCase());
      setSuggestions(filtered.slice(0, 6)); 
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const addChecklist = () => {
    if (!newChecklist.trim()) return;
    setIsAddingTask(true);
    setShowSuggestions(false);
    const item = { id: Date.now(), texto: newChecklist, feita: false, responsavel: newChecklistResp.trim(), criadoPor: username, data: newTaskDate, hora: newTaskTime, recorrencia: newTaskRecurrence, peso: newTaskWeight };
    const updatedChecklists = [...(masterStore.checklists || []), item];
    const newNextAccess = calculateNextAccess(updatedChecklists);

    let updatedLogs = masterStore.taskLogs || [];
    const resp = newChecklistResp.trim();
    if (resp && resp !== username) {
        updatedLogs.push({ id: Date.now() + 1, data: new Date().toLocaleString('pt-BR'), texto: `📌 @${resp}, nova tarefa: "${newChecklist}"`, author: username });
    }

    updateStoreInCloud({ ...masterStore, checklists: updatedChecklists, taskLogs: updatedLogs, dataProximoAcesso: newNextAccess || masterStore.dataProximoAcesso || '' });
    setStores(stores.map(s => s.id === masterStore.id ? { ...masterStore, checklists: updatedChecklists, taskLogs: updatedLogs } : s));
    
    setTimeout(() => {
      setNewChecklist(''); setNewChecklistResp(''); setNewTaskDate(''); setNewTaskTime(''); setNewTaskRecurrence('none');
      setIsAddingTask(false);
      toast.success('Tarefa adicionada com sucesso!');
    }, 500);
  };

  const deleteChecklist = (id) => {
    const updatedChecklists = masterStore.checklists.filter(c => c.id !== id);
    updateStoreInCloud({ ...masterStore, checklists: updatedChecklists });
    setStores(stores.map(s => s.id === masterStore.id ? { ...masterStore, checklists: updatedChecklists } : s));
    toast.success('Tarefa removida!');
  };

  const toggleChecklist = (id) => {
    const task = masterStore.checklists.find(c => c.id === id);
    const isCompleting = !task.feita;
    
    let updatedChecklists = [...masterStore.checklists];
    let updatedLogs = masterStore.taskLogs || [];

    if (isCompleting) {
      const result = processTaskCompletion(masterStore, task, username);
      updatedChecklists = result.updatedChecklists;
      updatedLogs = [...updatedLogs, result.newLog];
      toast.success('✅ Tarefa concluída!');
    } else {
      updatedChecklists = updatedChecklists.map(c => c.id === id ? { ...c, feita: false } : c);
      toast.success('Tarefa reaberta!');
    }

    updateStoreInCloud({ ...masterStore, checklists: updatedChecklists, taskLogs: updatedLogs });
    setStores(stores.map(s => s.id === masterStore.id ? { ...masterStore, checklists: updatedChecklists, taskLogs: updatedLogs } : s));
  };

  const saveFixedNotes = () => {
    setIsSavingNotes(true);
    updateStoreInCloud({ ...masterStore, notasFixas: fixedNotes });
    setStores(stores.map(s => s.id === masterStore.id ? { ...masterStore, notasFixas: fixedNotes } : s));
    setTimeout(() => { setIsSavingNotes(false); toast.success('Lembretes fixos atualizados!'); }, 500);
  };

  const deleteFixedNotes = () => {
    if (window.confirm("Apagar todas as notas fixas desta conta?")) {
      setFixedNotes('');
      updateStoreInCloud({ ...masterStore, notasFixas: '' });
      setStores(stores.map(s => s.id === masterStore.id ? { ...masterStore, notasFixas: '' } : s));
      toast.success('Notas apagadas!');
    }
  };

  const confirmDuplication = () => {
    if (!duplicateTargetId) return toast.error("Selecione um destino.");
    const destinationStore = stores.find(s => s.id === Number(duplicateTargetId));
    if (!destinationStore) return;
    const updatedDestStore = { ...destinationStore, notasFixas: fixedNotes };
    updateStoreInCloud(updatedDestStore);
    setStores(stores.map(s => s.id === updatedDestStore.id ? updatedDestStore : s));
    toast.success(`Nota duplicada para ${destinationStore.store}!`);
    setIsDuplicating(false); setDuplicateTargetId('');
  };

  // --- Funções de Acesso da Conta ---
  const saveAcesso = () => {
    setIsSavingAcesso(true);
    updateStoreInCloud({ ...masterStore, acessoEmail, acessoSenha });
    setStores(stores.map(s => s.id === masterStore.id ? { ...masterStore, acessoEmail, acessoSenha } : s));
    setTimeout(() => { setIsSavingAcesso(false); toast.success('Credenciais salvas com sucesso!'); }, 500);
  };

  const handleCopy = (text, type) => {
    if (!text) return toast.error(`Nenhum ${type.toLowerCase()} para copiar.`);
    navigator.clipboard.writeText(text);
    toast.success(`${type} copiado para a área de transferência!`);
  };

  // --- CÁLCULOS DO DASHBOARD ---
  const liveStores = useMemo(() => {
    const rawClientStores = stores.filter(s => s.client === clientGroup.client && !s.arquivada);
    return rawClientStores.map(s => enrichStoreMetrics(s, currentDay, daysInMonth || 30, globalGrowth || 10, clientGrowthMap, marketplaceGrowthMap));
  }, [stores, clientGroup.client, currentDay, daysInMonth, globalGrowth, clientGrowthMap, marketplaceGrowthMap]);

  const clientUnfilteredStats = useMemo(() => {
    let currentRevenue = 0, adsInvestment = 0, orders = 0, units = 0, totalTarget = 0, projectedGmv = 0;
    liveStores.forEach(s => {
        currentRevenue += Number(s.currentRevenue) || 0;
        adsInvestment += Number(s.adsInvestment) || 0;
        orders += Number(s.orders) || 0;
        units += Number(s.units) || 0;
        totalTarget += s.gmvTarget || 0;
        projectedGmv += s.projectedGmv || 0;
    });
    const roas = adsInvestment > 0 ? (currentRevenue / adsInvestment).toFixed(2) : 0;
    return { currentRevenue, adsInvestment, orders, units, projectedGmv, totalTarget, roas };
  }, [liveStores]);

  const clientEvents = useMemo(() => {
    const events = {};
    liveStores.forEach(s => {
      if (s.eventLogs) {
        Object.entries(s.eventLogs).forEach(([eName, data]) => {
          if (!events[eName]) events[eName] = { gmv: 0, orders: 0, units: 0 };
          events[eName].gmv += Number(data.gmv) || 0;
          events[eName].orders += Number(data.orders) || 0;
          events[eName].units += Number(data.units) || 0;
        });
      }
    });
    return Object.entries(events).map(([name, stats]) => ({ name, ...stats }));
  }, [liveStores]);

  const mesPassadoExato = useMemo(() => {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      return `${meses[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
  }, []);

  const allTimeTotalGmv = useMemo(() => liveStores.reduce((acc, s) => acc + (Number(s.currentRevenue) || 0) + (s.monthlyHistory?.reduce((a, h) => a + (Number(h.gmv) || 0), 0) || 0), 0), [liveStores]);
  const lastMonthTotalGmv = useMemo(() => liveStores.reduce((acc, s) => acc + (s.monthlyHistory?.find(h => h.month === mesPassadoExato)?.gmv || 0), 0), [liveStores, mesPassadoExato]);
  const momGrowth = lastMonthTotalGmv > 0 ? ((clientUnfilteredStats.projectedGmv - lastMonthTotalGmv) / lastMonthTotalGmv) * 100 : 0;

  const shareEvolucao = useMemo(() => {
      const faturamentoGlobalAtual = dashboardData?.totalCurrentRevenue || 1; 
      const currentShare = (clientUnfilteredStats.currentRevenue / faturamentoGlobalAtual) * 100;
      const pastGlobalData = dashboardData?.historicalChartData?.find(h => h.month === mesPassadoExato);
      const pastShare = (pastGlobalData?.ReceitaGlobal || 1) > 1 ? (lastMonthTotalGmv / pastGlobalData.ReceitaGlobal) * 100 : 0;
      return { currentShare, pastShare, evolution: currentShare - pastShare };
  }, [dashboardData, clientUnfilteredStats, lastMonthTotalGmv, mesPassadoExato]);

  const consolidatedHistory = useMemo(() => {
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

    const historyMap = {};
    liveStores.forEach(store => {
      (store.monthlyHistory || []).forEach(h => {
        if (!historyMap[h.month]) historyMap[h.month] = { month: h.month, gmv: 0, ads: 0, orders: 0, units: 0, agencyRevenue: 0 };
        
        historyMap[h.month].gmv += parseSafeNumber(h.gmv);
        historyMap[h.month].ads += parseSafeNumber(h.adsInvestment || h.ads);
        historyMap[h.month].orders += parseSafeNumber(h.orders);
        historyMap[h.month].units += parseSafeNumber(h.units);
      });
    });
    const monthsOrder = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    return Object.values(historyMap).sort((a, b) => (parseInt(b.month.split('/')[1], 10) * 100 + monthsOrder.indexOf(b.month.split('/')[0])) - (parseInt(a.month.split('/')[1], 10) * 100 + monthsOrder.indexOf(a.month.split('/')[0])));
  }, [liveStores]);

  const clientDailyMetrics = useMemo(() => {
    const days = Array.from({ length: currentDay }, (_, i) => ({ day: i + 1, gmv: 0, isEvent: false }));
    liveStores.forEach(s => s.history?.forEach(h => { const d = days.find(x => x.day === h.day); if (d) d.gmv += Number(h.dailyRevenue) || 0; }));
    const avgGmv = currentDay > 0 ? days.reduce((a, d) => a + d.gmv, 0) / currentDay : 0;
    days.forEach(d => { if (d.gmv > avgGmv * 1.5) d.isEvent = true; });
    return { days, avgGmv, dailyTargetAvg: (daysInMonth || 30) > 0 ? (clientUnfilteredStats.totalTarget || 0) / (daysInMonth || 30) : 0 };
  }, [liveStores, currentDay, daysInMonth, clientUnfilteredStats.totalTarget]);

  const clientHistoricalChartData = useMemo(() => {
    if (!consolidatedHistory || consolidatedHistory.length === 0) return [];
    const pastData = [...consolidatedHistory].reverse().map(h => ({ month: h.month, Faturamento: h.gmv, Projecao: null, Meta: null }));
    pastData.push({ month: 'Atual', Faturamento: clientUnfilteredStats.currentRevenue, Projecao: clientUnfilteredStats.projectedGmv, Meta: clientUnfilteredStats.totalTarget });
    if (pastData.length > 1) { pastData[pastData.length - 2].Projecao = pastData[pastData.length - 2].Faturamento; pastData[pastData.length - 2].Meta = pastData[pastData.length - 2].Faturamento; }
    return pastData;
  }, [consolidatedHistory, clientUnfilteredStats]);

  const [isEditingContract, setIsEditingContract] = useState(false);
  const [contractForm, setContractForm] = useState({ feeType: clientGroup?.feeType || 'percent', feePercent: clientGroup?.feePercent || 0, fixedFee: clientGroup?.fixedFee || 0 });

  const handleSaveContract = () => {
    if (!canEdit) return toast.error("Sem permissão.");
    let updatedStoresGlobal = [...stores];
    liveStores.forEach(store => {
      const updatedStore = { ...store, feeType: contractForm.feeType, feePercent: Number(contractForm.feePercent) || 0, fixedFee: contractForm.feeType === 'percent' ? 0 : (Number(contractForm.fixedFee) || 0) };
      updateStoreInCloud(updatedStore);
      updatedStoresGlobal = updatedStoresGlobal.map(s => s.id === store.id ? updatedStore : s);
    });
    setStores(updatedStoresGlobal);
    setIsEditingContract(false);
    toast.success("Contrato atualizado com sucesso!");
  };

  const clientOpenTasks = useMemo(() => {
    const open = [];
    liveStores.forEach(store => store.checklists?.forEach(task => { if (!task.feita) open.push({ ...task, storeName: store.store, storeId: store.id }); }));
    return open.sort((a, b) => new Date(`${a.data || '2099-01-01'}T${a.hora || '00:00'}`) - new Date(`${b.data || '2099-01-01'}T${b.hora || '00:00'}`));
  }, [liveStores]);

  if (!clientGroup) return null;

  const activeMarketplaces = useMemo(() => new Set(liveStores.map(s => s.marketplace?.toLowerCase().trim() === 'tiktok' ? 'tiktok shop' : s.marketplace?.toLowerCase().trim()).filter(Boolean)), [liveStores]);
  const pieData = useMemo(() => liveStores.map(s => ({ name: s.store, value: s.currentRevenue || 0 })).filter(s => s.value > 0), [liveStores]);
  const roasData = useMemo(() => liveStores.map(s => ({ name: s.store, roas: s.adsInvestment > 0 ? Number((s.currentRevenue / s.adsInvestment).toFixed(1)) : 0 })).sort((a, b) => b.roas - a.roas), [liveStores]);
  const clientMktData = useMemo(() => {
    const mktMap = {};
    liveStores.forEach(s => { const mkt = s.marketplace ? s.marketplace.toUpperCase() : 'N/A'; if (!mktMap[mkt]) mktMap[mkt] = { name: mkt, revenue: 0 }; mktMap[mkt].revenue += (Number(s.currentRevenue) || 0); });
    return Object.values(mktMap).sort((a, b) => b.revenue - a.revenue);
  }, [liveStores]);

  const clientHistoryLogs = useMemo(() => {
    const allLogs = [];
    liveStores.forEach(store => store.taskLogs?.forEach(log => allLogs.push({ ...log, storeName: store.store, storeId: store.id })));
    return allLogs.sort((a, b) => b.id - a.id);
  }, [liveStores]);

  const potentialMarketplaces = useMemo(() => liveStores[0]?.potentialMarketplaces || [], [liveStores]);
  
  const togglePotentialMarketplace = (mkt) => {
    if (!canUseBatchEntry || activeMarketplaces.has(mkt)) return; 
    let newPotentials = potentialMarketplaces.includes(mkt) ? potentialMarketplaces.filter(p => p !== mkt) : [...potentialMarketplaces, mkt];
    let updatedStoresGlobal = [...stores];
    liveStores.forEach(store => {
      const updatedStore = { ...store, potentialMarketplaces: newPotentials };
      updateStoreInCloud(updatedStore);
      updatedStoresGlobal = updatedStoresGlobal.map(s => s.id === store.id ? updatedStore : s);
    });
    setStores(updatedStoresGlobal);
  };

  const glassTooltipStyle = { backgroundColor: 'rgba(11, 15, 25, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' };
  const INTERNAL_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
      <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
        <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col relative">
        
        {/* CABEÇALHO DO MODAL GERAL */}
        <div className="p-6 border-b border-white/10 bg-black/20 flex flex-col gap-5 shrink-0">
          <div className="flex justify-between items-start">          
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-inner shrink-0">
                  <Briefcase size={28} className="text-indigo-400" />
                </div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h2 className="text-2xl font-bold text-white uppercase tracking-wide">{clientGroup.client}</h2>
                    {isEditingContract ? (
                      <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-indigo-500/30 animate-in fade-in flex-wrap">
                        <select value={contractForm.feeType} onChange={e => setContractForm({...contractForm, feeType: e.target.value})} className="bg-gray-800 text-white text-xs rounded p-1.5 outline-none border border-gray-600 focus:border-indigo-500">
                          <option value="percent">Percentual (%)</option>
                          <option value="fixed">Fixo Mensal (R$)</option>
                        </select>
                        {contractForm.feeType === 'percent' ? (
                          <div className="flex items-center gap-1">
                            <input type="number" value={contractForm.feePercent} onChange={e => setContractForm({...contractForm, feePercent: e.target.value})} className="bg-gray-800 text-white text-xs rounded p-1.5 w-16 outline-none border border-gray-600 focus:border-indigo-500" step="0.1" />
                            <span className="text-gray-400 text-xs font-bold">%</span>
                          </div>
                        ) : (
                          <input type="number" value={contractForm.fixedFee} onChange={e => setContractForm({...contractForm, fixedFee: e.target.value})} className="bg-gray-800 text-white text-xs rounded p-1.5 w-24 outline-none border border-gray-600 focus:border-indigo-500" placeholder="R$" />
                        )}
                        <button onClick={handleSaveContract} className="bg-green-600 hover:bg-green-500 text-white p-1.5 rounded transition-colors shadow-sm ml-1" title="Salvar Contrato"><Save size={14} /></button>
                        <button onClick={() => setIsEditingContract(false)} className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded transition-colors" title="Cancelar"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="bg-indigo-500/10 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-md border border-indigo-500/20 shadow-sm">
                          {clientGroup.feeType === 'fixed' ? `Fixo: ${formatCurrency(clientGroup.fixedFee)}` : `Fee: ${clientGroup.feePercent}%`}
                        </span>
                        {canEdit && (
                          <button onClick={() => { setContractForm({ feeType: clientGroup.feeType || 'percent', feePercent: clientGroup.feePercent || 0, fixedFee: clientGroup.fixedFee || 0 }); setIsEditingContract(true); }} className="opacity-0 group-hover:opacity-100 p-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-indigo-400 rounded-md transition-all">
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors ml-4 shrink-0">
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <PieChartIcon size={16} /> Visão Geral
            </button>
            <button onClick={() => setActiveTab('produtos')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'produtos' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <Package size={16} /> Catálogo de Produtos
            </button>
            <button onClick={() => setActiveTab('historico')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'historico' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <History size={16} /> Histórico & Tarefas
            </button>
            <button onClick={() => setActiveTab('apuracao')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'apuracao' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <Zap size={16} /> Lançamento Parcial
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-transparent flex flex-col lg:flex-row gap-6">
          
          {/* LADO ESQUERDO DO CONTEÚDO (Abas) */}
          <div className="flex-1 space-y-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in">
                {/* BLOCO DE EVENTOS DA WAR ROOM */}
                {clientEvents.length > 0 && (
                    <div className="bg-gradient-to-r from-orange-600/10 to-black/20 rounded-2xl p-5 border border-orange-500/20 shadow-sm">
                        <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Flame size={14}/> Eventos do Mês Ativos</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {clientEvents.map((ev, i) => (
                                <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 shadow-sm hover:border-orange-500/30 transition-colors">
                                    <h4 className="font-bold text-white mb-2 text-sm">{ev.name}</h4>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">GMV Gerado:</span>
                                        <span className="font-bold text-emerald-400">{formatCurrency(ev.gmv)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Volume:</span>
                                        <span className="font-bold text-gray-300">{ev.orders} ped ({ev.units} un)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grid de Cartões de Resumo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                  <div className="sm:col-span-2 bg-gradient-to-r from-indigo-900/20 to-black/20 p-5 rounded-2xl border border-indigo-500/20 shadow-sm flex flex-col justify-center">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                      <div className="flex-1 w-full">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Faturamento Histórico</span>
                        <p className="text-2xl font-bold text-indigo-300 mt-1">{formatCurrency(allTimeTotalGmv)}</p>
                        <p className="text-xs text-gray-400 mt-1">Acumulado de todos os meses</p>
                      </div>
                      <div className="w-px h-12 bg-white/10 hidden sm:block"></div>
                      <div className="flex-1 w-full sm:pl-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Neste mês</span>
                        <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(clientUnfilteredStats.currentRevenue)}</p>
                        <p className="text-xs text-gray-400 mt-1">Meta Global: {formatCurrency(clientUnfilteredStats.totalTarget)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Evolução Mensal</span>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-2xl font-bold ${momGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {momGrowth > 0 ? '+' : ''}{momGrowth.toFixed(1)}%
                      </p>
                      {momGrowth >= 0 ? <TrendingUp size={20} className="text-emerald-400" /> : <TrendingDown size={20} className="text-rose-400" />}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Mês anterior: {formatCurrency(lastMonthTotalGmv)}</p>
                  </div>

                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Investimento Ads & Eficiência</span>
                    <p className="text-2xl font-bold text-amber-500 mt-1">{formatCurrency(clientUnfilteredStats.adsInvestment)}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">ROAS: <span className="text-white text-xs">{clientUnfilteredStats.roas} x</span></p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">CPA: <span className="text-rose-400 text-xs">{formatCurrency(clientUnfilteredStats.units > 0 ? clientUnfilteredStats.adsInvestment / clientUnfilteredStats.units : 0)}</span></p>
                    </div>
                  </div>

                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Share na Carteira</span>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-2xl font-bold ${shareEvolucao.evolution >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                        {shareEvolucao.currentShare.toFixed(1)}%
                      </p>
                      {shareEvolucao.evolution >= 0 ? <TrendingUp size={20} className="text-indigo-400" /> : <TrendingDown size={20} className="text-rose-400" />}
                    </div>
                    <div className="flex flex-col mt-3 pt-3 border-t border-white/10 gap-1.5">
                      <p className="text-[10px] text-gray-400 flex justify-between">Mês passado: <span className="text-gray-300 font-bold">{shareEvolucao.pastShare.toFixed(1)}%</span></p>
                    </div>
                  </div>
                </div>

                {/* GRÁFICOS: LINHA 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-sm">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Zap size={16} className="text-amber-400" /> Eficiência de Ads</h3>
                    <div className="h-64">
                      {roasData.filter(d => d.roas > 0).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={roasData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={80} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.01)' }} contentStyle={glassTooltipStyle} formatter={(value) => `${value}x`} />
                            <Bar dataKey="roas" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <p className="text-gray-500 text-center mt-20 text-sm">Sem dados registrados.</p>}
                    </div>
                  </div>

                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-sm">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Target size={16} className="text-rose-400"/> Faturamento por Canal</h3>
                    <div className="h-64 w-full">
                      {clientMktData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={clientMktData} layout="vertical" margin={{ left: 0, right: 15, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} vertical={true} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={100} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={glassTooltipStyle} formatter={(value) => formatCurrency(value)} />
                            <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={16}>
                              {clientMktData.map((entry, index) => <Cell key={`cell-${index}`} fill={INTERNAL_COLORS[index % INTERNAL_COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <p className="text-gray-500 text-center mt-10 text-sm">Sem faturamento.</p>}
                    </div>
                  </div>

                  <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4 shrink-0">
                      <TrendingUp size={16} className="text-blue-400"/>
                      <h3 className="text-sm font-bold text-white tracking-wide">Evolução Histórica</h3>
                    </div>
                    <div className="flex-1 w-full relative h-[250px]">
                      {clientHistoricalChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={clientHistoricalChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <XAxis dataKey="month" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={glassTooltipStyle} formatter={(value, name) => [formatCurrency(value), name]} />
                            <Area type="monotone" dataKey="Faturamento" stroke="#3B82F6" strokeWidth={2} fillOpacity={0.2} fill="#3B82F6" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : <div className="flex items-center justify-center h-full text-gray-500 text-xs">Sem dados históricos.</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'apuracao' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-black/40 text-gray-400 text-[10px] uppercase tracking-wider border-b border-white/5">
                      <tr>
                        <th className="p-4">Loja / Canal</th>
                        <th className="p-4">Dia Final</th>
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
                          formatCurrency={formatCurrency} 
                          openTaskModal={openTaskModal}
                          openHistoryModal={openHistoryModal}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'historico' && (
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mt-4 animate-in fade-in">
                <div className="xl:col-span-3 flex flex-col gap-6">
                  <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/5 flex flex-col shadow-sm flex-1">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2"><History size={16} className="text-gray-400"/> Linha do Tempo</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar border-l-2 border-gray-800 ml-2 pl-4 space-y-4">
                      {clientHistoryLogs.map(log => (
                        <div key={log.id} className="relative">
                          <div className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                          <div className="text-[10px] font-bold text-indigo-400">{log.storeName}</div>
                          <div className="text-[9px] text-gray-500 mb-1">{log.data} por {log.author}</div>
                          <div className="bg-gray-900/80 p-3 rounded-xl border border-white/5 text-xs text-gray-300">{log.texto}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-2 bg-white/[0.02] p-5 rounded-3xl border border-white/5 flex flex-col shadow-sm max-h-[900px]">
                  <div className="flex flex-col gap-4 mb-4 border-b border-white/5 pb-4">
                    <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-3"><CheckSquare size={16} className="text-amber-400"/> Tarefas Pendentes</h4>
                    <div className="flex flex-col gap-2 relative">
                      <input type="text" value={newChecklist} onChange={handleChecklistChange} onKeyDown={e => { if(e.key==='Enter') addChecklist(); }} onFocus={() => { if(suggestions.length) setShowSuggestions(true); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="O que precisa ser feito?" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-indigo-500" />
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute top-12 left-0 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50">
                          {suggestions.map((sug, idx) => <li key={idx} onMouseDown={() => { setNewChecklist(sug); setShowSuggestions(false); }} className="px-4 py-2 text-sm text-gray-300 hover:bg-indigo-600 hover:text-white cursor-pointer">{sug}</li>)}
                        </ul>
                      )}
                      <button onClick={addChecklist} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2"><Plus size={16}/> Adicionar Tarefa</button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[500px] custom-scrollbar">
                    {masterStore.checklists?.filter(t => !t.feita).map(task => (
                      <div key={task.id} className="bg-gray-900/50 p-3 rounded-xl border border-white/5 flex gap-3 group">
                        <button onClick={() => toggleChecklist(task.id)} className="mt-0.5 text-gray-500 hover:text-emerald-400 transition-colors shrink-0">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-500 group-hover:border-emerald-400"></div>
                        </button>
                        <div className="flex-1">
                          <p className="text-xs text-gray-300 mb-1 leading-snug">{task.texto}</p>
                          {task.responsavel && <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Para: <span className="text-indigo-400">{task.responsavel}</span></p>}
                        </div>
                        <button onClick={() => deleteChecklist(task.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'produtos' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 shadow-sm">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Package size={20} className="text-indigo-400"/> Catálogo Oficial</h3>
                    <p className="text-xs text-gray-400 mt-1">Gerencie produtos e tabela de preços.</p>
                  </div>
                  {canEdit && (
                    <button onClick={() => { setProductModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md flex items-center gap-2"><Plus size={16}/> Adicionar Produto</button>
                  )}
                </div>

                {clientProducts.length === 0 ? (
                  <div className="text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl">
                    <Package size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400 font-bold">Nenhum produto cadastrado.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {clientProducts.map(prod => (
                      <div key={prod.id} className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col group relative">
                        <div className="h-40 bg-gray-900 flex items-center justify-center border-b border-white/5 relative shrink-0">
                          {prod.fotoUrl ? <img src={prod.fotoUrl} alt={prod.descricao} className="w-full h-full object-cover opacity-80" /> : <Image size={32} className="text-gray-600" />}
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h4 className="font-bold text-white text-sm leading-snug mb-1">{prod.descricao}</h4>
                          <span className="text-[10px] text-emerald-400 font-bold mb-3 block">Custo: R$ {prod.custo || '0.00'}</span>
                          <button onClick={() => abrirEdicaoProduto(prod)} className="mt-auto w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 border border-white/10"><Edit2 size={12}/> Gerenciar Preços</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProductDrawer 
        isOpen={productModalOpen} 
        onClose={() => setProductModalOpen(false)} 
        initialData={editingProductData} 
        onSave={handleSaveProduct} 
      />
    </div>
  );
}

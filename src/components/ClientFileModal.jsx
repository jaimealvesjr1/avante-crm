import React, { useState, useMemo } from 'react';
import { Flame, Clock, X, CheckSquare, ClipboardList, History, 
  PieChart as PieChartIcon, Zap, Target, Save, CopyPlus, TrendingUp, 
  TrendingDown, Edit2, Briefcase, Plus, LogOut, Activity, Package, 
  Image, MoreVertical, Trash2, Upload } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, 
  YAxis, CartesianGrid, LineChart, Line, ReferenceLine, ComposedChart, Area, Legend } from 'recharts';
import { toast } from 'react-hot-toast';
import BulkTaskModal from './BulkTaskModal';
import { enrichStoreMetrics } from '../utils/calculations';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];
const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

const StoreEntryRow = ({ store, handleSaveIndividualEntry, formatCurrency }) => {
    const lastDayRecorded = store.history && store.history.length > 0 
        ? Math.max(...store.history.map(h => h.day)) 
        : 0;
    
    const [day, setDay] = useState(lastDayRecorded < 31 ? lastDayRecorded + 1 : 31);
    const [rev, setRev] = useState(store.currentRevenue || '');
    const [ord, setOrd] = useState(store.orders || '');
    const [uni, setUni] = useState(store.units || '');
    const [ads, setAds] = useState(store.adsInvestment || '');
    const [isSaving, setIsSaving] = useState(false);

    const onSave = async () => {
        if (!day || rev === '') return toast.error("Dia e Faturamento são obrigatórios.");
        setIsSaving(true);

        const numRev = Number(String(rev).replace(',', '.'));
        const numAds = Number(String(ads).replace(',', '.')) || 0;
        const numOrd = Number(ord) || 0;
        const numUni = Number(uni) || 0;

        await handleSaveIndividualEntry(store.id, day, numRev, numAds, numOrd, numUni);
        setDay(prev => prev < 31 ? Number(prev) + 1 : 31);
        setIsSaving(false);
    };

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <td className="p-4">
                <div className="flex items-center gap-2">
                    <div>
                        <div className="font-bold text-gray-200 truncate max-w-[150px]" title={store.store}>{store.store}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{store.marketplace || 'Marketplace'}</div>
                    </div>
                </div>
            </td>
            <td className="p-3">
                <input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className="w-16 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white text-center font-bold outline-none focus:border-amber-500 shadow-inner" />
            </td>
            <td className="p-3">
                <input type="text" value={rev} onChange={e => setRev(e.target.value)} placeholder="0.00" className="w-24 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-blue-400 font-bold outline-none focus:border-blue-500 shadow-inner" />
            </td>
            <td className="p-3">
                <input type="number" value={ord} onChange={e => setOrd(e.target.value)} placeholder="0" className="w-16 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500 shadow-inner" />
            </td>
            <td className="p-3">
                <input type="number" value={uni} onChange={e => setUni(e.target.value)} placeholder="0" className="w-16 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-purple-400 font-bold outline-none focus:border-purple-500 shadow-inner" />
            </td>
            <td className="p-3">
                <input type="text" value={ads} onChange={e => setAds(e.target.value)} placeholder="0.00" className="w-24 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-amber-400 font-bold outline-none focus:border-amber-500 shadow-inner" />
            </td>
            <td className="p-4 text-right">
                <button onClick={onSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors">
                    {isSaving ? '⏳' : 'Salvar'}
                </button>
            </td>
        </tr>
    );
};

export default function ClientFileModal({ 
  clientGroup, onClose, openTaskModal, formatCurrency, stores, setStores, updateStoreInCloud, currentDay, 
  currentUserData, user, canUseBatchEntry, canEdit, teamMembers, allNotes, clientStores, onUpdateStore, 
  addNewStoreToClient, handleSaveIndividualEntry, dashboardData, offboardClient,
  daysInMonth, globalGrowth, clientGrowthMap, marketplaceGrowthMap
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isBulkTaskModalOpen, setIsBulkTaskModalOpen] = useState(false);


  // === ESTADOS PARA PRODUTOS ===
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [showProductHistoryId, setShowProductHistoryId] = useState(null);
  
  const [productForm, setProductForm] = useState({
    fotoUrl: '', descricao: '', 
    canais: [{ id: Date.now(), canal: 'Shopee', precoDe: '', precoPor: '', kits: [] }]
  });

  const username = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Usuário';

  // Usamos a primeira loja do cliente como "hospedeira" do catálogo de produtos
  const masterStore = useMemo(() => {
    return stores.find(s => s.client === clientGroup.client);
  }, [stores, clientGroup.client]);

  const clientProducts = useMemo(() => {
    return masterStore?.produtos || [];
  }, [masterStore]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300; // Tamanho máximo para thumbnail
        const scaleSize = MAX_WIDTH / img.width;
        
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        
        setProductForm({...productForm, fotoUrl: compressedBase64});
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = () => {
    if (!productForm.descricao.trim()) return toast.error("A descrição do produto é obrigatória.");
    if (!canEdit) return toast.error("Você não tem permissão para editar produtos.");

    const now = new Date().toLocaleString('pt-BR');
    let updatedProducts = [...clientProducts];
    const historyLog = { data: now, author: username, mudancas: [] };

    if (editingProductId) {
      updatedProducts = updatedProducts.map(p => {
        if (p.id === editingProductId) {
          // --- AUDITORIA ---
          productForm.canais.forEach(novoCanal => {
            const canalAntigo = (p.canais || []).find(c => c.id === novoCanal.id);
            if (!canalAntigo) {
              historyLog.mudancas.push(`Novo canal ativado: ${novoCanal.canal} por R$${novoCanal.precoPor}`);
            } else if (canalAntigo.precoPor !== novoCanal.precoPor) {
              historyLog.mudancas.push(`Preço (${novoCanal.canal}): de R$${canalAntigo.precoPor} para R$${novoCanal.precoPor}`);
            }
          });

          return { ...productForm, id: p.id, historico: historyLog.mudancas.length > 0 ? [historyLog, ...(p.historico || [])] : p.historico };
        }
        return p;
      });
      toast.success("Catálogo atualizado!");
    } else {
      const novoProduto = { ...productForm, id: Date.now() + Math.random(), historico: [historyLog] };
      updatedProducts.push(novoProduto);
      toast.success("Produto adicionado!");
    }

    const updatedMaster = { ...masterStore, produtos: updatedProducts };
    updateStoreInCloud(updatedMaster);
    
    const updatedStoresGlobal = stores.map(s => s.client === clientGroup.client ? { ...s, produtos: updatedProducts } : s);
    setStores(updatedStoresGlobal);

    setProductModalOpen(false);
    setEditingProductId(null);
  };

  const handleDeleteProduct = (productId) => {
    if (!window.confirm("Deseja realmente excluir este produto do catálogo?")) return;
    const updatedProducts = clientProducts.filter(p => p.id !== productId);
    const updatedMaster = { ...masterStore, produtos: updatedProducts };
    
    updateStoreInCloud(updatedMaster);
    setStores(stores.map(s => s.client === clientGroup.client ? { ...s, produtos: updatedProducts } : s));
    toast.success("Produto removido.");
  };

  const abrirEdicaoProduto = (prod) => {
    // 1. Tenta pegar os canais novos, se não achar, tenta os antigos, se não achar, usa array vazio
    let canaisAtuais = prod.canais || prod.precosCanais || [];
    
    // 2. Transforma (adapta) formato antigo para o novo formato de canais
    let canaisAdaptados = canaisAtuais.map(c => {
      // Garante retrocompatibilidade: converte o formato antigo em um item do novo array
      let kitsAdaptados = c.kits || [];
      if (!c.kits && (c.temKit || prod.temKit)) {
        kitsAdaptados = [{
          id: Date.now() + Math.random(),
          descricao: prod.kitDescricao || c.kitDescricao || `Kit ${prod.qtdParesKit || 'X'} Itens`,
          precoDe: c.precoDeKit || '',
          precoPor: c.precoPorKit || prod.precoKit || ''
        }];
      }

      return {
        id: c.id || Date.now() + Math.random(),
        canal: c.canal || 'Shopee',
        precoDe: prod.precoDe || '', 
        precoPor: c.precoPor || c.preco || '', 
        kits: kitsAdaptados
      };
    });

    // 3. Se for um produto novo ou sem canais, cria um canal padrão para não dar erro no map
    if (canaisAdaptados.length === 0) {
      canaisAdaptados.push({ 
          id: Date.now(), canal: 'Shopee', precoDe: '', precoPor: '', kits: [] 
      });
    }

    setProductForm({
      fotoUrl: prod.fotoUrl || '', 
      descricao: prod.descricao || '', 
      canais: canaisAdaptados // <--- Agora sempre existe e é um array
    });
    
    setEditingProductId(prod.id);
    setProductModalOpen(true);
  };

  // Filtra as lojas apenas por cliente (Bruto da nuvem, imune a filtros da tabela)
  const liveStores = useMemo(() => {
    const rawClientStores = stores.filter(s => s.client === clientGroup.client && !s.arquivada);
    // Enriquece cada loja usando o motor utilitário centralizado
    return rawClientStores.map(s => 
      enrichStoreMetrics(s, currentDay, daysInMonth || 30, globalGrowth || 10, clientGrowthMap, marketplaceGrowthMap)
    );
  }, [stores, clientGroup.client, currentDay, daysInMonth, globalGrowth, clientGrowthMap, marketplaceGrowthMap]);

  // Estatísticas consolidadas baseadas nas lojas limpas e enriquecidas
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
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      return `${meses[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
  }, []);

  const allTimeTotalGmv = useMemo(() => {
    return liveStores.reduce((acc, s) => {
        let storeTotal = Number(s.currentRevenue) || 0; 
        if (s.monthlyHistory) {
            s.monthlyHistory.forEach(h => storeTotal += (Number(h.gmv) || 0)); 
        }
        return acc + storeTotal;
    }, 0);
  }, [liveStores]);

  const lastMonthTotalGmv = useMemo(() => {
    return liveStores.reduce((acc, s) => {
        if (s.monthlyHistory && s.monthlyHistory.length > 0) {
            const prevData = s.monthlyHistory.find(h => h.month === mesPassadoExato);
            return acc + (prevData ? Number(prevData.gmv) : 0);
        }
        return acc;
    }, 0);
  }, [liveStores, mesPassadoExato]);

  const momGrowth = lastMonthTotalGmv > 0 
    ? ((clientUnfilteredStats.projectedGmv - lastMonthTotalGmv) / lastMonthTotalGmv) * 100 
    : 0;

  const shareEvolucao = useMemo(() => {
      const faturamentoGlobalAtual = dashboardData?.totalCurrentRevenue || 1; 
      const faturamentoClienteAtual = clientUnfilteredStats.currentRevenue || 0;
      const currentShare = (faturamentoClienteAtual / faturamentoGlobalAtual) * 100;

      const pastGlobalData = dashboardData?.historicalChartData?.find(h => h.month === mesPassadoExato);
      const faturamentoGlobalPassado = pastGlobalData ? (pastGlobalData.ReceitaGlobal || 1) : 1;
      const faturamentoClientePassado = lastMonthTotalGmv || 0;
      const pastShare = faturamentoGlobalPassado > 1 ? (faturamentoClientePassado / faturamentoGlobalPassado) * 100 : 0;
      
      const evolution = currentShare - pastShare;

      return { currentShare, pastShare, evolution };
  }, [dashboardData, clientUnfilteredStats, lastMonthTotalGmv, mesPassadoExato]);

  const consolidatedHistory = useMemo(() => {
    const historyMap = {};
    liveStores.forEach(store => {
      (store.monthlyHistory || []).forEach(h => {
        if (!historyMap[h.month]) {
          historyMap[h.month] = { month: h.month, gmv: 0, ads: 0, orders: 0, units: 0, agencyRevenue: 0 };
        }
        historyMap[h.month].gmv += Number(h.gmv) || 0;
        historyMap[h.month].ads += Number(h.adsInvestment) || 0;
        historyMap[h.month].orders += Number(h.orders) || 0;
        historyMap[h.month].units += Number(h.units) || 0;
        historyMap[h.month].agencyRevenue += Number(h.agencyRevenue) || 0;
      });
    });

    const monthsOrder = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    
    return Object.values(historyMap).sort((a, b) => {
      const [mA, yA] = a.month.split('/');
      const [mB, yB] = b.month.split('/');
      return (parseInt(yB, 10) * 100 + monthsOrder.indexOf(mB)) - (parseInt(yA, 10) * 100 + monthsOrder.indexOf(mA));
    });
  }, [liveStores]);

  const clientDailyMetrics = useMemo(() => {
    const days = Array.from({ length: currentDay }, (_, i) => ({ day: i + 1, gmv: 0, isEvent: false }));

    liveStores.forEach(s => {
      if (s.history) {
        s.history.forEach(h => {
          const d = days.find(x => x.day === h.day);
          if (d) d.gmv += (Number(h.dailyRevenue) || 0);
        });
      }
    });

    const totalGmv = days.reduce((acc, d) => acc + d.gmv, 0);
    const avgGmv = currentDay > 0 ? totalGmv / currentDay : 0;
    
    days.forEach(d => {
      if (d.gmv > avgGmv * 1.5) d.isEvent = true;
    });

    const daysInMonthActual = daysInMonth || 30;
    const dailyTargetAvg = daysInMonthActual > 0 ? (clientUnfilteredStats.totalTarget || 0) / daysInMonthActual : 0;

    return { days, avgGmv, dailyTargetAvg };
  }, [liveStores, currentDay, daysInMonth, clientUnfilteredStats.totalTarget]);

  const clientHistoricalChartData = useMemo(() => {
    if (!consolidatedHistory || consolidatedHistory.length === 0) return [];
    
    const pastData = [...consolidatedHistory].reverse().map(h => ({
        month: h.month,
        Faturamento: h.gmv,
        Projecao: null,
        Meta: null
    }));

    pastData.push({
        month: 'Atual',
        Faturamento: clientUnfilteredStats.currentRevenue,
        Projecao: clientUnfilteredStats.projectedGmv,
        Meta: clientUnfilteredStats.totalTarget
    });

    if (pastData.length > 1) {
        pastData[pastData.length - 2].Projecao = pastData[pastData.length - 2].Faturamento;
        pastData[pastData.length - 2].Meta = pastData[pastData.length - 2].Faturamento;
    }

    return pastData;
  }, [consolidatedHistory, clientUnfilteredStats]);

  const [isEditingContract, setIsEditingContract] = useState(false);
  const [contractForm, setContractForm] = useState({
    feeType: clientGroup?.feeType || 'percent',
    feePercent: clientGroup?.feePercent || 0,
    fixedFee: clientGroup?.fixedFee || 0
  });

  const handleSaveContract = () => {
    if (!canEdit) return toast.error("Sem permissão.");
    
    let updatedStoresGlobal = [...stores];
    liveStores.forEach(store => {
      const updatedStore = {
        ...store,
        feeType: contractForm.feeType,
        feePercent: Number(contractForm.feePercent) || 0,
        fixedFee: contractForm.feeType === 'percent' ? 0 : (Number(contractForm.fixedFee) || 0)
      };
      updateStoreInCloud(updatedStore);
      updatedStoresGlobal = updatedStoresGlobal.map(globalStore => globalStore.id === store.id ? updatedStore : globalStore);
    });

    setStores(updatedStoresGlobal);
    setIsEditingContract(false);
    toast.success("Contrato da agência atualizado com sucesso!");
  };

  const INTERNAL_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const handleBulkTaskSave = (selectedStoreIds, taskData) => {
    const username = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Usuário';

    const updatedStores = stores.map(store => {
      if (selectedStoreIds.includes(store.id)) {
        let updatedStore = { ...store };
        const newTask = {
          id: Date.now() + Math.random(),
          texto: taskData.text,
          feita: false,
          responsavel: taskData.resp?.trim() || '',
          criadoPor: username,
          dataCriacao: new Date().toLocaleDateString('pt-BR'),
          data: taskData.data || '',
          hora: taskData.hora || '',
          recurrence: taskData.recorrencia || 'none'
        };
        updatedStore.checklists = [...(store.checklists || []), newTask];
        updatedStore.dataUltimoAcesso = new Date().toISOString();
        updateStoreInCloud(updatedStore);
        return updatedStore;
      }
      return store;
    });

    setStores(updatedStores);
    setIsBulkTaskModalOpen(false);
    toast.success(`Tarefa replicada em ${selectedStoreIds.length} loja(s)!`);
  };

  const clientOpenTasks = useMemo(() => {
    const open = [];
    liveStores.forEach(store => {
      if (store.checklists) {
        store.checklists.forEach(task => {
          if (!task.feita) {
            open.push({ ...task, storeName: store.store, storeId: store.id });
          }
        });
      }
    });
    return open.sort((a, b) => {
      const dateA = new Date(`${a.data || '2099-01-01'}T${a.hora || '00:00'}`);
      const dateB = new Date(`${b.data || '2099-01-01'}T${b.hora || '00:00'}`);
      return dateA - dateB;
    });
  }, [liveStores]);

  const handleToggleTask = (storeId, taskId) => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return;
    
    const updatedChecklists = store.checklists.map(c => 
      c.id === taskId ? { ...c, feita: true, dataConclusao: new Date().toISOString() } : c
    );
    
    const updatedStore = { ...store, checklists: updatedChecklists };
    updateStoreInCloud(updatedStore); 
    setStores(stores.map(s => s.id === storeId ? updatedStore : s)); 
    toast.success("Tarefa concluída!");
  };

  if (!clientGroup) return null;

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

  const pieData = useMemo(() => 
    liveStores.map(s => ({ name: s.store, value: s.currentRevenue || 0 })).filter(s => s.value > 0)
  , [liveStores]);

  const roasData = useMemo(() => 
    liveStores.map(s => ({ 
      name: s.store, 
      roas: s.adsInvestment > 0 ? Number((s.currentRevenue / s.adsInvestment).toFixed(1)) : 0 
    })).sort((a, b) => b.roas - a.roas)
  , [liveStores]);

  const glassTooltipStyle = {
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    fontSize: '12px'
  };

  const clientMktData = useMemo(() => {
    if (!liveStores) return [];
    const mktMap = {};
    liveStores.forEach(s => {
      const mkt = s.marketplace ? s.marketplace.toUpperCase() : 'N/A';
      if (!mktMap[mkt]) mktMap[mkt] = { name: mkt, revenue: 0 };
      mktMap[mkt].revenue += (Number(s.currentRevenue) || 0);
    });
    return Object.values(mktMap).sort((a, b) => b.revenue - a.revenue);
  }, [liveStores]);

  const clientHistoryLogs = useMemo(() => {
    if (!liveStores) return [];
    const allLogs = [];
    liveStores.forEach(store => {
      if (store.taskLogs) {
        store.taskLogs.forEach(log => {
          allLogs.push({ ...log, storeName: store.store, storeId: store.id });
        });
      }
    });
    return allLogs.sort((a, b) => b.id - a.id);
  }, [liveStores]);

  const potentialMarketplaces = useMemo(() => {
    return liveStores[0]?.potentialMarketplaces || [];
  }, [liveStores]);

  // Cria uma lista única (sem duplicatas) unindo o que já está ativo com o que está no radar
  const clientAvailableMarketplaces = useMemo(() => {
    const combined = new Set([...Array.from(activeMarketplaces), ...potentialMarketplaces]);
    return Array.from(combined).sort();
  }, [activeMarketplaces, potentialMarketplaces]);

  // 2. Função para alternar o status do marketplace (Potencial <-> Inativo)
  const togglePotentialMarketplace = (mkt) => {
    if (!canUseBatchEntry) return; // Trava de segurança por nível de cargo
    if (activeMarketplaces.has(mkt)) return; // Se já estiver ativo, não faz nada

    let newPotentials = [...potentialMarketplaces];
    
    if (newPotentials.includes(mkt)) {
      // Se já era potencial, remove
      newPotentials = newPotentials.filter(p => p !== mkt); 
    } else {
      // Se não era, adiciona à lista de expansão
      newPotentials.push(mkt); 
    }

    // Atualiza em lote (batch) todas as lojas deste cliente na nuvem
    let updatedStoresGlobal = [...stores];
    liveStores.forEach(store => {
      const updatedStore = { ...store, potentialMarketplaces: newPotentials };
      updateStoreInCloud(updatedStore);
      updatedStoresGlobal = updatedStoresGlobal.map(globalStore => globalStore.id === store.id ? updatedStore : globalStore);
    });

    setStores(updatedStoresGlobal);
    toast.success(`Radar de expansão atualizado para ${clientGroup.client}!`);
  };

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col relative">
        
        {/* CABEÇALHO DO MODAL */}
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
                        <select 
                          value={contractForm.feeType} 
                          onChange={e => setContractForm({...contractForm, feeType: e.target.value})}
                          className="bg-gray-800 text-white text-xs rounded p-1.5 outline-none border border-gray-600 focus:border-indigo-500"
                        >
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
                        
                        <button onClick={handleSaveContract} className="bg-green-600 hover:bg-green-500 text-white p-1.5 rounded transition-colors shadow-sm ml-1" title="Salvar Contrato">
                          <Save size={14} />
                        </button>
                        <button onClick={() => setIsEditingContract(false)} className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded transition-colors" title="Cancelar">
                          <X size={14} />
                        </button>

                        <div className="w-px h-5 bg-white/20 mx-1"></div>

                        <button 
                          onClick={() => addNewStoreToClient(clientGroup.client)} 
                          className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded transition-colors text-[10px] uppercase font-bold flex items-center gap-1.5"
                        >
                          <Plus size={14} /> Nova Loja
                        </button>
                        <button 
                          onClick={() => { setIsEditingContract(false); if(offboardClient) { offboardClient(clientGroup.client); onClose(); } }} 
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded transition-colors text-[10px] uppercase font-bold flex items-center gap-1.5"
                        >
                          <LogOut size={14} /> Encerrar Contrato
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="bg-indigo-500/10 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-md border border-indigo-500/20 shadow-sm">
                          {clientGroup.feeType === 'fixed' ? `Fixo: ${formatCurrency(clientGroup.fixedFee)}` : `Fee: ${clientGroup.feePercent}%`}
                        </span>
                        {canEdit && (
                          <button 
                            onClick={() => {
                              setContractForm({ feeType: clientGroup.feeType || 'percent', feePercent: clientGroup.feePercent || 0, fixedFee: clientGroup.fixedFee || 0 });
                              setIsEditingContract(true);
                            }} 
                            className="opacity-0 group-hover:opacity-100 p-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-indigo-400 rounded-md transition-all"
                            title="Editar Regra de Contrato"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
              </div>
            </div>

            {/* Botão Fechar */}
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors ml-4 shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* ABAS DE NAVEGAÇÃO */}
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

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-transparent">
          
          {/* ABA 1: DASHBOARD E RADAR */}
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

              <div className="bg-black/20 rounded-2xl p-5 border border-white/5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Target size={14}/> Radar de Expansão</h3>
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
                    <div className="w-full h-px bg-white/10 sm:hidden my-1"></div>
                    
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
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                        ROAS: <span className="text-white text-xs">{clientUnfilteredStats.roas} x</span>
                     </p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                        CPA: <span className="text-rose-400 text-xs">
                          {formatCurrency(clientUnfilteredStats.units > 0 ? clientUnfilteredStats.adsInvestment / clientUnfilteredStats.units : 0)}
                        </span>
                     </p>
                  </div>
                </div>

                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider" title="Participação no Faturamento Global da Agência">Share na Carteira</span>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-2xl font-bold ${shareEvolucao.evolution >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                      {shareEvolucao.currentShare.toFixed(1)}%
                    </p>
                    {shareEvolucao.evolution >= 0 ? <TrendingUp size={20} className="text-indigo-400" /> : <TrendingDown size={20} className="text-rose-400" />}
                  </div>
                  
                  <div className="flex flex-col mt-3 pt-3 border-t border-white/10 gap-1.5">
                    <p className="text-[10px] text-gray-400 flex justify-between">
                      Mês passado (Fechado): 
                      <span className="text-gray-300 font-bold">{shareEvolucao.pastShare.toFixed(1)}%</span>
                    </p>
                    <p className="text-[10px] text-gray-400 flex justify-between">
                      Evolução de espaço: 
                      <span className={`font-bold ${shareEvolucao.evolution >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                        {shareEvolucao.evolution > 0 ? '+' : ''}{shareEvolucao.evolution.toFixed(1)} pp
                      </span>
                    </p>
                  </div>
                </div>

              </div>

              {/* GRÁFICOS: LINHA 2 (Eficiência Ads, Share por Loja, Faturamento Canal) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-sm">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Zap size={16} className="text-amber-400" /> Eficiência de Ads (ROAS)</h3>
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
                    ) : <p className="text-gray-500 text-center mt-20 text-sm">Sem dados de Ads registrados.</p>}
                  </div>
                </div>

                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 shadow-sm">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><PieChartIcon size={16} className="text-indigo-400" /> Share por Loja</h3>
                  <div className="h-64 w-full" style={{ minHeight: '250px' }}>
                    {pieData.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={glassTooltipStyle} formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
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
                          <Tooltip contentStyle={glassTooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value) => formatCurrency(value)} />
                          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={16}>
                            {clientMktData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={INTERNAL_COLORS[index % INTERNAL_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-gray-500 text-center mt-10 text-sm">Sem faturamento registrado.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* GRÁFICOS: LINHA 3 (Tração Diária + Evolução Histórica) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-white/[0.02] backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                    <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                      <Activity size={16} className="text-blue-400" /> Tração do Faturamento Diário
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-400/80 uppercase border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Ideal: {formatCurrency(clientDailyMetrics.dailyTargetAvg)}
                      </span>
                      <span className="text-[12px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        Real: {formatCurrency(clientDailyMetrics.avgGmv)}
                      </span>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={clientDailyMetrics.days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                        <Tooltip 
                          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} 
                          contentStyle={glassTooltipStyle} 
                          formatter={(value, name, props) => {
                            const isAboveAvg = value > clientDailyMetrics.avgGmv;
                            const label = props.payload.isEvent ? '🔥 Pico Sazonal' : (isAboveAvg ? '📈 Acima da Média' : '📉 Faturamento');
                            return [formatCurrency(value), label];
                          }}
                          labelFormatter={(label) => `Dia ${label}`}
                        />
                        <Line type="monotone" dataKey="gmv" stroke="#3B82F6" strokeWidth={3} 
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            const isAboveAvg = payload.gmv > clientDailyMetrics.avgGmv;
                            if (payload.isEvent) return <circle cx={cx} cy={cy} r={5} fill="#F97316" stroke="#fff" strokeWidth={1} />;
                            if (isAboveAvg) return <circle cx={cx} cy={cy} r={3} fill="#10B981" stroke="none" />;
                            return <circle cx={cx} cy={cy} r={3} fill="#6B7280" stroke="none" />;
                          }} 
                          activeDot={{ r: 7, fill: '#60A5FA', stroke: '#fff', strokeWidth: 2 }} 
                        />
                        {clientDailyMetrics.avgGmv > 0 && (
                          <ReferenceLine y={clientDailyMetrics.avgGmv} stroke="#F59E0B" strokeDasharray="3 3" opacity={0.4} label={{ position: 'insideTopLeft', value: 'Real', fill: '#F59E0B', fontSize: 9 }} />
                        )}
                        {clientDailyMetrics.dailyTargetAvg > 0 && (
                          <ReferenceLine y={clientDailyMetrics.dailyTargetAvg} stroke="#10B981" strokeDasharray="3 3" opacity={0.4} label={{ position: 'insideBottomLeft', value: 'Meta', fill: '#10B981', fontSize: 9 }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4 shrink-0">
                    <TrendingUp size={16} className="text-blue-400"/>
                    <h3 className="text-sm font-bold text-white tracking-wide">Evolução Histórica do Cliente</h3>
                  </div>
                  <div className="flex-1 w-full relative h-[300px]">
                    {clientHistoricalChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={clientHistoricalChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <Tooltip 
                            contentStyle={glassTooltipStyle}
                            formatter={(value, name) => [formatCurrency(value), name]}
                          />
                          <Legend verticalAlign="top" height={30} iconSize={8} wrapperStyle={{fontSize: '11px'}}/>
                          <Area type="monotone" dataKey="Faturamento" name="Consolidado" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorFaturamento)" />
                          <Line type="monotone" dataKey="Projecao" name="Projeção Atual" stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={2} dot={{r:3}} connectNulls />
                          <Line type="monotone" dataKey="Meta" name="Meta do Mês" stroke="#10B981" strokeDasharray="4 4" strokeWidth={2} dot={{r:3}} connectNulls />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500 text-xs">Sem dados históricos.</div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* === ABA 2: LANÇAMENTOS INTELIGENTES === */}
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
                <div className="bg-black/20 border border-white/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-white/5 bg-black/40 font-bold text-xs text-gray-400 uppercase tracking-widest">
                    Fechamentos Mensais Consolidado
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="text-[10px] text-gray-500 uppercase">
                        <tr>
                          <th className="p-4 pl-6">Competência</th>
                          <th className="p-4 text-emerald-400">GMV Consolidado</th>
                          <th className="p-4 text-amber-400">Ads Investido</th>
                          <th className="p-4 text-rose-400">Custo p/ Conv</th>
                          <th className="p-4 text-blue-400">ROAS Médio</th>
                          <th className="p-4">Pedidos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                        {consolidatedHistory.map(hist => {
                          const roas = hist.ads > 0 ? (hist.gmv / hist.ads).toFixed(2) : '-';
                          const cpa = hist.units > 0 ? (hist.ads / hist.units) : 0;
                          return (
                            <tr key={hist.month} className="hover:bg-white/[0.02] transition-colors">
                              <td className="p-4 pl-6 font-bold text-white">{hist.month}</td>
                              <td className="p-4 text-emerald-400 font-bold">{formatCurrency(hist.gmv)}</td>
                              <td className="p-4 text-amber-500 font-bold">{formatCurrency(hist.ads)}</td>
                              <td className="p-4 text-rose-400 font-bold">{formatCurrency(cpa)}</td>
                              <td className="p-4 text-blue-400 font-bold">{roas}</td>
                              <td className="p-4 text-gray-300 font-bold">{hist.orders} <span className="text-[10px] font-normal text-gray-500">ped</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/5 flex flex-col shadow-sm flex-1">
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                    <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                       <History size={16} className="text-gray-400"/> Linha do Tempo
                    </h4>
                    <span className="text-[10px] bg-white/5 text-gray-400 font-bold px-2 py-0.5 rounded">{clientHistoryLogs.length}</span>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <CheckSquare size={16} className="text-amber-400"/>
                      </div>
                      <h4 className="text-sm font-bold text-white tracking-wide">Tarefas Pendentes</h4>
                    </div>
                    <span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded text-xs">{clientOpenTasks.length}</span>
                  </div>
                  
                  <button 
                    onClick={() => setIsBulkTaskModalOpen(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <CopyPlus size={16}/> Criar Tarefa em Massa
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[500px] custom-scrollbar">
                  {clientOpenTasks.length > 0 ? clientOpenTasks.map(task => (
                    <div key={task.id} className="bg-gray-900/50 p-3 rounded-xl border border-white/5 flex gap-3 group transition-colors hover:border-white/10">
                      <button 
                        onClick={() => handleToggleTask(task.storeId, task.id)} 
                        className="mt-0.5 text-gray-500 hover:text-emerald-400 transition-colors shrink-0"
                        title="Concluir Tarefa"
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-gray-500 group-hover:border-emerald-400 flex items-center justify-center transition-colors"></div>
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {task.storeName}
                          </span>
                          {(task.data || task.hora) && (
                            <span className="text-[9px] text-gray-400 flex items-center gap-1">
                              <Clock size={10} /> 
                              {task.data && new Date(task.data + 'T12:00:00').toLocaleDateString('pt-BR')} {task.hora}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-300 mb-1.5 leading-snug">{task.texto}</p>
                        {task.responsavel && (
                          <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                            Para: <span className="text-indigo-400">{task.responsavel}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                      Tudo limpo! Nenhuma pendência para este cliente. 🎉
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'produtos' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-white/5 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><Package size={20} className="text-indigo-400"/> Catálogo Oficial</h3>
                  <p className="text-xs text-gray-400 mt-1">Gerencie produtos e monitore a tabela de preços individual por marketplace.</p>
                </div>
                {canEdit && (
                  <button 
                    onClick={() => {
                      setProductForm({ 
                        fotoUrl: '', descricao: '', 
                        canais: [{ id: Date.now(), canal: 'Shopee', precoDe: '', precoPor: '', temKit: false, kitDescricao: 'Kit 2 Pares', precoDeKit: '', precoPorKit: '' }] 
                      });
                      setEditingProductId(null);
                      setProductModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center gap-2"
                  >
                    <Plus size={16}/> Adicionar Produto
                  </button>
                )}
              </div>

              {clientProducts.length === 0 ? (
                <div className="text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl">
                  <Package size={40} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400 font-bold">Nenhum produto cadastrado.</p>
                  <p className="text-gray-500 text-xs mt-1">Cadastre os produtos focos da curva A deste cliente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {clientProducts.map(prod => (
                    <div key={prod.id} className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col group relative">
                      
                      <button 
                        onClick={() => setShowProductHistoryId(showProductHistoryId === prod.id ? null : prod.id)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-gray-400 hover:text-white transition-all z-10 backdrop-blur-sm"
                        title="Ver Histórico de Preços"
                      >
                        <History size={16} />
                      </button>

                      <div className="h-40 bg-gray-900 flex items-center justify-center border-b border-white/5 relative">
                        {prod.fotoUrl ? (
                          <img src={prod.fotoUrl} alt={prod.descricao} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <Image size={32} className="text-gray-600" />
                        )}
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col">
                        <h4 className="font-bold text-white text-sm leading-snug mb-3">{prod.descricao}</h4>
                        
                        {/* LISTAGEM DOS CANAIS ATIVOS (VISÃO DE TABELA) */}
                        <div className="space-y-3 mt-auto">
                          {(prod.canais || []).map((c, i) => (
                            <div key={c.id || i} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative">
                              {/* Tarja colorida de canal */}
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/50"></div>
                              
                              <div className="flex justify-between items-center ml-2 border-b border-white/5 pb-2">
                                <span className="text-xs font-black text-gray-300 uppercase tracking-wider">{c.canal}</span>
                                <div className="text-right">
                                  {c.precoDe && <span className="text-[10px] text-gray-500 line-through mr-1">R$ {c.precoDe}</span>}
                                  <span className="text-sm font-black text-emerald-400">R$ {c.precoPor || c.preco || '0.00'}</span>
                                </div>
                              </div>
                              
                              {(c.kits || []).map((kit, kIdx) => (
                                <div key={kit.id || kIdx} className="flex justify-between items-center ml-2 pt-1.5 border-t border-white/5 mt-1.5 first:border-0 first:mt-0">
                                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1 truncate max-w-[120px]" title={kit.descricao}>
                                    <Package size={12} className="shrink-0"/> {kit.descricao || 'Kit'}
                                  </span>
                                  <div className="text-right shrink-0">
                                    {kit.precoDe && <span className="text-[10px] text-gray-500 line-through mr-1">R$ {kit.precoDe}</span>}
                                    <span className="text-xs font-black text-indigo-300">R$ {kit.precoPor || '0.00'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Painel de Histórico (Sanduíche) */}
                      {showProductHistoryId === prod.id && (
                        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl p-4 flex flex-col z-20 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-4">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Trilha de Auditoria</h5>
                            <button onClick={() => setShowProductHistoryId(null)} className="text-gray-400 hover:text-white"><X size={16}/></button>
                          </div>
                          <div className="space-y-4">
                            {prod.historico?.map((hist, idx) => (
                              <div key={idx} className="border-l-2 border-indigo-500 pl-3 relative">
                                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-500"></div>
                                <span className="text-[9px] text-gray-500 block mb-1">{hist.data} por {hist.author}</span>
                                {hist.mudancas.map((m, mIdx) => (
                                  <p key={mIdx} className="text-[11px] text-gray-300 leading-snug mb-0.5">• {m}</p>
                                ))}
                              </div>
                            ))}
                            {(!prod.historico || prod.historico.length === 0) && (
                              <p className="text-[10px] text-gray-500 italic text-center">Nenhum registro encontrado.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {canEdit && (
                        <div className="flex border-t border-white/5 bg-black/40 mt-3">
                          <button onClick={() => abrirEdicaoProduto(prod)} className="flex-1 py-3 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors border-r border-white/5 uppercase tracking-wider flex items-center justify-center gap-1">
                            <Edit2 size={12}/> Editar Preços
                          </button>
                          <button onClick={() => handleDeleteProduct(prod.id)} className="flex-1 py-3 text-[10px] font-bold text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors uppercase tracking-wider flex items-center justify-center gap-1">
                            <Trash2 size={12}/> Remover
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === SIDE PANEL DE CRIAÇÃO/EDIÇÃO DE PRODUTO (GAVETA LATERAL) === */}
          {productModalOpen && (
            <div className="fixed inset-0 bg-[#0B0F19]/60 backdrop-blur-sm flex justify-end z-[9999]">
              <div className="absolute inset-0" onClick={() => setProductModalOpen(false)}></div>
              
              <div className="relative bg-gray-900 border-l border-white/10 w-full max-w-xl h-full shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-300">
                
                {/* Cabeçalho */}
                <div className="flex justify-between items-center shrink-0 border-b border-white/5 p-6 bg-black/20">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Package size={20} className="text-indigo-400"/> 
                    {editingProductId ? 'Editar Tabela de Preços' : 'Novo Produto'}
                  </h3>
                  <button onClick={() => setProductModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg">
                    <X size={20}/>
                  </button>
                </div>

                {/* Corpo do Formulário com Rolagem Interna */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                  
                  {/* BLOCO 1: INFOS GERAIS DO PRODUTO */}
                  <div className="space-y-4 border-b border-white/5 pb-6">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Informações Base</h4>
                    
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição / Nome do Produto</label>
                      <input type="text" value={productForm.descricao} onChange={e => setProductForm({...productForm, descricao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 mt-1 shadow-inner text-sm transition-colors" placeholder="Ex: Tênis Esportivo Runner X" />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Foto do Modelo (Thumbnail)</label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {productForm.fotoUrl ? (
                            <img src={productForm.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Image size={20} className="text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="w-full cursor-pointer bg-black/40 border border-white/10 hover:border-indigo-500 text-gray-300 rounded-xl p-3 text-sm transition-colors flex items-center justify-center gap-2 border-dashed">
                            <Upload size={16} className="text-indigo-400" />
                            <span>Fazer Upload de Imagem</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          </label>
                          <p className="text-[9px] text-gray-500 mt-1 text-center">A imagem será comprimida automaticamente (max 300px).</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 2: TABELA DE PREÇOS POR CANAL */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Tabela de Preços e Kits</h4>
                      <button 
                        onClick={() => setProductForm({
                          ...productForm, 
                          canais: [...productForm.canais, { id: Date.now(), canal: 'Novo Canal', precoDe: '', precoPor: '', kits: [] }] 
                        })} 
                        className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                      >
                        <Plus size={14}/> Ativar Canal
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(productForm.canais || []).map((c, idx) => (
                        <div key={c.id} className="bg-black/30 border border-white/10 rounded-2xl p-4 relative group">
                          
                          <button 
                            onClick={() => {
                              const novosCanais = productForm.canais.filter((_, i) => i !== idx);
                              setProductForm({...productForm, canais: novosCanais});
                            }} 
                            className="absolute top-4 right-4 text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                            title="Remover este canal"
                          >
                            <Trash2 size={14}/>
                          </button>

                          <div className="mb-4 pr-10">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Marketplace</label>
                            <select value={c.canal} onChange={e => {
                              const novosCanais = [...productForm.canais];
                              novosCanais[idx].canal = e.target.value;
                              setProductForm({...productForm, canais: novosCanais});
                            }} className="w-full bg-white/5 border border-white/10 text-white font-bold rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 transition-colors cursor-pointer">
                              {clientAvailableMarketplaces.map(m => <option key={m} value={m} className="bg-gray-900">{m.toUpperCase()}</option>)}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                              <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Preço 'DE' (Riscado)</label>
                              <input type="number" step="0.01" value={c.precoDe} onChange={e => {
                                const novos = [...productForm.canais]; novos[idx].precoDe = e.target.value; setProductForm({...productForm, canais: novos});
                              }} className="w-full bg-black/40 border border-white/10 text-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 transition-colors text-xs" placeholder="R$ 0,00" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-emerald-400 uppercase block mb-1">Preço 'POR' (Venda)</label>
                              <input type="number" step="0.01" value={c.precoPor} onChange={e => {
                                const novos = [...productForm.canais]; novos[idx].precoPor = e.target.value; setProductForm({...productForm, canais: novos});
                              }} className="w-full bg-emerald-500/10 border border-emerald-500/30 text-white font-bold rounded-lg p-2.5 outline-none focus:border-emerald-500 transition-colors text-xs placeholder:text-emerald-500/30" placeholder="R$ 0,00" />
                            </div>
                          </div>

                          <div className="border-t border-white/5 pt-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Kits e Variações
                              </span>
                              <button 
                                onClick={() => {
                                  const novos = [...productForm.canais];
                                  if (!novos[idx].kits) novos[idx].kits = [];
                                  novos[idx].kits.push({ id: Date.now(), descricao: '', precoDe: '', precoPor: '' });
                                  setProductForm({...productForm, canais: novos});
                                }}
                                className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center gap-1"
                              >
                                <Plus size={12}/> Adicionar Kit
                              </button>
                            </div>

                            <div className="space-y-2">
                              {(c.kits || []).map((kit, kitIdx) => (
                                <div key={kit.id} className="flex gap-2 animate-in fade-in bg-indigo-500/5 p-2.5 rounded-xl border border-indigo-500/10 items-end">
                                  <div className="flex-1">
                                    <label className="text-[9px] font-bold text-indigo-300 uppercase block mb-1">Desc. Kit</label>
                                    <input type="text" value={kit.descricao} onChange={e => {
                                      const novos = [...productForm.canais]; novos[idx].kits[kitIdx].descricao = e.target.value; setProductForm({...productForm, canais: novos});
                                    }} className="w-full bg-black/40 border border-white/10 text-white rounded-md p-2 outline-none focus:border-indigo-500 transition-colors text-[10px]" placeholder="Ex: Kit 3 Pares" />
                                  </div>
                                  <div className="w-20">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">DE</label>
                                    <input type="number" step="0.01" value={kit.precoDe} onChange={e => {
                                      const novos = [...productForm.canais]; novos[idx].kits[kitIdx].precoDe = e.target.value; setProductForm({...productForm, canais: novos});
                                    }} className="w-full bg-black/40 border border-white/10 text-gray-300 rounded-md p-2 outline-none focus:border-indigo-500 transition-colors text-[10px]" placeholder="R$" />
                                  </div>
                                  <div className="w-20">
                                    <label className="text-[9px] font-bold text-indigo-400 uppercase block mb-1">POR</label>
                                    <input type="number" step="0.01" value={kit.precoPor} onChange={e => {
                                      const novos = [...productForm.canais]; novos[idx].kits[kitIdx].precoPor = e.target.value; setProductForm({...productForm, canais: novos});
                                    }} className="w-full bg-indigo-500/20 border border-indigo-500/40 text-white font-bold rounded-md p-2 outline-none focus:border-indigo-500 transition-colors text-[10px]" placeholder="R$" />
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const novos = [...productForm.canais];
                                      novos[idx].kits = novos[idx].kits.filter((_, i) => i !== kitIdx);
                                      setProductForm({...productForm, canais: novos});
                                    }} 
                                    className="p-2 text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors mb-[1px]"
                                    title="Remover Kit"
                                  >
                                    <Trash2 size={12}/>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      ))}
                      {(!productForm?.canais || productForm.canais.length === 0) && (
                        <div className="text-center p-6 border border-dashed border-white/10 rounded-xl">
                          <p className="text-xs text-gray-500">Nenhum canal ativo para este produto.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Botão Salvar Fixo */}
                <div className="p-6 border-t border-white/5 bg-black/20 shrink-0">
                  <button onClick={handleSaveProduct} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2">
                    {editingProductId ? <Save size={18}/> : <Plus size={18}/>}
                    {editingProductId ? 'Salvar Tabela de Preços' : 'Finalizar Cadastro'}
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      <BulkTaskModal 
        isOpen={isBulkTaskModalOpen} 
        onClose={() => setIsBulkTaskModalOpen(false)} 
        stores={liveStores} 
        onSave={handleBulkTaskSave} 
        teamMembers={teamMembers} 
      />
    </div>
  );
}

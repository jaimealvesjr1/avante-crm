import React, { useState, useMemo } from 'react';
import { X, Target, Save, TrendingUp, ShoppingBag, Briefcase, Globe, ArrowRight, CalendarDays, Play, Trash2, Flame, Download, History } from 'lucide-react';
import { doc, writeBatch, deleteField } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatNumber } from '../../utils/financeUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function GoalsSettingsModal({ 
  isOpen, onClose, stores, globalGrowth, clientGrowthMap, marketplaceGrowthMap, 
  historicalGoals = [], formatCurrency, db, activeEvent, scheduledEvents, handleEventAction 
}) {
  if (!isOpen) return null;

  const [localHistoricalGoals, setLocalHistoricalGoals] = useState([...historicalGoals]);
  const [goalForm, setGoalForm] = useState({ month: '', level: 'Agência', targetValue: '' });
  const [activeTab, setActiveTab] = useState('global');
  const [isSaving, setIsSaving] = useState(false);

  const [localGlobal, setLocalGlobal] = useState(globalGrowth !== undefined ? globalGrowth : 10);
  const [localClientMap, setLocalClientMap] = useState({ ...(clientGrowthMap || {}) });
  const [localMktMap, setLocalMktMap] = useState({ ...(marketplaceGrowthMap || {}) });
  const [localStoreMap, setLocalStoreMap] = useState({});

  const [eventForm, setEventForm] = useState({ name: '', target: '', date: '', channels: [] });
  const clients = useMemo(() => [...new Set(stores.map(s => s.client))].filter(Boolean).sort(), [stores]);
  const getLocalStoreData = (store) => {
    if (localStoreMap[store.id]) return localStoreMap[store.id];
    return {
       type: store.targetType || 'percent',
       percent: store.customGrowth !== undefined ? store.customGrowth : '',
       fixed: store.fixedGmvTarget || ''
    };
  };

  const calculateTarget = (store, isSimulated = true) => {
    const globalVal = isSimulated ? Number(localGlobal) : Number(globalGrowth || 0);
    const clientMap = isSimulated ? localClientMap : (clientGrowthMap || {});
    const mktMap = isSimulated ? localMktMap : (marketplaceGrowthMap || {});
    const base = Number(store.gmvBase) || 0;

    const storeData = isSimulated ? getLocalStoreData(store) : { type: store.targetType || 'percent', percent: store.customGrowth, fixed: store.fixedGmvTarget };

    if (storeData.type === 'fixed') {
       return { base, target: Number(storeData.fixed) || 0, rate: 0, rule: 'Meta Fixa' };
    }

    let rate = globalVal || 0;
    if (store.marketplace && mktMap[store.marketplace.toUpperCase()] !== undefined && mktMap[store.marketplace.toUpperCase()] !== '') {
      rate += Number(mktMap[store.marketplace.toUpperCase()]);
    }
    if (clientMap[store.client] !== undefined && clientMap[store.client] !== '') {
      rate += Number(clientMap[store.client]);
    }
    if (storeData.percent !== undefined && storeData.percent !== null && storeData.percent !== '') {
      rate += Number(storeData.percent);
    }

    return { base, target: base * (1 + (rate / 100)), rate, rule: 'Acumulada' };
  };

  const handleAddHistoricalGoal = () => {
    if(!goalForm.month || !goalForm.targetValue) return toast.error("Preencha o mês e o valor.");
    setLocalHistoricalGoals(prev => [...prev, { ...goalForm, id: Date.now() }]);
    setGoalForm({ month: '', level: 'Agência', targetValue: '' });
  };

  const handleRemoveHistoricalGoal = (id) => {
    setLocalHistoricalGoals(prev => prev.filter(g => g.id !== id));
  };

  const formatMonthLabel = (val) => {
    if (!val) return '';
    const [year, month] = val.split('-');
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    return `${meses[parseInt(month) - 1]}/${year.slice(-2)}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);

      batch.set(doc(db, "settings", "global"), {
        globalGrowth: Number(localGlobal),
        clientGrowthMap: localClientMap,
        marketplaceGrowthMap: localMktMap,
        historicalGoals: localHistoricalGoals
      }, { merge: true });

      Object.entries(localStoreMap).forEach(([storeId, val]) => {
        const updates = { targetType: val.type };
        if (val.type === 'fixed') {
           updates.fixedGmvTarget = Number(val.fixed) || 0;
           updates.customGrowth = deleteField();
        } else {
           updates.fixedGmvTarget = deleteField();
           updates.customGrowth = (val.percent === '' || val.percent === null) ? deleteField() : Number(val.percent);
        }
        batch.update(doc(db, "stores", storeId.toString()), updates);
      });

      await batch.commit();
      toast.success("Metas Acumulativas atualizadas!");
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar metas.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const pastEventsStats = useMemo(() => {
    const events = {};

    stores.forEach(s => {
      if (s.eventLogs) {
        Object.entries(s.eventLogs).forEach(([eName, data]) => {
          if (activeEvent && activeEvent.name === eName) return; 

          if (!events[eName]) events[eName] = { name: eName, gmv: 0, target: 0, ads: 0, orders: 0, units: 0 };
          
          events[eName].target = Math.max(events[eName].target, Number(data.target) || 0);
          events[eName].gmv += Number(data.gmv) || 0;
          events[eName].ads += Number(data.ads) || 0;
          events[eName].orders += Number(data.orders) || 0;
          events[eName].units += Number(data.units) || 0;
        });}

      if (s.monthlyHistory) {
         s.monthlyHistory.forEach(mes => {
            if (mes.events) {
               Object.entries(mes.events).forEach(([eName, data]) => {
                  if (activeEvent && activeEvent.name === eName) return; 
                  
                  if (!events[eName]) events[eName] = { name: eName, gmv: 0, target: 0, ads: 0, orders: 0, units: 0 };
                  
                  events[eName].target = Math.max(events[eName].target, Number(data.target) || 0);
                  events[eName].gmv += Number(data.gmv) || 0;
                  events[eName].ads += Number(data.ads) || 0;
                  events[eName].orders += Number(data.orders) || 0;
                  events[eName].units += Number(data.units) || 0;
               });
            }
         });
      }
    });
    return Object.values(events).sort((a, b) => b.gmv - a.gmv);
  }, [stores, activeEvent]);

  const exportPastEventReport = async (eventName) => {
      toast.loading(`Gerando relatório de ${eventName}...`, { id: 'past-event-export' });
      try {
          const docPdf = new jsPDF();
          const clientsGroup = {};
          
          stores.forEach(store => {
              let eventData = null;

              if (store.eventLogs && store.eventLogs[eventName]) {
                  eventData = store.eventLogs[eventName];
              } else if (store.monthlyHistory) {
                  store.monthlyHistory.forEach(mes => {
                      if (mes.events && mes.events[eventName]) {
                          eventData = mes.events[eventName];
                      }
                  });
              }

              if (eventData) {
                  const cName = store.client || 'Sem Cliente';
                  if (!clientsGroup[cName]) clientsGroup[cName] = [];
                  clientsGroup[cName].push({ ...store, reportEventData: eventData });
              }
          });

          const clientNames = Object.keys(clientsGroup).sort();
          if (clientNames.length === 0) throw new Error("Nenhum dado encontrado para este evento.");

          clientNames.forEach((clientName, index) => {
              if (index > 0) docPdf.addPage();
              
              const clientStores = clientsGroup[clientName].sort((a, b) => {
                  return (Number(b.reportEventData.gmv) || 0) - (Number(a.reportEventData.gmv) || 0);
              });

              let totalGmv = 0, totalOrders = 0, totalUnits = 0;
              const storeRows = [];

              clientStores.forEach((s, idx) => {
                  const ev = s.reportEventData;
                  const gmv = Number(ev.gmv) || 0;
                  const orders = Number(ev.orders) || 0;
                  const units = Number(ev.units) || 0;

                  totalGmv += gmv; totalOrders += orders; totalUnits += units;

                  storeRows.push([
                      `${idx + 1}º`, s.marketplace || '-', s.store || '-', formatCurrency(gmv), `${orders}`, `${units}`
                  ]);
              });

              docPdf.setFillColor(15, 23, 42); 
              docPdf.rect(0, 0, 210, 46, 'F'); 
              docPdf.setFontSize(22); docPdf.setTextColor(255, 255, 255); 
              docPdf.text(clientName.toUpperCase(), 14, 22);
              docPdf.setFontSize(9); docPdf.setTextColor(148, 163, 184); 
              docPdf.text('RELATÓRIO DE DESEMPENHO - EVENTO ENCERRADO', 14, 29); 
              docPdf.setTextColor(250, 204, 21);
              docPdf.text(`Campanha: ${eventName}`, 14, 35);

              docPdf.setFontSize(11); docPdf.setTextColor(75, 85, 99); 
              docPdf.text('Faturamento do Evento:', 14, 58);
              docPdf.setFontSize(22); docPdf.setTextColor(234, 88, 12); 
              docPdf.text(formatCurrency(totalGmv), 14, 68);

              autoTable(docPdf, {
                  startY: 78,
                  head: [['Rk', 'Canal', 'Loja', 'Faturamento', 'Pedidos', 'Unidades']],
                  body: storeRows, theme: 'grid',
                  headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
                  styles: { fontSize: 8, cellPadding: 4 },
                  alternateRowStyles: { fillColor: [255, 247, 237] }
              });
          });
          
          docPdf.save(`B2X_Evento_Fechado_${eventName.replace(/[^a-z0-9]/gi, '_')}.pdf`);
          toast.success("Relatório Sazonal gerado e baixado!", { id: 'past-event-export' });
      } catch (error) {
          toast.error("Erro ao gerar PDF: " + error.message, { id: 'past-event-export' });
      }
  };

  const activeMkts = useMemo(() => [...new Set(stores.map(s => s.marketplace?.toUpperCase()))].filter(Boolean).sort(), [stores]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0B0F19] border border-white/10 w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Target className="text-indigo-400" /> Central de Controle de Metas
            </h2>
            <p className="text-sm text-gray-400 mt-1">Simule o crescimento. A meta final é a SOMA: <strong className="text-white">Global + Canal + Cliente + Loja</strong>.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CORPO */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* TABS */}
          <div className="w-full md:w-56 border-r border-white/10 bg-black/20 p-4 space-y-2 shrink-0 overflow-x-auto md:overflow-y-auto flex md:flex-col custom-scrollbar">
            <button onClick={() => setActiveTab('global')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'global' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Globe size={18} /> Taxa Global</button>
            <button onClick={() => setActiveTab('canais')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'canais' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><ShoppingBag size={18} /> Marketplaces</button>
            <button onClick={() => setActiveTab('clientes')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'clientes' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><Briefcase size={18} /> Clientes</button>
            <button onClick={() => setActiveTab('lojas')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'lojas' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><TrendingUp size={18} /> Lojas</button>
            <button onClick={() => setActiveTab('eventos')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap mt-4 border-t border-white/10 pt-4 ${activeTab === 'eventos' ? 'bg-orange-600 text-white shadow-md' : 'text-orange-500 hover:bg-orange-500/10'}`}><CalendarDays size={18} /> Sazonalidades</button>
          </div>

          {/* SIMULAÇÃO */}
          <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar">
            
            {activeTab === 'global' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">Meta Global Base</h3>
                  <p className="text-sm text-indigo-200/70 mb-6">Ponto de partida do crescimento de TODAS as lojas. As demais taxas serão somadas ou subtraídas deste valor.</p>
                  <div className="flex items-center gap-3">
                    <input type="number" value={localGlobal} onChange={e => setLocalGlobal(e.target.value)} className="bg-black/40 border border-white/10 text-white rounded-xl p-3 w-32 outline-none font-black text-2xl text-center focus:border-indigo-500" />
                    <span className="text-xl font-bold text-gray-500">%</span>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-sm">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Simulação de Impacto (Lojas Filtradas)</h4>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">GMV Base (Partida)</p>
                      <p className="text-lg font-bold text-gray-300">{formatCurrency(stores.reduce((acc, s) => acc + (Number(s.gmvBase) || 0), 0))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Meta Atual (Antes de salvar)</p>
                      <p className="text-lg font-bold text-gray-400">{formatCurrency(stores.reduce((acc, s) => acc + calculateTarget(s, false).target, 0))}</p>
                    </div>
                    <div className="bg-indigo-900/20 p-3 rounded-xl border border-indigo-500/30 text-right">
                      <p className="text-[10px] text-indigo-400 uppercase font-bold">Nova Meta Esperada</p>
                      <p className="text-2xl font-black text-indigo-400">{formatCurrency(stores.reduce((acc, s) => acc + calculateTarget(s, true).target, 0))}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-sm mt-6">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <History size={18} className="text-indigo-400"/> Histórico de Metas (Faturamento Real)
                  </h3>
                  <p className="text-sm text-gray-400 mb-6">Registre as metas fixas de meses anteriores para a Agência inteira ou para Clientes específicos.</p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Mês/Ano</label>
                      <input type="month" value={goalForm.month} onChange={e => setGoalForm({...goalForm, month: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500 text-sm mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Nível da Meta</label>
                      <select value={goalForm.level} onChange={e => setGoalForm({...goalForm, level: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500 text-sm mt-1 cursor-pointer">
                        <option className="bg-gray-900" value="Agência">Agência (Global)</option>
                        {clients.map(c => <option className="bg-gray-900" key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Valor da Meta (R$)</label>
                      <input type="number" value={goalForm.targetValue} onChange={e => setGoalForm({...goalForm, targetValue: e.target.value})} placeholder="Ex: 500000" className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500 text-sm mt-1" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleAddHistoricalGoal} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors">
                        Adicionar ao Histórico
                      </button>
                    </div>
                  </div>

                  {localHistoricalGoals.length > 0 ? (
                    <div className="overflow-x-auto custom-scrollbar border border-white/5 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-black/40 text-gray-400 text-[10px] uppercase tracking-wider">
                          <tr>
                            <th className="p-3 pl-4">Competência</th>
                            <th className="p-3">Nível</th>
                            <th className="p-3 text-right">Meta (R$)</th>
                            <th className="p-3 text-center pr-4">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {localHistoricalGoals.sort((a,b) => b.month.localeCompare(a.month)).map(goal => (
                            <tr key={goal.id} className="hover:bg-white/[0.02] transition-colors text-sm">
                              <td className="p-3 pl-4 font-bold text-white">{formatMonthLabel(goal.month)}</td>
                              <td className="p-3 font-bold text-gray-300">
                                {goal.level === 'Agência' ? <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs">Agência (Global)</span> : goal.level}
                              </td>
                              <td className="p-3 text-right font-black text-emerald-400">{formatCurrency(Number(goal.targetValue))}</td>
                              <td className="p-3 text-center pr-4">
                                <button onClick={() => handleRemoveHistoricalGoal(goal.id)} className="p-1.5 text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-6 bg-black/20 rounded-xl border border-white/5 border-dashed">Nenhum histórico de metas registrado.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'canais' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-sm text-gray-400 mb-4">Crescimento por Canal. Deixe vazio para somar 0% à meta Global. Use negativo para subtrair.</p>
                <div className="space-y-3">
                  {activeMkts.map(mkt => {
                    const mktStores = stores.filter(s => s.marketplace?.toUpperCase() === mkt);
                    const baseTotal = mktStores.reduce((acc, s) => acc + (Number(s.gmvBase) || 0), 0);
                    const currentTarget = mktStores.reduce((acc, s) => acc + calculateTarget(s, false).target, 0);
                    const expectedTarget = mktStores.reduce((acc, s) => acc + calculateTarget(s, true).target, 0);

                    return (
                      <div key={mkt} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="min-w-[150px]">
                          <h4 className="font-bold text-white uppercase">{mkt}</h4>
                          <p className="text-[10px] text-gray-500 mt-1">{mktStores.length} lojas • Base: {formatCurrency(baseTotal)}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 w-max shrink-0">
                          <span className="text-gray-500 font-bold">+</span>
                          <input type="number" placeholder="0" value={localMktMap[mkt] !== undefined ? localMktMap[mkt] : ''} onChange={e => { const val = e.target.value; setLocalMktMap(p => { const newMap = {...p}; if(val === '') delete newMap[mkt]; else newMap[mkt] = val; return newMap; })}} className="bg-transparent text-white w-16 outline-none font-bold text-center text-sm placeholder:text-gray-600 placeholder:font-normal" />
                          <span className="text-gray-500 font-bold text-sm">%</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm w-full xl:w-auto xl:justify-end">
                          <div className="text-right flex-1 xl:flex-none"><p className="text-[9px] text-gray-500 uppercase font-bold">Meta Atual</p><p className="text-gray-400 font-medium">{formatCurrency(currentTarget)}</p></div>
                          <ArrowRight size={14} className="text-gray-600 shrink-0" />
                          <div className="text-right flex-1 xl:flex-none"><p className="text-[9px] text-indigo-400 uppercase font-bold">Esperado</p><p className="text-indigo-400 font-bold">{formatCurrency(expectedTarget)}</p></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'clientes' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-sm text-gray-400 mb-4">Crescimento por Cliente. Soma-se à Global e ao Canal.</p>
                <div className="space-y-3">
                  {clients.map(client => {
                    const clientStores = stores.filter(s => s.client === client && !s.arquivada);
                    const baseTotal = clientStores.reduce((acc, s) => acc + (Number(s.gmvBase) || 0), 0);
                    const currentTarget = clientStores.reduce((acc, s) => acc + calculateTarget(s, false).target, 0);
                    const expectedTarget = clientStores.reduce((acc, s) => acc + calculateTarget(s, true).target, 0);

                    return (
                      <div key={client} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="min-w-[150px]">
                          <h4 className="font-bold text-white">{client}</h4>
                          <p className="text-[10px] text-gray-500 mt-1">{clientStores.length} lojas • Base: {formatCurrency(baseTotal)}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 w-max shrink-0">
                          <span className="text-gray-500 font-bold">+</span>
                          <input type="number" placeholder="0" value={localClientMap[client] !== undefined ? localClientMap[client] : ''} onChange={e => { const val = e.target.value; setLocalClientMap(p => { const newMap = {...p}; if(val === '') delete newMap[client]; else newMap[client] = val; return newMap; })}} className="bg-transparent text-amber-400 w-16 outline-none font-bold text-center text-sm placeholder:text-gray-600 placeholder:font-normal" />
                          <span className="text-gray-500 font-bold text-sm">%</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm w-full xl:w-auto xl:justify-end">
                          <div className="text-right flex-1 xl:flex-none"><p className="text-[9px] text-gray-500 uppercase font-bold">Meta Atual</p><p className="text-gray-400 font-medium">{formatCurrency(currentTarget)}</p></div>
                          <ArrowRight size={14} className="text-gray-600 shrink-0" />
                          <div className="text-right flex-1 xl:flex-none"><p className="text-[9px] text-amber-400 uppercase font-bold">Esperado</p><p className="text-amber-400 font-bold">{formatCurrency(expectedTarget)}</p></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'lojas' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-sm text-gray-400 mb-4">Ajuste fino por Loja. Soma-se à Global, Canal e Cliente.</p>
                <div className="grid grid-cols-1 gap-3">
                  {stores.filter(s => !s.arquivada).map(store => {
                    const currentSim = calculateTarget(store, false);
                    const expectedSim = calculateTarget(store, true);

                    return (
                      <div key={store.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors">
                        <div className="flex-1 min-w-[200px]">
                          <h4 className="font-bold text-white">{store.store}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">{store.client}</span>
                            <span className="text-[10px] text-indigo-300 uppercase tracking-widest">{store.marketplace}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-2">Base: {formatCurrency(expectedSim.base)}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-black/40 px-2 py-1.5 rounded-lg border border-white/10 w-max shrink-0">
                          <select 
                            value={getLocalStoreData(store).type} 
                            onChange={e => setLocalStoreMap(p => ({...p, [store.id]: { ...getLocalStoreData(store), type: e.target.value }}))} 
                            className="bg-transparent text-gray-400 text-[11px] font-bold outline-none cursor-pointer pr-1"
                          >
                            <option value="percent">% Soma</option>
                            <option value="fixed">R$ Fixo</option>
                          </select>
                          <div className="w-px h-5 bg-white/10 mx-1"></div>
                          {getLocalStoreData(store).type === 'percent' ? (
                            <>
                              <span className="text-gray-500 font-bold text-sm">+</span>
                              <input type="number" placeholder="0" value={getLocalStoreData(store).percent} onChange={e => setLocalStoreMap(p => ({...p, [store.id]: { ...getLocalStoreData(store), percent: e.target.value }}))} className="bg-transparent text-emerald-400 w-12 outline-none font-bold text-center text-sm placeholder:text-gray-600 placeholder:font-normal" />
                              <span className="text-gray-500 font-bold text-sm">%</span>
                            </>
                          ) : (
                            <>
                              <span className="text-gray-500 font-bold text-sm">R$</span>
                              <input type="number" placeholder="10000" value={getLocalStoreData(store).fixed} onChange={e => setLocalStoreMap(p => ({...p, [store.id]: { ...getLocalStoreData(store), fixed: e.target.value }}))} className="bg-transparent text-emerald-400 w-24 outline-none font-bold text-center text-sm placeholder:text-gray-600 placeholder:font-normal" />
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm w-full xl:w-auto xl:justify-end">
                          <div className="text-right flex-1 xl:flex-none">
                            <p className="text-[9px] text-gray-500 uppercase font-bold">Atual {currentSim.rule === 'Meta Fixa' ? '(Fixo)' : `(${currentSim.rate}%)`}</p>
                            <p className="text-gray-400 font-medium">{formatCurrency(currentSim.target)}</p>
                          </div>


                          <ArrowRight size={14} className="text-gray-600 shrink-0" />
                          <div className="text-right flex-1 xl:flex-none bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            <p className="text-[9px] text-emerald-400 uppercase font-bold">Esperado ({expectedSim.rate}%)</p>
                            <p className="text-emerald-400 font-bold">{formatCurrency(expectedSim.target)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'eventos' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><CalendarDays size={18} className="text-orange-400"/> Programar Novo Evento</h3>
                  <p className="text-sm text-orange-200/70 mb-4">Agende dias promocionais (Ex: 6/6, Black Friday). Ao iniciar um evento, a War Room é liberada.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Nome do Evento</label>
                      <input type="text" value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} placeholder="Ex: 6/6 Shopee" className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-2.5 outline-none focus:border-orange-500 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Data</label>
                      <input type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-2.5 outline-none focus:border-orange-500 text-sm cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Meta GMV (R$)</label>
                      <input type="number" value={eventForm.target} onChange={e => setEventForm({...eventForm, target: e.target.value})} placeholder="0.00" className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-2.5 outline-none focus:border-orange-500 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Canais Participantes (Deixe vazio para todos)</label>
                    <div className="flex flex-wrap gap-2">
                      {activeMkts.map(mkt => {
                        const isSelected = eventForm.channels.includes(mkt);
                        return (
                          <button key={mkt} onClick={() => {
                            setEventForm(p => ({...p, channels: isSelected ? p.channels.filter(c => c !== mkt) : [...p.channels, mkt]}));
                          }} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors border ${isSelected ? 'bg-orange-500 border-orange-400 text-white' : 'bg-black/40 border-white/10 text-gray-400 hover:border-orange-500/50'}`}>
                            {mkt}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if(!eventForm.name || !eventForm.target) return toast.error("Preencha nome e meta.");
                      handleEventAction('schedule', { id: Date.now(), name: eventForm.name, date: eventForm.date, target: Number(eventForm.target), channels: eventForm.channels });
                      setEventForm({ name: '', target: '', date: '', channels: [] });
                    }} 
                    className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-colors"
                  >
                    Agendar Evento
                  </button>
                </div>

                <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-sm mt-8">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                    <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20"><Flame size={20} className="text-orange-400"/></div>
                    Histórico de Sazonalidades (Eventos Encerrados)
                  </h3>
                  
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-black/40 text-gray-400 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="p-4 pl-6">Nome do Evento</th>
                          <th className="p-4 text-blue-400">Meta Estipulada</th>
                          <th className="p-4 text-emerald-400">GMV Consolidado</th>
                          <th className="p-4 text-amber-400">Pedidos Entregues</th>
                          <th className="p-4 text-purple-400">Volume Físico</th>
                          <th className="p-4 text-right pr-6">Documentação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {pastEventsStats.map((ev, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors text-sm">
                            <td className="p-4 pl-6 font-bold text-white">{ev.name}</td>
                            <td className="p-4 font-bold text-blue-400">{ev.target > 0 ? formatCurrency(ev.target) : '-'}</td>
                            <td className="p-4 font-black text-emerald-400">{formatCurrency(ev.gmv)}</td>
                            <td className="p-4 text-gray-300 font-bold">{formatNumber(ev.orders)} <span className="text-[10px] text-gray-500 font-normal">pedidos</span></td>
                            <td className="p-4 text-gray-300 font-bold">{formatNumber(ev.units)} <span className="text-[10px] text-gray-500 font-normal">unidades</span></td>
                            <td className="p-4 text-right pr-6">
                              <button 
                                onClick={() => exportPastEventReport(ev.name)} 
                                className="bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-lg text-xs font-bold transition-colors border border-white/10 inline-flex items-center gap-2"
                              >
                                <Download size={14} /> Relatório
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pastEventsStats.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-gray-500 text-sm">
                              Nenhum evento encerrado encontrado no histórico das lojas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-sm">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Eventos Agendados</h4>
                  <div className="space-y-3">
                    {scheduledEvents.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Nenhum evento agendado.</p>}
                    {scheduledEvents.map(ev => (
                      <div key={ev.id} className="bg-black/30 border border-white/5 p-4 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <h5 className="font-bold text-white text-lg">{ev.name}</h5>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span>📅 {ev.date ? new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'}</span>
                            <span>🎯 Meta: {formatCurrency(ev.target)}</span>
                            {ev.channels.length > 0 && <span className="text-orange-400">🛍️ {ev.channels.join(', ')}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEventAction('delete', ev)} className="p-2 text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir">
                            <Trash2 size={18} />
                          </button>
                          <button onClick={() => {
                            if (activeEvent) return toast.error("Já existe um evento em andamento. Encerre-o na War Room primeiro.");
                            handleEventAction('start', ev);
                            onClose();
                          }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-md transition-colors">
                            <Play size={16} /> Iniciar Agora
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-white/10 bg-black/40 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white transition-colors text-sm">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all text-sm flex items-center gap-2 disabled:opacity-50">
            {isSaving ? '⏳ Salvando...' : <><Save size={16} /> Salvar Metas Acumulativas</>}
          </button>
        </div>
      </div>
    </div>
  );
}

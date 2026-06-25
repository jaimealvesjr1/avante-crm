import React, { useState, useMemo } from 'react';
import { History, X, Trash2, Edit2, Check, DollarSign, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function StoreHistoryModal({ isOpen, onClose, store, currentDay, formatCurrency, formatNumber, canEdit }) {
  if (!isOpen || !store) return null;

  const [activeTab, setActiveTab] = useState('diario');
  const [editingMonthId, setEditingMonthId] = useState(null);
  const [monthEditData, setMonthEditData] = useState({ gmv: 0, adsInvestment: 0, orders: 0, units: 0 });
  
  const [isAddingMonth, setIsAddingMonth] = useState(false);
  const [newMonthData, setNewMonthData] = useState({ monthValue: '', gmv: '', adsInvestment: '', orders: '', units: '' });

  const [editingDay, setEditingDay] = useState(null);
  const [dayEditData, setDayEditData] = useState({ dailyRevenue: 0, dailyAds: 0, dailyOrders: 0, dailyUnits: 0 });

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

  const sortedHistory = useMemo(() => {
    if (!store.history || store.history.length === 0) return [];
    // Ordena do menor para o maior para a matemática funcionar
    let historyAsc = [...store.history].sort((a, b) => a.day - b.day);
    
    // Deduz matematicamente o valor exato de cada dia isolado
    let enrichedHistory = historyAsc.map((item, index) => {
        let prevItem = index > 0 ? historyAsc[index - 1] : null;
        return {
            ...item,
            calcDailyRev: item.dailyRevenue !== undefined ? item.dailyRevenue : (item.revenue - (prevItem?.revenue || 0)),
            calcDailyAds: item.dailyAds !== undefined ? item.dailyAds : ((item.ads || 0) - (prevItem?.ads || 0)),
            calcDailyOrd: item.dailyOrders !== undefined ? item.dailyOrders : ((item.orders || 0) - (prevItem?.orders || 0)),
            calcDailyUni: item.dailyUnits !== undefined ? item.dailyUnits : ((item.units || 0) - (prevItem?.units || 0))
        };
    });
    // Retorna ordenado do dia mais recente para o mais antigo (visualização da tabela)
    return enrichedHistory.sort((a, b) => b.day - a.day);
  }, [store.history]);

  const startEditingDay = (row) => {
      setEditingDay(row.day);
      setDayEditData({
          dailyRevenue: parseSafeNumber(row.calcDailyRev),
          dailyAds: parseSafeNumber(row.calcDailyAds),
          dailyOrders: parseSafeNumber(row.calcDailyOrd),
          dailyUnits: parseSafeNumber(row.calcDailyUni)
      });
  };

  const saveDayEdit = async (day) => {
      try {
          let historyAsc = [...store.history].sort((a, b) => a.day - b.day);
          let newHistory = [];
          let accRev = 0, accAds = 0, accOrd = 0, accUni = 0;

          // Reconstrói a linha do tempo do zero com o dia alterado
          for (let i = 0; i < historyAsc.length; i++) {
              let item = { ...historyAsc[i] };
              let prevItem = i > 0 ? historyAsc[i - 1] : null;

              let derivedRev = item.dailyRevenue !== undefined ? item.dailyRevenue : (item.revenue - (prevItem?.revenue || 0));
              let derivedAds = item.dailyAds !== undefined ? item.dailyAds : ((item.ads || 0) - (prevItem?.ads || 0));
              let derivedOrd = item.dailyOrders !== undefined ? item.dailyOrders : ((item.orders || 0) - (prevItem?.orders || 0));
              let derivedUni = item.dailyUnits !== undefined ? item.dailyUnits : ((item.units || 0) - (prevItem?.units || 0));

              // Injeta a edição do usuário no dia correspondente
              if (item.day === day) {
                  derivedRev = parseSafeNumber(dayEditData.dailyRevenue);
                  derivedAds = parseSafeNumber(dayEditData.dailyAds);
                  derivedOrd = parseSafeNumber(dayEditData.dailyOrders);
                  derivedUni = parseSafeNumber(dayEditData.dailyUnits);
                  
                  // Salva os valores diários purificados para facilitar as próximas edições
                  item.dailyRevenue = derivedRev;
                  item.dailyAds = derivedAds;
                  item.dailyOrders = derivedOrd;
                  item.dailyUnits = derivedUni;
              }

              // Acumula os valores para frente
              accRev += derivedRev || 0;
              accAds += derivedAds || 0;
              accOrd += derivedOrd || 0;
              accUni += derivedUni || 0;

              item.revenue = accRev;
              item.ads = accAds;
              item.orders = accOrd;
              item.units = accUni;
              newHistory.push(item);
          }

          const updates = { 
              history: newHistory,
              currentRevenue: accRev,
              adsInvestment: accAds,
              orders: accOrd,
              units: accUni
          };

          await updateDoc(doc(db, "stores", store.id.toString()), updates);
          toast.success("Lançamento diário atualizado e acumulados recalculados!");
          setEditingDay(null);
      } catch (error) {
          toast.error("Erro ao atualizar o dia.");
      }
  };

  const handleDeleteDay = async (dayRecorded) => {
      if (!canEdit) return toast.error("Sem permissão.");
      if (!window.confirm(`Deseja realmente apagar o lançamento do Dia ${dayRecorded}?`)) return;
      try {
          const updatedHistory = store.history.filter(h => h.day !== dayRecorded);
          await updateDoc(doc(db, "stores", store.id.toString()), { history: updatedHistory });
          toast.success(`Dia ${dayRecorded} removido! Recarregue a página se os totais não atualizarem.`);
      } catch(e) {
          toast.error("Erro ao apagar registro.");
      }
  };

  // --- LÓGICA DOS FECHAMENTOS MENSAIS ---
  const monthlyHistory = useMemo(() => {
      if (!store.monthlyHistory) return [];
      const monthsOrder = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      return [...store.monthlyHistory].sort((a, b) => {
          const [mA, yA] = a.month.split('/');
          const [mB, yB] = b.month.split('/');
          return (parseInt(yB || 0, 10) * 100 + monthsOrder.indexOf(mB)) - (parseInt(yA || 0, 10) * 100 + monthsOrder.indexOf(mA));
      });
  }, [store.monthlyHistory]);

  const startEditingMonth = (item) => {
      const currentId = item.id || item.month; // Compatibilidade com legados
      setEditingMonthId(currentId);
      setMonthEditData({
          gmv: parseSafeNumber(item.gmv),
          adsInvestment: parseSafeNumber(item.adsInvestment || item.ads),
          orders: parseSafeNumber(item.orders),
          units: parseSafeNumber(item.units)
      });
  };

  const saveMonthEdit = async (itemId) => {
      try {
          const updatedHistory = store.monthlyHistory.map(m => {
              const currentId = m.id || m.month;
              if (currentId === itemId) {
                  return { 
                      ...m, 
                      gmv: parseSafeNumber(monthEditData.gmv), 
                      adsInvestment: parseSafeNumber(monthEditData.adsInvestment),
                      orders: parseSafeNumber(monthEditData.orders),
                      units: parseSafeNumber(monthEditData.units)
                  };
              }
              return m;
          });

          await updateDoc(doc(db, "stores", store.id.toString()), { monthlyHistory: updatedHistory });
          toast.success("Fechamento atualizado com sucesso!");
          setEditingMonthId(null);
      } catch (error) {
          toast.error("Erro ao atualizar o mês.");
      }
  };

  const handleDeleteMonth = async (itemId, monthName) => {
      if (!window.confirm(`Deseja realmente excluir o fechamento de ${monthName}?`)) return;
      try {
          const updatedHistory = store.monthlyHistory.filter(m => (m.id || m.month) !== itemId);
          await updateDoc(doc(db, "stores", store.id.toString()), { monthlyHistory: updatedHistory });
          toast.success("Mês excluído com sucesso!");
      } catch (error) {
          toast.error("Erro ao excluir o mês.");
      }
  };

  const saveNewMonth = async () => {
      if (!newMonthData.monthValue) return toast.error("Selecione o mês da competência.");

      const [year, month] = newMonthData.monthValue.split('-');
      const monthsOrder = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const monthStr = `${monthsOrder[parseInt(month, 10) - 1]}/${year.slice(-2)}`;

      if (store.monthlyHistory?.some(m => m.month === monthStr)) {
          return toast.error("Este mês já está lançado na tabela!");
      }

      const safeGmv = parseSafeNumber(newMonthData.gmv);
      const feePercent = Number(store.feePercent) || 0;
      const fixedFee = Number(store.fixedFee) || 0;
      const agencyRev = (store.feeType === 'fixed' || fixedFee > 0) ? fixedFee : safeGmv * (feePercent / 100);

      const newSnapshot = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          month: monthStr,
          gmv: safeGmv,
          adsInvestment: parseSafeNumber(newMonthData.adsInvestment),
          orders: parseSafeNumber(newMonthData.orders),
          units: parseSafeNumber(newMonthData.units),
          agencyRevenue: agencyRev,
          feeType: store.feeType || 'percent',
          feePercent: feePercent,
          fixedFee: fixedFee,
          closedAt: new Date().toISOString()
      };

      const updatedHistory = [...(store.monthlyHistory || []), newSnapshot];

      try {
          await updateDoc(doc(db, "stores", store.id.toString()), { monthlyHistory: updatedHistory });
          toast.success(`Mês ${monthStr} adicionado com sucesso!`);
          setIsAddingMonth(false);
          setNewMonthData({ monthValue: '', gmv: '', adsInvestment: '', orders: '', units: '' });
      } catch (error) {
          toast.error("Erro ao adicionar o mês retroativo.");
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="p-5 border-b border-white/5 bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Histórico da Loja</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">{store.store} • {store.marketplace || 'Marketplace'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button onClick={() => setActiveTab('diario')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'diario' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Lançamentos Diários</button>
              <button onClick={() => setActiveTab('mensal')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'mensal' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Meses Fechados</button>
            </div>
            
            {canEdit && activeTab === 'mensal' && !isAddingMonth && (
              <button onClick={() => setIsAddingMonth(true)} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ml-2">
                <Plus size={14} /> Lançar Mês Retroativo
              </button>
            )}
          </div>

          <button onClick={onClose} className="absolute sm:relative top-5 right-5 sm:top-auto sm:right-auto p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          
          {/* TABELA DE LANÇAMENTOS DIÁRIOS */}
          {activeTab === 'diario' && (
            sortedHistory.length > 0 ? (
              <div className="bg-black/20 rounded-2xl border border-white/5 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead className="bg-black/40 text-gray-400 text-[10px] uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="p-3 text-center w-16">Dia</th>
                      <th className="p-3 text-blue-400">Fat. Diário</th>
                      <th className="p-3 text-emerald-400">Pedidos</th>
                      <th className="p-3 text-purple-400">Unidades</th>
                      <th className="p-3 text-amber-400">Ads Diário</th>
                      {canEdit && <th className="p-3 text-right pr-6">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    {sortedHistory.map((row) => {
                      const isEditingDay = editingDay === row.day;
                      
                      return (
                      <tr key={row.day} className={`hover:bg-white/[0.01] transition-colors ${isEditingDay ? 'bg-indigo-900/10' : ''}`}>
                        <td className="p-3 font-bold text-white text-center bg-white/[0.01]">{row.day}</td>
                        
                        <td className="p-3 font-bold text-blue-400">
                            {isEditingDay ? <input type="number" step="0.01" value={dayEditData.dailyRevenue} onChange={e => setDayEditData({...dayEditData, dailyRevenue: e.target.value})} className="w-20 bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none" /> : formatCurrency(row.calcDailyRev)}
                        </td>
                        
                        <td className="p-3 font-medium text-emerald-400">
                            {isEditingDay ? <input type="number" value={dayEditData.dailyOrders} onChange={e => setDayEditData({...dayEditData, dailyOrders: e.target.value})} className="w-16 bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none" /> : `${formatNumber(row.calcDailyOrd)} ped`}
                        </td>
                        
                        <td className="p-3 font-medium text-purple-400">
                            {isEditingDay ? <input type="number" value={dayEditData.dailyUnits} onChange={e => setDayEditData({...dayEditData, dailyUnits: e.target.value})} className="w-16 bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none" /> : `${formatNumber(row.calcDailyUni)} un`}
                        </td>
                        
                        <td className="p-3 font-medium text-amber-500">
                            {isEditingDay ? <input type="number" step="0.01" value={dayEditData.dailyAds} onChange={e => setDayEditData({...dayEditData, dailyAds: e.target.value})} className="w-20 bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none" /> : formatCurrency(row.calcDailyAds)}
                        </td>

                        {canEdit && (
                          <td className="p-3 text-right pr-6">
                            {isEditingDay ? (
                                <div className="flex gap-1 justify-end">
                                    <button onClick={() => setEditingDay(null)} className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"><X size={14}/></button>
                                    <button onClick={() => saveDayEdit(row.day)} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"><Check size={14}/></button>
                                </div>
                            ) : (
                                <div className="flex gap-1 justify-end">
                                    <button onClick={() => startEditingDay(row)} className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-indigo-400 rounded transition-colors" title="Editar este dia">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDeleteDay(row.day)} className="p-1.5 bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded transition-colors" title="Excluir este dia">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                          </td>
                        )}
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-gray-500 text-sm">
                <History size={32} className="mx-auto mb-3 opacity-30 text-gray-400" />
                Nenhum dado diário registrado para esta loja na competência atual. 📈
              </div>
            )
          )}

          {/* TABELA DE FECHAMENTOS MENSAIS */}
          {activeTab === 'mensal' && (
            (monthlyHistory.length > 0 || isAddingMonth) ? (
              <div className="bg-black/20 rounded-2xl border border-white/5 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead className="bg-black/40 text-gray-400 text-[10px] uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="p-3 pl-5">Competência</th>
                      <th className="p-3 text-emerald-400">GMV</th>
                      <th className="p-3 text-amber-400">Ads</th>
                      <th className="p-3 text-purple-400">Unidades</th>
                      <th className="p-3 text-blue-400">Pedidos</th>
                      <th className="p-3 text-center">ROAS</th>
                      {canEdit && <th className="p-3 text-right pr-5">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                    
                    {isAddingMonth && (
                        <tr className="bg-indigo-900/20 border-b border-indigo-500/30">
                            <td className="p-3 pl-5">
                                <input type="month" value={newMonthData.monthValue} onChange={e => setNewMonthData({...newMonthData, monthValue: e.target.value})} className="w-28 bg-gray-900 border border-indigo-500 rounded p-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-400" />
                            </td>
                            <td className="p-3">
                                <input type="number" step="0.01" value={newMonthData.gmv} onChange={e => setNewMonthData({...newMonthData, gmv: e.target.value})} className="w-20 bg-gray-900 border border-emerald-500/50 rounded p-1.5 text-xs text-white outline-none focus:border-emerald-500" placeholder="R$ 0,00" />
                            </td>
                            <td className="p-3">
                                <input type="number" step="0.01" value={newMonthData.adsInvestment} onChange={e => setNewMonthData({...newMonthData, adsInvestment: e.target.value})} className="w-20 bg-gray-900 border border-amber-500/50 rounded p-1.5 text-xs text-white outline-none focus:border-amber-500" placeholder="R$ 0,00" />
                            </td>
                            <td className="p-3">
                                <input type="number" value={newMonthData.units} onChange={e => setNewMonthData({...newMonthData, units: e.target.value})} className="w-16 bg-gray-900 border border-purple-500/50 rounded p-1.5 text-xs text-white outline-none focus:border-purple-500" placeholder="0" />
                            </td>
                            <td className="p-3">
                                <input type="number" value={newMonthData.orders} onChange={e => setNewMonthData({...newMonthData, orders: e.target.value})} className="w-16 bg-gray-900 border border-blue-500/50 rounded p-1.5 text-xs text-white outline-none focus:border-blue-500" placeholder="0" />
                            </td>
                            <td className="p-3 text-center text-gray-500 font-bold">-</td>
                            <td className="p-3 text-right pr-5">
                                <div className="flex gap-1 justify-end">
                                    <button onClick={() => setIsAddingMonth(false)} className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors" title="Cancelar"><X size={14}/></button>
                                    <button onClick={saveNewMonth} className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors" title="Salvar Lançamento"><Check size={14}/></button>
                                </div>
                            </td>
                        </tr>
                    )}

                    {monthlyHistory.map((item) => {
                      const currentId = item.id || item.month;
                      const isEditing = editingMonthId === currentId;
                      const safeGmv = parseSafeNumber(item.gmv);
                      const safeAds = parseSafeNumber(item.adsInvestment || item.ads);
                      const roas = safeAds > 0 ? (safeGmv / safeAds).toFixed(2) : 0;

                      return (
                      <tr key={item.id} className={`hover:bg-white/[0.02] transition-colors ${isEditing ? 'bg-indigo-900/10' : ''}`}>
                        <td className="p-3 pl-5 font-bold text-white">{item.month}</td>
                        
                        <td className="p-3 font-bold text-emerald-400">
                            {isEditing ? <input type="number" step="0.01" value={monthEditData.gmv} onChange={e => setMonthEditData({...monthEditData, gmv: e.target.value})} className="w-20 bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none" /> : formatCurrency(safeGmv)}
                        </td>
                        
                        <td className="p-3 font-bold text-amber-400">
                            {isEditing ? <input type="number" step="0.01" value={monthEditData.adsInvestment} onChange={e => setMonthEditData({...monthEditData, adsInvestment: e.target.value})} className="w-20 bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none" /> : formatCurrency(safeAds)}
                        </td>

                        <td className="p-3 font-medium text-purple-400">
                            {isEditing ? <input type="number" value={monthEditData.units} onChange={e => setMonthEditData({...monthEditData, units: e.target.value})} className="w-16 bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none" /> : formatNumber(parseSafeNumber(item.units))}
                        </td>

                        <td className="p-3 font-medium text-blue-400">
                            {isEditing ? <input type="number" value={monthEditData.orders} onChange={e => setMonthEditData({...monthEditData, orders: e.target.value})} className="w-16 bg-gray-900 border border-gray-600 rounded p-1 text-xs text-white outline-none" /> : formatNumber(parseSafeNumber(item.orders))}
                        </td>

                        <td className="p-3 text-center font-bold text-gray-400">
                            {isEditing ? '-' : (roas > 0 ? `${roas}x` : '-')}
                        </td>

                        {canEdit && (
                          <td className="p-3 text-right pr-5">
                            {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                    <button onClick={() => setEditingMonthId(null)} className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors" title="Cancelar Edição"><X size={14}/></button>
                                    <button onClick={() => saveMonthEdit(currentId)} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors" title="Confirmar Alterações"><Check size={14}/></button>
                                </div>
                            ) : (
                                <div className="flex gap-1 justify-end">
                                    <button onClick={() => startEditingMonth(item)} className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-indigo-400 rounded transition-colors" title="Editar Valores Antigos">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDeleteMonth(currentId, item.month)} className="p-1.5 bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded transition-colors" title="Excluir este mês">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                          </td>
                        )}
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-gray-500 text-sm flex flex-col items-center justify-center">
                <DollarSign size={32} className="mb-3 opacity-30 text-emerald-400" />
                Esta loja ainda não possui meses fechados. 📦
                {canEdit && (
                    <button onClick={() => setIsAddingMonth(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2">
                        <Plus size={16} /> Fazer Primeiro Lançamento
                    </button>
                )}
              </div>
            )
          )}
        </div>

        {/* RODAPÉ INFORMATIVO */}
        <div className="p-4 border-t border-white/5 bg-black/10 text-[10px] text-gray-500 text-center shrink-0">
          {activeTab === 'diario' ? 'Os dados acima refletem as inserções diárias acumuladas e recalcula para frente se editados.' : 'Dados consolidados e guardados no fechamento de cada mês.'}
        </div>
      </div>
    </div>
  );
}

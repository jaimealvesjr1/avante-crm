import React, { useMemo, useState } from 'react';
import { TrendingUp, ShoppingCart, Activity, CreditCard, Clock, Zap, Target, Settings, Crown, Store, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Area, Line, Legend, Tooltip, Cell, LineChart, ReferenceLine } from 'recharts';

export default function ExecutiveDashboard({ dashboardData, formatCurrency, formatNumber, roasData, COLORS, currentDay, daysInMonth, canEdit, openGoalsModal }) {
  
  const predictedOrders = currentDay > 0 ? Math.round((dashboardData.totalOrders / currentDay) * daysInMonth) : 0;
  const avgAdsCostPerOrder = dashboardData.totalOrders > 0 ? dashboardData.totalGlobalAds / dashboardData.totalOrders : 0;
  const ticketMedioGlobal = dashboardData.totalOrders > 0 ? dashboardData.totalCurrentRevenue / dashboardData.totalOrders : 0;
  
  const avgRoas = useMemo(() => {
    return roasData.length > 0 ? roasData.reduce((acc, curr) => acc + curr.roas, 0) / roasData.length : 0;
  }, [roasData]);

  const dailyTargetAvg = daysInMonth > 0 ? (dashboardData.totalTarget || 0) / daysInMonth : 0;

  const glassTooltipStyle = {
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    fontSize: '13px'
  };

  // === LÓGICA DE TRAÇÃO DIÁRIA (Gráfico de Linhas) ===
  const dailyMetrics = useMemo(() => {
    const days = Array.from({ length: currentDay }, (_, i) => ({ day: i + 1, gmv: 0, isEvent: false }));

    dashboardData.flatFilteredStores.forEach(s => {
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

    return { days, avgGmv };
  }, [dashboardData, currentDay]);

  // === LÓGICA DO RANKING LATERAL (1/4 de Tela) ===
  const [rankingType, setRankingType] = useState('client'); // 'client' ou 'store'
  const [storeMetric, setStoreMetric] = useState('gmv'); // 'gmv' ou 'cpa'

  const dataAtual = new Date();
  dataAtual.setMonth(dataAtual.getMonth() - 1);
  const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const mesPassadoExato = `${mesesNomes[dataAtual.getMonth()]}/${String(dataAtual.getFullYear()).slice(-2)}`;

  const rankingData = useMemo(() => {
    if (rankingType === 'client') {
      const pastGlobalData = dashboardData?.historicalChartData?.find(h => h.month === mesPassadoExato);
      const pastGlobalGmv = pastGlobalData ? (pastGlobalData.ReceitaGlobal || 1) : 1;
      const currentGlobalGmv = dashboardData.totalCurrentRevenue || 1;

      return dashboardData.groupedClients.map(g => {
        let lastMonthGmv = 0;
        g.stores.forEach(s => {
            const pm = (s.monthlyHistory || []).find(h => h.month === mesPassadoExato);
            if (pm) lastMonthGmv += Number(pm.gmv) || 0;
        });

        const currentShare = (g.totalCurrentRevenue / currentGlobalGmv) * 100;
        const pastShare = pastGlobalGmv > 1 ? (lastMonthGmv / pastGlobalGmv) * 100 : 0;
        const evolution = currentShare - pastShare;

        return {
          id: g.client,
          name: g.client,
          value: g.totalCurrentRevenue,
          subtitle: `${currentShare.toFixed(1)}% Share`,
          evolution: evolution,
          metricLabel: formatCurrency(g.totalCurrentRevenue)
        };
      }).sort((a, b) => b.value - a.value);

    } else {
      // RANKING POR LOJA (Top Faturamento ou Custo por Conversão)
      let storesList = dashboardData.flatFilteredStores.map(s => {
        const cpa = s.orders > 0 ? (Number(s.adsInvestment) || 0) / s.orders : 0;
        return {
          id: s.id,
          name: s.store,
          subtitle: s.client,
          value: storeMetric === 'gmv' ? s.projectedGmv : cpa,
          metricLabel: storeMetric === 'gmv' ? formatCurrency(s.projectedGmv) : formatCurrency(cpa),
          orders: s.orders
        };
      });

      if (storeMetric === 'gmv') {
        storesList = storesList.filter(s => s.value > 0).sort((a, b) => b.value - a.value);
      } else {
        storesList = storesList.filter(s => s.orders > 0 && s.value > 0).sort((a, b) => a.value - b.value);
      }
      return storesList;
    }
  }, [dashboardData, rankingType, storeMetric, mesPassadoExato]);

  const renderGlobalProgressBar = () => {
    const target = dashboardData.totalTarget || 0;
    const current = dashboardData.totalCurrentRevenue || 0;
    const projected = dashboardData.totalProjected || 0;

    const safeTarget = target > 0 ? target : 1;
    const currentWidth = Math.min((current / safeTarget) * 80, 100);
    const projectedWidth = Math.min((projected / safeTarget) * 80, 100);
    const currentPercent = ((current / safeTarget) * 100).toFixed(1);
    const projectedPercent = ((projected / safeTarget) * 100).toFixed(1);

    return (
      <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full relative transition-all duration-300">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Target className="text-blue-400" size={24} /> Progresso Global
              </h2>
              {canEdit && (
                <button onClick={openGoalsModal} className="p-1.5 rounded-lg transition-colors bg-white/5 text-gray-400 hover:text-white hover:bg-white/10" title="Abrir Central de Metas (MoM)">
                  <Settings size={18} />
                </button>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1">Faturamento consolidado de todos os clientes</p>
          </div>
          <div className="flex flex-wrap gap-4 md:gap-8 bg-black/20 p-3 rounded-2xl border border-white/5">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Hoje (Atual)</span>
              <span className="text-xl font-bold text-blue-400">{formatCurrency(current)} <span className="text-xs text-blue-400/70">({currentPercent}%)</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Projeção Fim do Mês</span>
              <span className="text-xl font-bold text-indigo-400">{formatCurrency(projected)} <span className="text-xs text-indigo-400/70">({projectedPercent}%)</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Meta Global</span>
              <span className="text-xl font-bold text-white">{formatCurrency(target)}</span>
            </div>
          </div>
        </div>

        <div className="relative pt-6 pb-2">
          <div className="h-8 bg-black/40 rounded-full border border-white/10 shadow-inner overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-indigo-500/20 transition-all duration-1000 ease-out border-r border-indigo-500/50" style={{ width: `${projectedWidth}%` }}>
              <div className="w-full h-full opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)' }}></div>
            </div>
            {(() => {
              let barGradient = "from-blue-600 to-cyan-400";
              let shadowColor = "rgba(56,189,248,0.4)";
              if (currentPercent >= 100) { barGradient = "from-emerald-600 to-emerald-400"; shadowColor = "rgba(16,185,129,0.4)"; } 
              else if (currentPercent >= 80) { barGradient = "from-amber-500 to-yellow-400"; shadowColor = "rgba(245,158,11,0.4)"; }
              return <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${barGradient} transition-all duration-1000 ease-out shadow-[0_0_20px_${shadowColor}]`} style={{ width: `${currentWidth}%` }}></div>;
            })()}
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-white to-gray-300 shadow-[0_0_15px_rgba(255,255,255,1)] z-10" style={{ left: '80%' }}>
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white text-black text-[11px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1">META</div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-[10px] font-bold">100%</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full">
      
      {/* BARRA SUPERIOR (META) */}
      {renderGlobalProgressBar()}

      <div className="flex flex-col xl:flex-row gap-6 w-full">
        
        {/* COLUNA ESQUERDA (3/4 de largura) */}
        <div className="flex flex-col gap-6 xl:w-3/4">
          
          {/* LINHA 1: Cartões (Volume / Ads / Agência) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/[0.02] backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner"><ShoppingCart size={20} className="text-emerald-400" /></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md border border-white/5">Volume</span>
              </div>
              <div className="space-y-4 relative z-10">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Projeção Pedidos</p>
                  <p className="text-3xl font-bold text-white tracking-tight">{formatNumber(predictedOrders)} <span className="text-sm text-gray-500 font-medium">UN</span></p>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Ticket Médio</p>
                    <p className="text-sm font-bold text-emerald-300">{formatCurrency(ticketMedioGlobal)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Físico</p>
                    <p className="text-sm font-bold text-gray-300">{formatNumber(dashboardData.totalUnits)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.02] backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner"><Activity size={20} className="text-amber-400" /></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md border border-white/5">Ads</span>
              </div>
              <div className="space-y-4 relative z-10">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">ROAS Médio</p>
                  <p className="text-3xl font-bold text-white tracking-tight">{dashboardData.globalRoas}<span className="text-xl text-amber-400">x</span></p>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Investido</p>
                    <p className="text-sm font-bold text-amber-300">{formatCurrency(dashboardData.totalGlobalAds)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">CPA</p>
                    <p className="text-sm font-bold text-gray-300">{formatCurrency(avgAdsCostPerOrder)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.02] backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-purple-400 to-indigo-600 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
              <div className="flex justify-between items-start mb-4 relative z-10 pl-2">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-inner"><CreditCard size={20} className="text-purple-400" /></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md border border-white/5">Agência</span>
              </div>
              <div className="space-y-4 relative z-10 pl-2">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Receita Projetada</p>
                  <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(dashboardData.totalAgencyRevenue)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Atual</p>
                    <p className="text-sm font-bold text-purple-300">{formatCurrency(dashboardData.totalAgencyRevenueActual)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Meta Receita</p>
                    <p className="text-sm font-bold text-gray-300">{formatCurrency(dashboardData.agencyTarget)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-white/5 pb-4 gap-3">
                <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <Activity size={16} className="text-blue-400" /> Tração do Faturamento Diário
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-emerald-400/80 uppercase border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded" title="O que precisamos faturar por dia para bater a meta">
                    Média Ideal: {formatCurrency(dailyTargetAvg)}
                  </span>
                  <span className="text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1" title="O que estamos realmente faturando por dia">
                    Média Real: {formatCurrency(dailyMetrics.avgGmv)}
                  </span>
                </div>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyMetrics.days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                    <Tooltip 
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} 
                      contentStyle={glassTooltipStyle} 
                      formatter={(value, name, props) => {
                        const isAboveAvg = value > dailyMetrics.avgGmv;
                        const label = props.payload.isEvent ? '🔥 Pico Sazonal' : (isAboveAvg ? '📈 Acima da Média' : '📉 Faturamento');
                        return [formatCurrency(value), label];
                      }}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    
                    <Line type="monotone" dataKey="gmv" stroke="#3B82F6" strokeWidth={3} 
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        const isAboveAvg = payload.gmv > dailyMetrics.avgGmv;
                        
                        if (payload.isEvent) return <circle cx={cx} cy={cy} r={5} fill="#F97316" stroke="#fff" strokeWidth={1} />;
                        if (isAboveAvg) return <circle cx={cx} cy={cy} r={3} fill="#10B981" stroke="none" />;
                        return <circle cx={cx} cy={cy} r={3} fill="#6B7280" stroke="none" />;
                      }} 
                      activeDot={{ r: 7, fill: '#60A5FA', stroke: '#fff', strokeWidth: 2 }} 
                    />
                    
                    {/* Linha da Média Realizada (Laranja/Âmbar) */}
                    {dailyMetrics.avgGmv > 0 && (
                      <ReferenceLine y={dailyMetrics.avgGmv} stroke="#F59E0B" strokeDasharray="3 3" opacity={0.4} label={{ position: 'insideTopRight', value: 'Real', fill: '#F59E0B', fontSize: 12 }} />
                    )}

                    {/* NOVA: Linha da Média Necessária/Ideal (Verde) */}
                    {dailyTargetAvg > 0 && (
                      <ReferenceLine y={dailyTargetAvg} stroke="#10B981" strokeDasharray="3 3" opacity={0.4} label={{ position: 'insideBottomRight', value: 'Meta', fill: '#10B981', fontSize: 12 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-1 bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2"><Zap size={16} className="text-amber-400"/> ROAS</h3>
                <span className="text-[12px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Média: {avgRoas.toFixed(1)}x</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roasData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={70} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={glassTooltipStyle} formatter={(value) => `${value}x`} />
                    <Bar dataKey="roas" radius={[0, 4, 4, 0]} barSize={12}>
                      {roasData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.roas >= avgRoas ? '#10B981' : '#F43F5E'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* LINHA 3: Evolução Histórica (3/5) + Faturamento Canais (2/5) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm flex flex-col h-[350px]">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4 shrink-0">
                <TrendingUp size={16} className="text-blue-400"/>
                <h3 className="text-lg font-bold text-white tracking-wide">Evolução Histórica Global</h3>
              </div>
              <div className="flex-1 w-full relative">
                {dashboardData.historicalChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dashboardData.historicalChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGlobal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorAgency" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" hide />
                      <YAxis yAxisId="right" orientation="right" hide />
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div style={glassTooltipStyle} className="p-3 min-w-[200px]">
                                <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider border-b border-white/10 pb-2">{label}</p>
                                <div className="flex flex-col gap-1.5">
                                  {payload.map((entry, index) => {
                                    if (label !== 'Atual' && (entry.name.includes('Projeção') || entry.name.includes('Meta'))) return null;
                                    return (
                                      <div key={index} className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-1.5"><span style={{ color: entry.color }}>●</span><span className="text-gray-300">{entry.name}</span></div>
                                        <span className="font-bold text-white ml-3">{formatCurrency(entry.value)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                      <Legend verticalAlign="top" height={30} iconSize={8} wrapperStyle={{fontSize: '11px'}}/>
                      <Area yAxisId="left" type="monotone" dataKey="ReceitaGlobal" name="Receita Clientes" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorGlobal)" />
                      <Area yAxisId="right" type="monotone" dataKey="ReceitaAgencia" name="Receita Real Ag." stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorAgency)" />
                      <Line yAxisId="right" type="monotone" dataKey="ProjecaoAgencia" name="Projeção Ag." stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={2} dot={{r:3}} connectNulls />
                      <Line yAxisId="right" type="monotone" dataKey="MetaAgencia" name="Meta Ag." stroke="#8B5CF6" strokeDasharray="4 4" strokeWidth={2} dot={{r:3}} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-xs">Sem dados históricos.</div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm flex flex-col h-[350px]">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4 shrink-0">
                <ShoppingCart size={16} className="text-emerald-400"/>
                <h3 className="text-lg font-bold text-white tracking-wide">Faturamento Canais</h3>
              </div>
              <div className="flex-1 w-full relative">
                {dashboardData.rankingMarketplaces.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.rankingMarketplaces} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} vertical={true} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={9} width={75} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={glassTooltipStyle} formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="passado" name="Mês Anterior" fill="#4B5563" radius={[0, 4, 4, 0]} barSize={8} />
                      <Bar dataKey="atual" name="Mês Atual" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-xs">Sem faturamento registrado.</div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA (1/4 de largura) - SUPER RANKING */}
        <div className="xl:w-1/4 flex flex-col gap-4 bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
          <div className="p-5 border-b border-white/5 bg-black/20 shrink-0">
            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
              <Crown size={26} className="text-amber-400" /> Ranking Geral
            </h3>
            
            <div className="flex bg-black/40 rounded-xl p-1 mb-4 shadow-inner">
              <button
                onClick={() => setRankingType('client')} 
                className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-lg transition-all ${rankingType === 'client' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Por Cliente
              </button>
              <button 
                onClick={() => setRankingType('store')} 
                className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-lg transition-all ${rankingType === 'store' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Por Loja
              </button>
            </div>

            {rankingType === 'store' && (
              <div className="flex items-center gap-2 px-1">
                <Filter size={14} className="text-gray-500" />
                <select 
                  value={storeMetric} 
                  onChange={(e) => setStoreMetric(e.target.value)}
                  className="bg-transparent text-[10px] font-bold text-gray-300 outline-none cursor-pointer hover:text-white transition-colors uppercase tracking-wider"
                >
                  <option value="gmv" className="bg-gray-900">Faturamento Projetado</option>
                  <option value="cpa" className="bg-gray-900">Custo p/ Conversão (CPA)</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {rankingData.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl p-3 transition-colors flex items-center gap-3">
                
                {/* Ícone de Posição */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : idx === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' : idx === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                  {idx + 1}º
                </div>
                
                {/* Meio: Nomes e Evolução */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-white truncate leading-tight">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest truncate font-semibold">{item.subtitle}</span>
                    
                    {rankingType === 'client' && (
                      <span className={`text-[10px] font-bold px-1.5 py-[1px] rounded ${item.evolution >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {item.evolution > 0 ? '+' : ''}{item.evolution.toFixed(1)}% Share
                      </span>
                    )}
                  </div>
                </div>

                {/* Direita: Valor e Pedidos */}
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-black text-indigo-300">{item.metricLabel}</p>
                  {rankingType === 'store' && item.orders > 0 && (
                    <p className="text-[10px] font-bold text-emerald-400/70 mt-0.5">{item.orders} ped</p>
                  )}
                </div>

              </div>
            ))}
            {rankingData.length === 0 && (
              <p className="text-center text-gray-500 text-xs py-10">Nenhum dado para o ranking.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

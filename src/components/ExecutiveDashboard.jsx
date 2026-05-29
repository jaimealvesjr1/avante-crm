import React, { useMemo } from 'react';
import { TrendingUp, ShoppingCart, Activity, CreditCard, AlertCircle, CheckCircle, Clock, Zap, Target, PieChartIcon, Award } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend } from 'recharts';

export default function ExecutiveDashboard({ dashboardData, formatCurrency, pieData, roasData, COLORS, currentDay, daysInMonth }) {
  
  const predictedOrders = currentDay > 0 ? Math.round((dashboardData.totalOrders / currentDay) * daysInMonth) : 0;
  const avgAdsCostPerOrder = dashboardData.totalOrders > 0 ? dashboardData.totalGlobalAds / dashboardData.totalOrders : 0;
  const ticketMedioGlobal = dashboardData.totalOrders > 0 ? dashboardData.totalCurrentRevenue / dashboardData.totalOrders : 0;
  
  const avgRoas = useMemo(() => {
    return roasData.length > 0 ? roasData.reduce((acc, curr) => acc + curr.roas, 0) / roasData.length : 0;
  }, [roasData]);

  const topStoresData = useMemo(() => {
    return dashboardData.flatFilteredStores
      .filter(s => s.projectedGmv > 0)
      .sort((a, b) => b.projectedGmv - a.projectedGmv)
      .slice(0, 5)
      .map(s => ({
        name: s.store,
        revenue: s.projectedGmv,
        client: s.client
      }));
  }, [dashboardData.flatFilteredStores]);

  const monthlyComparisonData = useMemo(() => {
    const monthlyStats = {};

    dashboardData.groupedClients.forEach(group => {
      const isFixed = group.feeType === 'fixed' || (group.stores[0]?.feeType === 'fixed') || Number(group.fixedFee || group.stores[0]?.fixedFee || 0) > 0;
      const fixedFee = Number(group.fixedFee || group.stores[0]?.fixedFee || 0);
      const feePercent = Number(group.feePercent || group.stores[0]?.feePercent || 0);

      const clientMonths = {};
      group.stores.forEach(store => {
        (store.monthlyHistory || []).forEach(h => {
          if (!clientMonths[h.month]) clientMonths[h.month] = 0;
          clientMonths[h.month] += h.gmv;
        });
      });

      Object.entries(clientMonths).forEach(([month, totalGmv]) => {
        if (!monthlyStats[month]) {
          monthlyStats[month] = { month, clientRevenue: 0, agencyRevenue: 0 };
        }
        
        monthlyStats[month].clientRevenue += totalGmv;
        
        if (isFixed) {
          monthlyStats[month].agencyRevenue += fixedFee;
        } else {
          monthlyStats[month].agencyRevenue += totalGmv * (feePercent / 100);
        }
      });
    });

    const data = Object.values(monthlyStats);
    data.push({
      month: 'Atual (Proj.)',
      clientRevenue: dashboardData.totalProjected,
      agencyRevenue: dashboardData.totalAgencyRevenue
    });
    
    return data;
  }, [dashboardData]);

  const changeLogs = useMemo(() => {
    return dashboardData.groupedClients.filter(g => g.status !== 'success').map(g => ({
      id: g.client,
      client: g.client,
      type: g.status === 'danger' ? 'danger' : 'warning',
      message: `A conta ${g.client} está operando em ${g.percentReached.toFixed(1)}% da meta projetada.`,
      time: 'Última atualização'
    }));
  }, [dashboardData]);

  const glassTooltipStyle = {
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    fontSize: '14px'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full">
      
      {/* 🌟 1. QUADROS DE KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner">
              <TrendingUp size={24} className="text-blue-400" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">Faturamento</span>
          </div>
          <div className="space-y-5 relative z-10">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1.5">Projetado Fim do Mês</p>
              <p className="text-4xl font-bold text-white tracking-tight">{formatCurrency(dashboardData.totalProjected)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Atual</p>
                <p className="text-base font-bold text-blue-300">{formatCurrency(dashboardData.totalCurrentRevenue)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Meta Global</p>
                <p className="text-base font-bold text-gray-300">{formatCurrency(dashboardData.totalTarget)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
              <ShoppingCart size={24} className="text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">Volume</span>
          </div>
          <div className="space-y-5 relative z-10">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1.5">Projeção de Pedidos</p>
              <p className="text-4xl font-bold text-white tracking-tight">{predictedOrders} <span className="text-lg text-gray-500 font-medium tracking-normal">un</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Ticket Médio</p>
                <p className="text-base font-bold text-emerald-300">{formatCurrency(ticketMedioGlobal)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Unid. Físicas</p>
                <p className="text-base font-bold text-gray-300">{dashboardData.totalUnits}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner">
              <Activity size={24} className="text-amber-400" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">Eficiência Ads</span>
          </div>
          <div className="space-y-5 relative z-10">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1.5">ROAS Global Médio</p>
              <p className="text-4xl font-bold text-white tracking-tight">{dashboardData.globalRoas}<span className="text-2xl text-amber-400">x</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Investido</p>
                <p className="text-base font-bold text-amber-300">{formatCurrency(dashboardData.totalGlobalAds)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Custo/Ped (CPA)</p>
                <p className="text-base font-bold text-gray-300">{formatCurrency(avgAdsCostPerOrder)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-purple-400 to-indigo-600 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
          <div className="flex justify-between items-start mb-5 relative z-10 pl-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-inner">
              <CreditCard size={24} className="text-purple-400" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">Receita Agência</span>
          </div>
          <div className="space-y-5 relative z-10 pl-3">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1.5">Receita Projetada</p>
              <p className="text-4xl font-bold text-white tracking-tight">{formatCurrency(dashboardData.totalAgencyRevenue)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Hoje</p>
                <p className="text-base font-bold text-purple-300">{formatCurrency(dashboardData.totalAgencyRevenueActual)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Meta Receita</p>
                <p className="text-base font-bold text-gray-300">{formatCurrency(dashboardData.agencyTarget)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 2. GRÁFICOS DE ANÁLISE SECUNDÁRIA */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6">
        
        {/* Gráfico 1: TOP 5 LOJAS */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20"><Award size={20} className="text-blue-400"/></div>
            <h3 className="text-lg font-bold text-white tracking-wide">Top 5 Lojas</h3>
          </div>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="99%" height={250} minWidth={0}>
              <BarChart data={topStoresData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={90} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={glassTooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={20}>
                  {topStoresData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Market Share */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Target size={20} className="text-indigo-400"/></div>
            <h3 className="text-lg font-bold text-white tracking-wide">Market Share (Clientes)</h3>
          </div>
          <div className="h-[300px] relative">
            <ResponsiveContainer width="99%" height={250} minWidth={0}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={90} outerRadius={125} paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={glassTooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Global</span>
              <span className="text-xl font-bold text-white">{formatCurrency(dashboardData.totalCurrentRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Gráfico 3: ROAS */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20"><Zap size={20} className="text-amber-400"/></div>
              <h3 className="text-lg font-bold text-white tracking-wide">Ranking de ROAS</h3>
            </div>
            <span className="bg-black/20 border border-white/10 px-3 py-1.5 rounded-lg text-sm font-bold text-gray-300">
              Média: <span className="text-amber-400">{avgRoas.toFixed(1)}x</span>
            </span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="99%" height={250} minWidth={0}>
              <BarChart data={roasData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={90} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={glassTooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value) => `${value}x`} />
                <Bar dataKey="roas" radius={[0, 6, 6, 0]} barSize={20}>
                  {roasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.roas >= avgRoas ? '#10B981' : '#F43F5E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 4: Faturamento por Canal */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <ShoppingCart size={20} className="text-emerald-400"/>
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide">Market Share (Canais)</h3>
          </div>
          <div className="h-[300px] w-full mt-4">
            {dashboardData.rankingMarketplaces.length > 0 ? (
              <ResponsiveContainer width="99%" height={250} minWidth={0}>
                <BarChart data={dashboardData.rankingMarketplaces} layout="vertical" margin={{ left: 0, right: 15, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} vertical={true} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={80} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(11, 15, 25, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }} formatter={(value) => formatCurrency(value)} />
                  {/* Agora com duas Barras para comparação MoM */}
                  <Bar dataKey="passado" name="Mês Anterior" fill="#6B7280" radius={[0, 4, 4, 0]} barSize={8} />
                  <Bar dataKey="atual" name="Mês Atual" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center mt-20 text-sm">Sem faturamento registrado.</p>
            )}
          </div>
        </div>

      </div>

      {/* 🌟 3. EVOLUÇÃO MENSAL E ALERTAS - AGORA FIXOS EM 400PX DE ALTURA */}
      <div className="grid grid-cols-1 2xl:grid-cols-4 gap-6">
        
        {/* EVOLUÇÃO */}
        <div className="bg-black/20 p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-400"/> Evolução Histórica (Dinâmica)</h3>
          <div className="h-80">
            {dashboardData.historicalChartData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                <AreaChart data={dashboardData.historicalChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGlobal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAgency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={(value) => formatCurrency(value)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                  <Area type="monotone" dataKey="ReceitaGlobal" name="Receita Global (Clientes)" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorGlobal)" />
                  <Area type="monotone" dataKey="ReceitaAgencia" name="Receita Avante" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorAgency)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Registre fechamentos passados nas lojas para gerar o gráfico histórico.
              </div>
            )}
          </div>
        </div>

        {/* LOG DE ALERTAS - Acompanhando a altura do Gráfico */}
        <div className="2xl:col-span-1 bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3 shrink-0">
            <div className="p-2.5 bg-gray-500/10 rounded-xl border border-white/10"><AlertCircle size={20} className="text-gray-400"/></div>
            Radar de Pacing
          </h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {changeLogs.map((log, i) => (
              <div key={i} className={`flex flex-col gap-3 p-4 rounded-2xl border backdrop-blur-md transition-all hover:scale-[1.02] ${log.type === 'danger' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl mt-0.5 ${log.type === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {log.type === 'danger' ? <AlertCircle size={18} /> : <Clock size={18} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-base mb-1">{log.client}</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">{log.message}</p>
                  </div>
                </div>
              </div>
            ))}
            {changeLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 p-6 text-emerald-400 text-base font-medium text-center h-full">
                <CheckCircle size={40} className="opacity-50" /> 
                <span>Excelente! Todas as contas operando dentro do ritmo.</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

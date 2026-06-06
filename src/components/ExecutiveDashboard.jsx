import React, { useMemo, useState } from 'react';
import { TrendingUp, ShoppingCart, Activity, CreditCard, AlertCircle, CheckCircle, Clock, Zap, Target, Award, Settings, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Area, Line, Legend } from 'recharts';

export default function ExecutiveDashboard({ dashboardData, formatCurrency, formatNumber, pieData, roasData, COLORS, currentDay, daysInMonth, canEdit, openGoalsModal }) {
  
  const predictedOrders = currentDay > 0 ? Math.round((dashboardData.totalOrders / currentDay) * daysInMonth) : 0;
  const avgAdsCostPerOrder = dashboardData.totalOrders > 0 ? dashboardData.totalGlobalAds / dashboardData.totalOrders : 0;
  const ticketMedioGlobal = dashboardData.totalOrders > 0 ? dashboardData.totalCurrentRevenue / dashboardData.totalOrders : 0;
  const [rankCriteria, setRankCriteria] = useState('gmv'); 

  const topStoresData = useMemo(() => {
    const sortedStores = [...dashboardData.flatFilteredStores].sort((a, b) => {
      if (rankCriteria === 'gmv') {
        return b.currentRevenue - a.currentRevenue; // Maior faturamento primeiro
      } else {
        const cpaA = a.units > 0 ? (a.adsInvestment / a.units) : Infinity;
        const cpaB = b.units > 0 ? (b.adsInvestment / b.units) : Infinity;
        return cpaA - cpaB; // Menor CPA (melhor) primeiro
      }
    });

    return sortedStores.slice(0, 5).map(store => {
      const cpa = store.units > 0 ? (store.adsInvestment / store.units) : 0;
      return {
        name: store.store,
        valueForChart: rankCriteria === 'gmv' ? store.currentRevenue : cpa, 
        cpaValue: cpa,
        gmvValue: store.currentRevenue
      };
    });
  }, [dashboardData.flatFilteredStores, rankCriteria]);
  
  const avgRoas = useMemo(() => {
    return roasData.length > 0 ? roasData.reduce((acc, curr) => acc + curr.roas, 0) / roasData.length : 0;
  }, [roasData]);

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
    backgroundColor: 'rgba(11, 15, 25, 0.9)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    fontSize: '14px'
  };

  const [showSettings, setShowSettings] = useState(false);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    const RADIAN = Math.PI / 180;
    // Joga o texto um pouco para fora do gráfico (1.2x o raio)
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central" 
        fontSize={11} 
        fontWeight="bold"
      >
        {`${name} ${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

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
      <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full mb-8 relative transition-all duration-300">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
          <div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Target className="text-blue-400" size={24} /> Progresso Global
                </h2>
                {canEdit && (
                  <button 
                    onClick={openGoalsModal} 
                    className="p-1.5 rounded-lg transition-colors bg-white/5 text-gray-400 hover:text-white hover:bg-white/10" 
                    title="Abrir Central de Metas (MoM)"
                  >
                    <Settings size={18} />
                  </button>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-1">Faturamento consolidado de todos os clientes</p>
            </div>
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
          {/* Fundo da Barra */}
          <div className="h-8 bg-black/40 rounded-full border border-white/10 shadow-inner overflow-hidden relative">
            {/* Barra da Projeção */}
            <div 
              className="absolute top-0 left-0 h-full bg-indigo-500/20 transition-all duration-1000 ease-out border-r border-indigo-500/50"
              style={{ width: `${projectedWidth}%` }}
            >
              <div className="w-full h-full opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)' }}></div>
            </div>

            {/* Barra Atual (Hoje) */}
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(56,189,248,0.4)]"
              style={{ width: `${currentWidth}%` }}
            ></div>
          </div>

          <div className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-white to-gray-300 shadow-[0_0_15px_rgba(255,255,255,1)] z-10" style={{ left: '80%' }}>
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white text-black text-[11px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
              META
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-[10px] font-bold">
              100%
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full">
      
      {/* 🌟 1. BARRA DE PROGRESSO GLOBAL SUBSTITUINDO O CARD */}
      {renderGlobalProgressBar()}

      {/* 🌟 2. QUADROS DE KPI RESTANTES (agora em 3 colunas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
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
              <p className="text-4xl font-bold text-white tracking-tight">{formatNumber(predictedOrders)} <span className="text-lg text-gray-500 font-medium tracking-normal">UN</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Ticket Médio</p>
                <p className="text-base font-bold text-emerald-300">{formatCurrency(ticketMedioGlobal)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Unidades Físicas</p>
                <p className="text-base font-bold text-gray-300">{formatNumber(dashboardData.totalUnits)}</p>
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
                <p className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-1">Custo por Conversão</p>
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

      {/* 🌟 3. GRÁFICOS SECUNDÁRIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Gráfico 1: TOP 5 LOJAS */}
        <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-sm h-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="text-emerald-400" size={16} /> Top 5 Lojas
            </h3>
            <div className="flex gap-1.5 bg-black/40 p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => setRankCriteria('gmv')} 
                className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${rankCriteria === 'gmv' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Por Faturamento
              </button>
              <button 
                onClick={() => setRankCriteria('cpa')} 
                className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${rankCriteria === 'cpa' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Por Custo p/ Conversão
              </button>
            </div>
          </div>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="99%" height={250} minWidth={0}>
              <BarChart data={topStoresData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={90} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                  contentStyle={glassTooltipStyle} 
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }} 
                  // Formata o Tooltip dependendo do que estamos olhando
                  formatter={(value, name, props) => [
                    formatCurrency(value), 
                    rankCriteria === 'gmv' ? 'Faturamento' : 'Custo p/ Conversão'
                  ]} 
                />
                {/* Mudamos dataKey="revenue" para dataKey="valueForChart" */}
                <Bar dataKey="valueForChart" radius={[0, 6, 6, 0]} barSize={20}>
                  {topStoresData.map((entry, index) => (
                    // Opcional: Se for CPA, pinte de vermelho (rose-500) para destacar que é custo
                    <Cell key={`cell-${index}`} fill={rankCriteria === 'cpa' ? '#F43F5E' : COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Market Share (Adicionado!) */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Target size={20} className="text-indigo-400"/></div>
            <h3 className="text-lg font-bold text-white tracking-wide">Market Share (Clientes)</h3>
          </div>
          <div className="h-[300px] relative">
            {pieData && pieData.length > 0 ? (
              <ResponsiveContainer width="99%" height={250} minWidth={0}>
                <PieChart>
                  <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={70} 
                    outerRadius={100} 
                    paddingAngle={4} 
                    dataKey="value" 
                    stroke="none"
                    label={renderCustomizedLabel}
                  >
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={glassTooltipStyle} 
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }} 
                    formatter={(value) => {
                      const total = pieData.reduce((sum, data) => sum + data.value, 0);
                      const percent = ((value / total) * 100).toFixed(1);
                      return [`${formatCurrency(value)} (${percent}%)`, 'Faturamento'];
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">Sem dados.</div>
            )}
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
            <h3 className="text-lg font-bold text-white tracking-wide">Faturamento Canais</h3>
          </div>
          <div className="h-[300px]">
            {dashboardData.rankingMarketplaces.length > 0 ? (
              <ResponsiveContainer width="99%" height={250} minWidth={0}>
                <BarChart data={dashboardData.rankingMarketplaces} layout="vertical" margin={{ left: 0, right: 15, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} vertical={true} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={80} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={glassTooltipStyle} formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="passado" name="Mês Anterior" fill="#4B5563" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="atual" name="Mês Atual" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center mt-20 text-sm">Sem faturamento registrado.</p>
            )}
          </div>
        </div>

      </div>

      {/* 🌟 4. EVOLUÇÃO MENSAL E ALERTAS */}
      <div className="grid grid-cols-1 2xl:grid-cols-4 gap-6">
        
        {/* EVOLUÇÃO (Ocupa 3/4 da tela) */}
        <div className="2xl:col-span-3 bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm overflow-hidden flex flex-col h-[420px]">
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20"><TrendingUp size={20} className="text-blue-400"/></div>
            <h3 className="text-lg font-bold text-white tracking-wide">Evolução Histórica Global (Mês a Mês)</h3>
          </div>
          
          <div className="flex-1 w-full relative">
            {dashboardData.historicalChartData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                <ComposedChart data={dashboardData.historicalChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGlobal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAgency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide />
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={glassTooltipStyle} className="p-3 min-w-[220px]">
                            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider border-b border-white/10 pb-2">
                              {label}
                            </p>
                            <div className="flex flex-col gap-2">
                              {payload.map((entry, index) => {
                                if (label !== 'Atual' && (entry.name.includes('Projeção') || entry.name.includes('Meta'))) {
                                  return null;
                                }
                                
                                return (
                                  <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <span style={{ color: entry.color }}>●</span>
                                      <span className="text-gray-300">{entry.name}</span>
                                    </div>
                                    <span className="font-bold text-white ml-4">
                                      {formatCurrency(entry.value)}
                                    </span>
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

                  <Legend verticalAlign="top" height={36}/>
                  
                  <Area yAxisId="left" type="monotone" dataKey="ReceitaGlobal" name="Receita dos Clientes" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorGlobal)" />
                  
                  <Area yAxisId="right" type="monotone" dataKey="ReceitaAgencia" name="Receita Real" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorAgency)" />
                  <Line yAxisId="right" type="monotone" dataKey="ProjecaoAgencia" name="Projeção Atual" stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={3} dot={{r:4}} connectNulls={true} />
                  <Line yAxisId="right" type="monotone" dataKey="MetaAgencia" name="Meta Avante" stroke="#8B5CF6" strokeDasharray="5 5" strokeWidth={3} dot={{r:4}} connectNulls={true} />
                  
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">Registre fechamentos nas lojas para gerar o gráfico histórico.</div>
            )}
          </div>
        </div>

        <div className="2xl:col-span-1 bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm overflow-hidden flex flex-col h-[420px]">
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

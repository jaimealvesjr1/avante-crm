import React, { useMemo } from 'react';
import { TrendingUp, ShoppingCart, Activity, CreditCard, AlertCircle, CheckCircle, Clock, Zap, Target, PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Legend } from 'recharts';

export default function ExecutiveDashboard({ dashboardData, formatCurrency, pieData, roasData, COLORS, currentDay, daysInMonth }) {
  
  // 1. Cálculos Adicionais
  const predictedOrders = currentDay > 0 ? Math.round((dashboardData.totalOrders / currentDay) * daysInMonth) : 0;
  const avgAdsCostPerOrder = dashboardData.totalOrders > 0 ? dashboardData.totalGlobalAds / dashboardData.totalOrders : 0;
  
  // 2. Lógica de Cores para o ROAS (Acima/Abaixo da média)
  const avgRoas = useMemo(() => {
    return roasData.length > 0 ? roasData.reduce((acc, curr) => acc + curr.roas, 0) / roasData.length : 0;
  }, [roasData]);

  // 3. Agregação por CLIENTE para evitar a multiplicação de taxa fixa por loja
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

  // 4. Alertas de Ritmo baseados em Metas
  const changeLogs = useMemo(() => {
    return dashboardData.groupedClients.filter(g => g.status !== 'success').map(g => ({
      id: g.client,
      client: g.client,
      type: g.status === 'danger' ? 'danger' : 'warning',
      message: `A conta ${g.client} está operando em ${g.percentReached.toFixed(1)}% da meta projetada.`,
      time: 'Última atualização'
    }));
  }, [dashboardData]);

  // Estilos globais para Tooltips dos Gráficos (Glassmorphism inline)
  const glassTooltipStyle = {
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <div className="bg-white/[0.02] backdrop-blur-xl p-6 md:p-5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-6 flex items-center gap-4">
        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 shadow-inner">
          <PieChartIcon size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Dashboard de Fechamento</h2>
          <p className="text-sm text-gray-400 mt-0.5">Métricas de desempenho até o momento.</p>
        </div>
      </div>
      
      {/* 🌟 QUADROS DE KPI (GLASSMORPHISM) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* FATURAMENTO */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner">
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-lg border border-white/5">Faturamento</span>
          </div>
          <div className="space-y-4 relative z-10">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Projetado Fim do Mês</p>
              <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(dashboardData.totalProjected)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Atual</p>
                <p className="text-sm font-bold text-blue-300">{formatCurrency(dashboardData.totalCurrentRevenue)}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Meta Global</p>
                <p className="text-sm font-bold text-gray-300">{formatCurrency(dashboardData.totalTarget)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* VOLUME DE VENDAS */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
              <ShoppingCart size={20} className="text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-lg border border-white/5">Volume</span>
          </div>
          <div className="space-y-4 relative z-10">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Projeção de Pedidos</p>
              <p className="text-3xl font-bold text-white tracking-tight">{predictedOrders} <span className="text-sm text-gray-500 font-medium tracking-normal">un</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Pedidos Atual</p>
                <p className="text-sm font-bold text-emerald-300">{dashboardData.totalOrders}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Produtos</p>
                <p className="text-sm font-bold text-gray-300">{dashboardData.totalUnits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ROAS MÉDIO */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner">
              <Activity size={20} className="text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-lg border border-white/5">Eficiência Ads</span>
          </div>
          <div className="space-y-4 relative z-10">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">ROAS Global Médio</p>
              <p className="text-3xl font-bold text-white tracking-tight">{dashboardData.globalRoas}<span className="text-lg text-amber-400">x</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Investido</p>
                <p className="text-sm font-bold text-amber-300">{formatCurrency(dashboardData.totalGlobalAds)}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Custo/Ped (CPA)</p>
                <p className="text-sm font-bold text-gray-300">{formatCurrency(avgAdsCostPerOrder)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RECEITA AVANTE */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-purple-400 to-indigo-600 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
          <div className="flex justify-between items-start mb-4 relative z-10 pl-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-inner">
              <CreditCard size={20} className="text-purple-400" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-lg border border-white/5">Receita Agência</span>
          </div>
          <div className="space-y-4 relative z-10 pl-2">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Receita Projetada</p>
              <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(dashboardData.totalAgencyRevenue)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Hoje</p>
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

      {/* 🌟 GRÁFICOS INTERMEDIÁRIOS (GLASS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PIE CHART */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Target size={18} className="text-indigo-400"/></div>
            <h3 className="text-base font-bold text-white tracking-wide">Market Share por Cliente</h3>
          </div>
          <div className="h-80 relative">
            <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={85} outerRadius={120} paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={glassTooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            {/* Texto Central do Gráfico Pizza */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Global</span>
              <span className="text-lg font-bold text-white">{formatCurrency(dashboardData.totalCurrentRevenue)}</span>
            </div>
          </div>
        </div>

        {/* BAR CHART ROAS */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20"><Zap size={18} className="text-amber-400"/></div>
              <h3 className="text-base font-bold text-white tracking-wide">Ranking de ROAS</h3>
            </div>
            <span className="bg-black/20 border border-white/10 px-3 py-1 rounded-lg text-xs font-bold text-gray-300">
              Média: <span className="text-amber-400">{avgRoas.toFixed(1)}x</span>
            </span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={roasData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={11} width={100} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={glassTooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} formatter={(value) => `${value}x`} />
                <Bar dataKey="roas" radius={[0, 6, 6, 0]} barSize={16}>
                  {roasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.roas >= avgRoas ? '#10B981' : '#F43F5E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 🌟 GRÁFICO DE COMPARAÇÃO MENSAL (DUAS LINHAS - GLASS) */}
      <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20"><Activity size={18} className="text-purple-400"/></div>
          <h3 className="text-base font-bold text-white tracking-wide">Evolução: Receita Clientes vs Agência</h3>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
              {/* Eixo Esquerdo - Faturamento Clientes */}
              <YAxis yAxisId="left" stroke="#3B82F6" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              {/* Eixo Direito Compactado - Receita Avante */}
              <YAxis yAxisId="right" orientation="right" stroke="#A855F7" fontSize={11} tickFormatter={(v) => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v}`} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={glassTooltipStyle} itemStyle={{ fontWeight: 'bold' }} formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#9CA3AF' }} iconType="circle" />
              <Line yAxisId="left" type="monotone" dataKey="clientRevenue" name="Receita Global Clientes" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#0B0F19' }} activeDot={{ r: 6, fill: '#3B82F6' }} />
              <Line yAxisId="right" type="monotone" dataKey="agencyRevenue" name="Receita Avante" stroke="#A855F7" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#0B0F19' }} activeDot={{ r: 6, fill: '#A855F7' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 🌟 LOG DE ALTERAÇÕES E ALERTAS (GLASS) */}
      <div className="bg-white/[0.02] backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/5 shadow-sm">
        <h3 className="text-base font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 bg-gray-500/10 rounded-xl border border-white/10"><AlertCircle size={18} className="text-gray-400"/></div>
          Radar de Pacing e Mudanças de Ritmo
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {changeLogs.map((log, i) => (
            <div key={i} className={`flex flex-col gap-3 p-4 rounded-2xl border backdrop-blur-md transition-all hover:scale-[1.01] ${log.type === 'danger' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl mt-0.5 ${log.type === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {log.type === 'danger' ? <AlertCircle size={16} /> : <Clock size={16} />}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm mb-1">{log.client}</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">{log.message}</p>
                </div>
              </div>
              <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider text-right w-full border-t border-white/5 pt-2">
                {log.time}
              </div>
            </div>
          ))}
          {changeLogs.length === 0 && (
            <div className="col-span-full flex items-center justify-center gap-3 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm font-medium">
              <CheckCircle size={24} /> 
              <span>Excelente! Todas as contas estão operando dentro do ritmo ou acima da meta.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

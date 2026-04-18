import React, { useMemo } from 'react';
import { TrendingUp, ShoppingCart, Activity, CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Legend } from 'recharts';

export default function ExecutiveDashboard({ dashboardData, formatCurrency, pieData, roasData, COLORS, currentDay, daysInMonth }) {
  
  // 1. Cálculos Adicionais
  const predictedOrders = currentDay > 0 ? Math.round((dashboardData.totalOrders / currentDay) * daysInMonth) : 0;
  const avgAdsCostPerOrder = dashboardData.totalOrders > 0 ? dashboardData.totalGlobalAds / dashboardData.totalOrders : 0;
  
  // 2. Lógica de Cores para o ROAS (Acima/Abaixo da média)
  const avgRoas = useMemo(() => {
    return roasData.length > 0 ? roasData.reduce((acc, curr) => acc + curr.roas, 0) / roasData.length : 0;
  }, [roasData]);

  // 3. Agregação para Gráfico Mensal (Duas Linhas)
  const monthlyComparisonData = useMemo(() => {
    const monthlyStats = {};

    dashboardData.groupedClients.forEach(group => {
      group.stores.forEach(store => {
        (store.monthlyHistory || []).forEach(h => {
          if (!monthlyStats[h.month]) monthlyStats[h.month] = { month: h.month, clientRevenue: 0, agencyRevenue: 0 };
          monthlyStats[h.month].clientRevenue += h.gmv;
          const isFixed = store.feeType === 'fixed' || store.fixedFee > 0;
          monthlyStats[h.month].agencyRevenue += isFixed ? Number(store.fixedFee) : h.gmv * (Number(store.feePercent) / 100);
        });
      });
    });

    const data = Object.values(monthlyStats);
    // Adiciona o mês atual como projeção
    data.push({
      month: 'Atual (Proj.)',
      clientRevenue: dashboardData.totalProjected,
      agencyRevenue: dashboardData.totalAgencyRevenue
    });
    return data;
  }, [dashboardData]);

  // 4. Mock de Log de Alterações (Para demonstrar a UI)
  const changeLogs = useMemo(() => {
    return dashboardData.groupedClients.filter(g => g.status !== 'success').map(g => ({
      id: g.client,
      client: g.client,
      type: g.status === 'danger' ? 'danger' : 'warning',
      message: `A conta ${g.client} está operando em ${g.percentReached.toFixed(1)}% da meta projetada.`,
      time: 'Última atualização'
    }));
  }, [dashboardData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. QUADROS DE KPI (REESTRUTURADOS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* FATURAMENTO */}
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Faturamento</span>
            <TrendingUp size={18} className="text-gray-500" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Projetado</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData.totalProjected)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-gray-700 pt-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Atual</p>
                <p className="text-sm font-bold text-gray-300">
                  {formatCurrency(dashboardData.totalCurrentRevenue)} 
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Meta</p>
                <p className="text-sm font-bold text-gray-300">{formatCurrency(dashboardData.totalTarget)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* VOLUME DE VENDAS */}
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Volume</span>
            <ShoppingCart size={18} className="text-gray-500" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Prev. Fim do Mês</p>
              <p className="text-2xl font-bold text-white">{predictedOrders} Pedidos</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-gray-700 pt-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Total Pedidos</p>
                <p className="text-sm font-bold text-gray-300">{dashboardData.totalOrders}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Unidades</p>
                <p className="text-sm font-bold text-gray-300">{dashboardData.totalUnits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ROAS MÉDIO */}
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Ads & Eficiência</span>
            <Activity size={18} className="text-gray-500" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">ROAS Global</p>
              <p className="text-2xl font-bold text-white">{dashboardData.globalRoas}x</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-gray-700 pt-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Investido</p>
                <p className="text-sm font-bold text-gray-300">{formatCurrency(dashboardData.totalGlobalAds)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Custo/Ped</p>
                <p className="text-sm font-bold text-gray-300">{formatCurrency(avgAdsCostPerOrder)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RECEITA AVANTE */}
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-purple-600"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Receita Avante</span>
            <CreditCard size={18} className="text-gray-500" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Projetado</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData.totalAgencyRevenue)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-gray-700 pt-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Hoje</p>
                <p className="text-sm font-bold text-gray-300">{formatCurrency(dashboardData.totalAgencyRevenueActual)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Meta (Calc)</p>
                <p className="text-sm font-bold text-gray-300">{formatCurrency(dashboardData.agencyTarget)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRÁFICOS INTERMEDIÁRIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-6">Participação por Cliente</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-6">Ranking de ROAS (Média: {avgRoas.toFixed(1)}x)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roasData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={11} width={100} />
                <Tooltip cursor={{ fill: '#374151' }} contentStyle={{ backgroundColor: '#111827', border: 'none' }} formatter={(value) => `${value}x`} />
                <Bar dataKey="roas" radius={[0, 4, 4, 0]} barSize={20}>
                  {roasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.roas >= avgRoas ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. GRÁFICO DE COMPARAÇÃO MENSAL (DUAS LINHAS) */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-6">Evolução: Clientes vs Agência</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
              <YAxis yAxisId="left" stroke="#3B82F6" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" stroke="#8B5CF6" fontSize={12} tickFormatter={(v) => `R$${v}`} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none' }} formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="clientRevenue" name="Receita Clientes" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="agencyRevenue" name="Receita Avante" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. LOG DE ALTERAÇÕES (FULL WIDTH) */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity size={20} className="text-blue-500" /> Alertas e Mudanças de Ritmo
        </h3>
        <div className="space-y-3">
          {changeLogs.map((log, i) => (
            <div key={i} className={`flex items-center gap-4 p-3 rounded-lg border ${log.type === 'danger' ? 'bg-red-900/10 border-red-900/30 text-red-400' : 'bg-amber-900/10 border-amber-900/30 text-amber-400'}`}>
              {log.type === 'danger' ? <AlertCircle size={18} /> : <Clock size={18} />}
              <div className="flex-1 text-sm font-medium">{log.message}</div>
              <div className="text-[10px] uppercase font-bold opacity-50">{log.time}</div>
            </div>
          ))}
          {changeLogs.length === 0 && (
            <div className="flex items-center gap-3 p-4 bg-green-900/10 border border-green-900/30 rounded-lg text-green-400 text-sm">
              <CheckCircle size={18} /> Todas as lojas estão operando dentro do ritmo esperado.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

import React, { useState } from 'react';
import { Target, TrendingUp, Activity, DollarSign, PieChart as PieChartIcon, Crosshair, Zap, Briefcase } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function ExecutiveDashboard({ dashboardData, formatCurrency, pieData, roasData, COLORS }) {
  // 1. Estado para o Simulador de Engenharia Reversa
  const [targetAgencyGoal, setTargetAgencyGoal] = useState(
    dashboardData.totalAgencyRevenue > 0 ? Math.round(dashboardData.totalAgencyRevenue * 1.2) : 50000
  );

  // 2. Lógica do Simulador Ampliado
  const gapAgency = targetAgencyGoal - dashboardData.totalAgencyRevenue;
  
  const variableClients = dashboardData.groupedClients.filter(c => c.stores.some(s => s.feePercent > 0));
  const totalVariableProjected = variableClients.reduce((acc, c) => acc + c.totalProjectedGmv, 0);
  const totalVariableAgencyRev = variableClients.reduce((acc, c) => acc + c.stores.reduce((sum, s) => sum + (s.projectedGmv * (s.feePercent / 100)), 0), 0);
  
  // Calcula a média real de comissão que a Avante ganha
  const averageFeePercent = totalVariableProjected > 0 ? (totalVariableAgencyRev / totalVariableProjected) : 0.015; 
  
  // Exigências calculadas
  const gmvDeficitGlobal = gapAgency > 0 ? (gapAgency / averageFeePercent) : 0;
  const currentGlobalRoas = Number(dashboardData.globalRoas) > 0 ? Number(dashboardData.globalRoas) : 10;
  const adsDeficitGlobal = gapAgency > 0 ? (gmvDeficitGlobal / currentGlobalRoas) : 0;

  // 3. Lógica para o novo Gráfico de Evolução Mensal (Histórico + Projeção)
  const evolutionMap = {};
  dashboardData.groupedClients.forEach(group => {
    group.stores.forEach(store => {
      (store.monthlyHistory || []).forEach(mh => {
        if (!evolutionMap[mh.month]) evolutionMap[mh.month] = 0;
        evolutionMap[mh.month] += store.fixedFee > 0 ? store.fixedFee : mh.gmv * (store.feePercent / 100);
      });
    });
  });
  
  const evolutionData = Object.keys(evolutionMap).map(month => ({ name: month, Faturamento: evolutionMap[month] }));
  // Adiciona a projeção do mês atual no fim do gráfico
  evolutionData.push({ name: 'Projeção (Atual)', Faturamento: dashboardData.totalAgencyRevenue });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      
      {/* SIMULADOR DE ENGENHARIA REVERSA AMPLIADO */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Crosshair className="text-blue-400" /> Simulador de Crescimento Avante</h2>
              <p className="text-sm text-gray-400 mt-1">Calcule o esforço operacional necessário para bater a meta financeira da agência.</p>
            </div>
            <Zap className="text-amber-500 opacity-20" size={48} />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Input da Meta */}
            <div className="w-full lg:w-1/3 bg-gray-900 p-5 rounded-lg border border-gray-700">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Meta de Honorários (R$)</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold text-2xl">R$</span>
                <input 
                  type="number" 
                  value={targetAgencyGoal} 
                  onChange={(e) => setTargetAgencyGoal(Number(e.target.value))}
                  className="bg-transparent border-b-2 border-blue-500 text-white font-bold text-3xl outline-none focus:border-blue-400 w-full pb-1"
                />
              </div>
            </div>

            {/* Resultados Analíticos */}
            <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 flex flex-col justify-center">
                <span className="text-[11px] text-gray-500 font-bold uppercase mb-1">Gap Financeiro</span>
                <span className={`text-xl font-bold ${gapAgency > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                  {gapAgency > 0 ? formatCurrency(gapAgency) : 'Meta Atingida! 🚀'}
                </span>
              </div>
              
              <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-900/30 flex flex-col justify-center">
                <span className="text-[11px] text-blue-400/70 font-bold uppercase mb-1">Necessidade de GMV</span>
                <span className="text-xl font-bold text-blue-400">
                  {gapAgency > 0 ? '+' + formatCurrency(gmvDeficitGlobal) : '-'}
                </span>
                <span className="text-[10px] text-gray-500 mt-1">Fee Médio Calculado: {(averageFeePercent * 100).toFixed(2)}%</span>
              </div>
              
              <div className="bg-purple-900/10 p-4 rounded-lg border border-purple-900/30 flex flex-col justify-center">
                <span className="text-[11px] text-purple-400/70 font-bold uppercase mb-1">Aporte de Ads Necessário</span>
                <span className="text-xl font-bold text-purple-400">
                  {gapAgency > 0 ? '+' + formatCurrency(adsDeficitGlobal) : '-'}
                </span>
                <span className="text-[10px] text-gray-500 mt-1">Baseado no ROAS de {currentGlobalRoas}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP CARDS DE ESTATÍSTICAS GLOBAIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-900/50 rounded-lg text-blue-400"><Target size={24} /></div>
          <div><p className="text-sm font-medium text-gray-400">GMV Projetado</p><h3 className="text-xl font-bold text-white">{formatCurrency(dashboardData.totalProjected)}</h3></div>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-5 rounded-xl border border-indigo-700/50 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-900/50 rounded-lg text-indigo-400"><Briefcase size={24} /></div>
          <div><p className="text-sm font-medium text-indigo-200/70">Honorários Avante (Proj.)</p><h3 className="text-xl font-bold text-indigo-300">{formatCurrency(dashboardData.totalAgencyRevenue)}</h3></div>
        </div>
        
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-900/50 rounded-lg text-amber-400"><Activity size={24} /></div>
          <div><p className="text-sm font-medium text-gray-400">Ads Investido (Total)</p><h3 className="text-xl font-bold text-white">{formatCurrency(dashboardData.totalGlobalAds)}</h3></div>
        </div>
        
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-green-900/50 rounded-lg text-green-400"><TrendingUp size={24} /></div>
          <div><p className="text-sm font-medium text-gray-400">ROAS Global</p><h3 className="text-xl font-bold text-green-400">{dashboardData.globalRoas}x</h3></div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* NOVO: Gráfico de Evolução Mensal (Area Chart) */}
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700 h-[380px] flex flex-col shadow-sm">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400"/> Evolução de Honorários Avante (Mês a Mês)
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickMargin={10} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} 
                  formatter={(value) => [formatCurrency(value), 'Faturamento da Agência']} 
                />
                <Area type="monotone" dataKey="Faturamento" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorFaturamento)" activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Representatividade */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-[350px] flex flex-col shadow-sm">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><PieChartIcon size={16} className="text-blue-400"/> Dependência de GMV por Cliente</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Ranking de ROAS */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-[350px] flex flex-col shadow-sm">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><DollarSign size={16} className="text-amber-400"/> Eficiência de Ads (Ranking ROAS)</h3>
          <div className="flex-1">
            {roasData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roasData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={10} tickFormatter={(val) => `${val}x`} />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={80} fontSize={10} />
                  <RechartsTooltip cursor={{ fill: '#374151', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }} formatter={(value) => [`${value}x`, 'ROAS']} />
                  <Bar dataKey="roas" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={16}>
                    {roasData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.roas < dashboardData.globalRoas ? '#EF4444' : '#F59E0B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm border border-dashed border-gray-700 rounded-lg">Nenhum investimento registado.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

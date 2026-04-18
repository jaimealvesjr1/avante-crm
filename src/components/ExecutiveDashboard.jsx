import React from 'react';
import { Target, TrendingUp, Activity, DollarSign, ShoppingCart, Package, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import GrowthSimulator from './GrowthSimulator.jsx';

export default function ExecutiveDashboard({ dashboardData, formatCurrency, pieData, roasData, COLORS }) {
  const averageTicket = dashboardData.totalOrders > 0 ? dashboardData.totalProjected / (dashboardData.totalOrders * (30/1)) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* GRID DE MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Faturamento Projetado</p>
              <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(dashboardData.totalProjected)}</h3>
            </div>
            <div className="p-2 bg-blue-900/30 rounded-lg text-blue-400"><TrendingUp size={20} /></div>
          </div>
          <div className="mt-3 text-xs text-gray-500">Meta Global: {formatCurrency(dashboardData.totalTarget)}</div>
        </div>

        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Volume de Vendas</p>
              <h3 className="text-2xl font-bold text-white mt-1">{dashboardData.totalOrders} Pedidos</h3>
            </div>
            <div className="p-2 bg-green-900/30 rounded-lg text-green-400"><ShoppingCart size={20} /></div>
          </div>
          <div className="mt-3 text-xs text-gray-500">{dashboardData.totalUnits} Unidades Enviadas</div>
        </div>

        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Eficiência Ads (ROAS)</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">{dashboardData.globalRoas}x</h3>
            </div>
            <div className="p-2 bg-amber-900/30 rounded-lg text-amber-400"><Activity size={20} /></div>
          </div>
          <div className="mt-3 text-xs text-gray-500">Investimento Total: {formatCurrency(dashboardData.totalGlobalAds)}</div>
        </div>

        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Receita da Agência</p>
              <h3 className="text-2xl font-bold text-purple-400 mt-1">{formatCurrency(dashboardData.totalAgencyRevenue)}</h3>
            </div>
            <div className="p-2 bg-purple-900/30 rounded-lg text-purple-400"><CreditCard size={20} /></div>
          </div>
          <div className="mt-3 text-xs text-gray-500">Projeção baseada em Fee + Fixo</div>
        </div>
      </div>

      {/* SEÇÃO DE GRÁFICOS */}
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
          <h3 className="text-lg font-bold text-white mb-6">Ranking de ROAS por Cliente</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roasData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
                <Tooltip cursor={{ fill: '#374151' }} contentStyle={{ backgroundColor: '#111827', border: 'none' }} formatter={(value) => `${value}x`} />
                <Bar dataKey="roas" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SIMULADOR DE CRESCIMENTO */}
      <GrowthSimulator formatCurrency={formatCurrency} />

    </div>
  );
}

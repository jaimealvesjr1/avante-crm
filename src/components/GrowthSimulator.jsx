import React, { useState } from 'react';
import { Target, TrendingUp, TrendingDown, Activity, CalendarDays, BarChart2 } from 'lucide-react';

export default function GrowthSimulator({ formatCurrency }) {
  // Valores iniciais de exemplo
  const [currentRevenue, setCurrentRevenue] = useState(45000);
  const [targetRevenue, setTargetRevenue] = useState(100000);
  const [currentDay, setCurrentDay] = useState(15);
  const [daysInMonth, setDaysInMonth] = useState(30);

  // Modificadores de ritmo para os cenários (em %)
  const [pessimisticDrop, setPessimisticDrop] = useState(15); // Ex: ritmo cai 15%
  const [optimisticBoost, setOptimisticBoost] = useState(20); // Ex: ritmo sobe 20%

  // Cálculos Base
  const runRate = currentDay > 0 ? currentRevenue / currentDay : 0;
  const daysLeft = Math.max(0, daysInMonth - currentDay);

  // Projeções Financeiras
  const projRealista = currentRevenue + (runRate * daysLeft);
  const projPessimista = currentRevenue + (runRate * (1 - (pessimisticDrop / 100)) * daysLeft);
  const projOtimista = currentRevenue + (runRate * (1 + (optimisticBoost / 100)) * daysLeft);

  // Percentuais de Alcance da Meta
  const pctRealista = targetRevenue > 0 ? (projRealista / targetRevenue) * 100 : 0;
  const pctPessimista = targetRevenue > 0 ? (projPessimista / targetRevenue) * 100 : 0;
  const pctOtimista = targetRevenue > 0 ? (projOtimista / targetRevenue) * 100 : 0;

  // Função auxiliar para mostrar a diferença (Gap) para a meta
  const renderGap = (projected) => {
    const diff = projected - targetRevenue;
    if (diff >= 0) {
      return <span className="text-green-400 text-xs font-bold">+ {formatCurrency(diff)} acima da meta</span>;
    }
    return <span className="text-red-400 text-xs font-bold">Faltam {formatCurrency(Math.abs(diff))}</span>;
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mt-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
        <div className="p-2 bg-blue-900/50 rounded-lg text-blue-400">
          <BarChart2 size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Simulador de Fechamento (Projeção de Cenários)</h2>
          <p className="text-sm text-gray-400">Simule como o mês vai fechar com base no ritmo atual, acelerações ou quedas de tráfego.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* COLUNA ESQUERDA: INPUTS DE DADOS */}
        <div className="flex-1 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target size={16} className="text-blue-400"/> Dados Atuais da Loja
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Meta do Mês (R$)</label>
                <input type="number" value={targetRevenue} onChange={(e) => setTargetRevenue(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white font-bold outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Faturado até Hoje (R$)</label>
                <input type="number" value={currentRevenue} onChange={(e) => setCurrentRevenue(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-blue-300 font-bold outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Dia Atual</label>
                <input type="number" value={currentDay} onChange={(e) => setCurrentDay(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white font-bold outline-none focus:border-blue-500" max="31" min="1" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Dias no Mês</label>
                <input type="number" value={daysInMonth} onChange={(e) => setDaysInMonth(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white font-bold outline-none focus:border-blue-500" max="31" min="28" />
              </div>
            </div>
            <div className="mt-3 p-3 bg-gray-900 rounded-lg border border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-400">Velocidade Diária Atual (Run Rate):</span>
              <span className="font-bold text-blue-400">{formatCurrency(runRate)} / dia</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity size={16} className="text-amber-400"/> Variáveis de Cenário
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-900/10 p-3 rounded-lg border border-green-900/30">
                <label className="block text-xs font-semibold text-green-500 mb-1">Aceleração Otimista (%)</label>
                <div className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  <input type="number" value={optimisticBoost} onChange={(e) => setOptimisticBoost(Number(e.target.value))} className="w-full bg-gray-900 border border-green-700/50 rounded p-1.5 text-green-300 font-bold outline-none focus:border-green-500 text-center" />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Ex: Promoção, Injeção de Ads</p>
              </div>
              <div className="bg-red-900/10 p-3 rounded-lg border border-red-900/30">
                <label className="block text-xs font-semibold text-red-500 mb-1">Queda Pessimista (%)</label>
                <div className="flex items-center gap-2">
                  <span className="text-red-500 font-bold">-</span>
                  <input type="number" value={pessimisticDrop} onChange={(e) => setPessimisticDrop(Number(e.target.value))} className="w-full bg-gray-900 border border-red-700/50 rounded p-1.5 text-red-300 font-bold outline-none focus:border-red-500 text-center" />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Ex: Furo de Estoque, Bloqueio</p>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: RESULTADOS DOS CENÁRIOS */}
        <div className="flex-1 bg-gray-900 p-5 rounded-xl border border-gray-700 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Projeção Final de Mês</h3>

          {/* CENÁRIO OTIMISTA */}
          <div className="bg-gray-800 p-4 rounded-lg border border-green-700/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-green-900/50 text-green-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
              <TrendingUp size={12}/> OTIMISTA
            </div>
            <div className="text-2xl font-bold text-white mb-1">{formatCurrency(projOtimista)}</div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-green-400">{pctOtimista.toFixed(1)}% da Meta</span>
              {renderGap(projOtimista)}
            </div>
            <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(pctOtimista, 100)}%` }}></div>
            </div>
            <div className="text-[10px] text-gray-500 mt-2">Mantendo ritmo de {formatCurrency(runRate * (1 + optimisticBoost/100))} / dia</div>
          </div>

          {/* CENÁRIO REALISTA */}
          <div className="bg-gray-800 p-4 rounded-lg border border-blue-700/30 relative overflow-hidden shadow-lg transform scale-[1.02] z-10">
            <div className="absolute top-0 right-0 bg-blue-900/50 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
              <Activity size={12}/> REALISTA (ATUAL)
            </div>
            <div className="text-3xl font-bold text-white mb-1">{formatCurrency(projRealista)}</div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-blue-400">{pctRealista.toFixed(1)}% da Meta</span>
              {renderGap(projRealista)}
            </div>
            <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(pctRealista, 100)}%` }}></div>
            </div>
            <div className="text-[10px] text-gray-500 mt-2">Mantendo o ritmo atual rigorosamente</div>
          </div>

          {/* CENÁRIO PESSIMISTA */}
          <div className="bg-gray-800 p-4 rounded-lg border border-red-700/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-900/50 text-red-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
              <TrendingDown size={12}/> PESSIMISTA
            </div>
            <div className="text-2xl font-bold text-gray-300 mb-1">{formatCurrency(projPessimista)}</div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-red-400">{pctPessimista.toFixed(1)}% da Meta</span>
              {renderGap(projPessimista)}
            </div>
            <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(pctPessimista, 100)}%` }}></div>
            </div>
            <div className="text-[10px] text-gray-500 mt-2">Caindo para o ritmo de {formatCurrency(runRate * (1 - pessimisticDrop/100))} / dia</div>
          </div>

        </div>
      </div>
    </div>
  );
}

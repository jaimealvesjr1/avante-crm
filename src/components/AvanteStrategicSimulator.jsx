import React, { useState, useMemo } from 'react';
import { Briefcase } from 'lucide-react';

export default function AvanteStrategicSimulator({ formatCurrency, groupedClients = [] }) {
  const diaAtual = new Date().getDate();
  const diasNoMes = 30;
  const diasRestantes = Math.max(0, diasNoMes - diaAtual);

  const [metaAvante, setMetaAvante] = useState(15000);

  // Mapeia os dados estruturados do App.jsx
  const clientes = useMemo(() => {
    if (!groupedClients || groupedClients.length === 0) return [];

    return groupedClients.map(g => ({
      id: g.client,
      nome: g.client,
      faturadoAtual: g.totalCurrentRevenue,
      feeType: g.feeType || 'percent',
      comissao: (g.feePercent || 0) / 100,
      feeFixo: Number(g.fixedFee) || 0
    }));
  }, [groupedClients]);

  const metricasAvante = useMemo(() => {
    let receitaAtualAgencia = 0;
    let projecaoRealistaAgencia = 0;

    clientes.forEach(cliente => {
      const runRate = diaAtual > 0 ? cliente.faturadoAtual / diaAtual : 0;
      const faturamentoProjetado = cliente.faturadoAtual + (runRate * diasRestantes);
      
      const isFixed = cliente.feeType === 'fixed' || cliente.feeFixo > 0;

      // Se for fixo, a receita atual e projetada da agência é o próprio fixo.
      const receitaAtual = isFixed ? cliente.feeFixo : (cliente.faturadoAtual * cliente.comissao);
      const receitaProjetada = isFixed ? cliente.feeFixo : (faturamentoProjetado * cliente.comissao);
      
      receitaAtualAgencia += receitaAtual;
      projecaoRealistaAgencia += receitaProjetada;
    });

    return { receitaAtualAgencia, projecaoRealistaAgencia };
  }, [clientes, diaAtual, diasRestantes]);

  const gap = metaAvante - metricasAvante.projecaoRealistaAgencia;

  return (
    <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 mt-6 shadow-xl text-white">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-700 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-900/50 rounded-lg text-purple-400"><Briefcase size={28} /></div>
          <div>
            <h2 className="text-2xl font-bold text-white">Termômetro Avante</h2>
            <div className="flex gap-4 mt-1">
               <span className="text-sm text-gray-400">Dia Atual: <strong>{diaAtual}</strong></span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-600 flex items-center gap-3 w-full md:w-auto shadow-inner">
          <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Meta Desejada:</label>
          <input 
            type="number" 
            value={metaAvante} 
            onChange={(e) => setMetaAvante(Number(e.target.value))} 
            className="bg-transparent border-b-2 border-purple-500 w-32 text-white font-bold text-lg outline-none focus:border-purple-300 text-right pb-1" 
          />
        </div>
      </div>

      {/* CARDS DE RESULTADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 relative overflow-hidden flex flex-col justify-center shadow-lg">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Receita Atual Garantida</h3>
           <div className="text-5xl font-bold text-white">{formatCurrency(metricasAvante.receitaAtualAgencia)}</div>
           <p className="text-sm text-gray-500 mt-3">Soma de Fixos + Variável até o momento</p>
        </div>

        <div className="bg-purple-900/20 p-8 rounded-xl border border-purple-700/50 flex flex-col justify-center shadow-lg transform transition-all hover:scale-[1.01]">
           <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-3">Fechamento Projetado (Mês)</h3>
           <div className="text-6xl font-bold text-white mb-6">{formatCurrency(metricasAvante.projecaoRealistaAgencia)}</div>
           
           <div className={`text-sm font-bold p-4 rounded-lg flex justify-between items-center ${gap > 0 ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-green-900/30 text-green-400 border border-green-900/50'}`}>
             <span className="uppercase tracking-wider">{gap > 0 ? 'Faltam para a meta:' : 'Meta superada em:'}</span>
             <span className="text-xl">{formatCurrency(Math.abs(gap))}</span>
           </div>
        </div>

      </div>
    </div>
  );
}

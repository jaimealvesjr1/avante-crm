import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle, Clock, FileText, Edit2, Briefcase, X, Save, Plus, Trash2, ArrowUpRight, ArrowDownRight, Activity, Calculator, Calendar, Shield } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { getVisualRole } from '../App';
import { getSemanaDoMes, getMesAno } from '../utils/dateUtils';
import { calcularFolhaMembro } from '../utils/financeUtils';

export default function FinanceDashboard({ db, dashboardData, formatCurrency, canEdit, teamMembers, searchTerm }) {
  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in">
        <Shield size={64} className="text-gray-700 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
        <p className="text-gray-400">Apenas Administradores e Gestores têm acesso ao fluxo financeiro.</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('clientes'); 
  const [recebimentos, setRecebimentos] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [contratoEmEdicao, setContratoEmEdicao] = useState(null); 
  const [contratoForm, setContratoForm] = useState({ name: '', feeType: 'percent', feePercent: 0, fixedFee: 0 });

  const [despesaEmEdicao, setDespesaEmEdicao] = useState(null);
  const [despesaForm, setDespesaForm] = useState({ 
    descricao: '', valor: '', categoria: 'Folha de Pagamento', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pago'
  });

  const [mesFolha, setMesFolha] = useState('Atual');
  const [metricasFolha, setMetricasFolha] = useState({
    faturamentoBruto: dashboardData.totalAgencyRevenueActual || 0,
    custoOperacional: 0
  });
  const [bonusManuais, setBonusManuais] = useState({});
  const [demonstrativoData, setDemonstrativoData] = useState(null);

  useEffect(() => {
    if (!db) return;
    
    const unsubRecebimentos = onSnapshot(collection(db, "financeiro_recebimentos"), (snapshot) => {
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      dados.sort((a, b) => new Date(b.dataEmissao) - new Date(a.dataEmissao));
      setRecebimentos(dados);
      setLoading(false);
    });

    const unsubDespesas = onSnapshot(collection(db, "financeiro_despesas"), (snapshot) => {
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      dados.sort((a, b) => new Date(b.dataVencimento) - new Date(a.dataVencimento));
      setDespesas(dados);
    });

    return () => { unsubRecebimentos(); unsubDespesas(); };
  }, [db]);

  useEffect(() => {
    if (!dashboardData?.historicalChartData) return;
    const target = dashboardData.historicalChartData.find(h => h.month === mesFolha);
    if (target) {
      setMetricasFolha(prev => ({ ...prev, faturamentoBruto: target.ReceitaAgencia || 0 }));
    }
  }, [mesFolha, dashboardData]);

  const projecaoReceitaAgencia = dashboardData.totalAgencyRevenue || 0;

  // Filtra as listas baseando-se na busca global (searchTerm vindo do App.jsx)
  const busca = (searchTerm || '').toLowerCase();
  
  const recebimentosFiltrados = recebimentos.filter(rec => 
    !busca || rec.cliente.toLowerCase().includes(busca) || rec.mesReferencia.toLowerCase().includes(busca)
  );

  const despesasFiltradas = despesas.filter(d => 
    !busca || d.descricao.toLowerCase().includes(busca) || d.categoria.toLowerCase().includes(busca)
  );

  // Totais (Gerais e Filtrados)
  const totalPendenteGeral = recebimentos.filter(r => r.status === 'Pendente').reduce((acc, curr) => acc + curr.valorAgencia, 0);

  const pendenteFiltrado = recebimentosFiltrados.filter(r => r.status === 'Pendente').reduce((acc, curr) => acc + curr.valorAgencia, 0);
  const pagoFiltrado = recebimentosFiltrados.filter(r => r.status === 'Pago').reduce((acc, curr) => acc + curr.valorAgencia, 0);
  
  const despesasPendentesFiltradas = despesasFiltradas.filter(d => d.status === 'Pendente').reduce((acc, curr) => acc + curr.valor, 0);
  const despesasPagasFiltradas = despesasFiltradas.filter(d => d.status === 'Pago').reduce((acc, curr) => acc + curr.valor, 0);

  const dataAtual = new Date();
  dataAtual.setMonth(dataAtual.getMonth() - 1);
  const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const mesPassadoExato = `${mesesNomes[dataAtual.getMonth()]}/${String(dataAtual.getFullYear()).slice(-2)}`;

    const totalReceitaAgencia = dashboardData.totalAgencyRevenueActual || 0;

    const folhaCalculada = useMemo(() => {
    if (!teamMembers) return [];
    return teamMembers.filter(m => m.paymentConfig).map(m => {
        const calculo = calcularFolhaMembro(m, totalReceitaAgencia, metricasFolha.custoOperacional, bonusManuais[m.email]);
        return { ...m, calculo };
    });
    }, [teamMembers, metricasFolha, bonusManuais, totalReceitaAgencia]);

  const handleLancarPagamentoEquipe = async (membro) => {
    if (!canEdit) return toast.error("Sem permissão.");
    try {
      await addDoc(collection(db, "financeiro_despesas"), {
        descricao: `Repasse: ${membro.nomeCompleto} (${membro.paymentConfig.frequencia})`,
        valor: membro.calculo.total,
        categoria: 'Folha de Pagamento',
        dataVencimento: new Date().toISOString().split('T')[0],
        status: 'Pendente',
        criadoEm: new Date().toISOString()
      });
      toast.success(`Pagamento lançado no Contas a Pagar!`);

      // Gera os dados para abrir o Modal do Demonstrativo
      const dataAtual = new Date();
      dataAtual.setMonth(dataAtual.getMonth() - 1);
      const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      
      setDemonstrativoData({
        nome: membro.nomeCompleto,
        funcao: getVisualRole(membro.role) || 'Colaborador',
        ref: `${mesesNomes[dataAtual.getMonth()]}/${String(dataAtual.getFullYear()).slice(-2)}`,
        fat: totalReceitaAgencia,
        meta: membro.paymentConfig.gatilho || 0,
        base: membro.calculo.fixo,
        comissao: membro.calculo.comissao,
        bonus: membro.calculo.bonus,
        total: membro.calculo.total,
        p1V: membro.calculo.fixo,
        p1D: membro.paymentConfig.diaFixo || 'Dia 05',
        p2V: membro.calculo.comissao + membro.calculo.bonus,
        p2D: membro.paymentConfig.diaVariavel || 'Dia 20'
      });
    } catch (error) { toast.error("Erro ao lançar pagamento."); }
  };

  const baixarDemonstrativo = () => {
    const node = document.getElementById('comprovante-export');
    html2canvas(node, { scale: 3, backgroundColor: "#f0f2f5", useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Demonstrativo-${demonstrativoData.nome}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
  };

  const fluxoDeCaixa = useMemo(() => {
    const relatorio = {};

    recebimentos.filter(r => r.status === 'Pago' && r.dataPagamentoRealizado).forEach(r => {
      const mes = getMesAno(r.dataPagamentoRealizado);
      const semana = getSemanaDoMes(r.dataPagamentoRealizado);
      
      if (!relatorio[mes]) relatorio[mes] = { totalEntradas: 0, totalSaidas: 0, saldo: 0, semanas: {} };
      if (!relatorio[mes].semanas[semana]) relatorio[mes].semanas[semana] = { entradas: 0, saidas: 0, saldo: 0 };

      relatorio[mes].semanas[semana].entradas += r.valorAgencia;
      relatorio[mes].semanas[semana].saldo += r.valorAgencia;
      relatorio[mes].totalEntradas += r.valorAgencia;
      relatorio[mes].saldo += r.valorAgencia;
    });

    despesas.filter(d => d.status === 'Pago' && d.dataPagamentoRealizado).forEach(d => {
      const mes = getMesAno(d.dataPagamentoRealizado);
      const semana = getSemanaDoMes(d.dataPagamentoRealizado);
      
      if (!relatorio[mes]) relatorio[mes] = { totalEntradas: 0, totalSaidas: 0, saldo: 0, semanas: {} };
      if (!relatorio[mes].semanas[semana]) relatorio[mes].semanas[semana] = { entradas: 0, saidas: 0, saldo: 0 };

      relatorio[mes].semanas[semana].saidas += d.valor;
      relatorio[mes].semanas[semana].saldo -= d.valor;
      relatorio[mes].totalSaidas += d.valor;
      relatorio[mes].saldo -= d.valor;
    });

    return relatorio;
  }, [recebimentos, despesas]);

  // 6. FUNÇÕES DE AÇÃO
  const renderGrowthBadge = (currentValue, pastValue) => {
    if (pastValue === 0) return null;
    const percent = ((currentValue - pastValue) / pastValue) * 100;
    const isPositive = percent >= 0;
    return (
      <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 w-max ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(percent).toFixed(1)}%
      </span>
    );
  };

  const iniciarEdicaoCliente = (grupo) => {
    setContratoEmEdicao(grupo.client);
    setContratoForm({ name: grupo.client, feeType: grupo.feeType || 'percent', feePercent: grupo.feePercent || 0, fixedFee: grupo.fixedFee || 0 });
  };

  const salvarEdicaoCliente = async (oldClientName) => {
    if (!canEdit) return toast.error("Sem permissão.");
    if (!contratoForm.name.trim()) return toast.error("O nome do cliente não pode ser vazio.");
    
    const batch = writeBatch(db);
    const grupo = dashboardData.groupedClients.find(g => g.client === oldClientName);
    if (!grupo) return toast.error("Cliente não encontrado.");

    const upperNewName = contratoForm.name.toUpperCase();
    grupo.stores.forEach(store => {
      const storeRef = doc(db, "stores", store.id.toString());
      batch.update(storeRef, {
        client: upperNewName, 
        feeType: contratoForm.feeType,
        feePercent: Number(contratoForm.feePercent) || 0,
        fixedFee: contratoForm.feeType === 'percent' ? 0 : (Number(contratoForm.fixedFee) || 0)
      });
    });

    try {
      await batch.commit();
      toast.success(`Dados atualizados!`);
      setContratoEmEdicao(null);
    } catch (error) { toast.error("Erro ao salvar os dados."); }
  };

  const ajustarFatura = async (fatura) => {
    if (!canEdit) return toast.error("Sem permissão.");
    const novoValorStr = window.prompt(`Ajustar valor da fatura de ${fatura.cliente}.\nValor atual: ${fatura.valorAgencia}\nNovo valor final:`, fatura.valorAgencia);
    if (novoValorStr === null) return;
    const novoValor = Number(novoValorStr.replace(',', '.'));
    if (isNaN(novoValor)) return toast.error("Valor inválido.");

    const diasStr = window.prompt("Quantos dias a partir de hoje para vencimento?", "10");
    if (diasStr === null) return;
    const novaDataVencimento = new Date();
    novaDataVencimento.setDate(novaDataVencimento.getDate() + parseInt(diasStr, 10));

    try {
      await updateDoc(doc(db, "financeiro_recebimentos", fatura.id), {
        valorAgencia: novoValor, dataVencimento: novaDataVencimento.toISOString()
      });
      toast.success("Fatura ajustada!");
    } catch (error) { toast.error("Erro ao ajustar fatura."); }
  };

  const marcarRecebimentoComoPago = async (idFatura, cliente, mes) => {
    if (!canEdit) return toast.error("Sem permissão.");
    if(window.confirm(`Confirmar recebimento de ${cliente} referente a ${mes}?`)) {
      try {
        await updateDoc(doc(db, "financeiro_recebimentos", idFatura), { status: 'Pago', dataPagamentoRealizado: new Date().toISOString() });
        toast.success("Pagamento recebido!");
      } catch (error) { toast.error("Erro ao registrar."); }
    }
  };

  const handleAdicionarDespesa = async (e) => {
    e.preventDefault();
    if (!canEdit) return toast.error("Sem permissão.");
    const numValor = Number(String(despesaForm.valor).replace(',', '.'));
    if (!despesaForm.descricao.trim() || isNaN(numValor) || numValor <= 0) return toast.error("Preencha descrição e valor válidos.");

    try {
      if (despesaEmEdicao) {
        await updateDoc(doc(db, "financeiro_despesas", despesaEmEdicao), {
          descricao: despesaForm.descricao.trim(), valor: numValor, categoria: despesaForm.categoria,
          dataVencimento: despesaForm.dataVencimento, status: despesaForm.status
        });
        toast.success("Despesa atualizada!");
        setDespesaEmEdicao(null);
      } else {
        await addDoc(collection(db, "financeiro_despesas"), {
          descricao: despesaForm.descricao.trim(), valor: numValor, categoria: despesaForm.categoria,
          dataVencimento: despesaForm.dataVencimento, status: despesaForm.status,
          dataPagamentoRealizado: despesaForm.status === 'Pago' ? new Date().toISOString() : null,
          criadoEm: new Date().toISOString()
        });
        toast.success("Despesa registada!");
      }
      setDespesaForm({ descricao: '', valor: '', categoria: 'Ferramentas/Software', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente' });
    } catch (error) { toast.error("Erro ao salvar despesa."); }
  };

  const iniciarEdicaoDespesa = (d) => {
    setDespesaEmEdicao(d.id);
    setDespesaForm({ descricao: d.descricao, valor: d.valor, categoria: d.categoria, dataVencimento: d.dataVencimento, status: d.status });
  };

  const marcarDespesaComoPaga = async (idDespesa) => {
    if (!canEdit) return toast.error("Sem permissão.");
    try {
      await updateDoc(doc(db, "financeiro_despesas", idDespesa), { status: 'Pago', dataPagamentoRealizado: new Date().toISOString() });
      toast.success("Despesa paga!");
    } catch (error) { toast.error("Erro ao registrar."); }
  };

  const handleExcluirDespesa = async (id) => {
    if (!canEdit) return;
    if (window.confirm("Deseja realmente apagar este registro de despesa?")) {
      await deleteDoc(doc(db, "financeiro_despesas", id));
      toast.success("Apagada.");
    }
  };

  // 7. INTERFACE PRINCIPAL (JSX)
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* CABEÇALHO E NAVEGAÇÃO PADRONIZADO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign className="text-green-400" size={28} /> Financeiro</h1>
          <p className="text-gray-400 text-sm mt-1">Gestão centralizada de receitas, despesas e fluxo de caixa.</p>
        </div>
        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner overflow-x-auto max-w-full custom-scrollbar">
            <button onClick={() => setActiveTab('clientes')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'clientes' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Briefcase size={16} /> Contratos</button>
            <button onClick={() => setActiveTab('receber')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'receber' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Entradas ({recebimentos.filter(r => r.status === 'Pendente').length})</button>
            <button onClick={() => setActiveTab('pagar')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'pagar' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Saídas ({despesas.filter(d => d.status === 'Pendente').length})</button>
            <button onClick={() => setActiveTab('caixa')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'caixa' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Activity size={16} /> Fluxo de Caixa</button>
        </div>
      </div>

      {/* ABA 1: CLIENTES E CONTRATOS */}
      {activeTab === 'clientes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-l-4 border-l-green-500">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Receita da Agência (Realizado)</p>
              <h2 className="text-3xl font-black text-white">{formatCurrency(totalReceitaAgencia)}</h2>
            </div>
            <div className="bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-l-4 border-l-indigo-500">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Projeção Final do Mês</p>
              <h2 className="text-3xl font-black text-white">{formatCurrency(projecaoReceitaAgencia)}</h2>
            </div>
            <div className="bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-l-4 border-l-amber-500">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Faturas a Receber (Em Aberto)</p>
              {/* Note que aqui usamos a variável corrigida */}
              <h2 className="text-3xl font-black text-amber-400 mt-1">{formatCurrency(totalPendenteGeral)}</h2>
            </div>
          </div>

          <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="text-indigo-400" size={18} /> Base de Clientes e Rentabilidade
              </h3>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold pl-6">Cliente</th>
                    <th className="p-4 font-semibold">Regra de Comissão</th>
                    <th className="p-4 font-semibold">GMV Gerado (Atual)</th>
                    <th className="p-4 font-semibold text-green-400">Receita Agência</th>
                    <th className="p-4 font-semibold text-center pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dashboardData.groupedClients.map((group, idx) => {
                    const isEditing = contratoEmEdicao === group.client;
                    const isFixed = group.feeType === 'fixed' || group.fixedFee > 0;
                    const valorComissao = isFixed ? Number(group.fixedFee) : (group.totalCurrentRevenue * (Number(group.feePercent) / 100));

                    const pastGmv = group.stores.reduce((acc, store) => {
                        const hist = (store.monthlyHistory || []).find(h => h.month === mesPassadoExato);
                        return acc + (hist ? Number(hist.gmv) : 0);
                    }, 0);
                    
                    const pastComissao = group.stores.reduce((acc, store) => {
                        const hist = (store.monthlyHistory || []).find(h => h.month === mesPassadoExato);
                        return acc + (hist ? Number(hist.agencyRevenue) : 0);
                    }, 0);

                    return (
                      <tr key={idx} className={`${isEditing ? 'bg-indigo-900/20' : 'hover:bg-white/5'} transition-colors`}>
                        <td className="p-4 pl-6">
                          {isEditing ? (
                            <input type="text" value={contratoForm.name} onChange={e => setContratoForm({...contratoForm, name: e.target.value})} className="bg-gray-800 text-white font-bold text-sm rounded-lg p-2 w-full outline-none border border-gray-600 focus:border-indigo-500 uppercase" placeholder="Nome do Cliente" />
                          ) : (
                            <span className="font-bold text-white">{group.client}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10">
                              <select value={contratoForm.feeType} onChange={e => setContratoForm({...contratoForm, feeType: e.target.value})} className="bg-gray-800 text-white text-sm rounded-lg p-1.5 outline-none border border-gray-600">
                                <option value="percent">Percentual (%)</option>
                                <option value="fixed">Fixo (R$)</option>
                              </select>
                              {contratoForm.feeType === 'percent' ? (
                                <input type="number" value={contratoForm.feePercent} onChange={e => setContratoForm({...contratoForm, feePercent: e.target.value})} className="bg-gray-800 text-white text-sm rounded-lg p-1.5 w-16 outline-none border border-gray-600" step="0.1" />
                              ) : (
                                <input type="number" value={contratoForm.fixedFee} onChange={e => setContratoForm({...contratoForm, fixedFee: e.target.value})} className="bg-gray-800 text-white text-sm rounded-lg p-1.5 w-24 outline-none border border-gray-600" />
                              )}
                            </div>
                          ) : (
                            <div className="text-sm">
                              {isFixed ? (
                                <span className="bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded-md border border-indigo-500/20">Fixo: {formatCurrency(group.fixedFee)}</span>
                              ) : (
                                <span className="bg-blue-500/10 text-blue-300 px-2 py-1 rounded-md border border-blue-500/20">Variável: {group.feePercent}% s/ Fat.</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-sm text-gray-300">
                           <div className="flex flex-col">
                               <span>{formatCurrency(group.totalCurrentRevenue)}</span>
                               {renderGrowthBadge(group.totalCurrentRevenue, pastGmv)}
                           </div>
                        </td>
                        <td className="p-4 font-bold text-green-400">
                           <div className="flex flex-col">
                               <span>{formatCurrency(valorComissao)}</span>
                               {renderGrowthBadge(valorComissao, pastComissao)}
                           </div>
                        </td>
                        <td className="p-4 pr-6 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => salvarEdicaoCliente(group.client)} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors shadow-md" title="Salvar"><Save size={16} /></button>
                              <button onClick={() => setContratoEmEdicao(null)} className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors" title="Cancelar"><X size={16} /></button>
                            </div>
                          ) : (
                            <button onClick={() => iniciarEdicaoCliente(group)} className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-indigo-400 rounded-xl transition-all shadow-sm" title="Editar Contrato"><Edit2 size={16} /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CONTAS A RECEBER */}
      {activeTab === 'receber' && (
        <div className="space-y-6 animate-in fade-in">
          
          <div className="flex flex-col sm:flex-row gap-6 mb-2">
            <div className="flex-1 bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-l-4 border-l-amber-500">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">A Receber (Aberto)</p>
              <h2 className="text-3xl font-black text-amber-400">{formatCurrency(pendenteFiltrado)}</h2>
            </div>
            <div className="flex-1 bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-l-4 border-l-green-500">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Já Recebido (Pago)</p>
              <h2 className="text-3xl font-black text-green-400">{formatCurrency(pagoFiltrado)}</h2>
            </div>
          </div>

          <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><ArrowUpRight size={18} className="text-green-400"/> Histórico de Faturas</h3>
              {busca && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">Filtrado por: "{busca}"</span>}
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Carregando recebimentos...</div>
              ) : recebimentosFiltrados.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                    <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhuma fatura encontrada.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-semibold pl-6">Cliente</th>
                      <th className="p-4 font-semibold">Competência</th>
                      <th className="p-4 font-semibold">Vencimento</th>
                      <th className="p-4 font-semibold text-right">Valor Final</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                      <th className="p-4 font-semibold text-center pr-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recebimentosFiltrados.map((rec) => {
                      const dataVenc = new Date(rec.dataVencimento);
                      const isAtrasado = rec.status === 'Pendente' && dataVenc < new Date();
                      return (
                        <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 pl-6 font-bold text-white flex items-center gap-2"><FileText size={16} className="text-gray-500" />{rec.cliente}</td>
                          <td className="p-4 text-sm font-bold text-indigo-300">{rec.mesReferencia}</td>
                          <td className={`p-4 text-sm font-bold ${isAtrasado ? 'text-red-400' : 'text-gray-300'}`}>
                            {dataVenc.toLocaleDateString('pt-BR')}
                            {isAtrasado && <span className="ml-2 text-[10px] bg-red-500/20 px-1 rounded text-red-400">Atrasado</span>}
                          </td>
                          <td className="p-4 font-bold text-white text-right">
                            <div className="flex items-center justify-end gap-2">
                                {formatCurrency(rec.valorAgencia)}
                                {rec.status === 'Pendente' && (
                                    <button onClick={() => ajustarFatura(rec)} className="text-gray-500 hover:text-indigo-400 transition-colors p-1" title="Ajustar Valor"><Edit2 size={14} /></button>
                                )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {rec.status === 'Pago' ? (
                              <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold border border-green-500/20">Pago</span>
                            ) : (
                              <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-500/20">Pendente</span>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-center">
                              {rec.status === 'Pendente' ? (
                                  <button onClick={() => marcarRecebimentoComoPago(rec.id, rec.cliente, rec.mesReferencia)} className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase px-3 py-2 rounded-xl transition-all shadow-md">Dar Baixa</button>
                              ) : (
                                  <span className="text-xs text-gray-500">Em {new Date(rec.dataPagamentoRealizado).toLocaleDateString('pt-BR')}</span>
                              )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: CONTAS A PAGAR E FOLHA DE PAGAMENTO */}
      {activeTab === 'pagar' && (
        <div className="space-y-6 animate-in fade-in">
          
          <div className="flex flex-col sm:flex-row gap-6 mb-2">
            <div className="flex-1 bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-l-4 border-l-amber-500">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">A Pagar (Aberto)</p>
              <h2 className="text-3xl font-black text-amber-400">{formatCurrency(despesasPendentesFiltradas)}</h2>
            </div>
            <div className="flex-1 bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-l-4 border-l-rose-500">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Saídas (Pagas)</p>
              <h2 className="text-3xl font-black text-rose-400">{formatCurrency(despesasPagasFiltradas)}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LADO ESQUERDO: LISTA DE HISTÓRICO (Ocupa 2/3) */}
            <div className="lg:col-span-2 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden h-max">
              <div className="p-5 border-b border-white/10 bg-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Clock size={18} className="text-gray-400"/> Histórico de Saídas</h3>
              </div>
              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-gray-900 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Vencimento</th>
                      <th className="p-4">Descrição</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4 text-right">Valor</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center pr-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {despesasFiltradas.map(d => {
                      const isAtrasado = d.status === 'Pendente' && new Date(d.dataVencimento) < new Date();
                      return (
                        <tr key={d.id} className="hover:bg-white/5 transition-colors">
                          <td className={`p-4 pl-6 text-sm font-bold ${isAtrasado ? 'text-red-400' : 'text-gray-300'}`}>
                            {new Date(d.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                            {isAtrasado && <span className="ml-2 text-[10px] bg-red-500/20 px-1 rounded text-red-400">Atrasado</span>}
                          </td>
                          <td className="p-4 font-bold text-white">{d.descricao}</td>
                          <td className="p-4"><span className="bg-gray-800 text-gray-300 text-[10px] px-2 py-1 rounded-md border border-gray-700">{d.categoria}</span></td>
                          <td className="p-4 font-bold text-rose-400 text-right">{formatCurrency(d.valor)}</td>
                          <td className="p-4 text-center">
                            {d.status === 'Pago' ? <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold border border-green-500/20">Pago</span> : <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-500/20">Pendente</span>}
                          </td>
                          <td className="p-4 pr-6 text-center flex items-center justify-center gap-2">
                            {d.status === 'Pendente' && <button onClick={() => marcarDespesaComoPaga(d.id)} className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl font-bold shadow-md transition-all">Dar Baixa</button>}
                            <button onClick={() => iniciarEdicaoDespesa(d)} className="p-2 text-gray-400 hover:text-indigo-400 bg-white/5 rounded-xl transition-colors" title="Editar Despesa"><Edit2 size={14}/></button>
                            <button onClick={() => handleExcluirDespesa(d.id)} className="p-2 text-gray-500 hover:text-red-400 bg-white/5 rounded-xl transition-colors" title="Excluir"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      )
                    })}
                    {despesasFiltradas.length === 0 && (
                       <tr><td colSpan="6" className="p-12 text-center text-gray-500">Nenhuma despesa encontrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LADO DIREITO: BLOCOS EMPILHADOS VERTICALMENTE (Ocupa 1/3) */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* BLOCO 1: FOLHA AUTOMÁTICA (AGORA DENTRO DE UM CARD) */}
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                  <Calculator size={18} className="text-indigo-400" /> Folha Automática
                </h3>
                
                {/* SELECTOR DE MÊS DA COMPETÊNCIA */}
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Competência da Folha</label>
                  <select value={mesFolha} onChange={e => setMesFolha(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none shadow-inner cursor-pointer text-sm">
                    {dashboardData.historicalChartData?.map(h => (
                      <option key={h.month} className="bg-gray-900" value={h.month}>
                        {h.month === 'Atual' ? 'Mês Atual (Em andamento)' : h.month}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 mb-6">
                  <div className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 shadow-inner flex flex-col justify-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Fat. Bruto (Base LT)</label>
                    <span className="font-bold text-white text-sm">
                      {formatCurrency(metricasFolha.faturamentoBruto)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Custo Oper. (Base LL)</label>
                    <input type="number" value={metricasFolha.custoOperacional} onChange={e => setMetricasFolha({...metricasFolha, custoOperacional: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 mt-1 shadow-inner text-sm" />
                  </div>
                </div>

                <div className="space-y-3">
                  {folhaCalculada.map((membro, idx) => (
                    <div key={idx} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex flex-col gap-3 hover:bg-white/[0.05] transition-colors">
                      <div>
                        <p className="font-bold text-white text-sm">{membro.nomeCompleto}</p>
                        <div className="text-xs text-gray-400 flex flex-wrap gap-2 mt-1">
                          <span>Fixo: {formatCurrency(membro.calculo.fixo)}</span> |
                          <span>Comissão: {formatCurrency(membro.calculo.comissao)}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                           <span className="text-xs text-gray-500 font-medium">Extra: R$</span>
                           <input type="number" value={bonusManuais[membro.email] || ''} onChange={e => setBonusManuais({...bonusManuais, [membro.email]: e.target.value})} placeholder="0.00" className="bg-black/40 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs w-20 outline-none focus:border-indigo-500 shadow-inner" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/10 pt-3">
                        <span className="text-lg font-black text-indigo-400">{formatCurrency(membro.calculo.total)}</span>
                        <button onClick={() => handleLancarPagamentoEquipe(membro)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all shadow-md">
                          Lançar
                        </button>
                      </div>
                    </div>
                  ))}
                  {folhaCalculada.length === 0 && <p className="text-xs text-gray-500 text-center py-6">Nenhum membro possui regras configuradas no Admin.</p>}
                </div>
              </div>

              {/* BLOCO 2: LANÇAR DESPESA MANUAL */}
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                  <Plus size={18} className="text-rose-400" /> Despesa Avulsa
                </h3>
                <form onSubmit={handleAdicionarDespesa} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                    <input type="text" required value={despesaForm.descricao} onChange={e => setDespesaForm({...despesaForm, descricao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Valor (R$)</label>
                      <input type="number" step="0.01" required value={despesaForm.valor} onChange={e => setDespesaForm({...despesaForm, valor: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Vencimento</label>
                      <input type="date" required value={despesaForm.dataVencimento} onChange={e => setDespesaForm({...despesaForm, dataVencimento: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Categoria</label>
                      <select value={despesaForm.categoria} onChange={e => setDespesaForm({...despesaForm, categoria: e.target.value})} className="w-full bg-black/40 border border-white/10 text-gray-300 rounded-xl p-3 outline-none mt-1 shadow-inner text-xs cursor-pointer">
                        <option className="bg-gray-900" value="Folha de Pagamento">Folha/Equipe</option>
                        <option className="bg-gray-900" value="Ferramentas/Software">Ferramentas</option>
                        <option className="bg-gray-900" value="Impostos">Impostos</option>
                        <option className="bg-gray-900" value="Infraestrutura">Infra/Escritório</option>
                        <option className="bg-gray-900" value="Outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                      <select value={despesaForm.status} onChange={e => setDespesaForm({...despesaForm, status: e.target.value})} className="w-full bg-black/40 border border-white/10 text-gray-300 rounded-xl p-3 outline-none mt-1 shadow-inner text-xs cursor-pointer">
                        <option className="bg-gray-900" value="Pendente">A Pagar</option>
                        <option className="bg-gray-900" value="Pago">Já Pago</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    {despesaEmEdicao && (
                      <button type="button" onClick={() => { setDespesaEmEdicao(null); setDespesaForm({ descricao: '', valor: '', categoria: 'Folha de Pagamento', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente' }); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
                        Cancelar
                      </button>
                    )}
                    <button type="submit" className={`flex-1 ${despesaEmEdicao ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-rose-600 hover:bg-rose-500'} text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm`}>
                      {despesaEmEdicao ? 'Salvar Edição' : 'Registrar Despesa'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

      {activeTab === 'caixa' && (
        <div className="space-y-6 animate-in fade-in">
          {Object.keys(fluxoDeCaixa).sort().reverse().map(mes => {
            const dadosMes = fluxoDeCaixa[mes];
            return (
              <div key={mes} className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/20 to-transparent flex flex-col md:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-black text-white flex items-center gap-2"><Calendar size={20} className="text-indigo-400"/> CAIXA: {mes}</h3>
                  <div className="flex flex-wrap gap-4">
                    <span className="text-sm font-bold text-green-400 flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"><ArrowUpRight size={16}/> Entradas: {formatCurrency(dadosMes.totalEntradas)}</span>
                    <span className="text-sm font-bold text-rose-400 flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"><ArrowDownRight size={16}/> Saídas: {formatCurrency(dadosMes.totalSaidas)}</span>
                    <span className={`text-sm font-black px-4 py-1.5 rounded-lg border ${dadosMes.saldo >= 0 ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>Saldo Mês: {formatCurrency(dadosMes.saldo)}</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-4 pl-6 font-semibold">Período</th>
                        <th className="p-4 font-semibold text-green-400">Soma Entradas (+)</th>
                        <th className="p-4 font-semibold text-rose-400">Soma Saídas (-)</th>
                        <th className="p-4 pr-6 font-semibold">Saldo da Semana</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'].map(semana => {
                        const dadosSemana = dadosMes.semanas[semana];
                        if (!dadosSemana) return null;
                        
                        return (
                          <tr key={semana} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 pl-6 font-bold text-gray-300">{semana}</td>
                            <td className="p-4 font-bold text-green-400">{formatCurrency(dadosSemana.entradas)}</td>
                            <td className="p-4 font-bold text-rose-400">{formatCurrency(dadosSemana.saidas)}</td>
                            <td className={`p-4 pr-6 font-bold ${dadosSemana.saldo >= 0 ? 'text-indigo-300' : 'text-red-400'}`}>{formatCurrency(dadosSemana.saldo)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {Object.keys(fluxoDeCaixa).length === 0 && (
            <div className="bg-[#0B0F19]/80 rounded-3xl border border-white/10 p-16 text-center text-gray-400 shadow-lg">
              <Activity size={48} className="mx-auto mb-4 opacity-20 text-indigo-400" />
              <p className="text-lg font-bold text-white mb-2">Sem movimentações concluídas</p>
              <p>Nenhuma transação financeira com status "Pago" foi encontrada.</p>
              <p className="text-sm mt-2">Dê baixa em contas a pagar ou a receber para popular o fluxo de caixa em tempo real.</p>
            </div>
          )}
        </div>
      )}

    {demonstrativoData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm overflow-y-auto">
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                
                {/* O COMPROVANTE (ESTILIZADO IGUAL AO SEU HTML) */}
                <div id="comprovante-export" className="bg-[#f0f2f5] w-[450px] rounded-[16px] shadow-2xl overflow-hidden border border-gray-100 font-sans">
                    <div className="px-5 py-8 text-center border-b-2 border-[#eef4fc] bg-white">
                        <img src="https://i.ibb.co/PszR8C1j/Whats-App-Image-2025-12-10-at-17-17-30.jpg" crossOrigin="anonymous" alt="Logo" className="h-[70px] rounded-full mx-auto mb-4" />
                        <h1 className="m-0 text-[20px] text-[#0f3c7a] font-bold">Demonstrativo de Pagamento</h1>
                        <p className="m-0 mt-1 text-[13px] text-[#555555]">Referência: {demonstrativoData.ref}</p>
                    </div>
                    <div className="p-6 text-[#1a1a1a]">
                        
                        <div className="border border-[#e0e0e0] rounded-xl p-4 mb-4 bg-white">
                            <span className="text-[10px] uppercase tracking-wide text-[#888888] font-bold mb-2 block">Colaborador</span>
                            <strong className="text-[16px] text-[#1a1a1a] block leading-tight">{demonstrativoData.nome}</strong>
                            <span className="text-[13px] text-[#555555]">{demonstrativoData.funcao}</span>
                        </div>
                        
                        <div className="border border-[#e0e0e0] rounded-xl p-4 mb-4 bg-white">
                            <span className="text-[10px] uppercase tracking-wide text-[#888888] font-bold mb-2 block">Performance</span>
                            <div className="flex justify-between mb-2 text-[14px]"><span>Meta Estipulada:</span><span className="font-semibold">{formatCurrency(demonstrativoData.meta)}</span></div>
                            <div className="flex justify-between mb-2 text-[14px]"><span>Faturamento da Agência:</span><span className="font-semibold text-[#e67e22]">{formatCurrency(demonstrativoData.fat)}</span></div>
                            <div className="text-right mt-3">
                                <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold inline-block ${demonstrativoData.fat >= demonstrativoData.meta ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fff0e6] text-[#e67e22]'}`}>
                                    Meta {demonstrativoData.fat >= demonstrativoData.meta ? 'Batida' : 'Não Atingida'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="border border-[#e0e0e0] rounded-xl p-4 mb-4 bg-white">
                            <span className="text-[10px] uppercase tracking-wide text-[#888888] font-bold mb-2 block">Detalhamento</span>
                            <div className="flex justify-between mb-2 text-[14px]"><span>Salário Base:</span><span className="font-semibold">{formatCurrency(demonstrativoData.base)}</span></div>
                            <div className="flex justify-between mb-2 text-[14px]"><span>Comissão:</span><span className="font-semibold">{formatCurrency(demonstrativoData.comissao)}</span></div>
                            {demonstrativoData.bonus > 0 && (
                                <div className="flex justify-between mb-2 text-[14px] text-[#10b981]"><span>Acréscimo (Bônus):</span><span className="font-semibold">+ {formatCurrency(demonstrativoData.bonus)}</span></div>
                            )}
                            
                            <div className="bg-[#eef4fc] p-4 rounded-xl mt-4">
                                <div className="flex justify-between items-center m-0">
                                    <span className="text-[#0f3c7a] font-bold text-[13px]">LÍQUIDO A RECEBER</span>
                                    <span className="text-[#0f3c7a] font-extrabold text-[22px]">{formatCurrency(demonstrativoData.total)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-[#fafafa] border border-[#e0e0e0] rounded-xl p-4 mt-2">
                            <span className="text-[10px] uppercase tracking-wide text-[#888888] font-bold mb-2 block">📅 Cronograma de Crédito</span>
                            <div className="flex justify-between text-[13px] mb-1.5 text-[#555555]">
                                <span>• Pagamento Parte 1 ({formatCurrency(demonstrativoData.p1V)})</span><strong className="text-[#1a1a1a]">{demonstrativoData.p1D}</strong>
                            </div>
                            <div className="flex justify-between text-[13px] text-[#555555]">
                                <span>• Pagamento Parte 2 ({formatCurrency(demonstrativoData.p2V)})</span><strong className="text-[#1a1a1a]">{demonstrativoData.p2D}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AÇÕES DO MODAL */}
                <div className="mt-6 flex gap-4 w-[450px]">
                    <button onClick={() => setDemonstrativoData(null)} className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition">Fechar</button>
                    <button onClick={baixarDemonstrativo} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500 transition shadow-lg">Baixar PNG</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

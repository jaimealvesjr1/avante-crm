import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle, Clock, FileText, Edit2, Briefcase, X, Save, Plus, Trash2, ArrowUpRight, ArrowDownRight, Activity, Calculator, Calendar, Shield, Target } from 'lucide-react';
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
    descricao: '', valor: '', desconto: '', categoria: 'Folha de Pagamento', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', desembolsos: []
  });

  const [recebimentoEmEdicao, setRecebimentoEmEdicao] = useState(null);
  const [recebimentoForm, setRecebimentoForm] = useState({ 
    cliente: '', mesReferencia: '', valorAgencia: '', desconto: '', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', desembolsos: []
  });

  const [mesFolha, setMesFolha] = useState('Atual');
  const [metricasFolha, setMetricasFolha] = useState({
    faturamentoBruto: dashboardData.totalAgencyRevenueActual || 0,
    custoOperacional: 0,
    metaAgenciaHistorica: dashboardData.agencyTarget || 0
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
      setMetricasFolha(prev => ({ 
        ...prev, 
        faturamentoBruto: target.ReceitaAgencia || 0,
        metaAgenciaHistorica: mesFolha === 'Atual' ? dashboardData.agencyTarget : (prev.metaAgenciaHistorica || 0)
      }));
    }
  }, [mesFolha, dashboardData]);

  const projecaoReceitaAgencia = dashboardData.totalAgencyRevenue || 0;
  const totalReceitaAgencia = mesFolha === 'Atual' ? dashboardData.totalAgencyRevenueActual : metricasFolha.faturamentoBruto;
  const metaAgencia = mesFolha === 'Atual' ? dashboardData.agencyTarget : metricasFolha.metaAgenciaHistorica;

  // Filtra as listas baseando-se na busca global (searchTerm vindo do App.jsx)
  const busca = (searchTerm || '').toLowerCase();
  
  const recebimentosFiltrados = recebimentos.filter(rec => 
    !busca || rec.cliente.toLowerCase().includes(busca) || rec.mesReferencia.toLowerCase().includes(busca)
  );

  const despesasFiltradas = despesas.filter(d => 
    !busca || d.descricao.toLowerCase().includes(busca) || d.categoria.toLowerCase().includes(busca)
  );

  const totalPendenteGeral = recebimentos.filter(r => r.status === 'Pendente').reduce((acc, curr) => acc + curr.valorAgencia, 0);

  const pendenteFiltrado = recebimentosFiltrados.reduce((acc, r) => {
      if (r.desembolsos && r.desembolsos.length > 0) return acc + r.desembolsos.filter(x => x.status === 'Pendente').reduce((sum, x) => sum + x.valor, 0);
      return acc + (r.status === 'Pendente' ? r.valorAgencia : 0);
  }, 0);
  
  const pagoFiltrado = recebimentosFiltrados.reduce((acc, r) => {
      if (r.desembolsos && r.desembolsos.length > 0) return acc + r.desembolsos.filter(x => x.status === 'Pago').reduce((sum, x) => sum + x.valor, 0);
      return acc + (r.status === 'Pago' ? r.valorAgencia : 0);
  }, 0);
  
  const despesasPendentesFiltradas = despesasFiltradas.reduce((acc, d) => {
      if (d.desembolsos && d.desembolsos.length > 0) return acc + d.desembolsos.filter(x => x.status === 'Pendente').reduce((sum, x) => sum + x.valor, 0);
      return acc + (d.status === 'Pendente' ? d.valor : 0);
  }, 0);
  
  const despesasPagasFiltradas = despesasFiltradas.reduce((acc, d) => {
      if (d.desembolsos && d.desembolsos.length > 0) return acc + d.desembolsos.filter(x => x.status === 'Pago').reduce((sum, x) => sum + x.valor, 0);
      return acc + (d.status === 'Pago' ? d.valor : 0);
  }, 0);

  const dataAtual = new Date();
  dataAtual.setMonth(dataAtual.getMonth() - 1);
  const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const mesPassadoExato = `${mesesNomes[dataAtual.getMonth()]}/${String(dataAtual.getFullYear()).slice(-2)}`;

  const folhaCalculada = useMemo(() => {
    if (!teamMembers) return [];
    return teamMembers.filter(m => m.paymentConfig).map(m => {
        const calculo = calcularFolhaMembro(m, metricasFolha.faturamentoBruto, metricasFolha.custoOperacional, bonusManuais[m.email]);
        return { ...m, calculo };
    });
  }, [teamMembers, metricasFolha, bonusManuais]);

  const handleLancarPagamentoEquipe = async (membro) => {
    if (!canEdit) return toast.error("Sem permissão.");
    
    const config = membro.paymentConfig;
    const hoje = new Date();
    const lancamentos = [];
    
    // Gerar a explicação de como a comissão foi calculada
    const regraTexto = `${config.percentual}% ${config.gatilho > 0 ? `acima de ${formatCurrency(config.gatilho)}` : `s/ ${config.baseCalculo === 'LL' ? 'Lucro Líq.' : 'Fat. Bruto'}`}`;

    // Objeto do holerite que será salvo no banco para consulta futura
    const dadosHolerite = {
      nome: membro.nomeCompleto,
      funcao: getVisualRole(membro.role) || 'Colaborador',
      ref: `${mesesNomes[dataAtual.getMonth()]}/${String(dataAtual.getFullYear()).slice(-2)}`,
      fat: metricasFolha.faturamentoBruto,
      meta: metricasFolha.metaAgenciaHistorica,
      base: membro.calculo.fixo,
      comissao: membro.calculo.comissao,
      regra: regraTexto, // <-- Regra explícita salva aqui
      bonus: membro.calculo.bonus,
      total: membro.calculo.total,
      p1V: membro.calculo.fixo,
      p1D: config.diaFixo || 'Dia 05',
      p2V: membro.calculo.comissao + membro.calculo.bonus,
      p2D: config.diaVariavel || 'Dia 20'
    };

    if (config.frequencia === 'fracionado') {
        lancamentos.push({ descricao: `Fixo: ${membro.nomeCompleto}`, valor: config.salarioFixo, dataVencimento: hoje.toISOString().split('T')[0] });
        lancamentos.push({ descricao: `Comissão: ${membro.nomeCompleto}`, valor: membro.calculo.comissao + membro.calculo.bonus, dataVencimento: hoje.toISOString().split('T')[0] });
    } else {
        lancamentos.push({ descricao: `Salário: ${membro.nomeCompleto}`, valor: membro.calculo.total, dataVencimento: hoje.toISOString().split('T')[0] });
    }

    try {
      for (const item of lancamentos) {
          await addDoc(collection(db, "financeiro_despesas"), {
            ...item, categoria: 'Folha de Pagamento', status: 'Pendente', 
            holerite: dadosHolerite, // <-- Salvamos o holerite na despesa!
            criadoEm: new Date().toISOString()
          });
      }
      toast.success(`Pagamento de ${membro.nome} lançado com sucesso!`);
      // Mostra o demonstrativo na hora para conferência
      setDemonstrativoData(dadosHolerite);
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

    recebimentos.forEach(r => {
      if (r.desembolsos && r.desembolsos.length > 0) {
        r.desembolsos.filter(x => x.status === 'Pago' && x.dataPagamentoRealizado).forEach(x => {
          const mes = getMesAno(x.dataPagamentoRealizado);
          const semana = getSemanaDoMes(x.dataPagamentoRealizado);
          if (!relatorio[mes]) relatorio[mes] = { totalEntradas: 0, totalSaidas: 0, saldo: 0, semanas: {} };
          if (!relatorio[mes].semanas[semana]) relatorio[mes].semanas[semana] = { entradas: 0, saidas: 0, saldo: 0 };
          relatorio[mes].semanas[semana].entradas += x.valor;
          relatorio[mes].semanas[semana].saldo += x.valor;
          relatorio[mes].totalEntradas += x.valor;
          relatorio[mes].saldo += x.valor;
        });
      } else if (r.status === 'Pago' && r.dataPagamentoRealizado) {
        const mes = getMesAno(r.dataPagamentoRealizado);
        const semana = getSemanaDoMes(r.dataPagamentoRealizado);
        if (!relatorio[mes]) relatorio[mes] = { totalEntradas: 0, totalSaidas: 0, saldo: 0, semanas: {} };
        if (!relatorio[mes].semanas[semana]) relatorio[mes].semanas[semana] = { entradas: 0, saidas: 0, saldo: 0 };
        relatorio[mes].semanas[semana].entradas += r.valorAgencia;
        relatorio[mes].semanas[semana].saldo += r.valorAgencia;
        relatorio[mes].totalEntradas += r.valorAgencia;
        relatorio[mes].saldo += r.valorAgencia;
      }
    });

    despesas.forEach(d => {
      if (d.desembolsos && d.desembolsos.length > 0) {
        d.desembolsos.filter(x => x.status === 'Pago' && x.dataPagamentoRealizado).forEach(x => {
          const mes = getMesAno(x.dataPagamentoRealizado);
          const semana = getSemanaDoMes(x.dataPagamentoRealizado);
          if (!relatorio[mes]) relatorio[mes] = { totalEntradas: 0, totalSaidas: 0, saldo: 0, semanas: {} };
          if (!relatorio[mes].semanas[semana]) relatorio[mes].semanas[semana] = { entradas: 0, saidas: 0, saldo: 0 };
          relatorio[mes].semanas[semana].saidas += x.valor;
          relatorio[mes].semanas[semana].saldo -= x.valor;
          relatorio[mes].totalSaidas += x.valor;
          relatorio[mes].saldo -= x.valor;
        });
      } else if (d.status === 'Pago' && d.dataPagamentoRealizado) {
        const mes = getMesAno(d.dataPagamentoRealizado);
        const semana = getSemanaDoMes(d.dataPagamentoRealizado);
        if (!relatorio[mes]) relatorio[mes] = { totalEntradas: 0, totalSaidas: 0, saldo: 0, semanas: {} };
        if (!relatorio[mes].semanas[semana]) relatorio[mes].semanas[semana] = { entradas: 0, saidas: 0, saldo: 0 };
        relatorio[mes].semanas[semana].saidas += d.valor;
        relatorio[mes].semanas[semana].saldo -= d.valor;
        relatorio[mes].totalSaidas += d.valor;
        relatorio[mes].saldo -= d.valor;
      }
    });

    return relatorio;
  }, [recebimentos, despesas]);

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

  const iniciarEdicaoRecebimento = (r) => {
    const formElement = document.getElementById('form-recebimento');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setRecebimentoEmEdicao(r.id);
    setRecebimentoForm({ 
      cliente: r.cliente, 
      mesReferencia: r.mesReferencia || '', 
      valorAgencia: r.valorBruto || r.valorAgencia, // Puxa o bruto, se existir
      desconto: r.desconto || '', 
      dataVencimento: r.dataVencimento ? r.dataVencimento.split('T')[0] : new Date().toISOString().split('T')[0], 
      status: r.status,
      desembolsos: r.desembolsos || []
    });
  };

  const handleSalvarRecebimento = async (e) => {
    e.preventDefault();
    if (!canEdit) return toast.error("Sem permissão.");
    
    const numValorBruto = Number(String(recebimentoForm.valorAgencia).replace(',', '.')) || 0;
    const numDesconto = Number(String(recebimentoForm.desconto).replace(',', '.')) || 0;
    const numValorLiquido = numValorBruto - numDesconto;

    if (!recebimentoForm.cliente.trim() || numValorBruto <= 0) return toast.error("Preencha cliente e valor válidos.");

    const parsedDesembolsos = (recebimentoForm.desembolsos || []).map(d => ({
      ...d, valor: Number(String(d.valor).replace(',', '.')) || 0
    }));

    if (parsedDesembolsos.length > 0) {
      const sum = parsedDesembolsos.reduce((acc, curr) => acc + curr.valor, 0);
      if (Math.abs(sum - numValorLiquido) > 0.01) {
        return toast.error(`A soma das parcelas deve bater o valor líquido final: ${formatCurrency(numValorLiquido)}`);
      }
    }

    const allPaid = parsedDesembolsos.length > 0 && parsedDesembolsos.every(d => d.status === 'Pago');
    const finalStatus = parsedDesembolsos.length > 0 ? (allPaid ? 'Pago' : (parsedDesembolsos.some(d => d.status === 'Pago') ? 'Parcial' : 'Pendente')) : recebimentoForm.status;

    try {
      if (recebimentoEmEdicao) {
        await updateDoc(doc(db, "financeiro_recebimentos", recebimentoEmEdicao), {
          cliente: recebimentoForm.cliente.trim(), mesReferencia: recebimentoForm.mesReferencia,
          valorBruto: numValorBruto, desconto: numDesconto, valorAgencia: numValorLiquido,
          dataVencimento: recebimentoForm.dataVencimento, status: finalStatus, desembolsos: parsedDesembolsos
        });
        toast.success("Recebimento atualizado!");
        setRecebimentoEmEdicao(null);
      } else {
        await addDoc(collection(db, "financeiro_recebimentos"), {
          cliente: recebimentoForm.cliente.trim(), mesReferencia: recebimentoForm.mesReferencia || 'Avulso',
          valorBruto: numValorBruto, desconto: numDesconto, valorAgencia: numValorLiquido,
          dataVencimento: recebimentoForm.dataVencimento, status: finalStatus, desembolsos: parsedDesembolsos,
          dataPagamentoRealizado: finalStatus === 'Pago' && parsedDesembolsos.length === 0 ? new Date().toISOString() : null,
          dataEmissao: new Date().toISOString()
        });
        toast.success("Entrada registrada!");
      }
      setRecebimentoForm({ cliente: '', mesReferencia: '', valorAgencia: '', desconto: '', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', desembolsos: [] });
    } catch (error) { toast.error("Erro ao salvar entrada."); }
  };

  const marcarDesembolsoRecebimentoComoPago = async (idReceb, idDesembolso) => {
    if (!canEdit) return toast.error("Sem permissão.");
    try {
      const rec = recebimentos.find(r => r.id === idReceb);
      if (!rec) return;

      const novosDesembolsos = rec.desembolsos.map(d => 
        d.id === idDesembolso ? { ...d, status: 'Pago', dataPagamentoRealizado: new Date().toISOString() } : d
      );

      const todosPagos = novosDesembolsos.every(d => d.status === 'Pago');
      const algumPago = novosDesembolsos.some(d => d.status === 'Pago');
      const novoStatus = todosPagos ? 'Pago' : (algumPago ? 'Parcial' : 'Pendente');
      
      await updateDoc(doc(db, "financeiro_recebimentos", idReceb), {
        desembolsos: novosDesembolsos, status: novoStatus,
        dataPagamentoRealizado: todosPagos ? new Date().toISOString() : (rec.dataPagamentoRealizado || null)
      });
      toast.success("Parcela recebida!");
    } catch (error) { toast.error("Erro ao registrar parcela."); }
  };

  const handleExcluirRecebimento = async (id) => {
    if (!canEdit) return;
    if (window.confirm("Deseja realmente apagar esta entrada?")) {
      await deleteDoc(doc(db, "financeiro_recebimentos", id));
      toast.success("Entrada apagada.");
    }
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
    
    const numValorBruto = Number(String(despesaForm.valor).replace(',', '.')) || 0;
    const numDesconto = Number(String(despesaForm.desconto).replace(',', '.')) || 0;
    const numValorLiquido = numValorBruto - numDesconto;

    if (!despesaForm.descricao.trim() || numValorBruto <= 0) return toast.error("Preencha descrição e valor bruto válidos.");

    const parsedDesembolsos = (despesaForm.desembolsos || []).map(d => ({
      ...d, valor: Number(String(d.valor).replace(',', '.')) || 0
    }));

    if (parsedDesembolsos.length > 0) {
      const sum = parsedDesembolsos.reduce((acc, curr) => acc + curr.valor, 0);
      if (Math.abs(sum - numValorLiquido) > 0.01) { // margem de erro de 1 centavo
        return toast.error(`A soma dos desembolsos deve bater o valor líquido final: ${formatCurrency(numValorLiquido)}`);
      }
    }

    const allPaid = parsedDesembolsos.length > 0 && parsedDesembolsos.every(d => d.status === 'Pago');
    const finalStatus = parsedDesembolsos.length > 0 ? (allPaid ? 'Pago' : (parsedDesembolsos.some(d => d.status === 'Pago') ? 'Parcial' : 'Pendente')) : despesaForm.status;

    try {
      if (despesaEmEdicao) {
        await updateDoc(doc(db, "financeiro_despesas", despesaEmEdicao), {
          descricao: despesaForm.descricao.trim(), 
          valorBruto: numValorBruto, desconto: numDesconto, valor: numValorLiquido, // <-- Salva os 3 valores
          categoria: despesaForm.categoria, dataVencimento: despesaForm.dataVencimento, status: finalStatus, desembolsos: parsedDesembolsos
        });
        toast.success("Despesa atualizada!");
        setDespesaEmEdicao(null);
      } else {
        await addDoc(collection(db, "financeiro_despesas"), {
          descricao: despesaForm.descricao.trim(), 
          valorBruto: numValorBruto, desconto: numDesconto, valor: numValorLiquido, 
          categoria: despesaForm.categoria, dataVencimento: despesaForm.dataVencimento, status: finalStatus, desembolsos: parsedDesembolsos,
          dataPagamentoRealizado: finalStatus === 'Pago' && parsedDesembolsos.length === 0 ? new Date().toISOString() : null,
          criadoEm: new Date().toISOString()
        });
        toast.success("Despesa registada!");
      }
      setDespesaForm({ descricao: '', valor: '', desconto: '', categoria: 'Folha de Pagamento', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', desembolsos: [] });
    } catch (error) { toast.error("Erro ao salvar despesa."); }
  };

  const iniciarEdicaoDespesa = (d) => {
    const formElement = document.getElementById('form-despesa');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setDespesaEmEdicao(d.id);
    setDespesaForm({ 
      descricao: d.descricao, 
      valor: d.valorBruto || d.valor,
      desconto: d.desconto || '', 
      categoria: d.categoria, dataVencimento: d.dataVencimento, status: d.status,
      desembolsos: d.desembolsos || []
    });
  };

  const marcarDesembolsoComoPago = async (idDespesa, idDesembolso) => {
    if (!canEdit) return toast.error("Sem permissão.");
    try {
      const despesa = despesas.find(d => d.id === idDespesa);
      if (!despesa) return;

      const novosDesembolsos = despesa.desembolsos.map(d => 
        d.id === idDesembolso ? { ...d, status: 'Pago', dataPagamentoRealizado: new Date().toISOString() } : d
      );

      const todosPagos = novosDesembolsos.every(d => d.status === 'Pago');
      const algumPago = novosDesembolsos.some(d => d.status === 'Pago');
      const novoStatus = todosPagos ? 'Pago' : (algumPago ? 'Parcial' : 'Pendente');
      
      await updateDoc(doc(db, "financeiro_despesas", idDespesa), {
        desembolsos: novosDesembolsos,
        status: novoStatus,
        dataPagamentoRealizado: todosPagos ? new Date().toISOString() : despesa.dataPagamentoRealizado
      });
      toast.success("Parcela/Desembolso pago!");
    } catch (error) { toast.error("Erro ao registrar desembolso."); }
  };

  const marcarDespesaComoPaga = async (idDespesa) => {
    if (!canEdit) return toast.error("Sem permissão.");
    try {
      await updateDoc(doc(db, "financeiro_despesas", idDespesa), { status: 'Pago', dataPagamentoRealizado: new Date().toISOString() });
      toast.success("Despesa total paga!");
    } catch (error) { toast.error("Erro ao registrar."); }
  };

  const handleExcluirDespesa = async (id) => {
    if (!canEdit) return;
    if (window.confirm("Deseja realmente apagar este registro de despesa?")) {
      await deleteDoc(doc(db, "financeiro_despesas", id));
      toast.success("Apagada.");
    }
  };

  // --- LÓGICA DA BARRA DE META DA AGÊNCIA ---
  const renderAgencyProgressBar = () => {
    const safeTarget = metaAgencia > 0 ? metaAgencia : 1;
    // O 100% da meta fica em 80% da barra. Se chegar a 125% ou mais, preenche a barra toda.
    const currentWidth = Math.min((totalReceitaAgencia / safeTarget) * 80, 100);
    const projectedWidth = Math.min((projecaoReceitaAgencia / safeTarget) * 80, 100);
    
    const currentPercent = ((totalReceitaAgencia / safeTarget) * 100).toFixed(1);
    const projectedPercent = ((projecaoReceitaAgencia / safeTarget) * 100).toFixed(1);

    return (
      <div className="bg-white/[0.02] backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full relative mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Target className="text-emerald-400" size={24} /> Meta da Agência
            </h2>
            <p className="text-gray-400 text-sm mt-1">Acompanhamento do Faturamento Interno vs Meta</p>
          </div>
          <div className="flex flex-wrap gap-4 md:gap-8 bg-black/20 p-3 rounded-2xl border border-white/5">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Hoje (Receita)</span>
              <span className="text-xl font-bold text-blue-400">{formatCurrency(totalReceitaAgencia)} <span className="text-xs text-blue-400/70">({currentPercent}%)</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Projeção</span>
              <span className="text-xl font-bold text-indigo-400">{formatCurrency(projecaoReceitaAgencia)} <span className="text-xs text-indigo-400/70">({projectedPercent}%)</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Meta</span>
              <span className="text-xl font-bold text-white">{formatCurrency(metaAgencia)}</span>
            </div>
          </div>
        </div>

        <div className="relative pt-6 pb-2">
          {/* Track/Fundo */}
          <div className="h-8 bg-black/40 rounded-full border border-white/10 shadow-inner overflow-hidden relative">
            {/* Projeção */}
            <div 
              className="absolute top-0 left-0 h-full bg-indigo-500/20 transition-all duration-1000 ease-out border-r border-indigo-500/50"
              style={{ width: `${projectedWidth}%` }}
            >
              <div className="w-full h-full opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)' }}></div>
            </div>

            {/* Hoje */}
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(16,185,129,0.4)] "
              style={{ width: `${currentWidth}%` }}
            ></div>
          </div>

          {/* Marcador da Meta exata (80%) */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-white to-gray-300 shadow-[0_0_15px_rgba(255,255,255,1)] z-10" style={{ left: '80%' }}>
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white text-black text-[11px] font-black px-2 py-0.5 rounded shadow-lg">
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
    <div className="space-y-6 animate-in fade-in duration-300 w-full">
      
      {/* BARRA DE PROGRESSÃO DE META (No Topo Absoluto) */}
      {renderAgencyProgressBar()}

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LADO ESQUERDO: LISTA DE HISTÓRICO */}
            <div className="lg:col-span-2 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden h-max">
              <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><ArrowUpRight size={18} className="text-green-400"/> Histórico de Faturas</h3>
                {busca && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">Filtrado por: "{busca}"</span>}
              </div>
              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-900 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
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
                      const hasDesembolsos = rec.desembolsos && rec.desembolsos.length > 0;
                      const dataVenc = new Date(rec.dataVencimento);
                      const isAtrasado = !hasDesembolsos && rec.status === 'Pendente' && dataVenc < new Date();
                      
                      return (
                        <React.Fragment key={rec.id}>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="p-4 pl-6 font-bold text-white flex items-center gap-2"><FileText size={16} className="text-gray-500" />{rec.cliente}</td>
                            <td className="p-4 text-sm font-bold text-indigo-300">{rec.mesReferencia || '-'}</td>
                            <td className={`p-4 text-sm font-bold ${isAtrasado ? 'text-red-400' : 'text-gray-300'}`}>
                              {hasDesembolsos ? 'Múltiplos Venc.' : dataVenc.toLocaleDateString('pt-BR')}
                              {isAtrasado && <span className="ml-2 text-[10px] bg-red-500/20 px-1 rounded text-red-400">Atrasado</span>}
                            </td>
                            <td className="p-4 font-bold text-white text-right">
                              {formatCurrency(rec.valorAgencia)}
                            </td>
                            <td className="p-4 text-center">
                              {rec.status === 'Pago' ? <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold border border-green-500/20">Pago</span> : 
                               rec.status === 'Parcial' ? <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-bold border border-indigo-500/20">Parcial</span> :
                               <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-500/20">Pendente</span>}
                            </td>
                            <td className="p-4 pr-6 text-center flex items-center justify-center gap-2">
                                {!hasDesembolsos && rec.status === 'Pendente' && <button onClick={() => marcarRecebimentoComoPago(rec.id, rec.cliente, rec.mesReferencia)} className="bg-green-600 hover:bg-green-500 text-white text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl font-bold shadow-md transition-all">Dar Baixa</button>}
                                <button onClick={() => iniciarEdicaoRecebimento(rec)} className="p-2 text-gray-400 hover:text-indigo-400 bg-white/5 rounded-xl transition-colors" title="Editar / Adicionar Parcelas"><Edit2 size={14}/></button>
                                <button onClick={() => handleExcluirRecebimento(rec.id)} className="p-2 text-gray-500 hover:text-red-400 bg-white/5 rounded-xl transition-colors" title="Excluir"><Trash2 size={14}/></button>
                            </td>
                          </tr>

                          {hasDesembolsos && rec.desembolsos.map((desem, idx) => {
                            const isDesemAtrasado = desem.status === 'Pendente' && new Date(desem.dataVencimento) < new Date();
                            return (
                              <tr key={desem.id} className="bg-white/[0.01] hover:bg-white/[0.03] transition-colors border-l border-emerald-500/30">
                                <td className="p-3 pl-10 text-gray-500 text-[11px] font-medium uppercase tracking-wider">↳ Parcela {idx + 1}</td>
                                <td className="p-3"></td>
                                <td className={`p-3 font-bold text-xs ${isDesemAtrasado ? 'text-red-400' : 'text-gray-400'}`}>
                                  {new Date(desem.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  {isDesemAtrasado && <span className="ml-2 text-[10px] bg-red-500/20 px-1 rounded text-red-400">Atrasado</span>}
                                </td>
                                <td className="p-3 font-bold text-emerald-300/80 text-right text-sm">{formatCurrency(desem.valor)}</td>
                                <td className="p-3 text-center">
                                  {desem.status === 'Pago' ? <span className="text-[10px] font-bold text-green-400">Pago</span> : <span className="text-[10px] font-bold text-amber-400">Pendente</span>}
                                </td>
                                <td className="p-3 pr-6 text-center flex justify-center">
                                  {desem.status === 'Pendente' && (
                                    <button onClick={() => marcarDesembolsoRecebimentoComoPago(rec.id, desem.id)} className="bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg font-bold shadow-md transition-all">Receber</button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      );
                    })}
                    {recebimentosFiltrados.length === 0 && (
                       <tr><td colSpan="6" className="p-12 text-center text-gray-500">Nenhuma entrada encontrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LADO DIREITO: FORMULÁRIO DE EDIÇÃO/ENTRADA AVULSA */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                  {recebimentoEmEdicao ? <Edit2 size={18} className="text-amber-400" /> : <Plus size={18} className="text-emerald-400" />}
                  {recebimentoEmEdicao ? 'Editar Fatura' : 'Lançar Entrada Avulsa'}
                </h3>
                
                <form id="form-recebimento" onSubmit={handleSalvarRecebimento} className="space-y-4 scroll-mt-24">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Cliente / Origem</label>
                    <input type="text" required value={recebimentoForm.cliente} onChange={e => setRecebimentoForm({...recebimentoForm, cliente: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-emerald-500 mt-1 shadow-inner text-sm" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Competência</label>
                      <input type="text" placeholder="Ex: MAI/26" value={recebimentoForm.mesReferencia} onChange={e => setRecebimentoForm({...recebimentoForm, mesReferencia: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-emerald-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Status Inicial</label>
                      <select disabled={recebimentoForm.desembolsos.length > 0} value={recebimentoForm.status} onChange={e => setRecebimentoForm({...recebimentoForm, status: e.target.value})} className={`w-full bg-black/40 border border-white/10 ${recebimentoForm.desembolsos.length > 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-pointer'} rounded-xl p-3 outline-none mt-1 shadow-inner text-xs`}>
                        <option className="bg-gray-900" value="Pendente">A Receber</option>
                        <option className="bg-gray-900" value="Pago">Já Recebido</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Vencimento</label>
                      <input type="date" required value={recebimentoForm.dataVencimento} onChange={e => setRecebimentoForm({...recebimentoForm, dataVencimento: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-emerald-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Bruto (R$)</label>
                      <input type="number" step="0.01" required value={recebimentoForm.valorAgencia} onChange={e => setRecebimentoForm({...recebimentoForm, valorAgencia: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-emerald-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Desc. (R$)</label>
                      <input type="number" step="0.01" placeholder="0.00" value={recebimentoForm.desconto} onChange={e => setRecebimentoForm({...recebimentoForm, desconto: e.target.value})} className="w-full bg-black/40 border border-white/10 text-rose-300 rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4 mt-2">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                        Parcelamento
                        <span className="bg-gray-800 px-2 py-0.5 rounded-full text-gray-500 font-normal normal-case">Opcional</span>
                      </label>
                      <button type="button" onClick={() => setRecebimentoForm(p => ({...p, desembolsos: [...p.desembolsos, { id: Date.now(), valor: '', dataVencimento: p.dataVencimento, status: 'Pendente' }] }))} className="text-[10px] font-bold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-all">
                        + Dividir Parcela
                      </button>
                    </div>
                    
                    {recebimentoForm.desembolsos.length > 0 && (() => {
                       const valorLiq = (Number(String(recebimentoForm.valorAgencia).replace(',', '.')) || 0) - (Number(String(recebimentoForm.desconto).replace(',', '.')) || 0);
                       const somaDistr = recebimentoForm.desembolsos.reduce((acc, curr) => acc + (Number(String(curr.valor).replace(',', '.')) || 0), 0);
                       const faltaDistribuir = valorLiq - somaDistr;

                       return (
                        <>
                          <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1 mb-3">
                            {recebimentoForm.desembolsos.map((desem, idx) => (
                              <div key={desem.id} className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5 shadow-inner">
                                <span className="text-[10px] text-gray-500 font-bold ml-1">{idx + 1}º</span>
                                <input type="number" step="0.01" placeholder="Valor R$" value={desem.valor} onChange={e => setRecebimentoForm(p => ({...p, desembolsos: p.desembolsos.map(x => x.id === desem.id ? {...x, valor: e.target.value} : x)}))} className="w-1/3 bg-black/40 border border-white/10 text-white rounded-lg p-2 outline-none focus:border-emerald-500 text-xs shadow-inner" />
                                <input type="date" value={desem.dataVencimento} onChange={e => setRecebimentoForm(p => ({...p, desembolsos: p.desembolsos.map(x => x.id === desem.id ? {...x, dataVencimento: e.target.value} : x)}))} className="w-1/2 bg-black/40 border border-white/10 text-white rounded-lg p-2 outline-none focus:border-emerald-500 text-xs shadow-inner" />
                                <button type="button" onClick={() => setRecebimentoForm(p => ({...p, desembolsos: p.desembolsos.filter(x => x.id !== desem.id)}))} className="text-gray-500 hover:text-red-400 p-1 mr-1 transition-colors"><X size={14}/></button>
                              </div>
                            ))}
                          </div>
                          <div className={`text-right text-xs font-bold px-2 py-1.5 rounded-lg border ${Math.abs(faltaDistribuir) < 0.01 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                              {Math.abs(faltaDistribuir) < 0.01 ? '✅ 100% Distribuído' : `Falta Distribuir: ${formatCurrency(faltaDistribuir)}`}
                          </div>
                        </>
                       );
                    })()}
                  </div>

                  <div className="flex gap-3 mt-4">
                    {recebimentoEmEdicao && (
                      <button type="button" onClick={() => { setRecebimentoEmEdicao(null); setRecebimentoForm({ cliente: '', mesReferencia: '', valorAgencia: '', desconto: '', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', desembolsos: [] }); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
                        Cancelar
                      </button>
                    )}
                    <button type="submit" className={`flex-1 ${recebimentoEmEdicao ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm`}>
                      {recebimentoEmEdicao ? 'Salvar Edição' : 'Registrar Entrada'}
                    </button>
                  </div>
                </form>
              </div>
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
                      const hasDesembolsos = d.desembolsos && d.desembolsos.length > 0;
                      const isAtrasado = !hasDesembolsos && d.status === 'Pendente' && new Date(d.dataVencimento) < new Date();
                      
                      return (
                        <React.Fragment key={d.id}>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className={`p-4 pl-6 text-sm font-bold ${isAtrasado ? 'text-red-400' : 'text-gray-300'}`}>
                              {hasDesembolsos ? 'Parcelado' : new Date(d.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                              {isAtrasado && <span className="ml-2 text-[10px] bg-red-500/20 px-1 rounded text-red-400">Atrasado</span>}
                            </td>
                            <td className="p-4 font-bold text-white">{d.descricao}</td>
                            <td className="p-4"><span className="bg-gray-800 text-gray-300 text-[10px] px-2 py-1 rounded-md border border-gray-700">{d.categoria}</span></td>
                            <td className="p-4 font-bold text-rose-400 text-right">{formatCurrency(d.valor)}</td>
                            <td className="p-4 text-center">
                              {d.status === 'Pago' ? <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold border border-green-500/20">Pago</span> : 
                               d.status === 'Parcial' ? <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-bold border border-indigo-500/20">Parcial</span> :
                               <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-500/20">Pendente</span>}
                            </td>
                            <td className="p-4 pr-6 text-center flex items-center justify-center gap-2">
                              {!hasDesembolsos && d.status === 'Pendente' && <button onClick={() => marcarDespesaComoPaga(d.id)} className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl font-bold shadow-md transition-all">Dar Baixa</button>}
                              {d.holerite && <button onClick={() => setDemonstrativoData(d.holerite)} className="p-2 text-indigo-300 hover:text-indigo-100 bg-indigo-500/20 hover:bg-indigo-500/40 rounded-xl transition-colors" title="Ver Demonstrativo"><FileText size={14}/></button>}
                              <button onClick={() => iniciarEdicaoDespesa(d)} className="p-2 text-gray-400 hover:text-indigo-400 bg-white/5 rounded-xl transition-colors" title="Editar Despesa"><Edit2 size={14}/></button>
                              <button onClick={() => handleExcluirDespesa(d.id)} className="p-2 text-gray-500 hover:text-red-400 bg-white/5 rounded-xl transition-colors" title="Excluir"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                          
                          {hasDesembolsos && d.desembolsos.map((desem, idx) => {
                            const isDesemAtrasado = desem.status === 'Pendente' && new Date(desem.dataVencimento) < new Date();
                            return (
                              <tr key={desem.id} className="bg-white/[0.01] hover:bg-white/[0.03] transition-colors border-l border-indigo-500/30">
                                <td className="p-3 pl-10 text-gray-500 text-[11px] font-medium uppercase tracking-wider">↳ Parcela {idx + 1}</td>
                                <td className={`p-3 font-bold text-xs ${isDesemAtrasado ? 'text-red-400' : 'text-gray-400'}`}>
                                  {new Date(desem.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  {isDesemAtrasado && <span className="ml-2 text-[10px] bg-red-500/20 px-1 rounded text-red-400">Atrasado</span>}
                                </td>
                                <td className="p-3"></td>
                                <td className="p-3 font-bold text-rose-300/80 text-right text-sm">{formatCurrency(desem.valor)}</td>
                                <td className="p-3 text-center">
                                  {desem.status === 'Pago' ? <span className="text-[10px] font-bold text-green-400">Pago</span> : <span className="text-[10px] font-bold text-amber-400">Pendente</span>}
                                </td>
                                <td className="p-3 pr-6 text-center flex justify-center">
                                  {desem.status === 'Pendente' && (
                                    <button onClick={() => marcarDesembolsoComoPago(d.id, desem.id)} className="bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg font-bold shadow-md transition-all">Dar Baixa</button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </React.Fragment>
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
              
              {/* BLOCO 2: LANÇAR DESPESA MANUAL */}
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                  <Plus size={18} className="text-rose-400" /> Lançamento de Despesa
                </h3>
                <form id="form-despesa" onSubmit={handleAdicionarDespesa} className="space-y-4 scroll-mt-24">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                    <input type="text" required value={despesaForm.descricao} onChange={e => setDespesaForm({...despesaForm, descricao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Vencimento</label>
                      <input type="date" required value={despesaForm.dataVencimento} onChange={e => setDespesaForm({...despesaForm, dataVencimento: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Bruto (R$)</label>
                      <input type="number" step="0.01" required value={despesaForm.valor} onChange={e => setDespesaForm({...despesaForm, valor: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Desconto (R$)</label>
                      <input type="number" step="0.01" placeholder="0.00" value={despesaForm.desconto} onChange={e => setDespesaForm({...despesaForm, desconto: e.target.value})} className="w-full bg-black/40 border border-white/10 text-rose-300 rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
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
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Status Inicial</label>
                      <select disabled={despesaForm.desembolsos.length > 0} value={despesaForm.status} onChange={e => setDespesaForm({...despesaForm, status: e.target.value})} className={`w-full bg-black/40 border border-white/10 ${despesaForm.desembolsos.length > 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-pointer'} rounded-xl p-3 outline-none mt-1 shadow-inner text-xs`}>
                        <option className="bg-gray-900" value="Pendente">A Pagar</option>
                        <option className="bg-gray-900" value="Pago">Já Pago</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4 mt-2">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                        Desembolsos
                        <span className="bg-gray-800 px-2 py-0.5 rounded-full text-gray-500 font-normal normal-case">Opcional</span>
                      </label>
                      <button type="button" onClick={() => setDespesaForm(p => ({...p, desembolsos: [...p.desembolsos, { id: Date.now(), valor: '', dataVencimento: p.dataVencimento, status: 'Pendente' }] }))} className="text-[10px] font-bold bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-all">
                        + Adicionar Desembolso
                      </button>
                    </div>
                    
                    {despesaForm.desembolsos.length > 0 && (() => {
                       const valorLiq = (Number(String(despesaForm.valor).replace(',', '.')) || 0) - (Number(String(despesaForm.desconto).replace(',', '.')) || 0);
                       const somaDistr = despesaForm.desembolsos.reduce((acc, curr) => acc + (Number(String(curr.valor).replace(',', '.')) || 0), 0);
                       const faltaDistribuir = valorLiq - somaDistr;

                       return (
                        <>
                          <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1 mb-3">
                            {despesaForm.desembolsos.map((desem, idx) => (
                              <div key={desem.id} className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5 shadow-inner">
                                <span className="text-[10px] text-gray-500 font-bold ml-1">{idx + 1}º</span>
                                <input type="number" step="0.01" placeholder="Valor R$" value={desem.valor} onChange={e => setDespesaForm(p => ({...p, desembolsos: p.desembolsos.map(x => x.id === desem.id ? {...x, valor: e.target.value} : x)}))} className="w-1/3 bg-black/40 border border-white/10 text-white rounded-lg p-2 outline-none focus:border-indigo-500 text-xs shadow-inner" />
                                <input type="date" value={desem.dataVencimento} onChange={e => setDespesaForm(p => ({...p, desembolsos: p.desembolsos.map(x => x.id === desem.id ? {...x, dataVencimento: e.target.value} : x)}))} className="w-1/2 bg-black/40 border border-white/10 text-white rounded-lg p-2 outline-none focus:border-indigo-500 text-xs shadow-inner" />
                                <button type="button" onClick={() => setDespesaForm(p => ({...p, desembolsos: p.desembolsos.filter(x => x.id !== desem.id)}))} className="text-gray-500 hover:text-red-400 p-1 mr-1 transition-colors"><X size={14}/></button>
                              </div>
                            ))}
                          </div>
                          <div className={`text-right text-xs font-bold px-2 py-1.5 rounded-lg border ${Math.abs(faltaDistribuir) < 0.01 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                              {Math.abs(faltaDistribuir) < 0.01 ? '✅ Valor 100% Distribuído' : `Falta Distribuir: ${formatCurrency(faltaDistribuir)}`}
                          </div>
                        </>
                       );
                    })()}
                  </div>

                  <div className="flex gap-3 mt-4">
                    {despesaEmEdicao && (
                      <button type="button" onClick={() => { setDespesaEmEdicao(null); setDespesaForm({ descricao: '', valor: '', categoria: 'Folha de Pagamento', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', desembolsos: [] }); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
                        Cancelar Edição
                      </button>
                    )}
                    <button type="submit" className={`flex-1 ${despesaEmEdicao ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-rose-600 hover:bg-rose-500'} text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm`}>
                      {despesaEmEdicao ? 'Salvar Edição' : 'Registrar Despesa'}
                    </button>
                  </div>
                </form>
              </div>

              {/* BLOCO 1: FOLHA AUTOMÁTICA */}
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                  <Calculator size={18} className="text-indigo-400" /> Folha Automática
                </h3>
                
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
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Meta do Mês</label>
                    <input type="number" step="0.01" value={metricasFolha.metaAgenciaHistorica} onChange={e => setMetricasFolha({...metricasFolha, metaAgenciaHistorica: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 shadow-inner text-sm font-bold" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Custo (LL)</label>
                    <input type="number" step="0.01" value={metricasFolha.custoOperacional} onChange={e => setMetricasFolha({...metricasFolha, custoOperacional: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 shadow-inner text-sm" />
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
                
                {/* O COMPROVANTE */}
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
                          
                          <div className="flex justify-between mb-0.5 text-[14px]"><span>Comissão:</span><span className="font-semibold">{formatCurrency(demonstrativoData.comissao)}</span></div>
                          {demonstrativoData.regra && <div className="text-[10px] text-[#888888] text-right mb-2 italic">({demonstrativoData.regra})</div>}
                          
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

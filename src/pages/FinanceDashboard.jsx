import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle, Clock, FileText, Edit2, Briefcase, X, Save, Plus, Trash2, ArrowUpRight, ArrowDownRight, Activity, Calculator, Calendar, Shield, Target, Building, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { getVisualRole } from '../App';
import { getSemanaDoMes, getMesAno } from '../utils/dateUtils';
import { calcularFolhaMembro } from '../utils/financeUtils';

const CONTAS_PADRAO = ['AVANTE PJ', 'EDUARDA', 'Carteira'];

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

  const [activeTab, setActiveTab] = useState('caixa'); 
  const [recebimentos, setRecebimentos] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [despesaEmEdicao, setDespesaEmEdicao] = useState(null);
  const [despesaForm, setDespesaForm] = useState({ 
    descricao: '', valor: '', desconto: '', motivoDesconto: '', categoria: 'Folha de Pagamento', 
    contaBancaria: 'AVANTE PJ', dataVencimento: new Date().toISOString().split('T')[0], 
    status: 'Pendente', desembolsos: [], chavePix: ''
  });

  const [recebimentoEmEdicao, setRecebimentoEmEdicao] = useState(null);
  const [recebimentoForm, setRecebimentoForm] = useState({ 
    cliente: '', mesReferencia: '', valorAgencia: '', desconto: '', motivoDesconto: '', contaBancaria: 'AVANTE PJ', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', desembolsos: []
  });

  const [mesFolha, setMesFolha] = useState('Atual');
  const [metricasFolha, setMetricasFolha] = useState({
    faturamentoBruto: dashboardData.totalAgencyRevenueActual || 0,
    custoOperacional: 0,
    metaAgenciaHistorica: dashboardData.agencyTarget || 0
  });
  
  const [bonusManuais, setBonusManuais] = useState({});
  const [chavesPix, setChavesPix] = useState({});
  
  const [demonstrativoData, setDemonstrativoData] = useState(null);

  const parseSafeNumber = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      
      const cleaned = String(val).replace(/[^\d.,-]/g, '');
      if (!cleaned) return 0;
      
      if (cleaned.includes(',')) {
          return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
      }
      
      return Number(cleaned) || 0;
  };

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

  const busca = (searchTerm || '').toLowerCase();
  
  const recebimentosFiltrados = recebimentos.filter(rec => 
    !busca || rec.cliente.toLowerCase().includes(busca) || (rec.mesReferencia || '').toLowerCase().includes(busca) || (rec.contaBancaria && rec.contaBancaria.toLowerCase().includes(busca))
  );

  const despesasFiltradas = despesas.filter(d => 
    !busca || d.descricao.toLowerCase().includes(busca) || d.categoria.toLowerCase().includes(busca) || (d.contaBancaria && d.contaBancaria.toLowerCase().includes(busca))
  );

  // CÁLCULOS SEGUROS COM PARSESAFENUMBER
  const totalPendenteGeral = recebimentos.filter(r => r.status === 'Pendente').reduce((acc, curr) => acc + parseSafeNumber(curr.valorAgencia), 0);

  const pendenteFiltrado = recebimentosFiltrados.reduce((acc, r) => {
      if (r.desembolsos && r.desembolsos.length > 0) return acc + r.desembolsos.filter(x => x.status === 'Pendente').reduce((sum, x) => sum + parseSafeNumber(x.valor), 0);
      return acc + (r.status === 'Pendente' ? parseSafeNumber(r.valorAgencia) : 0);
  }, 0);
  
  const pagoFiltrado = recebimentosFiltrados.reduce((acc, r) => {
      if (r.desembolsos && r.desembolsos.length > 0) return acc + r.desembolsos.filter(x => x.status === 'Pago').reduce((sum, x) => sum + parseSafeNumber(x.valor), 0);
      return acc + (r.status === 'Pago' ? parseSafeNumber(r.valorAgencia) : 0);
  }, 0);
  
  const despesasPendentesFiltradas = despesasFiltradas.reduce((acc, d) => {
      // Se a despesa tiver parcelas (desembolsos), somamos o valor das parcelas que estão Pendentes
      if (d.desembolsos && d.desembolsos.length > 0) {
          const somaParcelasPendentes = d.desembolsos
              .filter(x => x.status === 'Pendente')
              .reduce((sum, x) => sum + parseSafeNumber(x.valor), 0);
          return acc + somaParcelasPendentes;
      }
      return acc + (d.status === 'Pendente' ? parseSafeNumber(d.valor || d.valorBruto) : 0);
  }, 0);
  
  const despesasPagasFiltradas = despesasFiltradas.reduce((acc, d) => {
      // Se a despesa tiver parcelas (desembolsos), somamos o valor das parcelas que estão Pagas
      if (d.desembolsos && d.desembolsos.length > 0) {
          const somaParcelasPagas = d.desembolsos
              .filter(x => x.status === 'Pago')
              .reduce((sum, x) => sum + parseSafeNumber(x.valor), 0);
          return acc + somaParcelasPagas;
      }
      return acc + (d.status === 'Pago' ? parseSafeNumber(d.valor || d.valorBruto) : 0);
  }, 0);

  const dataAtual = new Date();
  dataAtual.setMonth(dataAtual.getMonth() - 1);
  const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const mesPassadoExato = `${mesesNomes[dataAtual.getMonth()]}/${String(dataAtual.getFullYear()).slice(-2)}`;

  const agruparPorTempo = (lista) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    const fimProximaSemana = new Date(fimSemana);
    fimProximaSemana.setDate(fimSemana.getDate() + 7);

    const grupos = {
      'Atrasados': [],
      'Esta Semana': [],
      'Próxima Semana': [],
      'Futuro': [],
      'Concluídos': []
    };

    const alocarNoGrupo = (itemAlocavel) => {
      if (itemAlocavel.status === 'Pago') {
        grupos['Concluídos'].push(itemAlocavel);
        return;
      }
      const dataVenc = new Date(itemAlocavel.dataVencimento + 'T00:00:00');
      if (dataVenc < hoje) grupos['Atrasados'].push(itemAlocavel);
      else if (dataVenc >= inicioSemana && dataVenc <= fimSemana) grupos['Esta Semana'].push(itemAlocavel);
      else if (dataVenc > fimSemana && dataVenc <= fimProximaSemana) grupos['Próxima Semana'].push(itemAlocavel);
      else grupos['Futuro'].push(itemAlocavel);
    };

    lista.forEach(item => {
      if (item.desembolsos && item.desembolsos.length > 0) {
        item.desembolsos.forEach((desem, idx) => {
          alocarNoGrupo({
            ...item,
            ...desem,
            idPai: item.id,
            isParcela: true,
            numeroParcela: idx + 1
          });
        });
      } else {
        alocarNoGrupo(item);
      }
    });

    return grupos;
  };

  const recebimentosAgrupados = agruparPorTempo(recebimentosFiltrados);
  const despesasAgrupadas = agruparPorTempo(despesasFiltradas);

  const folhaCalculada = useMemo(() => {
    if (!teamMembers) return [];
    return teamMembers.filter(m => m.paymentConfig).map(m => {
        const calculo = calcularFolhaMembro(m, metricasFolha.faturamentoBruto, metricasFolha.custoOperacional, parseSafeNumber(bonusManuais[m.email]));
        return { ...m, calculo };
    });
  }, [teamMembers, metricasFolha, bonusManuais]);

  const handleLancarPagamentoEquipe = async (membro) => {
    if (!canEdit) return toast.error("Sem permissão.");
    
    const config = membro.paymentConfig;
    const hoje = new Date();
    const lancamentos = [];
    
    const pixDefinitivo = chavesPix[membro.email] !== undefined ? chavesPix[membro.email] : (config.chavePix || '');
    const regraTexto = `${config.percentual}% ${config.gatilho > 0 ? `acima de ${formatCurrency(config.gatilho)}` : `s/ ${config.baseCalculo === 'LL' ? 'Lucro Líq.' : 'Fat. Bruto'}`}`;

    const dadosHolerite = {
      nome: membro.nomeCompleto,
      funcao: getVisualRole(membro.role) || 'Colaborador',
      ref: `${mesesNomes[dataAtual.getMonth()]}/${String(dataAtual.getFullYear()).slice(-2)}`,
      fat: metricasFolha.faturamentoBruto,
      meta: metricasFolha.metaAgenciaHistorica,
      base: membro.calculo.fixo,
      comissao: membro.calculo.comissao,
      regra: regraTexto,
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
            ...item, categoria: 'Folha de Pagamento', status: 'Pendente', contaBancaria: 'AVANTE PJ',
            holerite: dadosHolerite,
            chavePix: pixDefinitivo,
            criadoEm: new Date().toISOString()
          });
      }
      toast.success(`Pagamento de ${membro.nome} lançado com sucesso!`);
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

    const registrarLancamento = (dataLancamento, valor, tipo, status) => {
      let dataSegura = dataLancamento;
      if (!dataSegura || isNaN(new Date(dataSegura).getTime())) {
          dataSegura = new Date().toISOString(); 
      }

      const mes = getMesAno(dataSegura);
      const semana = getSemanaDoMes(dataSegura);
      const tipoStatus = status === 'Pago' ? 'Real' : 'Prev';

      if (!relatorio[mes]) relatorio[mes] = { 
        semanas: {}, 
        totalRealEntradas: 0, totalPrevEntradas: 0, totalRealSaidas: 0, totalPrevSaidas: 0,
        qtdRealEntradas: 0, qtdPrevEntradas: 0, qtdRealSaidas: 0, qtdPrevSaidas: 0
      };
      if (!relatorio[mes].semanas[semana]) relatorio[mes].semanas[semana] = { 
        entradasReal: 0, entradasPrev: 0, saidasReal: 0, saidasPrev: 0,
        qtdEntradasReal: 0, qtdEntradasPrev: 0, qtdSaidasReal: 0, qtdSaidasPrev: 0
      };

      if (tipo === 'entrada') {
        relatorio[mes].semanas[semana][`entradas${tipoStatus}`] += valor;
        relatorio[mes].semanas[semana][`qtdEntradas${tipoStatus}`] += 1;
        relatorio[mes][`total${tipoStatus}Entradas`] += valor;
        relatorio[mes][`qtd${tipoStatus}Entradas`] += 1;
      } else {
        relatorio[mes].semanas[semana][`saidas${tipoStatus}`] += valor;
        relatorio[mes].semanas[semana][`qtdSaidas${tipoStatus}`] += 1;
        relatorio[mes][`total${tipoStatus}Saidas`] += valor;
        relatorio[mes][`qtd${tipoStatus}Saidas`] += 1;
      }
    };

    recebimentos.forEach(r => {
      if (r.desembolsos && r.desembolsos.length > 0) {
        r.desembolsos.forEach(x => {
            const dataBase = x.status === 'Pago' ? x.dataPagamentoRealizado : x.dataVencimento;
            registrarLancamento(dataBase, parseSafeNumber(x.valor), 'entrada', x.status);
        });
      } else {
        const dataBase = r.status === 'Pago' ? r.dataPagamentoRealizado : r.dataVencimento;
        registrarLancamento(dataBase, parseSafeNumber(r.valorAgencia), 'entrada', r.status);
      }
    });

    despesas.forEach(d => {
      if (d.desembolsos && d.desembolsos.length > 0) {
        d.desembolsos.forEach(x => {
          const dataBase = x.status === 'Pago' ? x.dataPagamentoRealizado : x.dataVencimento;
          registrarLancamento(dataBase, parseSafeNumber(x.valor), 'saida', x.status);
        });
      } else {
        const dataBase = d.status === 'Pago' ? d.dataPagamentoRealizado : d.dataVencimento;
        registrarLancamento(dataBase, parseSafeNumber(d.valor), 'saida', d.status);
      }
    });

    return relatorio;
  }, [recebimentos, despesas]);

  const iniciarEdicaoRecebimento = (r) => {
    const formElement = document.getElementById('form-recebimento');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setRecebimentoEmEdicao(r.id);
    setRecebimentoForm({ 
      cliente: r.cliente, 
      mesReferencia: r.mesReferencia || '', 
      valorAgencia: r.valorBruto || r.valorAgencia,
      desconto: r.desconto || '', 
      motivoDesconto: r.motivoDesconto || '',
      contaBancaria: r.contaBancaria || 'AVANTE PJ',
      dataVencimento: r.dataVencimento ? r.dataVencimento.split('T')[0] : new Date().toISOString().split('T')[0], 
      status: r.status,
      desembolsos: r.desembolsos || []
    });
  };

  const handleSalvarRecebimento = async (e) => {
    e.preventDefault();
    if (!canEdit) return toast.error("Sem permissão.");
    
    const numValorBruto = parseSafeNumber(recebimentoForm.valorAgencia);
    const numDesconto = parseSafeNumber(recebimentoForm.desconto);
    const numValorLiquido = numValorBruto - numDesconto;

    if (!recebimentoForm.cliente.trim() || numValorBruto <= 0) return toast.error("Preencha cliente e valor válidos.");

    const parsedDesembolsos = (recebimentoForm.desembolsos || []).map(d => ({
      ...d, valor: parseSafeNumber(d.valor)
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
          valorBruto: numValorBruto, desconto: numDesconto, motivoDesconto: recebimentoForm.motivoDesconto.trim(), valorAgencia: numValorLiquido, contaBancaria: recebimentoForm.contaBancaria,
          dataVencimento: recebimentoForm.dataVencimento, status: finalStatus, desembolsos: parsedDesembolsos
        });
        toast.success("Recebimento atualizado!");
        setRecebimentoEmEdicao(null);
      } else {
        await addDoc(collection(db, "financeiro_recebimentos"), {
          cliente: recebimentoForm.cliente.trim(), mesReferencia: recebimentoForm.mesReferencia || 'Avulso',
          valorBruto: numValorBruto, desconto: numDesconto, motivoDesconto: recebimentoForm.motivoDesconto.trim(), valorAgencia: numValorLiquido, contaBancaria: recebimentoForm.contaBancaria,
          dataVencimento: recebimentoForm.dataVencimento, status: finalStatus, desembolsos: parsedDesembolsos,
          dataPagamentoRealizado: finalStatus === 'Pago' && parsedDesembolsos.length === 0 ? new Date().toISOString() : null,
          dataEmissao: new Date().toISOString()
        });
        toast.success("Entrada registrada!");
      }
      setRecebimentoForm({ cliente: '', mesReferencia: '', valorAgencia: '', desconto: '', motivoDesconto: '', contaBancaria: 'AVANTE PJ', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', desembolsos: [] });
    } catch (error) { toast.error("Erro ao salvar entrada."); }
  };

  const toggleRecebimento = async (idFatura, currentStatus) => {
    if (!canEdit) return toast.error("Sem permissão.");
    const novoStatus = currentStatus === 'Pago' ? 'Pendente' : 'Pago';
    try {
      await updateDoc(doc(db, "financeiro_recebimentos", idFatura), { 
        status: novoStatus, 
        dataPagamentoRealizado: novoStatus === 'Pago' ? new Date().toISOString() : null 
      });
      toast.success(novoStatus === 'Pago' ? "Pagamento recebido!" : "Baixa desfeita!");
    } catch (error) { toast.error("Erro ao alterar status."); }
  };

  const toggleDesembolsoRecebimento = async (idReceb, idDesembolso) => {
    if (!canEdit) return toast.error("Sem permissão.");
    try {
      const rec = recebimentos.find(r => r.id === idReceb);
      if (!rec) return;

      const novosDesembolsos = rec.desembolsos.map(d => {
        if (d.id === idDesembolso) {
            const novoStatus = d.status === 'Pago' ? 'Pendente' : 'Pago';
            return { ...d, status: novoStatus, dataPagamentoRealizado: novoStatus === 'Pago' ? new Date().toISOString() : null };
        }
        return d;
      });

      const todosPagos = novosDesembolsos.every(d => d.status === 'Pago');
      const algumPago = novosDesembolsos.some(d => d.status === 'Pago');
      const novoStatus = todosPagos ? 'Pago' : (algumPago ? 'Parcial' : 'Pendente');
      
      await updateDoc(doc(db, "financeiro_recebimentos", idReceb), {
        desembolsos: novosDesembolsos, status: novoStatus,
        dataPagamentoRealizado: todosPagos ? new Date().toISOString() : null
      });
      toast.success("Status da parcela alterado!");
    } catch (error) { toast.error("Erro ao registrar parcela."); }
  };

  const handleExcluirRecebimento = async (id) => {
    if (!canEdit) return;
    if (window.confirm("Deseja realmente apagar esta entrada?")) {
      await deleteDoc(doc(db, "financeiro_recebimentos", id));
      toast.success("Entrada apagada.");
    }
  };

  const handleAdicionarDespesa = async (e) => {
    e.preventDefault();
    if (!canEdit) return toast.error("Sem permissão.");
    
    const numValorBruto = parseSafeNumber(despesaForm.valor);
    const numDesconto = parseSafeNumber(despesaForm.desconto);
    const numValorLiquido = numValorBruto - numDesconto;

    if (!despesaForm.descricao.trim() || numValorBruto <= 0) return toast.error("Preencha descrição e valor bruto válidos.");

    const parsedDesembolsos = (despesaForm.desembolsos || []).map(d => ({
      ...d, valor: parseSafeNumber(d.valor)
    }));

    if (parsedDesembolsos.length > 0) {
      const sum = parsedDesembolsos.reduce((acc, curr) => acc + curr.valor, 0);
      if (Math.abs(sum - numValorLiquido) > 0.01) { 
        return toast.error(`A soma dos desembolsos deve bater o valor líquido final: ${formatCurrency(numValorLiquido)}`);
      }
    }

    const allPaid = parsedDesembolsos.length > 0 && parsedDesembolsos.every(d => d.status === 'Pago');
    const finalStatus = parsedDesembolsos.length > 0 ? (allPaid ? 'Pago' : (parsedDesembolsos.some(d => d.status === 'Pago') ? 'Parcial' : 'Pendente')) : despesaForm.status;

    try {
      if (despesaEmEdicao) {
        await updateDoc(doc(db, "financeiro_despesas", despesaEmEdicao), {
          descricao: despesaForm.descricao.trim(), 
          valorBruto: numValorBruto, desconto: numDesconto, motivoDesconto: despesaForm.motivoDesconto.trim(), valor: numValorLiquido, 
          categoria: despesaForm.categoria, contaBancaria: despesaForm.contaBancaria, dataVencimento: despesaForm.dataVencimento, status: finalStatus, desembolsos: parsedDesembolsos,
          chavePix: despesaForm.chavePix.trim()
        });
        toast.success("Despesa atualizada!");
        setDespesaEmEdicao(null);
      } else {
        await addDoc(collection(db, "financeiro_despesas"), {
          descricao: despesaForm.descricao.trim(), 
          valorBruto: numValorBruto, desconto: numDesconto, motivoDesconto: despesaForm.motivoDesconto.trim(), valor: numValorLiquido, 
          categoria: despesaForm.categoria, contaBancaria: despesaForm.contaBancaria, dataVencimento: despesaForm.dataVencimento, status: finalStatus, desembolsos: parsedDesembolsos,
          chavePix: despesaForm.chavePix.trim(), 
          dataPagamentoRealizado: finalStatus === 'Pago' && parsedDesembolsos.length === 0 ? new Date().toISOString() : null,
          criadoEm: new Date().toISOString()
        });
        toast.success("Despesa registrada!");
      }
      setDespesaForm({ descricao: '', valor: '', desconto: '', motivoDesconto: '', 
        categoria: 'Folha de Pagamento', contaBancaria: 'AVANTE PJ', 
        dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', 
        desembolsos: [], chavePix: '' });
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
      motivoDesconto: d.motivoDesconto || '', 
      categoria: d.categoria, 
      contaBancaria: d.contaBancaria || 'AVANTE PJ',
      dataVencimento: d.dataVencimento, status: d.status,
      desembolsos: d.desembolsos || [],
      chavePix: d.chavePix || ''
    });
  };

  const toggleDespesa = async (item) => {
    if (!canEdit) return toast.error("Sem permissão.");
    const novoStatus = item.status === 'Pago' ? 'Pendente' : 'Pago';
    try {
      await updateDoc(doc(db, "financeiro_despesas", item.id), { 
        status: novoStatus, 
        dataPagamentoRealizado: novoStatus === 'Pago' ? new Date().toISOString() : null 
      });

      if (novoStatus === 'Pago' && item.chavePix) {
        toast((t) => (
          <div className="flex flex-col gap-2 p-1">
            <span className="text-sm font-bold text-white">Chave PIX Disponível:</span>
            <span className="text-xs text-amber-400 bg-black/50 p-2 rounded select-all break-all">{item.chavePix}</span>
            <button onClick={() => { navigator.clipboard.writeText(item.chavePix); toast.success('Copiada!'); toast.dismiss(t.id); }} className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 rounded-lg transition-colors font-bold shadow">Copiar Chave</button>
          </div>
        ), { duration: Infinity });
      } else {
        toast.success(novoStatus === 'Pago' ? "Despesa total paga!" : "Baixa desfeita!");
      }
    } catch (error) { toast.error("Erro ao alterar status."); }
  };

  const toggleDesembolsoDespesa = async (idDespesa, idDesembolso) => {
    if (!canEdit) return toast.error("Sem permissão.");
    try {
      const despesa = despesas.find(d => d.id === idDespesa);
      if (!despesa) return;

      const novosDesembolsos = despesa.desembolsos.map(d => {
        if (d.id === idDesembolso) {
            const novoStatus = d.status === 'Pago' ? 'Pendente' : 'Pago';
            return { ...d, status: novoStatus, dataPagamentoRealizado: novoStatus === 'Pago' ? new Date().toISOString() : null };
        }
        return d;
      });

      const todosPagos = novosDesembolsos.every(d => d.status === 'Pago');
      const algumPago = novosDesembolsos.some(d => d.status === 'Pago');
      const novoStatus = todosPagos ? 'Pago' : (algumPago ? 'Parcial' : 'Pendente');
      
      await updateDoc(doc(db, "financeiro_despesas", idDespesa), {
        desembolsos: novosDesembolsos,
        status: novoStatus,
        dataPagamentoRealizado: todosPagos ? new Date().toISOString() : null
      });

      const parcelaAtualizada = novosDesembolsos.find(d => d.id === idDesembolso);
      if (parcelaAtualizada.status === 'Pago' && despesa.chavePix) {
        toast((t) => (
          <div className="flex flex-col gap-2 p-1">
            <span className="text-sm font-bold text-white">Chave PIX Disponível:</span>
            <span className="text-xs text-amber-400 bg-black/50 p-2 rounded select-all break-all">{despesa.chavePix}</span>
            <button onClick={() => { navigator.clipboard.writeText(despesa.chavePix); toast.success('Copiada!'); toast.dismiss(t.id); }} className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 rounded-lg transition-colors font-bold shadow">Copiar Chave</button>
          </div>
        ), { duration: Infinity });
      } else {
        toast.success("Status do desembolso alterado!");
      }
    } catch (error) { toast.error("Erro ao registrar desembolso."); }
  };

  const handleExcluirDespesa = async (id) => {
    if (!canEdit) return;
    if (window.confirm("Deseja realmente apagar este registro de despesa?")) {
      await deleteDoc(doc(db, "financeiro_despesas", id));
      toast.success("Apagada.");
    }
  };

  const renderAgencyProgressBar = () => {
    const safeTarget = parseSafeNumber(metaAgencia) > 0 ? parseSafeNumber(metaAgencia) : 1;
    const currentWidth = Math.min((parseSafeNumber(totalReceitaAgencia) / safeTarget) * 80, 100);
    const projectedWidth = Math.min((parseSafeNumber(projecaoReceitaAgencia) / safeTarget) * 80, 100);
    
    const currentPercent = ((parseSafeNumber(totalReceitaAgencia) / safeTarget) * 100).toFixed(1);
    const projectedPercent = ((parseSafeNumber(projecaoReceitaAgencia) / safeTarget) * 100).toFixed(1);

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
              <span className="text-xl font-bold text-blue-400">{formatCurrency(parseSafeNumber(totalReceitaAgencia))} <span className="text-xs text-blue-400/70">({currentPercent}%)</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Projeção</span>
              <span className="text-xl font-bold text-indigo-400">{formatCurrency(parseSafeNumber(projecaoReceitaAgencia))} <span className="text-xs text-indigo-400/70">({projectedPercent}%)</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Meta</span>
              <span className="text-xl font-bold text-white">{formatCurrency(parseSafeNumber(metaAgencia))}</span>
            </div>
          </div>
        </div>

        <div className="relative pt-6 pb-2">
          <div className="h-8 bg-black/40 rounded-full border border-white/10 shadow-inner overflow-hidden relative">
            <div 
              className="absolute top-0 left-0 h-full bg-indigo-500/20 transition-all duration-1000 ease-out border-r border-indigo-500/50"
              style={{ width: `${projectedWidth}%` }}
            >
              <div className="w-full h-full opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)' }}></div>
            </div>
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(16,185,129,0.4)] "
              style={{ width: `${currentWidth}%` }}
            ></div>
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-white to-gray-300 shadow-[0_0_15px_rgba(255,255,255,1)] z-10" style={{ left: '80%' }}>
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white text-black text-[11px] font-black px-2 py-0.5 rounded shadow-lg">META</div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-[10px] font-bold">100%</div>
          </div>
        </div>
      </div>
    );
  };

  const renderTableRow = (item, isReceita) => {
    const isAtrasado = item.status === 'Pendente' && new Date(item.dataVencimento) < new Date();
    
    const nomePrincipal = isReceita ? item.cliente : item.descricao;
    const descricaoFinal = item.isParcela ? `${nomePrincipal} (Parcela ${item.numeroParcela})` : nomePrincipal;
    const valorParaExibir = isReceita ? (item.isParcela ? item.valor : item.valorAgencia) : item.valor;
    
    return (
      <tr key={item.id} className="hover:bg-white/5 transition-colors">
        <td className="p-4 pl-6 font-bold text-white">
            <div className="flex flex-col">
                <span className="flex items-center gap-2"><FileText size={14} className="text-gray-500" />{descricaoFinal}</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-1 uppercase font-medium"><Building size={10}/> {item.contaBancaria || 'Não Informada'}</span>
            </div>
        </td>
        <td className="p-4 text-sm font-bold text-indigo-300">{isReceita ? (item.mesReferencia || '-') : <span className="bg-gray-800 text-gray-300 text-[10px] px-2 py-1 rounded-md border border-gray-700">{item.categoria}</span>}</td>
        <td className={`p-4 text-sm font-bold ${isAtrasado ? 'text-red-400' : 'text-gray-300'}`}>
          {new Date(item.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')} <span className="text-[10px] font-normal text-gray-500 ml-1">({getSemanaDoMes(item.dataVencimento)})</span>
          {isAtrasado && <span className="ml-2 text-[10px] bg-red-500/20 px-1 rounded text-red-400">Atrasado</span>}
        </td>
        <td className="p-4 font-bold text-white text-right">
          {formatCurrency(parseSafeNumber(valorParaExibir))}
        </td>
        <td className="p-4 text-center">
          {item.status === 'Pago' ? <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold border border-green-500/20">Pago</span> : 
           item.status === 'Parcial' ? <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-bold border border-indigo-500/20">Parcial</span> :
           <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-500/20">Pendente</span>}
        </td>
        <td className="p-4 pr-6 text-center flex items-center justify-center gap-2">
            {item.status === 'Pendente' ? (
                <button onClick={() => {
                    if (item.isParcela) {
                        isReceita ? toggleDesembolsoRecebimento(item.idPai, item.id) : toggleDesembolsoDespesa(item.idPai, item.id);
                    } else {
                        isReceita ? toggleRecebimento(item.id, item.status) : toggleDespesa(item);
                    }
                }} className={`${isReceita ? 'bg-green-600 hover:bg-green-500' : 'bg-rose-600 hover:bg-rose-500'} text-white text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl font-bold shadow-md transition-all`}>Dar Baixa</button>
            ) : (
                <button onClick={() => {
                    if (item.isParcela) {
                        isReceita ? toggleDesembolsoRecebimento(item.idPai, item.id) : toggleDesembolsoDespesa(item.idPai, item.id);
                    } else {
                        isReceita ? toggleRecebimento(item.id, item.status) : toggleDespesa(item);
                    }
                }} className="text-[10px] text-gray-500 underline hover:text-white mr-2">Desfazer</button>
            )}
            {!isReceita && item.holerite && !item.isParcela && <button onClick={() => setDemonstrativoData(item.holerite)} className="p-2 text-indigo-300 hover:text-indigo-100 bg-indigo-500/20 hover:bg-indigo-500/40 rounded-xl transition-colors" title="Ver Demonstrativo"><FileText size={14}/></button>}
            <button onClick={() => isReceita ? iniciarEdicaoRecebimento(item.isParcela ? recebimentos.find(r=>r.id===item.idPai) : item) : iniciarEdicaoDespesa(item.isParcela ? despesas.find(d=>d.id===item.idPai) : item)} className="p-2 text-gray-400 hover:text-indigo-400 bg-white/5 rounded-xl transition-colors" title="Editar"><Edit2 size={14}/></button>
            {!item.isParcela && <button onClick={() => isReceita ? handleExcluirRecebimento(item.id) : handleExcluirDespesa(item.id)} className="p-2 text-gray-500 hover:text-red-400 bg-white/5 rounded-xl transition-colors" title="Excluir"><Trash2 size={14}/></button>}
        </td>
      </tr>
    );
  };

  const renderGroupedTable = (groupedData, isReceita) => {
    const ordenacaoSessoes = ['Atrasados', 'Esta Semana', 'Próxima Semana', 'Futuro', 'Concluídos'];
    
    return ordenacaoSessoes.map(grupo => {
      const items = groupedData[grupo];
      if (!items || items.length === 0) return null;

      let corGrupo = 'text-gray-400';
      if (grupo === 'Atrasados') corGrupo = 'text-red-400';
      if (grupo === 'Esta Semana') corGrupo = 'text-amber-400';
      if (grupo === 'Próxima Semana') corGrupo = 'text-indigo-400';
      if (grupo === 'Concluídos') corGrupo = 'text-green-400';

      return (
        <React.Fragment key={grupo}>
          <tr className="bg-black/40">
            <td colSpan="6" className={`p-3 pl-6 font-black text-xs uppercase tracking-widest ${corGrupo} border-b border-white/5`}>
              <div className="flex items-center gap-2">
                {grupo === 'Atrasados' && <AlertCircle size={14} />}
                {grupo === 'Esta Semana' && <Clock size={14} />}
                {grupo === 'Próxima Semana' && <Calendar size={14} />}
                {grupo === 'Concluídos' && <CheckCircle size={14} />}
                {grupo} ({items.length})
              </div>
            </td>
          </tr>
          {items.map(item => renderTableRow(item, isReceita))}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full">
      {renderAgencyProgressBar()}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign className="text-green-400" size={28} /> Financeiro</h1>
          <p className="text-gray-400 text-sm mt-1">Gestão centralizada de receitas, despesas e fluxo de caixa.</p>
        </div>
        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner overflow-x-auto max-w-full custom-scrollbar">
            <button onClick={() => setActiveTab('caixa')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'caixa' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Activity size={16} /> Fluxo de Caixa</button>
            <button onClick={() => setActiveTab('receber')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'receber' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Entradas ({recebimentos.filter(r => r.status === 'Pendente').length})</button>
            <button onClick={() => setActiveTab('pagar')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'pagar' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Saídas ({despesas.filter(d => d.status === 'Pendente').length})</button>
        </div>
      </div>

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
            
            <div className="lg:col-span-2 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden h-max">
              <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><ArrowUpRight size={18} className="text-green-400"/> Cronograma de Entradas</h3>
                {busca && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">Filtrado por: "{busca}"</span>}
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-900 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider z-10">
                    <tr>
                      <th className="p-4 font-semibold pl-6">Cliente / C. Custo</th>
                      <th className="p-4 font-semibold">Competência</th>
                      <th className="p-4 font-semibold">Vencimento</th>
                      <th className="p-4 font-semibold text-right">Valor Final</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                      <th className="p-4 font-semibold text-center pr-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {renderGroupedTable(recebimentosAgrupados, true)}
                    {recebimentosFiltrados.length === 0 && (
                       <tr><td colSpan="6" className="p-12 text-center text-gray-500">Nenhuma entrada encontrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

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

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Conta Bancária de Destino</label>
                    <select required value={recebimentoForm.contaBancaria} onChange={e => setRecebimentoForm({...recebimentoForm, contaBancaria: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none mt-1 shadow-inner text-xs cursor-pointer">
                      {CONTAS_PADRAO.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                    </select>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Vencimento</label>
                      <input type="date" required value={recebimentoForm.dataVencimento} onChange={e => setRecebimentoForm({...recebimentoForm, dataVencimento: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-emerald-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Bruto (R$)</label>
                      <input type="number" step="0.01" required value={recebimentoForm.valorAgencia} onChange={e => setRecebimentoForm({...recebimentoForm, valorAgencia: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-emerald-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Desc. (R$)</label>
                      <input type="number" step="0.01" placeholder="0.00" value={recebimentoForm.desconto} onChange={e => setRecebimentoForm({...recebimentoForm, desconto: e.target.value})} className="w-full bg-black/40 border border-white/10 text-rose-300 rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Motivo do Desconto</label>
                      <input type="text" placeholder="Ex: Impostos, Estorno" value={recebimentoForm.motivoDesconto} onChange={e => setRecebimentoForm({...recebimentoForm, motivoDesconto: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-emerald-500 mt-1 shadow-inner text-sm" />
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
                       const valorLiq = parseSafeNumber(recebimentoForm.valorAgencia) - parseSafeNumber(recebimentoForm.desconto);
                       const somaDistr = recebimentoForm.desembolsos.reduce((acc, curr) => acc + parseSafeNumber(curr.valor), 0);
                       const faltaDistribuir = valorLiq - somaDistr;

                       return (
                        <>
                          <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 mb-3">
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
                      <button type="button" onClick={() => { setRecebimentoEmEdicao(null); setRecebimentoForm({ cliente: '', mesReferencia: '', valorAgencia: '', desconto: '', contaBancaria: 'AVANTE PJ', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', desembolsos: [] }); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
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
            
            <div className="lg:col-span-2 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden h-max">
              <div className="p-5 border-b border-white/10 bg-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Clock size={18} className="text-gray-400"/> Cronograma de Saídas</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-gray-900 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider z-10">
                    <tr>
                      <th className="p-4 pl-6">Descrição / C. Custo</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Vencimento</th>
                      <th className="p-4 text-right">Valor</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center pr-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {renderGroupedTable(despesasAgrupadas, false)}
                    {despesasFiltradas.length === 0 && (
                       <tr><td colSpan="6" className="p-12 text-center text-gray-500">Nenhuma despesa encontrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-6">
              
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                  <Plus size={18} className="text-rose-400" /> Lançamento de Despesa
                </h3>
                <form id="form-despesa" onSubmit={handleAdicionarDespesa} className="space-y-4 scroll-mt-24">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                    <input type="text" required value={despesaForm.descricao} onChange={e => setDespesaForm({...despesaForm, descricao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Conta Bancária de Origem</label>
                    <select required value={despesaForm.contaBancaria} onChange={e => setDespesaForm({...despesaForm, contaBancaria: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none mt-1 shadow-inner text-xs cursor-pointer">
                      {CONTAS_PADRAO.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Vencimento</label>
                      <input type="date" required value={despesaForm.dataVencimento} onChange={e => setDespesaForm({...despesaForm, dataVencimento: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Bruto (R$)</label>
                      <input type="number" step="0.01" required value={despesaForm.valor} onChange={e => setDespesaForm({...despesaForm, valor: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Desconto (R$)</label>
                      <input type="number" step="0.01" placeholder="0.00" value={despesaForm.desconto} onChange={e => setDespesaForm({...despesaForm, desconto: e.target.value})} className="w-full bg-black/40 border border-white/10 text-rose-300 rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Motivo do Desconto</label>
                      <input type="text" placeholder="Ex: Multa, Abatimento" value={despesaForm.motivoDesconto} onChange={e => setDespesaForm({...despesaForm, motivoDesconto: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Chave PIX (Opcional)</label>
                    <input type="text" placeholder="CPF, Email, Celular ou Aleatória..." value={despesaForm.chavePix} onChange={e => setDespesaForm({...despesaForm, chavePix: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 shadow-inner text-sm" />
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
                       const valorLiq = parseSafeNumber(despesaForm.valor) - parseSafeNumber(despesaForm.desconto);
                       const somaDistr = despesaForm.desembolsos.reduce((acc, curr) => acc + parseSafeNumber(curr.valor), 0);
                       const faltaDistribuir = valorLiq - somaDistr;

                       return (
                        <>
                          <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 mb-3">
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
                      <button type="button" onClick={() => { setDespesaEmEdicao(null); setDespesaForm({ descricao: '', valor: '', categoria: 'Folha de Pagamento', contaBancaria: 'AVANTE PJ', dataVencimento: new Date().toISOString().split('T')[0], status: 'Pendente', desembolsos: [] }); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
                        Cancelar Edição
                      </button>
                    )}
                    <button type="submit" className={`flex-1 ${despesaEmEdicao ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-rose-600 hover:bg-rose-500'} text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm`}>
                      {despesaEmEdicao ? 'Salvar Edição' : 'Registrar Despesa'}
                    </button>
                  </div>
                </form>
              </div>

              {/* BLOCO: FOLHA AUTOMÁTICA */}
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
                      {formatCurrency(parseSafeNumber(metricasFolha.faturamentoBruto))}
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
                        
                        <div className="mt-3 flex flex-col gap-2">
                           <div className="flex items-center gap-2">
                             <span className="text-[11px] text-gray-500 font-bold w-12 uppercase">Extra R$:</span>
                             <input type="number" value={bonusManuais[membro.email] || ''} onChange={e => setBonusManuais({...bonusManuais, [membro.email]: e.target.value})} placeholder="0.00" className="bg-black/40 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs flex-1 outline-none focus:border-indigo-500 shadow-inner" />
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-[11px] text-gray-500 font-bold w-12 uppercase">PIX:</span>
                             <input type="text" value={chavesPix[membro.email] !== undefined ? chavesPix[membro.email] : (membro.paymentConfig?.chavePix || '')} onChange={e => setChavesPix({...chavesPix, [membro.email]: e.target.value})} placeholder="CPF, Email, Telefone..." className="bg-black/40 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs flex-1 outline-none focus:border-indigo-500 shadow-inner" />
                           </div>
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

      {/* ABA 4: FLUXO DE CAIXA REAL VS PREVISTO */}
      {activeTab === 'caixa' && (
        <div className="space-y-6 animate-in fade-in">
          {Object.keys(fluxoDeCaixa).sort().reverse().map(mes => {
            const dadosMes = fluxoDeCaixa[mes];
            
            const saldoReal = dadosMes.totalRealEntradas - dadosMes.totalRealSaidas;
            const saldoPrevisto = (dadosMes.totalRealEntradas + dadosMes.totalPrevEntradas) - (dadosMes.totalRealSaidas + dadosMes.totalPrevSaidas);

            return (
              <div key={mes} className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/20 to-transparent flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                  <h3 className="text-xl font-black text-white flex items-center gap-2"><Calendar size={20} className="text-indigo-400"/> CAIXA: {mes}</h3>
                  
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-1 min-w-[150px]">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><CheckCircle size={12}/> Dinheiro na Conta (Real)</span>
                      <span className="text-sm font-bold text-green-400 flex items-center justify-between">Entradas: <span>{formatCurrency(dadosMes.totalRealEntradas)}</span></span>
                      <span className="text-sm font-bold text-rose-400 flex items-center justify-between">Saídas: <span>{formatCurrency(dadosMes.totalRealSaidas)}</span></span>
                      <div className="w-full h-px bg-white/10 my-1"></div>
                      <span className={`text-sm font-black flex items-center justify-between ${saldoReal >= 0 ? 'text-indigo-300' : 'text-red-400'}`}>Saldo Atual: <span>{formatCurrency(saldoReal)}</span></span>
                    </div>

                    <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col gap-1 min-w-[150px] shadow-inner">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={12}/> Projeção Final (Se tudo for pago)</span>
                      <span className="text-sm font-medium text-green-400/50 flex items-center justify-between">Entradas: <span>{formatCurrency(dadosMes.totalRealEntradas + dadosMes.totalPrevEntradas)}</span></span>
                      <span className="text-sm font-medium text-rose-400/50 flex items-center justify-between">Saídas: <span>{formatCurrency(dadosMes.totalRealSaidas + dadosMes.totalPrevSaidas)}</span></span>
                      <div className="w-full h-px bg-white/10 my-1"></div>
                      <span className={`text-sm font-bold flex items-center justify-between ${saldoPrevisto >= 0 ? 'text-indigo-400/70' : 'text-red-400/70'}`}>Saldo Final: <span>{formatCurrency(saldoPrevisto)}</span></span>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-black/20 text-gray-400 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="p-4 pl-6 font-semibold border-r border-white/5" rowSpan={2}>Semana</th>
                        <th className="p-2 text-center border-r border-b border-white/5" colSpan={3}>REALIZADO (Já Pago)</th>
                        <th className="p-2 text-center text-gray-500 border-b border-white/5" colSpan={3}>PREVISTO (Pendente)</th>
                      </tr>
                      <tr>
                        <th className="p-3 font-semibold text-green-400">Entradas (+)</th>
                        <th className="p-3 font-semibold text-rose-400">Saídas (-)</th>
                        <th className="p-3 font-semibold border-r border-white/5">Saldo</th>
                        <th className="p-3 font-semibold text-green-400/50">Entradas (+)</th>
                        <th className="p-3 font-semibold text-rose-400/50">Saídas (-)</th>
                        <th className="p-3 font-semibold text-gray-500 pr-6">Saldo Prev.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5', 'Semana 6'].map(semana => {
                        const dadosSemana = dadosMes.semanas[semana];
                        if (!dadosSemana) return null;

                        const saldoSemanaReal = dadosSemana.entradasReal - dadosSemana.saidasReal;
                        const saldoSemanaPrevisto = dadosSemana.entradasPrev - dadosSemana.saidasPrev;
                        
                        if (dadosSemana.entradasReal === 0 && dadosSemana.saidasReal === 0 && dadosSemana.entradasPrev === 0 && dadosSemana.saidasPrev === 0) return null;

                        return (
                          <tr key={semana} className="hover:bg-white/5 transition-colors text-sm">
                            <td className="p-4 pl-6 font-bold text-gray-300 border-r border-white/5">{semana}</td>
                            
                            <td className="p-4 font-bold text-green-400">{formatCurrency(dadosSemana.entradasReal)}</td>
                            <td className="p-4 font-bold text-rose-400">{formatCurrency(dadosSemana.saidasReal)}</td>
                            <td className={`p-4 font-bold border-r border-white/5 ${saldoSemanaReal >= 0 ? 'text-indigo-300' : 'text-red-400'}`}>
                              {formatCurrency(saldoSemanaReal)}
                            </td>

                            <td className="p-4 font-medium text-green-400/50">{formatCurrency(dadosSemana.entradasPrev)}</td>
                            <td className="p-4 font-medium text-rose-400/50">{formatCurrency(dadosSemana.saidasPrev)}</td>
                            <td className={`p-4 pr-6 font-medium ${saldoSemanaPrevisto >= 0 ? 'text-indigo-400/50' : 'text-red-400/50'}`}>
                              {formatCurrency(saldoSemanaPrevisto)}
                            </td>
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
              <p className="text-lg font-bold text-white mb-2">Sem movimentações financeiras</p>
              <p>Cadastre despesas ou feche um mês para gerar o fluxo de caixa.</p>
            </div>
          )}
        </div>
      )}

    {demonstrativoData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm overflow-y-auto">
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
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
                          <div className="flex justify-between mb-2 text-[14px]"><span>Meta Estipulada:</span><span className="font-semibold">{formatCurrency(parseSafeNumber(demonstrativoData.meta))}</span></div>
                          <div className="flex justify-between mb-2 text-[14px]"><span>Faturamento da Agência:</span><span className="font-semibold text-[#e67e22]">{formatCurrency(parseSafeNumber(demonstrativoData.fat))}</span></div>
                          <div className="text-right mt-3">
                              <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold inline-block ${parseSafeNumber(demonstrativoData.fat) >= parseSafeNumber(demonstrativoData.meta) ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fff0e6] text-[#e67e22]'}`}>
                                  Meta {parseSafeNumber(demonstrativoData.fat) >= parseSafeNumber(demonstrativoData.meta) ? 'Batida' : 'Não Atingida'}
                              </span>
                          </div>
                        </div>
                        
                        <div className="border border-[#e0e0e0] rounded-xl p-4 mb-4 bg-white">
                          <span className="text-[10px] uppercase tracking-wide text-[#888888] font-bold mb-2 block">Detalhamento</span>
                          <div className="flex justify-between mb-2 text-[14px]"><span>Salário Base:</span><span className="font-semibold">{formatCurrency(parseSafeNumber(demonstrativoData.base))}</span></div>
                          
                          <div className="flex justify-between mb-0.5 text-[14px]"><span>Comissão:</span><span className="font-semibold">{formatCurrency(parseSafeNumber(demonstrativoData.comissao))}</span></div>
                          {demonstrativoData.regra && <div className="text-[10px] text-[#888888] text-right mb-2 italic">({demonstrativoData.regra})</div>}
                          
                          {parseSafeNumber(demonstrativoData.bonus) > 0 && (
                              <div className="flex justify-between mb-2 text-[14px] text-[#10b981]"><span>Acréscimo (Bônus):</span><span className="font-semibold">+ {formatCurrency(parseSafeNumber(demonstrativoData.bonus))}</span></div>
                          )}
                            
                          <div className="bg-[#eef4fc] p-4 rounded-xl mt-4">
                              <div className="flex justify-between items-center m-0">
                                  <span className="text-[#0f3c7a] font-bold text-[13px]">LÍQUIDO A RECEBER</span>
                                  <span className="text-[#0f3c7a] font-extrabold text-[22px]">{formatCurrency(parseSafeNumber(demonstrativoData.total))}</span>
                              </div>
                          </div>
                        </div>

                        <div className="bg-[#fafafa] border border-[#e0e0e0] rounded-xl p-4 mt-2">
                            <span className="text-[10px] uppercase tracking-wide text-[#888888] font-bold mb-2 block">📅 Cronograma de Crédito</span>
                            <div className="flex justify-between text-[13px] mb-1.5 text-[#555555]">
                                <span>• Pagamento Parte 1 ({formatCurrency(parseSafeNumber(demonstrativoData.p1V))})</span><strong className="text-[#1a1a1a]">{demonstrativoData.p1D}</strong>
                            </div>
                            <div className="flex justify-between text-[13px] text-[#555555]">
                                <span>• Pagamento Parte 2 ({formatCurrency(parseSafeNumber(demonstrativoData.p2V))})</span><strong className="text-[#1a1a1a]">{demonstrativoData.p2D}</strong>
                            </div>
                        </div>
                    </div>
                </div>

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

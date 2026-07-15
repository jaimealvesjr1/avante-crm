import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, DollarSign, ArrowUpCircle, ArrowDownCircle, FileText, Calendar, Target, ShieldCheck, Plus, Trash2, Link as LinkIcon, Download, Briefcase, User, CreditCard, PiggyBank, TrendingUp, LayoutDashboard, Pencil, X } from 'lucide-react';
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export default function PersonalFinance({ db, currentUser, formatCurrency }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [carteiraAtiva, setCarteiraAtiva] = useState('PF')
  
  const [movimentacoesGerais, setMovimentacoesGerais] = useState([]);
  const movimentacoes = movimentacoesGerais.filter(m => m.statusAlocacao !== 'Pendente' && m.tipo !== 'CartaoCadastro');
  const pendenciasAlocacao = movimentacoesGerais.filter(m => m.statusAlocacao === 'Pendente');

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    tipo: 'Receita',
    categoria: 'Prestação de Serviços',
    valor: '',
    linkComprovante: '',
    statusTransacao: 'Efetuado'
  });

  const [formCartao, setFormCartao] = useState({
    cartaoId: '', // Armazenará o ID do cartão selecionado
    dataCompra: new Date().toISOString().split('T')[0],
    descricao: '',
    valorTotal: '',
    parcelas: '1'
  });

  const [formNovoCartao, setFormNovoCartao] = useState({
    bandeira: 'Visa',
    finalCartao: '',
    limiteTotal: '',
    diaFechamento: '3',
    diaVencimento: '10'
  });

  const [formCofrinho, setFormCofrinho] = useState({
    nome: '',
    metaTotal: '',
    saldoInformado: '',
    dataAtualizacao: new Date().toISOString().split('T')[0]
  });

  const [formInvestimento, setFormInvestimento] = useState({
    ativo: '',
    tipoAtivo: 'Renda Fixa (CDB/Tesouro)',
    valorAplicado: '',
    dataCompra: new Date().toISOString().split('T')[0]
  });

  const [itemEditando, setItemEditando] = useState(null);

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "financeiro_pessoal", itemEditando.id), {
        data: itemEditando.data,
        descricao: itemEditando.descricao,
        valor: parseSafeNumber(itemEditando.valor),
        statusTransacao: itemEditando.statusTransacao
      });
      toast.success("Registro atualizado com sucesso!");
      setItemEditando(null);
    } catch (error) {
      toast.error("Erro ao salvar edição.");
    }
  };

  const TIPOS = ['Receita', 'Despesa', 'Aporte', 'Retirada'];
  const CATEGORIAS = {
    'Receita': ['Salário', 'Serviços', 'Rendimento', 'Outros'],
    'Despesa': ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Outros'],
    'Aporte': ['Investimento', 'Reserva'],
    'Retirada': ['Transferência']
  };

  const parseSafeNumber = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^\d.,-]/g, '');
    if (!cleaned) return 0;
    if (cleaned.includes(',')) return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    return Number(cleaned) || 0;
  };

  useEffect(() => {
    if (!db || !currentUser?.email) return;
    const q = query(collection(db, "financeiro_pessoal"), where("userEmail", "==", currentUser.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      dados.sort((a, b) => new Date(b.data) - new Date(a.data));
      setMovimentacoesGerais(dados);
    });
    return () => unsubscribe();
  }, [db, currentUser]);

  const handleSalvar = async (e) => {
    e.preventDefault();
    const valorConvertido = parseSafeNumber(form.valor);
    if (!form.descricao.trim() || valorConvertido <= 0) return toast.error("Verifique os campos.");
    try {
      await addDoc(collection(db, "financeiro_pessoal"), {
        userEmail: currentUser.email,
        carteira: carteiraAtiva,
        data: form.data,
        descricao: form.descricao.trim(),
        tipo: form.tipo,
        categoria: form.categoria,
        valor: valorConvertido,
        linkComprovante: form.linkComprovante.trim(),
        statusTransacao: form.statusTransacao,
        criadoEm: new Date().toISOString()
      });
      toast.success("Registrado!");
      setForm({...form, descricao: '', valor: '', statusTransacao: 'Efetuado'});
    } catch (error) { toast.error("Erro ao salvar."); }
  };

  const handleExcluir = async (id) => {
    if (window.confirm("Deseja realmente apagar este registro?")) {
      await deleteDoc(doc(db, "financeiro_pessoal", id));
      toast.success("Registro apagado.");
    }
  };

  const handleAlternarStatus = async (id, statusAtual) => {
    try {
      const novoStatus = statusAtual === 'Efetuado' ? 'Pendente' : 'Efetuado';
      await updateDoc(doc(db, "financeiro_pessoal", id), {
        statusTransacao: novoStatus
      });
      toast.success(novoStatus === 'Efetuado' ? "Lançamento efetivado com sucesso!" : "Marcado como pendente.");
    } catch (error) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleCadastrarCartao = async (e) => {
    e.preventDefault();
    const limite = parseSafeNumber(formNovoCartao.limiteTotal);
    if (!formNovoCartao.finalCartao || formNovoCartao.finalCartao.length !== 4 || limite <= 0) {
      return toast.error("Preencha o final do cartão com 4 dígitos e insira um limite válido.");
    }

    try {
      await addDoc(collection(db, "financeiro_pessoal"), {
        userEmail: currentUser.email,
        carteira: carteiraAtiva, // Vincula o cartão à carteira atualmente selecionada (PF ou PJ)
        tipo: 'CartaoCadastro', // Identificador da coleção de cartões
        bandeira: formNovoCartao.bandeira,
        finalCartao: formNovoCartao.finalCartao,
        limiteTotal: limite,
        diaFechamento: formNovoCartao.diaFechamento,
        diaVencimento: formNovoCartao.diaVencimento,
        criadoEm: new Date().toISOString()
      });
      toast.success("Cartão cadastrado!");
      setFormNovoCartao({ bandeira: 'Visa', finalCartao: '', limiteTotal: '', diaFechamento: '3', diaVencimento: '10' });
    } catch (error) {
      toast.error("Erro ao cadastrar cartão.");
    }
  };

  const handleSalvarCartao = async (e) => {
    e.preventDefault();
    const valorTotal = parseSafeNumber(formCartao.valorTotal);
    const numParcelas = parseInt(formCartao.parcelas, 10);
    
    const cartaoSelecionado = cartoesCadastrados.find(c => c.id === formCartao.cartaoId);

    if (!cartaoSelecionado) return toast.error("Selecione um cartão cadastrado.");
    if (!formCartao.descricao.trim() || valorTotal <= 0 || numParcelas < 1) {
      return toast.error("Verifique a descrição, valor e parcelas.");
    }

    const valorParcela = valorTotal / numParcelas;
    const dataCompra = new Date(formCartao.dataCompra + 'T12:00:00');
    
    const fechamentoDia = parseInt(cartaoSelecionado.diaFechamento, 10);
    const vencimentoDia = parseInt(cartaoSelecionado.diaVencimento, 10);

    // 1. Determinar o mês do ciclo de fechamento atual
    const dataFechamentoAtual = new Date(dataCompra.getFullYear(), dataCompra.getMonth(), fechamentoDia, 23, 59, 59);
    
    let cicloMesIndex = dataCompra.getMonth();
    let cicloAno = dataCompra.getFullYear();

    // Se comprou após o fechamento, cai no ciclo do próximo mês
    if (dataCompra > dataFechamentoAtual) {
      cicloMesIndex += 1;
      if (cicloMesIndex > 11) {
        cicloMesIndex = 0;
        cicloAno += 1;
      }
    }

    // 2. Calcular o mês de vencimento base do ciclo
    let vencimentoMesIndex = cicloMesIndex;
    let vencimentoAno = cicloAno;

    // Se o dia de fechamento for maior ou igual ao vencimento, o vencimento é no mês seguinte ao fechamento
    if (fechamentoDia >= vencimentoDia) {
      vencimentoMesIndex += 1;
      if (vencimentoMesIndex > 11) {
        vencimentoMesIndex = 0;
        vencimentoAno += 1;
      }
    }

    try {
      for (let i = 0; i < numParcelas; i++) {
        let vencIndex = vencimentoMesIndex + i;
        let vencAno = vencimentoAno;
        while (vencIndex > 11) {
          vencIndex -= 12;
          vencAno += 1;
        }

        let dataVencimento = new Date(vencAno, vencIndex, vencimentoDia);
        
        await addDoc(collection(db, "financeiro_pessoal"), {
          userEmail: currentUser.email,
          carteira: carteiraAtiva,
          data: dataVencimento.toISOString().split('T')[0],
          descricao: `${formCartao.descricao} (${i + 1}/${numParcelas}) - ${cartaoSelecionado.bandeira} ****${cartaoSelecionado.finalCartao}`,
          tipo: 'Despesa Operacional', 
          categoria: 'Cartão de Crédito',
          valor: valorParcela,
          cartaoId: cartaoSelecionado.id,
          linkComprovante: '',
          statusTransacao: 'Pendente',
          criadoEm: new Date().toISOString()
        });
      }
      toast.success(`Compra lançada com sucesso no ${cartaoSelecionado.bandeira}!`);
      setFormCartao({ ...formCartao, descricao: '', valorTotal: '', parcelas: '1' });
    } catch (error) {
      toast.error("Erro ao registrar compra no cartão.");
    }
  };

  const handleSalvarCofrinho = async (e) => {
    e.preventDefault();
    const saldo = parseSafeNumber(formCofrinho.saldoInformado);
    const meta = parseSafeNumber(formCofrinho.metaTotal);
    
    if (!formCofrinho.nome.trim() || saldo < 0) return toast.error("Verifique o nome e o saldo.");
    
    try {
      await addDoc(collection(db, "financeiro_pessoal"), {
        userEmail: currentUser.email,
        carteira: carteiraAtiva,
        data: formCofrinho.dataAtualizacao,
        descricao: `Atualização: ${formCofrinho.nome}`,
        cofrinhoNome: formCofrinho.nome,
        metaTotal: meta,
        tipo: 'Cofrinho',
        categoria: 'Cofrinho',
        valor: saldo,
        statusTransacao: 'Efetuado',
        criadoEm: new Date().toISOString()
      });
      toast.success("Saldo do cofrinho atualizado!");
      setFormCofrinho({ ...formCofrinho, saldoInformado: '', metaTotal: '' });
    } catch (error) { toast.error("Erro ao atualizar cofrinho."); }
  };

  const handleSalvarInvestimento = async (e) => {
    e.preventDefault();
    const valor = parseSafeNumber(formInvestimento.valorAplicado);
    if (!formInvestimento.ativo.trim() || valor <= 0) return toast.error("Verifique os dados do investimento.");
    
    try {
      await addDoc(collection(db, "financeiro_pessoal"), {
        userEmail: currentUser.email,
        carteira: carteiraAtiva,
        data: formInvestimento.dataCompra,
        descricao: formInvestimento.ativo,
        tipoAtivo: formInvestimento.tipoAtivo,
        tipo: 'Investimento',
        categoria: 'Investimento',
        valor: valor,
        statusTransacao: 'Efetuado',
        criadoEm: new Date().toISOString()
      });
      toast.success("Investimento registado com sucesso!");
      setFormInvestimento({ ...formInvestimento, ativo: '', valorAplicado: '' });
    } catch (error) { toast.error("Erro ao registar investimento."); }
  };

  const handleAlocarPendencia = async (id, carteiraEscolhida) => {
    try {
      await updateDoc(doc(db, "financeiro_pessoal", id), {
        carteira: carteiraEscolhida,
        statusAlocacao: 'Concluído'
      });
      toast.success(`Lançamento confirmado no Caixa ${carteiraEscolhida}!`);
    } catch (error) {
      toast.error("Erro ao alocar o lançamento.");
    }
  };

  const movimentacoesFiltradas = movimentacoes.filter(m => (m.carteira || 'PF') === carteiraAtiva);

  const cartoesCadastrados = useMemo(() => {
    return movimentacoesGerais.filter(m => 
      m.tipo === 'CartaoCadastro' && (m.carteira || 'PF') === carteiraAtiva
    );
  }, [movimentacoesGerais, carteiraAtiva]);

  const dashboardCartoes = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();

    return cartoesCadastrados.map(c => {
      const limiteTotal = parseSafeNumber(c.limiteTotal);
      const fechamentoDia = parseInt(c.diaFechamento, 10);
      const vencimentoDia = parseInt(c.diaVencimento, 10);

      // Transações vinculadas a este cartão
      const transacoes = movimentacoesFiltradas.filter(
        m => m.categoria === 'Cartão de Crédito' && m.cartaoId === c.id
      );

      // Limite usado = total das parcelas que ainda constam como 'Pendente'
      const limiteUsado = transacoes
        .filter(t => t.statusTransacao === 'Pendente')
        .reduce((sum, t) => sum + parseSafeNumber(t.valor), 0);

      const limiteDisponivel = Math.max(0, limiteTotal - limiteUsado);

      // Agrupa as parcelas por mês da fatura ('YYYY-MM')
      const faturas = {};
      transacoes.forEach(t => {
        const mesAno = t.data.slice(0, 7);
        if (!faturas[mesAno]) {
          faturas[mesAno] = { mesAno, valor: 0, status: 'Efetuado' };
        }
        faturas[mesAno].valor += parseSafeNumber(t.valor);
        if (t.statusTransacao === 'Pendente') {
          faturas[mesAno].status = 'Pendente';
        }
      });

      const faturasOrdenadas = Object.values(faturas).sort((a, b) => a.mesAno.localeCompare(b.mesAno));

      // A próxima fatura é a fatura pendente mais antiga. Se não houver, estimamos a do mês corrente.
      let proximaFatura = faturasOrdenadas.find(f => f.status === 'Pendente');

      if (!proximaFatura) {
        const cicloAtualMes = mesAtual + 1;
        const mesAnoEstimado = `${anoAtual}-${cicloAtualMes.toString().padStart(2, '0')}`;
        proximaFatura = faturas[mesAnoEstimado] || { mesAno: mesAnoEstimado, valor: 0, status: 'Efetuado' };
      }

      // Calcular se essa próxima fatura já está fechada
      const [fatAno, fatMes] = proximaFatura.mesAno.split('-').map(Number);
      let fechamentoAno = fatAno;
      let fechamentoMesIndex = fatMes - 1;

      // Se o fechamento é em um mês anterior ao vencimento
      if (fechamentoDia >= vencimentoDia) {
        fechamentoMesIndex -= 1;
        if (fechamentoMesIndex < 0) {
          fechamentoMesIndex = 11;
          fechamentoAno -= 1;
        }
      }

      const dataFechamentoFatura = new Date(fechamentoAno, fechamentoMesIndex, fechamentoDia, 23, 59, 59);
      const estaFechada = hoje > dataFechamentoFatura;

      return {
        ...c,
        limiteTotal,
        limiteUsado,
        limiteDisponivel,
        faturaAtual: {
          mesAno: proximaFatura.mesAno,
          valor: proximaFatura.valor,
          status: proximaFatura.status,
          estaFechada,
          dataFechamento: dataFechamentoFatura
        }
      };
    });
  }, [cartoesCadastrados, movimentacoesFiltradas]);

  // AGRUPA FATURAS PARA A ABA "FLUXO"
  const itensFluxo = useMemo(() => {
    const lista = [];
    const faturasMap = {};

    movimentacoesFiltradas.forEach(mov => {
      if (mov.categoria === 'Cartão de Crédito') {
        const mesAno = mov.data.slice(0, 7);
        const partesDesc = mov.descricao.split(' - ');
        const nomeCartao = partesDesc.length > 1 ? partesDesc[partesDesc.length - 1] : 'Cartão';
        const key = `fatura-${nomeCartao}-${mesAno}`;
        
        if (!faturasMap[key]) {
          faturasMap[key] = {
            id: key,
            isFatura: true,
            data: mov.data,
            descricao: `Fatura ${nomeCartao}`,
            categoria: 'Cartão de Crédito',
            tipo: 'Despesa Operacional',
            valor: 0,
            itens: [],
            statusTransacao: 'Efetuado'
          };
          lista.push(faturasMap[key]);
        }
        
        faturasMap[key].valor += parseSafeNumber(mov.valor);
        faturasMap[key].itens.push(mov);
        
        if (mov.statusTransacao === 'Pendente') {
          faturasMap[key].statusTransacao = 'Pendente';
        }
      } else {
        lista.push({ ...mov, isFatura: false });
      }
    });

    // ORDENAÇÃO INTELIGENTE: Futuros mais próximos acima; Passados mais recentes abaixo.
    const hoje = new Date().toISOString().split('T')[0];
    return lista.sort((a, b) => {
      const aFuturo = a.data >= hoje;
      const bFuturo = b.data >= hoje;

      if (aFuturo && !bFuturo) return -1; // Futuros acima dos passados
      if (!aFuturo && bFuturo) return 1;
      
      if (aFuturo && bFuturo) {
        return new Date(a.data) - new Date(b.data); // Futuros: Mais próximo de hoje primeiro (Crescente)
      }
      return new Date(b.data) - new Date(a.data); // Passados: Mais recente primeiro (Decrescente)
    });
  }, [movimentacoesFiltradas]);

  // EXTRATO DE CARTÕES (MAIS ANTIGO PRIMEIRO)
  const extratoCartoes = useMemo(() => {
    return movimentacoesFiltradas
      .filter(m => m.categoria === 'Cartão de Crédito')
      .sort((a, b) => new Date(a.data) - new Date(b.data)); // Crescente
  }, [movimentacoesFiltradas]);

  const consolidadoIRPF = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const resumo = { receitaTotal: 0, despesaComprovada: 0, lucroEvidenciado: 0, retiradas: 0, meses: {} };

    movimentacoesFiltradas.forEach(mov => {
      if (mov.statusTransacao === 'Pendente') return;
      
      const dataMov = new Date(mov.data + 'T12:00:00');
      if (dataMov.getFullYear() !== anoAtual) return;

      const mesNome = dataMov.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
      if (!resumo.meses[mesNome]) resumo.meses[mesNome] = { receita: 0, despesa: 0, retirada: 0 };

      const val = parseSafeNumber(mov.valor);
      if (mov.tipo === 'Receita') {
        resumo.receitaTotal += val;
        resumo.meses[mesNome].receita += val;
      } else if (mov.tipo === 'Despesa Operacional') {
        resumo.despesaComprovada += val;
        resumo.meses[mesNome].despesa += val;
      } else if (mov.tipo === 'Retirada (Sócio)') {
        resumo.retiradas += val;
        resumo.meses[mesNome].retirada += val;
      }
    });
    resumo.lucroEvidenciado = resumo.receitaTotal - resumo.despesaComprovada;
    return resumo;
  }, [movimentacoesFiltradas]);

  const totaisGlobais = useMemo(() => {
    let aPagar = 0;
    let aReceber = 0;
    let limiteUsado = 0;
    let investido = 0;
    const cofrinhos = {};

    movimentacoesFiltradas.forEach(m => {
      const val = parseSafeNumber(m.valor);
      
      // 1. Dívidas e Recebimentos Pendentes
      if (m.statusTransacao === 'Pendente') {
        if (m.tipo === 'Receita') aReceber += val;
        if (m.tipo.includes('Despesa')) {
          if (m.categoria === 'Cartão de Crédito') limiteUsado += val;
          else aPagar += val; // Boletos e contas normais
        }
      }
      
      // 2. Patrimônio Investido
      if (m.tipo === 'Investimento') investido += val;
      
      // 3. Cofrinhos (Sempre pega a atualização de saldo mais recente)
      if (m.tipo === 'Cofrinho') {
        if (!cofrinhos[m.cofrinhoNome] || new Date(m.data) > new Date(cofrinhos[m.cofrinhoNome].data)) {
          cofrinhos[m.cofrinhoNome] = m;
        }
      }
    });

    const emCofrinho = Object.values(cofrinhos).reduce((sum, c) => sum + parseSafeNumber(c.valor), 0);

    return { aPagar, aReceber, limiteUsado, investido, emCofrinho };
  }, [movimentacoesFiltradas]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-emerald-400" size={28} /> Gestão Financeira Individual
          </h1>
          <p className="text-gray-400 text-sm mt-1">Seu livro-caixa particular. Seguro, privado e organizado.</p>
        </div>
        
        {/* SELETOR DE CARTEIRA (PJ vs PF) */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner">
          <button onClick={() => setCarteiraAtiva('PF')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${carteiraAtiva === 'PF' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}>
            <User size={14} /> Caixa PF
          </button>
          <button onClick={() => setCarteiraAtiva('PJ')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${carteiraAtiva === 'PJ' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}>
            <Briefcase size={14} /> Caixa PJ
          </button>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner overflow-x-auto max-w-full custom-scrollbar">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <LayoutDashboard size={16} /> Início
          </button>
          <button onClick={() => setActiveTab('fluxo')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'fluxo' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <DollarSign size={16} /> O Dia a Dia
          </button>
          <button onClick={() => setActiveTab('cartoes')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'cartoes' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <CreditCard size={16} /> Cartões
          </button>
          <button onClick={() => setActiveTab('cofrinhos')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'cofrinhos' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <PiggyBank size={16} /> Cofrinhos
          </button>
          <button onClick={() => setActiveTab('investimentos')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'investimentos' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <TrendingUp size={16} /> Investimentos
          </button>
          <button onClick={() => setActiveTab('irpf')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'irpf' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <ShieldCheck size={16} /> Blindagem IRPF
          </button>
        </div>
      </div>

      {/* MÉTRICAS GLOBAIS (VISÍVEL EM TODAS AS ABAS) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total a Pagar (Boletos/Contas) */}
        <div className="bg-rose-900/20 border border-rose-500/30 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">A Pagar (Boletos)</p>
          <h3 className="text-lg font-black text-white">{formatCurrency(totaisGlobais.aPagar)}</h3>
        </div>
        
        {/* 2. Limite Usado (Cartões) */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Limite Usado</p>
          <h3 className="text-lg font-black text-white">{formatCurrency(totaisGlobais.limiteUsado)}</h3>
        </div>

        {/* 3. Total a Receber */}
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">A Receber</p>
          <h3 className="text-lg font-black text-white">{formatCurrency(totaisGlobais.aReceber)}</h3>
        </div>

        {/* 4. Total em Cofrinhos */}
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Em Cofrinhos</p>
          <h3 className="text-lg font-black text-white">{formatCurrency(totaisGlobais.emCofrinho)}</h3>
        </div>

        {/* 5. Patrimônio Investido */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4 shadow-sm col-span-2 lg:col-span-1">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Patrimônio Investido</p>
          <h3 className="text-lg font-black text-white">{formatCurrency(totaisGlobais.investido)}</h3>
        </div>
      </div>

      {/* ABA 0: DASHBOARD / TELA INICIAL */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Card de Boas-Vindas */}
          <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg p-6">
            <h2 className="text-xl font-bold text-white mb-1">Olá! Bem-vindo ao seu painel.</h2>
            <p className="text-gray-400 text-sm">Este é o ponto de partida das suas finanças particulares. Acompanhe a saúde dos seus limites abaixo.</p>
          </div>

          {/* Seção dos Cartões de Crédito */}
          <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <CreditCard size={20} className="text-rose-400" /> Visão de Cartões de Crédito ({carteiraAtiva})
            </h3>

            {dashboardCartoes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CreditCard size={48} className="mx-auto mb-3 opacity-30 animate-pulse" />
                <p className="text-sm">Nenhum cartão cadastrado neste caixa. Vá na aba "Cartões" para começar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {dashboardCartoes.map((card) => {
                  const percLimite = card.limiteTotal > 0 ? (card.limiteUsado / card.limiteTotal) * 100 : 0;
                  
                  // Formatar mês/ano (ex: "AGOSTO/2026")
                  const [fatAno, fatMes] = card.faturaAtual.mesAno.split('-').map(Number);
                  const nomeMesStr = new Date(fatAno, fatMes - 1, 1)
                    .toLocaleString('pt-BR', { month: 'long' })
                    .toUpperCase();

                  return (
                    <div key={card.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col justify-between">
                      <div>
                        {/* Identificadores do Cartão */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-purple-500/10 text-purple-400 font-bold px-2 py-1 rounded-lg border border-purple-500/20">
                              {card.bandeira}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              **** {card.finalCartao}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Fech: Dia {card.diaFechamento} | Venc: Dia {card.diaVencimento}
                          </span>
                        </div>

                        {/* Progresso do Limite Usado */}
                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Disponível: {formatCurrency(card.limiteDisponivel)}</span>
                            <span className="text-purple-300 font-bold">Usado: {formatCurrency(card.limiteUsado)}</span>
                          </div>
                          <div className="w-full bg-black/40 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                percLimite > 85 ? 'bg-rose-500' : percLimite > 60 ? 'bg-amber-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${Math.min(percLimite, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-500">
                            <span>0%</span>
                            <span>Limite Total: {formatCurrency(card.limiteTotal)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Caixa de Destaque da Fatura */}
                      <div className="bg-black/30 border border-white/5 rounded-xl p-4 mt-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Fatura {nomeMesStr}
                          </span>
                          {card.faturaAtual.estaFechada ? (
                            <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold px-2 py-0.5 rounded-full">
                              🔒 Fechada
                            </span>
                          ) : (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full">
                              🔓 Aberta
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between">
                          <h4 className="text-lg font-black text-white">
                            {formatCurrency(card.faturaAtual.valor)}
                          </h4>
                          <span className="text-[10px] text-gray-500">
                            {card.faturaAtual.estaFechada 
                              ? `Fechou em: ${card.faturaAtual.dataFechamento.toLocaleDateString('pt-BR')}` 
                              : `Fecha em: ${card.faturaAtual.dataFechamento.toLocaleDateString('pt-BR')}`}
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ABA 1: FLUXO DE CAIXA (O DIA A DIA) */}
      {activeTab === 'fluxo' && (
        <div className="space-y-6">

          {/* CONTROLE DE IMPOSTOS (DAS MEI) - Apenas no Caixa PJ */}
          {carteiraAtiva === 'PJ' && (() => {
            const mesAtual = new Date().toISOString().slice(0, 7);
            const dasPago = movimentacoesFiltradas.some(m => 
              m.tipo.includes('Despesa') && 
              m.descricao.toUpperCase().includes('DAS') && 
              m.data.startsWith(mesAtual) &&
              m.statusTransacao === 'Efetuado'
            );

            return (
              <div className={`border rounded-2xl p-4 flex items-center justify-between shadow-md transition-all ${dasPago ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-rose-900/20 border-rose-500/30'}`}>
                <div className="flex items-center gap-3">
                  <ShieldCheck className={dasPago ? 'text-emerald-400' : 'text-rose-400'} size={24} />
                  <div>
                    <h4 className={`font-bold text-sm ${dasPago ? 'text-emerald-400' : 'text-rose-400'}`}>
                      Controle de DAS (Simples Nacional)
                    </h4>
                    <p className="text-xs text-gray-400">Referência: {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <div>
                  {dasPago ? (
                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                      ✅ DAS Pago
                    </span>
                  ) : (
                    <span className="bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-500/30 flex items-center gap-1 animate-pulse">
                      ⚠️ DAS Pendente
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
          
          {/* AVISO DE PENDÊNCIAS DA AGÊNCIA */}
          {pendenciasAlocacao.length > 0 && (
            <div className="bg-indigo-900/40 border border-indigo-500/50 rounded-2xl p-5 shadow-lg">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <ShieldCheck className="text-indigo-400" size={20} /> 
                Pagamentos Recebidos da Agência
              </h3>
              <p className="text-sm text-indigo-200/80 mb-4">
                A agência realizou o pagamento das seguintes folhas. Em qual carteira deseja alocar essa receita?
              </p>
              <div className="space-y-3">
                {pendenciasAlocacao.map(pendencia => (
                  <div key={pendencia.id} className="flex flex-col sm:flex-row items-center justify-between bg-black/40 p-4 rounded-xl border border-white/10">
                    <div className="mb-3 sm:mb-0 text-center sm:text-left">
                      <p className="text-white font-bold text-sm">{pendencia.descricao}</p>
                      <p className="text-green-400 font-black">{formatCurrency(pendencia.valor)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAlocarPendencia(pendencia.id, 'PJ')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-2">
                        <Briefcase size={14} /> Alocar PJ
                      </button>
                      <button onClick={() => handleAlocarPendencia(pendencia.id, 'PF')} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-2">
                        <User size={14} /> Alocar PF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulário de Lançamento */}
          <div className="lg:col-span-1 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 h-max">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
              <Plus size={18} className="text-indigo-400" /> Novo Lançamento
            </h3>
            
            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Data</label>
                <input type="date" required value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 mt-1 text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                <input type="text" placeholder="Ex: Pagamento Cliente X, Compra de Mouse..." required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 mt-1 text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value, categoria: CATEGORIAS[e.target.value][0]})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none mt-1 text-xs cursor-pointer">
                    {TIPOS.map(t => <option key={t} value={t} className="bg-gray-900">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full bg-black/40 border border-white/10 text-gray-300 rounded-xl p-3 outline-none mt-1 text-xs cursor-pointer">
                    {CATEGORIAS[form.tipo].map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Valor (R$)</label>
                  <input type="number" step="0.01" required value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 mt-1 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                  <select value={form.statusTransacao} onChange={e => setForm({...form, statusTransacao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none mt-1 text-xs cursor-pointer">
                    <option className="bg-gray-900" value="Efetuado">Efetuado (Já Pago/Recebido)</option>
                    <option className="bg-gray-900" value="Pendente">Pendente (A Pagar/Receber)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Link do Comprovante / NF (Drive)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon size={14} className="text-gray-500" />
                  </div>
                  <input type="url" placeholder="https://drive.google.com/..." value={form.linkComprovante} onChange={e => setForm({...form, linkComprovante: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 pl-9 outline-none focus:border-indigo-500 mt-1 text-sm" />
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm mt-2">
                Registrar Movimentação
              </button>
            </form>
          </div>

          {/* Tabela de Movimentações */}
          <div className="lg:col-span-2 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
             <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} className="text-gray-400"/> Livro Caixa ({carteiraAtiva})</h3>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">Total Registros: {itensFluxo.length}</span>
             </div>
             
             <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-900 border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-wider z-10">
                    <tr>
                      <th className="p-4 pl-6 font-semibold">Data</th>
                      <th className="p-4 font-semibold">Descrição / Categoria</th>
                      <th className="p-4 font-semibold text-center">Tipo</th>
                      <th className="p-4 font-semibold text-right">Valor</th>
                      <th className="p-4 font-semibold text-center pr-6">Anexo/Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {itensFluxo.length === 0 ? (
                      <tr><td colSpan="5" className="p-12 text-center text-gray-500">Nenhuma movimentação registrada nesta carteira.</td></tr>
                    ) : (
                      itensFluxo.map(mov => (
                        <tr key={mov.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 pl-6 text-sm font-bold text-gray-300 whitespace-nowrap">
                            {new Date(mov.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">
                              {mov.descricao} 
                              {mov.isFatura && <span className="ml-2 text-[10px] font-normal text-gray-400">({mov.itens.length} parcelas)</span>}
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase mt-0.5">{mov.categoria}</div>
                          </td>
                          <td className="p-4 text-center">
                            {mov.tipo === 'Receita' && <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-[10px] font-bold"><ArrowUpCircle size={12} className="inline mr-1"/> Receita</span>}
                            {mov.tipo === 'Despesa Operacional' && <span className="text-rose-400 bg-rose-400/10 px-2 py-1 rounded text-[10px] font-bold"><ArrowDownCircle size={12} className="inline mr-1"/> Despesa</span>}
                            {mov.tipo === 'Aporte/Capital' && <span className="text-blue-400 bg-blue-400/10 px-2 py-1 rounded text-[10px] font-bold">Aporte</span>}
                            {mov.tipo === 'Retirada (Sócio)' && <span className="text-amber-400 bg-amber-400/10 px-2 py-1 rounded text-[10px] font-bold">Retirada</span>}
                          </td>
                          <td className={`p-4 font-black text-right ${mov.statusTransacao === 'Pendente' ? 'text-gray-500' : (mov.tipo === 'Receita' || mov.tipo === 'Aporte/Capital' ? 'text-green-400' : 'text-rose-400')}`}>
                            <div className="flex flex-col items-end">
                              <span>{mov.tipo === 'Receita' || mov.tipo === 'Aporte/Capital' ? '+' : '-'} {formatCurrency(parseSafeNumber(mov.valor))}</span>
                              {mov.statusTransacao === 'Pendente' && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded mt-1 font-bold">Pendente</span>}
                            </div>
                          </td>
                          <td className="p-4 pr-6 text-center flex items-center justify-center gap-2">
                             {mov.isFatura ? (
                               mov.statusTransacao === 'Pendente' ? (
                                 <button 
                                   onClick={async () => {
                                     for (const item of mov.itens) {
                                       if(item.statusTransacao === 'Pendente'){
                                         await updateDoc(doc(db, "financeiro_pessoal", item.id), { statusTransacao: 'Efetuado' });
                                       }
                                     }
                                     toast.success("Fatura paga com sucesso!");
                                   }}
                                   className="p-2 text-emerald-400 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/60 rounded-xl transition-colors font-bold text-[10px] uppercase tracking-wider whitespace-nowrap" title="Pagar Fatura"
                                 >
                                   Pagar Fatura
                                 </button>
                               ) : (
                                 <span className="text-[10px] text-green-400 bg-green-500/20 px-2 py-1 rounded">Paga</span>
                               )
                             ) : (
                               <>
                                 {mov.statusTransacao === 'Pendente' ? (
                                   <button onClick={() => handleAlternarStatus(mov.id, mov.statusTransacao)} className="p-2 text-amber-400 hover:text-white bg-amber-500/20 hover:bg-amber-500/60 rounded-xl transition-colors font-bold text-[10px] uppercase tracking-wider" title="Dar Baixa">
                                     Dar Baixa
                                   </button>
                                 ) : (
                                   <button onClick={() => handleAlternarStatus(mov.id, mov.statusTransacao)} className="text-[10px] text-gray-500 underline hover:text-white mr-1" title="Desfazer">
                                     Desfazer
                                   </button>
                                 )}
                                 {mov.linkComprovante && (
                                   <a href={mov.linkComprovante} target="_blank" rel="noopener noreferrer" className="p-2 text-indigo-300 hover:text-indigo-100 bg-indigo-500/20 hover:bg-indigo-500/40 rounded-xl transition-colors" title="Ver Comprovante">
                                     <FileText size={14}/>
                                   </a>
                                 )}
                                 <button onClick={() => setItemEditando(mov)} className="p-2 text-blue-400 hover:text-white bg-blue-500/20 hover:bg-blue-500/60 rounded-xl transition-colors" title="Editar">
                                   <Pencil size={14}/>
                                 </button>
                                 <button onClick={() => handleExcluir(mov.id)} className="p-2 text-gray-500 hover:text-red-400 bg-white/5 rounded-xl transition-colors" title="Excluir">
                                   <Trash2 size={14}/>
                                 </button>
                               </>
                             )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>
      )}

      {/* ABA CARTÕES DE CRÉDITO (EXTRATO) */}
      {activeTab === 'cartoes' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* COLUNA ESQUERDA: FORMULÁRIOS (Ocupa 1 Coluna) */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Lançamento de Compra no Cartão */}
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg p-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                  <CreditCard size={18} className="text-rose-400" /> Nova Compra no Cartão
                </h3>
                
                <form onSubmit={handleSalvarCartao} className="space-y-4">
                  
                  {/* LINHA 1: Cartão e Data */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Selecione o Cartão</label>
                      <select 
                        required 
                        value={formCartao.cartaoId} 
                        onChange={e => setFormCartao({...formCartao, cartaoId: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none mt-1 text-sm cursor-pointer"
                      >
                        <option value="" className="bg-gray-900">Selecione...</option>
                        {cartoesCadastrados.map(c => (
                          <option key={c.id} value={c.id} className="bg-gray-900">
                            {c.bandeira} (****{c.finalCartao})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Data da Compra</label>
                      <input type="date" required value={formCartao.dataCompra} onChange={e => setFormCartao({...formCartao, dataCompra: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 text-sm" />
                    </div>
                  </div>

                  {/* LINHA 2: Descrição */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição da Compra</label>
                    <input type="text" placeholder="Ex: Notebook M1, Supermercado..." required value={formCartao.descricao} onChange={e => setFormCartao({...formCartao, descricao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 text-sm" />
                  </div>

                  {/* LINHA 3: Valor e Parcelas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Total (R$)</label>
                      <input type="number" step="0.01" required value={formCartao.valorTotal} onChange={e => setFormCartao({...formCartao, valorTotal: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-rose-500 mt-1 text-sm font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Parcelas (Qtd)</label>
                      <select value={formCartao.parcelas} onChange={e => setFormCartao({...formCartao, parcelas: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none mt-1 text-xs cursor-pointer">
                        {[...Array(24)].map((_, i) => (
                          <option key={i+1} className="bg-gray-900" value={i+1}>{i+1}x {formCartao.valorTotal ? `(${formatCurrency(parseSafeNumber(formCartao.valorTotal)/(i+1))})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm mt-2">
                    Lançar na Fatura
                  </button>
                </form>
              </div>

              {/* Cadastro de Cartão Físico/Virtual */}
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg p-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                  <Plus size={18} className="text-purple-400" /> Cadastrar Novo Cartão
                </h3>
                <form onSubmit={handleCadastrarCartao} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Bandeira</label>
                      <select value={formNovoCartao.bandeira} onChange={e => setFormNovoCartao({...formNovoCartao, bandeira: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 mt-1 text-xs cursor-pointer">
                        <option className="bg-gray-900" value="Visa">Visa</option>
                        <option className="bg-gray-900" value="MasterCard">MasterCard</option>
                        <option className="bg-gray-900" value="Elo">Elo</option>
                        <option className="bg-gray-900" value="Amex">Amex</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Últimos 4 Dígitos</label>
                      <input type="text" maxLength="4" placeholder="1234" required value={formNovoCartao.finalCartao} onChange={e => setFormNovoCartao({...formNovoCartao, finalCartao: e.target.value.replace(/\D/g, '')})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 mt-1 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Limite (R$)</label>
                      <input type="number" step="0.01" required value={formNovoCartao.limiteTotal} onChange={e => setFormNovoCartao({...formNovoCartao, limiteTotal: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 mt-1 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Fecham. (Dia)</label>
                      <input type="number" min="1" max="31" required value={formNovoCartao.diaFechamento} onChange={e => setFormNovoCartao({...formNovoCartao, diaFechamento: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 mt-1 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Vencim. (Dia)</label>
                      <input type="number" min="1" max="31" required value={formNovoCartao.diaVencimento} onChange={e => setFormNovoCartao({...formNovoCartao, diaVencimento: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 mt-1 text-xs" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
                    Salvar Cartão
                  </button>
                </form>
              </div>
            </div>

            {/* COLUNA DIREITA: TABELA (Ocupa 2 Colunas) */}
            <div className="lg:col-span-2 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg overflow-hidden h-max">
              <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard size={18} className="text-gray-400"/> Extrato de Compras ({carteiraAtiva})
                </h3>
              </div>              
              <div className="overflow-x-auto custom-scrollbar max-h-[700px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-900 border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-wider z-10">
                    <tr>
                      <th className="p-4 pl-6 font-semibold">Vencimento</th>
                      <th className="p-4 font-semibold">Descrição / Parcela</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                      <th className="p-4 font-semibold text-right">Valor da Parcela</th>
                      <th className="p-4 font-semibold text-center pr-6">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {extratoCartoes.length === 0 ? (
                      <tr><td colSpan="5" className="p-12 text-center text-gray-500">Nenhuma compra no cartão registrada.</td></tr>
                    ) : (
                      extratoCartoes.map(mov => (
                        <tr key={mov.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 pl-6 text-sm font-bold text-gray-300 whitespace-nowrap">
                            {new Date(mov.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{mov.descricao}</div>
                          </td>
                          <td className="p-4 text-center">
                            {mov.statusTransacao === 'Pendente' ? (
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">A Pagar</span>
                            ) : (
                              <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">Paga</span>
                            )}
                          </td>
                          <td className="p-4 font-black text-right text-rose-400">
                            - {formatCurrency(parseSafeNumber(mov.valor))}
                          </td>
                          <td className="p-4 pr-6 text-center flex items-center justify-center gap-2">
                             <button onClick={() => setItemEditando(mov)} className="p-2 text-blue-400 hover:text-white bg-blue-500/20 hover:bg-blue-500/60 rounded-xl transition-colors" title="Editar Parcela">
                               <Pencil size={14}/>
                             </button>
                             <button onClick={() => handleExcluir(mov.id)} className="p-2 text-gray-500 hover:text-red-400 bg-white/5 rounded-xl transition-colors" title="Excluir Parcela">
                               <Trash2 size={14}/>
                             </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA COFRINHOS (METAS E RENDIMENTOS) */}
      {activeTab === 'cofrinhos' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-1 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg p-6 h-max">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                <PiggyBank size={18} className="text-amber-400" /> Atualizar Cofrinho
              </h3>
              <p className="text-xs text-gray-400 mb-4">Atualize o saldo do dia para o sistema calcular o quanto rendeu.</p>
              
              <form onSubmit={handleSalvarCofrinho} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nome do Cofrinho</label>
                  <input type="text" placeholder="Ex: Viagem Vitória 2026, Férias..." required value={formCofrinho.nome} onChange={e => setFormCofrinho({...formCofrinho, nome: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-amber-500 mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Meta Total Desejada (R$)</label>
                  <input type="number" step="0.01" value={formCofrinho.metaTotal} onChange={e => setFormCofrinho({...formCofrinho, metaTotal: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-amber-500 mt-1 text-sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Saldo Hoje (R$)</label>
                    <input type="number" step="0.01" required value={formCofrinho.saldoInformado} onChange={e => setFormCofrinho({...formCofrinho, saldoInformado: e.target.value})} className="w-full bg-black/40 border border-white/10 text-amber-400 rounded-xl p-3 outline-none focus:border-amber-500 mt-1 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Data Ref.</label>
                    <input type="date" required value={formCofrinho.dataAtualizacao} onChange={e => setFormCofrinho({...formCofrinho, dataAtualizacao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-amber-500 mt-1 text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-3.5 rounded-xl transition-all shadow-md text-sm mt-2">
                  Gravar Saldo Atual
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Target size={18} className="text-gray-400"/> Meus Cofrinhos ({carteiraAtiva})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const historicoCofrinhos = movimentacoesFiltradas.filter(m => m.tipo === 'Cofrinho');
                  if (historicoCofrinhos.length === 0) return <p className="text-gray-500 text-sm">Nenhum cofrinho registado.</p>;
                  
                  // Agrupa pelo nome para pegar sempre a última atualização
                  const cofrinhosAgrupados = {};
                  historicoCofrinhos.forEach(c => {
                    if (!cofrinhosAgrupados[c.cofrinhoNome] || new Date(c.data) > new Date(cofrinhosAgrupados[c.cofrinhoNome].data)) {
                      cofrinhosAgrupados[c.cofrinhoNome] = c;
                    }
                  });

                  return Object.values(cofrinhosAgrupados).map((cofre, idx) => {
                    const progresso = cofre.metaTotal > 0 ? Math.min((cofre.valor / cofre.metaTotal) * 100, 100) : 0;
                    return (
                      <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-bold">{cofre.cofrinhoNome}</h4>
                          <span className="text-[10px] text-gray-500 uppercase bg-black/40 px-2 py-1 rounded">Atualizado: {new Date(cofre.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>
                        <h2 className="text-3xl font-black text-amber-400">{formatCurrency(cofre.valor)}</h2>
                        {cofre.metaTotal > 0 && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Progresso ({progresso.toFixed(1)}%)</span>
                              <span>Meta: {formatCurrency(cofre.metaTotal)}</span>
                            </div>
                            <div className="w-full bg-black/40 rounded-full h-2">
                              <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-2 rounded-full" style={{ width: `${progresso}%` }}></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA INVESTIMENTOS (PATRIMÓNIO) */}
      {activeTab === 'investimentos' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-1 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg p-6 h-max">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                <TrendingUp size={18} className="text-blue-400" /> Registar Aplicação
              </h3>
              
              <form onSubmit={handleSalvarInvestimento} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nome do Ativo</label>
                  <input type="text" placeholder="Ex: MXRF11, Tesouro Selic..." required value={formInvestimento.ativo} onChange={e => setFormInvestimento({...formInvestimento, ativo: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-blue-500 mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Categoria</label>
                  <select value={formInvestimento.tipoAtivo} onChange={e => setFormInvestimento({...formInvestimento, tipoAtivo: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none mt-1 text-xs cursor-pointer">
                    <option className="bg-gray-900" value="Renda Fixa (CDB/Tesouro)">Renda Fixa (CDB/Tesouro)</option>
                    <option className="bg-gray-900" value="Fundos Imobiliários (FIIs)">Fundos Imobiliários (FIIs)</option>
                    <option className="bg-gray-900" value="Ações">Ações</option>
                    <option className="bg-gray-900" value="Criptomoedas">Criptomoedas</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Aplicado</label>
                    <input type="number" step="0.01" required value={formInvestimento.valorAplicado} onChange={e => setFormInvestimento({...formInvestimento, valorAplicado: e.target.value})} className="w-full bg-black/40 border border-white/10 text-blue-400 rounded-xl p-3 outline-none focus:border-blue-500 mt-1 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Data Compra</label>
                    <input type="date" required value={formInvestimento.dataCompra} onChange={e => setFormInvestimento({...formInvestimento, dataCompra: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-blue-500 mt-1 text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-xl transition-all shadow-md text-sm mt-2">
                  Adicionar à Carteira
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg overflow-hidden">
              <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Briefcase size={18} className="text-gray-400"/> Carteira de Ativos ({carteiraAtiva})</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-900 border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-wider z-10">
                    <tr>
                      <th className="p-4 pl-6 font-semibold">Data Compra</th>
                      <th className="p-4 font-semibold">Ativo / Tipo</th>
                      <th className="p-4 font-semibold text-right pr-6">Valor Aplicado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {movimentacoesFiltradas.filter(m => m.tipo === 'Investimento').length === 0 ? (
                      <tr><td colSpan="3" className="p-12 text-center text-gray-500">Nenhum investimento registado.</td></tr>
                    ) : (
                      movimentacoesFiltradas.filter(m => m.tipo === 'Investimento').map(inv => (
                        <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 pl-6 text-sm font-bold text-gray-300 whitespace-nowrap">
                            {new Date(inv.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{inv.descricao}</div>
                            <div className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full inline-block mt-1">{inv.tipoAtivo}</div>
                          </td>
                          <td className="p-4 pr-6 font-black text-right text-blue-400">
                            {formatCurrency(parseSafeNumber(inv.valor))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CONSOLIDADO ANUAL (BLINDAGEM IRPF) */}
      {activeTab === 'irpf' && (
        <div className="space-y-6 animate-in fade-in">
          
          <div className="bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] rounded-3xl border border-indigo-500/30 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 text-white/5">
              <ShieldCheck size={200} />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-black text-white mb-2">Ano Base: {new Date().getFullYear()}</h2>
              <p className="text-indigo-200/70 text-sm mb-8 max-w-2xl">
                Esta tela aplica a lógica do "Lucro Evidenciado" empresarial. Ao comprovar as despesas operacionais da sua atividade PJ, a diferença entre o que você faturou e o que gastou vira lucro isento e não tributável no Imposto de Renda Pessoa Física.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-inner">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Total Receitas (Bruto)</p>
                  <h3 className="text-2xl font-black text-white">{formatCurrency(consolidadoIRPF.receitaTotal)}</h3>
                  <p className="text-xs text-gray-500 mt-2">Tudo que entrou no seu CNPJ/Caixa</p>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-inner">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Despesas Comprovadas</p>
                  <h3 className="text-2xl font-black text-rose-400">{formatCurrency(consolidadoIRPF.despesaComprovada)}</h3>
                  <p className="text-xs text-gray-500 mt-2">Custo operacional da sua atividade</p>
                </div>
                <div className="bg-indigo-600/20 border border-indigo-500/50 rounded-2xl p-5 shadow-[0_0_20px_rgba(79,70,229,0.15)] relative overflow-hidden">
                  <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2 relative z-10">Lucro Evidenciado (Isento)</p>
                  <h3 className="text-3xl font-black text-indigo-400 relative z-10">{formatCurrency(consolidadoIRPF.lucroEvidenciado)}</h3>
                  <p className="text-xs text-indigo-200/70 mt-2 relative z-10">Valor 100% legal para declarar no IRPF</p>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-inner">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Retiradas Pessoais</p>
                  <h3 className="text-2xl font-black text-amber-400">{formatCurrency(consolidadoIRPF.retiradas)}</h3>
                  <p className="text-xs text-gray-500 mt-2">O que você já transferiu pra Pessoa Física</p>
                </div>
              </div>

              {consolidadoIRPF.retiradas > consolidadoIRPF.lucroEvidenciado && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 mb-8">
                  <Target className="text-red-400 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-red-400 font-bold text-sm">Atenção: Retiradas acima do Lucro Comprovado!</h4>
                    <p className="text-red-200/70 text-xs mt-1">
                      Você transferiu para a Pessoa Física {formatCurrency(consolidadoIRPF.retiradas - consolidadoIRPF.lucroEvidenciado)} a mais do que o seu lucro evidenciado atual. Essa diferença poderá ser tributada pela tabela do IRPF se ultrapassar o limite de isenção da Receita. Registre mais despesas se houver, ou alinhe as retiradas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Resumo Mensal */}
          <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Calendar size={18} className="text-gray-400"/> Resumo Mês a Mês</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-900 border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 pl-6 font-semibold">Mês</th>
                    <th className="p-4 font-semibold text-right">Faturamento</th>
                    <th className="p-4 font-semibold text-right">Despesas</th>
                    <th className="p-4 font-semibold text-right text-indigo-300">Lucro (Isento)</th>
                    <th className="p-4 font-semibold text-right pr-6">Retirado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Object.keys(consolidadoIRPF.meses).length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-500">Nenhum dado lançado neste ano.</td></tr>
                  ) : (
                    Object.keys(consolidadoIRPF.meses).map(mes => {
                      const m = consolidadoIRPF.meses[mes];
                      const lucro = m.receita - m.despesa;
                      return (
                        <tr key={mes} className="hover:bg-white/5">
                          <td className="p-4 pl-6 font-bold text-white text-sm">{mes}</td>
                          <td className="p-4 text-right font-medium text-green-400/80">{formatCurrency(m.receita)}</td>
                          <td className="p-4 text-right font-medium text-rose-400/80">{formatCurrency(m.despesa)}</td>
                          <td className="p-4 text-right font-bold text-indigo-400">{formatCurrency(lucro)}</td>
                          <td className="p-4 pr-6 text-right font-medium text-amber-400/80">{formatCurrency(m.retirada)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL DE EDIÇÃO UNIVERSAL */}
      {itemEditando && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0B0F19] border border-white/10 rounded-3xl shadow-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setItemEditando(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Pencil className="text-blue-400" size={24} /> Editar Lançamento
            </h3>
            
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Data (Vencimento/Compra)</label>
                <input type="date" required value={itemEditando.data} onChange={e => setItemEditando({...itemEditando, data: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-blue-500 mt-1 text-sm" />
                {itemEditando.categoria === 'Cartão de Crédito' && (
                  <p className="text-[10px] text-blue-400 mt-1">Dica: Alterar a data moverá a parcela para a respectiva fatura de forma automática.</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                <input type="text" required value={itemEditando.descricao} onChange={e => setItemEditando({...itemEditando, descricao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-blue-500 mt-1 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Valor (R$)</label>
                  <input type="number" step="0.01" required value={itemEditando.valor} onChange={e => setItemEditando({...itemEditando, valor: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-blue-500 mt-1 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                  <select value={itemEditando.statusTransacao} onChange={e => setItemEditando({...itemEditando, statusTransacao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none mt-1 text-xs cursor-pointer">
                    <option className="bg-gray-900" value="Efetuado">Efetuado</option>
                    <option className="bg-gray-900" value="Pendente">Pendente</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm mt-4">
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

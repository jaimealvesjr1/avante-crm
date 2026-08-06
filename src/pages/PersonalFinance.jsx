import React, { useState, useEffect, useMemo } from 'react';
// IMPORTAÇÕES CORRIGIDAS: Activity e Calculator adicionados
import { Wallet, DollarSign, ArrowUpCircle, ArrowDownCircle, FileText, Calendar, Target, ShieldCheck, Plus, Trash2, Link as LinkIcon, Download, Briefcase, User, CreditCard, PiggyBank, TrendingUp, LayoutDashboard, Pencil, X, Activity, Calculator } from 'lucide-react';
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast';

export default function PersonalFinance({ db, currentUser, currentUserData, formatCurrency }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const carteiraPJ = currentUserData?.paymentConfig?.tipoConta || 'MEI';
  const [carteiraAtiva, setCarteiraAtiva] = useState('PF')
  
  const anoAtual = new Date().getFullYear();
  const dataInicialDefault = currentUserData?.dataAberturaMei || `${anoAtual}-01`;
  const [dataAberturaMei, setDataAberturaMei] = useState(dataInicialDefault);

  // Sincroniza a data de abertura gravada no perfil
  useEffect(() => {
    if (currentUserData?.dataAberturaMei) {
      setDataAberturaMei(currentUserData.dataAberturaMei);
    }
  }, [currentUserData?.dataAberturaMei]);

  const handleSalvarAberturaMei = async (novaData) => {
    setDataAberturaMei(novaData);
    try {
      await updateDoc(doc(db, "equipe", currentUser.email.toLowerCase()), {
        dataAberturaMei: novaData
      });
      toast.success("Data de abertura do MEI gravada no seu perfil!");
    } catch (error) {
      toast.error("Erro ao guardar a data de abertura.");
    }
  };

  const [movimentacoesGerais, setMovimentacoesGerais] = useState([]);
  const movimentacoes = movimentacoesGerais.filter(m => m.statusAlocacao !== 'Pendente' && m.tipo !== 'CartaoCadastro');
  const pendenciasAlocacao = movimentacoesGerais.filter(m => m.statusAlocacao === 'Pendente');

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    conta: 'Conta Principal',
    descricao: '',
    tipo: 'Receita',
    categoria: 'Serviços',
    valor: '',
    linkComprovante: '',
    statusTransacao: 'Efetuado',
    recorrencia: 'none'
  });

  const [itemEditando, setItemEditando] = useState(null);
  const [imagemExpandida, setImagemExpandida] = useState(null);

  // ATUALIZADO: Comprime a imagem antes de a guardar para evitar erros de limite de 1MB do Firebase
  const handleUploadImagem = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Reduz largura para otimização
        const scaleSize = MAX_WIDTH / img.width;
        
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Converte para JPEG leve (70% de qualidade)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setForm({ ...form, linkComprovante: dataUrl });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "financeiro_pessoal", itemEditando.id), {
        data: itemEditando.data,
        conta: itemEditando.conta || 'Conta Principal',
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
    'Receita': ['Prestação de Serviços', 'Rendimentos (CDB/Ações)', 'Estornos', 'Outros'],
    'Despesa': ['Impostos (DAS/Simples)', 'Pró-Labore / Folha', 'Fornecedores / Software', 'Despesas Administrativas', 'Saúde/Alimentação (PF)', 'Lazer/Moradia (PF)'],
    'Aporte': ['Capital Social', 'Transferência para Empresa'],
    'Retirada': ['Distribuição de Lucros (Isento)', 'Transferência Pessoal']
  };

  const parseSafeNumber = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^\d.,-]/g, '');
    if (!cleaned) return 0;
    if (cleaned.includes(',')) return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    return Number(cleaned) || 0;
  };

  const processarRecorrencia = async (mov) => {
    if (!mov.recorrencia || mov.recorrencia === 'none') return;

    const [year, month, day] = mov.data.split('-').map(Number);
    let nextDateObj = new Date(year, month - 1, day);
    
    if (mov.recorrencia === 'weekly') nextDateObj.setDate(nextDateObj.getDate() + 7);
    if (mov.recorrencia === 'monthly') nextDateObj.setMonth(nextDateObj.getMonth() + 1);
    if (mov.recorrencia === 'yearly') nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);

    const nextDateStr = `${nextDateObj.getFullYear()}-${String(nextDateObj.getMonth() + 1).padStart(2, '0')}-${String(nextDateObj.getDate()).padStart(2, '0')}`;

    // ATUALIZADO: Extrai o linkComprovante para NÃO o clonar no mês seguinte
    const { id, isFatura, itens, linkComprovante, ...dadosBase } = mov;

    await addDoc(collection(db, "financeiro_pessoal"), {
        ...dadosBase,
        data: nextDateStr,
        linkComprovante: '', // Nasce vazio sem a foto do mês passado
        statusTransacao: 'Pendente',
        criadoEm: new Date().toISOString()
    });
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
      const novaMovimentacao = {
        userEmail: currentUser.email,
        carteira: carteiraAtiva,
        data: form.data,
        conta: form.conta.trim() || 'Conta Principal',
        descricao: form.descricao.trim(),
        tipo: form.tipo,
        categoria: form.categoria,
        valor: valorConvertido,
        linkComprovante: form.linkComprovante.trim(),
        statusTransacao: form.statusTransacao,
        recorrencia: form.recorrencia || 'none',
        criadoEm: new Date().toISOString()
      };

      await addDoc(collection(db, "financeiro_pessoal"), novaMovimentacao);

      if (form.tipo === 'Retirada') {
        const carteiraDestino = carteiraAtiva === 'PF' ? carteiraPJ : 'PF';
        await addDoc(collection(db, "financeiro_pessoal"), {
          ...novaMovimentacao,
          carteira: carteiraDestino,
          tipo: 'Receita',
          categoria: carteiraAtiva === 'PF' ? 'Capital Social' : 'Distribuição de Lucros (Isento)',
          descricao: `Recebimento de Transferência: ${form.descricao.trim()}`
        });
        toast.success(`Transferência espelhada automaticamente para o Caixa ${carteiraDestino}!`);
      } else if (form.tipo === 'Aporte') {
        const carteiraDestino = carteiraAtiva === 'PF' ? carteiraPJ : 'PF';
        await addDoc(collection(db, "financeiro_pessoal"), {
          ...novaMovimentacao,
          carteira: carteiraDestino,
          tipo: 'Receita',
          categoria: carteiraAtiva === 'PF' ? 'Capital Social' : 'Rendimentos (CDB/Ações)',
          descricao: `Aporte recebido: ${form.descricao.trim()}`
        });
        toast.success(`Aporte espelhado automaticamente para o Caixa ${carteiraDestino}!`);
      }

      if (form.statusTransacao === 'Efetuado' && form.recorrencia !== 'none') {
        await processarRecorrencia(novaMovimentacao);
      }

      toast.success("Lançamento registrado!");
      setForm({...form, descricao: '', valor: '', statusTransacao: 'Efetuado', recorrencia: 'none', linkComprovante: ''});
    } catch (error) { toast.error("Erro ao salvar."); }
  };

  const handleExcluir = async (id) => {
    if (window.confirm("Deseja realmente apagar este registro?")) {
      await deleteDoc(doc(db, "financeiro_pessoal", id));
      toast.success("Registro apagado.");
    }
  };

  const handleAlternarStatus = async (mov) => {
    try {
      const novoStatus = mov.statusTransacao === 'Efetuado' ? 'Pendente' : 'Efetuado';
      await updateDoc(doc(db, "financeiro_pessoal", mov.id), {
        statusTransacao: novoStatus
      });
      
      if (novoStatus === 'Efetuado' && mov.recorrencia && mov.recorrencia !== 'none') {
        await processarRecorrencia(mov);
      }

      toast.success(novoStatus === 'Efetuado' ? "Lançamento efetivado com sucesso!" : "Marcado como pendente.");
    } catch (error) {
      toast.error("Erro ao atualizar status.");
    }
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

  const itensFluxo = useMemo(() => {
    const lista = movimentacoesFiltradas.map(mov => ({ ...mov, isFatura: false }));
    const hoje = new Date().toISOString().split('T')[0];
    return lista.sort((a, b) => {
      const aFuturo = a.data >= hoje;
      const bFuturo = b.data >= hoje;
      if (aFuturo && !bFuturo) return -1;
      if (!aFuturo && bFuturo) return 1;
      if (aFuturo && bFuturo) return new Date(a.data) - new Date(b.data);
      return new Date(b.data) - new Date(a.data);
    });
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
      } else if (mov.tipo === 'Despesa Operacional' || mov.tipo === 'Despesa') {
        resumo.despesaComprovada += val;
        resumo.meses[mesNome].despesa += val;
      } else if (mov.tipo === 'Retirada') {
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
    let realizadas = 0;

    movimentacoesFiltradas.forEach(m => {
      const val = parseSafeNumber(m.valor);
      if (m.statusTransacao === 'Pendente') {
        if (m.tipo === 'Receita') aReceber += val;
        if (m.tipo.includes('Despesa')) aPagar += val; 
      } else {
        if (m.tipo.includes('Despesa')) realizadas += val;
      }
    });
    return { aPagar, aReceber, realizadas };
  }, [movimentacoesFiltradas]);

  const resumoMesAtual = useMemo(() => {
    const mesAtualStr = new Date().toISOString().slice(0, 7);
    let receitas = 0;
    let despesas = 0;

    movimentacoesFiltradas.forEach(m => {
      if (m.data.startsWith(mesAtualStr) && m.statusTransacao === 'Efetuado') {
        if (m.tipo === 'Receita' || m.tipo === 'Aporte') receitas += parseSafeNumber(m.valor);
        if (m.tipo.includes('Despesa') || m.tipo === 'Retirada') despesas += parseSafeNumber(m.valor);
      }
    });
    return { receitas, despesas, saldo: receitas - despesas };
  }, [movimentacoesFiltradas]);

  const metricasFiscaisAno = useMemo(() => {
    const dataHoje = new Date();
    const anoAtual = dataHoje.getFullYear();
    const anoAtualStr = anoAtual.toString();
    let faturamentoAno = 0;

    movimentacoesFiltradas.forEach(m => {
      if (m.data.startsWith(anoAtualStr) && m.tipo === 'Receita' && m.statusTransacao === 'Efetuado') {
        faturamentoAno += parseSafeNumber(m.valor);
      }
    });

    const [anoAbertura, mesAbertura] = dataAberturaMei.split('-').map(Number);
    let limiteMeiProporcional = 81000; 

    if (anoAbertura === anoAtual) {
      const mesesDeAtividade = 12 - mesAbertura + 1;
      limiteMeiProporcional = mesesDeAtividade * 6750;
    } else if (anoAbertura > anoAtual) {
      limiteMeiProporcional = 0; 
    }

    return {
      faturamentoAno,
      limiteMei: limiteMeiProporcional,
      usoLimiteMeiPercent: limiteMeiProporcional > 0 ? Math.min((faturamentoAno / limiteMeiProporcional) * 100, 100) : 0
    };
  }, [movimentacoesFiltradas, dataAberturaMei]);

  const dadosGrafico6Meses = useMemo(() => {
    const mesesArr = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      mesesArr.push(d.toISOString().slice(0, 7)); 
    }

    return mesesArr.map(mesStr => {
      let rec = 0;
      let des = 0;
      movimentacoesFiltradas.forEach(m => {
        if (m.data.startsWith(mesStr) && m.statusTransacao === 'Efetuado') {
          if (m.tipo === 'Receita' || m.tipo === 'Aporte') rec += parseSafeNumber(m.valor);
          if (m.tipo.includes('Despesa') || m.tipo === 'Retirada') des += parseSafeNumber(m.valor);
        }
      });
      const mesFormatado = new Date(mesStr + '-01T12:00:00').toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
      return { name: mesFormatado, Receitas: rec, Despesas: des };
    });
  }, [movimentacoesFiltradas]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-emerald-400" size={28} /> Organização Contábil
          </h1>
          <p className="text-gray-400 text-sm mt-1">Sua blindagem e organização contábil unificada.</p>
        </div>
        
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner w-full xl:w-auto">
          <button 
            onClick={() => {
              setCarteiraAtiva('PF');
              if (activeTab === 'irpf') setActiveTab('dashboard');
            }} 
            className={`flex-1 xl:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${carteiraAtiva === 'PF' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}
          >
            <User size={14} /> Caixa PF
          </button>
          
          <button onClick={() => setCarteiraAtiva(carteiraPJ)} className={`flex-1 xl:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${carteiraAtiva === carteiraPJ ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}>
            <Briefcase size={14} /> Caixa {carteiraPJ}
          </button>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner overflow-x-auto w-full xl:w-auto max-w-full custom-scrollbar">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <LayoutDashboard size={16} /> Início
          </button>
          <button onClick={() => setActiveTab('fluxo')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'fluxo' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <DollarSign size={16} /> Dia a Dia
          </button>
          
          {carteiraAtiva !== 'PF' && (
            <button onClick={() => setActiveTab('irpf')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'irpf' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <ShieldCheck size={16} /> Blindagem Fiscal (IRPF)
            </button>
          )}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col xl:flex-row gap-6 items-start">
            <div className="w-full xl:w-2/3 2xl:w-3/4 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-rose-900/20 border border-rose-500/30 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-2"><ArrowDownCircle size={14}/>A Pagar (Pendente)</p>
                  <h3 className="text-2xl font-black text-white">{formatCurrency(totaisGlobais.aPagar)}</h3>
                </div>
                
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-2"><ArrowUpCircle size={14}/>A Receber (Pendente)</p>
                  <h3 className="text-2xl font-black text-white">{formatCurrency(totaisGlobais.aReceber)}</h3>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-2"><FileText size={14}/>Custos Realizados (Total)</p>
                  <h3 className="text-2xl font-black text-white">{formatCurrency(totaisGlobais.realizadas)}</h3>
                </div>
              </div>

              {/* Gráfico de Evolução COM A CORREÇÃO DE ALTURA (height explícito na DIV pai) */}
              <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg p-6 flex flex-col min-h-[350px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-400"/> Evolução (Últimos 6 meses)
                  </h3>
                </div>
                
                <div className="w-full" style={{ height: 250 }}>
                  <ResponsiveContainer width="99%" height="100%">
                    <LineChart data={dadosGrafico6Meses} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                      <Tooltip 
                        cursor={{ stroke: 'rgba(255,255,255,0.1)' }} 
                        contentStyle={{ backgroundColor: 'rgba(11, 15, 25, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
                      />
                      <Line type="monotone" name="Receitas" dataKey="Receitas" stroke="#10B981" strokeWidth={3} dot={{r: 4, fill: '#10B981', strokeWidth: 0}} activeDot={{r: 6}} />
                      <Line type="monotone" name="Saídas" dataKey="Despesas" stroke="#F43F5E" strokeWidth={3} dot={{r: 4, fill: '#F43F5E', strokeWidth: 0}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            <div className="w-full xl:w-1/3 2xl:w-1/4 flex flex-col gap-6 xl:sticky xl:top-[160px]">
              
              {carteiraAtiva === 'MEI' && (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2"><Target size={16}/> Teto de Faturamento MEI</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-gray-400">Data de abertura (Mês/Ano):</p>
                        <input 
                          type="month"
                          value={dataAberturaMei} 
                          onChange={e => handleSalvarAberturaMei(e.target.value)} 
                          className="bg-black/40 text-amber-400 border border-amber-500/30 rounded px-2 py-0.5 outline-none text-[10px] font-bold cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-white">{formatCurrency(metricasFiscaisAno.faturamentoAno)}</span>
                      <span className="text-[10px] text-gray-500"> / {formatCurrency(metricasFiscaisAno.limiteMei)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-2.5 mt-2 overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${metricasFiscaisAno.usoLimiteMeiPercent > 85 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                      style={{ width: `${metricasFiscaisAno.usoLimiteMeiPercent}%` }}
                    ></div>
                  </div>
                  {metricasFiscaisAno.usoLimiteMeiPercent > 85 && (
                    <p className="text-[10px] text-rose-400 mt-2 font-bold animate-pulse">⚠️ Atenção: Você está muito próximo de estourar o teto do MEI proporcional!</p>
                  )}
                </div>
              )}

              {carteiraAtiva === 'SIMPLES' && (
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2"><Calculator size={16}/> Provisão de Impostos (Simples)</h4>
                    <p className="text-[10px] text-gray-400 mt-1">Estimativa de DAS baseada em 6% sobre o faturamento recebido neste mês.</p>
                  </div>
                  <div className="text-right bg-black/30 px-4 py-2 rounded-xl border border-white/5 w-full sm:w-auto">
                    <p className="text-[10px] uppercase font-bold text-gray-500">Guardar este mês</p>
                    <h3 className="text-xl font-black text-indigo-300">{formatCurrency(resumoMesAtual.receitas * 0.06)}</h3>
                  </div>
                </div>
              )}

              {carteiraAtiva === 'PF' && (
                <div className={`border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${consolidadoIRPF.retiradas > consolidadoIRPF.lucroEvidenciado ? 'bg-rose-900/20 border-rose-500/30' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
                  <div>
                    <h4 className={`text-sm font-bold flex items-center gap-2 ${consolidadoIRPF.retiradas > consolidadoIRPF.lucroEvidenciado ? 'text-rose-400' : 'text-emerald-400'}`}>
                      <ShieldCheck size={16}/> Limite de Isenção PJ
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-md">
                      A sua empresa comprovou lucro de <b>{formatCurrency(consolidadoIRPF.lucroEvidenciado)}</b> este ano.
                    </p>
                  </div>
                  <div className="text-left sm:text-right bg-black/30 px-4 py-2 rounded-xl border border-white/5 w-full sm:w-auto shrink-0">
                    <p className="text-[10px] uppercase font-bold text-gray-500">Status IRPF</p>
                    {consolidadoIRPF.retiradas > consolidadoIRPF.lucroEvidenciado ? (
                      <h3 className="text-lg font-black text-rose-400 animate-pulse">Risco (Tributável)</h3>
                    ) : (
                      <h3 className="text-lg font-black text-emerald-400">Seguro (Isento)</h3>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg p-6">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity size={18} className="text-indigo-400"/> Últimas Transações
                  </h3>
                  <button onClick={() => setActiveTab('fluxo')} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold">Ver todas</button>
                </div>

                <div className="space-y-3">
                  {itensFluxo.slice(0, 4).map(mov => (
                    <div key={mov.id} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3 truncate">
                        <div className={`p-2 rounded-lg ${mov.tipo === 'Receita' || mov.tipo === 'Aporte' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {mov.tipo === 'Receita' || mov.tipo === 'Aporte' ? <ArrowUpCircle size={16}/> : <ArrowDownCircle size={16}/>}
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-white truncate">{mov.descricao}</p>
                          <p className="text-[10px] text-gray-500">{new Date(mov.data + 'T12:00:00').toLocaleDateString('pt-BR')} • {mov.conta}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className={`text-sm font-bold ${mov.statusTransacao === 'Pendente' ? 'text-gray-500' : (mov.tipo === 'Receita' || mov.tipo === 'Aporte' ? 'text-emerald-400' : 'text-rose-400')}`}>
                          {mov.tipo === 'Receita' || mov.tipo === 'Aporte' ? '+' : '-'} {formatCurrency(parseSafeNumber(mov.valor))}
                        </p>
                        {mov.statusTransacao === 'Pendente' && <p className="text-[9px] text-amber-400 uppercase font-bold">Pendente</p>}
                      </div>
                    </div>
                  ))}
                  {itensFluxo.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-6 italic">Sem movimentos nesta carteira.</p>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {activeTab === 'fluxo' && (
        <div className="space-y-6">

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
          
          <div className="lg:col-span-1 bg-[#0B0F19]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 h-max">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
              <Plus size={18} className="text-indigo-400" /> Novo Lançamento
            </h3>
            
            <form onSubmit={handleSalvar} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Data</label>
                  <input type="date" required value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Conta / Banco / CDB</label>
                  <input type="text" placeholder="Ex: Nubank, Inter..." required value={form.conta} onChange={e => setForm({...form, conta: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 mt-1 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                <input type="text" placeholder="Ex: Pagamento Cliente X..." required value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 mt-1 text-sm" />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Frequência</label>
                  <select value={form.recorrencia} onChange={e => setForm({...form, recorrencia: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none mt-1 text-xs cursor-pointer mb-1">
                    <option className="bg-gray-900" value="none">Único (Não repete)</option>
                    <option className="bg-gray-900" value="weekly">Semanal</option>
                    <option className="bg-gray-900" value="monthly">Mensal (Ideal p/ Guias MEI/DAS)</option>
                    <option className="bg-gray-900" value="yearly">Anual</option>
                  </select>
                  {form.recorrencia !== 'none' && <p className="text-[9px] text-emerald-400">💡 Ao dar baixa neste lançamento, o próximo será gerado automaticamente.</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Anexar Comprovante (Imagem)</label>
                  <div className="relative">
                    <input type="file" accept="image/*" onChange={handleUploadImagem} className="w-full bg-black/40 border border-white/10 text-gray-300 file:bg-indigo-600 file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 rounded-xl p-2 outline-none focus:border-indigo-500 mt-1 text-xs cursor-pointer" />
                  </div>
                  {form.linkComprovante && <p className="text-[9px] text-green-400 mt-1">✓ Imagem carregada pronta para salvar.</p>}
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm mt-2">
                Registrar Movimentação
              </button>
            </form>
          </div>

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
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase mt-0.5 flex items-center gap-2">
                              <span>{mov.categoria}</span>
                              {mov.conta && (
                                <span className="border-l border-white/10 pl-2 text-indigo-300 font-bold">
                                  🏦 {mov.conta}
                                </span>
                              )}
                            </div>
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
                                        if (item.recorrencia && item.recorrencia !== 'none') {
                                          await processarRecorrencia(item);
                                        }
                                      }
                                    }
                                    toast.success("Fatura paga com sucesso!");
                                  }}
                                  className="..." title="Pagar Fatura"
                                >
                                  Pagar Fatura
                                </button>
                               ) : (
                                 <span className="text-[10px] text-green-400 bg-green-500/20 px-2 py-1 rounded">Paga</span>
                               )
                             ) : (
                               <>
                                 {mov.statusTransacao === 'Pendente' ? (
                                   <button onClick={() => handleAlternarStatus(mov)} className="p-2 text-amber-400 hover:text-white bg-amber-500/20 hover:bg-amber-500/60 rounded-xl transition-colors font-bold text-[10px] uppercase tracking-wider" title="Dar Baixa">
                                     Dar Baixa
                                   </button>
                                 ) : (
                                   <button onClick={() => handleAlternarStatus(mov)} className="text-[10px] text-gray-500 underline hover:text-white mr-1" title="Desfazer">
                                     Desfazer
                                   </button>
                                 )}
                                 {mov.linkComprovante && (
                                   <button onClick={() => setImagemExpandida(mov.linkComprovante)} className="p-2 text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/60 rounded-xl transition-colors" title="Ver Comprovante Anexado">
                                     <FileText size={14}/>
                                   </button>
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
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setItemEditando(null)}
        >
          <div 
            className="bg-[#0B0F19] border border-white/10 rounded-3xl shadow-2xl p-6 w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()} 
          >
            <button onClick={() => setItemEditando(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Pencil className="text-blue-400" size={24} /> Editar Lançamento
            </h3>
            
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Data</label>
                  <input type="date" required value={itemEditando.data} onChange={e => setItemEditando({...itemEditando, data: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-blue-500 mt-1 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Conta / Banco</label>
                  <input type="text" required value={itemEditando.conta || ''} onChange={e => setItemEditando({...itemEditando, conta: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-blue-500 mt-1 text-sm" />
                </div>
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

      {/* MODAL DE VISUALIZAÇÃO DE COMPROVANTE (IMAGEM) */}
      {imagemExpandida && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in zoom-in-95"
          onClick={() => setImagemExpandida(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex justify-center">
            <button onClick={() => setImagemExpandida(null)} className="absolute -top-10 right-0 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
              <X size={24} />
            </button>
            <img src={imagemExpandida} alt="Comprovante" className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/20 shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

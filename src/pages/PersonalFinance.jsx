import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, DollarSign, ArrowUpCircle, ArrowDownCircle, FileText, Calendar, Target, ShieldCheck, Plus, Trash2, Link as LinkIcon, Download, Briefcase, User } from 'lucide-react';
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export default function PersonalFinance({ db, currentUser, formatCurrency }) {
  const [activeTab, setActiveTab] = useState('fluxo'); // 'fluxo' ou 'irpf'
  const [carteiraAtiva, setCarteiraAtiva] = useState('PJ'); // 'PJ' ou 'PF'
  
  const [movimentacoesGerais, setMovimentacoesGerais] = useState([]);
  const movimentacoes = movimentacoesGerais.filter(m => m.statusAlocacao !== 'Pendente');
  const pendenciasAlocacao = movimentacoesGerais.filter(m => m.statusAlocacao === 'Pendente');

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    tipo: 'Receita',
    categoria: 'Prestação de Serviços',
    valor: '',
    linkComprovante: ''
  });

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
        criadoEm: new Date().toISOString()
      });
      toast.success("Registrado!");
      setForm({...form, descricao: '', valor: ''});
    } catch (error) { toast.error("Erro ao salvar."); }
  };

  // 3. EXCLUIR MOVIMENTAÇÃO
  const handleExcluir = async (id) => {
    if (window.confirm("Deseja realmente apagar este registro?")) {
      await deleteDoc(doc(db, "financeiro_pessoal", id));
      toast.success("Registro apagado.");
    }
  };

  // 4. MOTOR DE CÁLCULO PARA O IRPF (Consolidado Anual)
  const handleAlocarPendencia = async (id, carteiraEscolhida) => {
    try {
      await updateDoc(doc(db, "financeiro_pessoal", id), {
        carteira: carteiraEscolhida,
        statusAlocacao: 'Concluído' // Remove da fila de pendências
      });
      toast.success(`Lançamento confirmado no Caixa ${carteiraEscolhida}!`);
    } catch (error) {
      toast.error("Erro ao alocar o lançamento.");
    }
  };

  // 4. MOTOR DE CÁLCULO PARA O IRPF (Consolidado Anual)
  const movimentacoesFiltradas = movimentacoes.filter(m => (m.carteira || 'PF') === carteiraAtiva);

  const consolidadoIRPF = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const resumo = {
      receitaTotal: 0,
      despesaComprovada: 0,
      lucroEvidenciado: 0, // Receita - Despesa (Isento de IRPF se MEI com contabilidade/livro caixa)
      retiradas: 0,
      meses: {}
    };

    movimentacoesFiltradas.forEach(mov => {
      const dataMov = new Date(mov.data + 'T12:00:00');
      if (dataMov.getFullYear() !== anoAtual) return; // Filtra apenas o ano atual

      const mesNome = dataMov.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
      
      if (!resumo.meses[mesNome]) {
        resumo.meses[mesNome] = { receita: 0, despesa: 0, retirada: 0 };
      }

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

    // O MEI que comprova despesas pode declarar o Lucro Evidenciado 100% isento no IRPF.
    resumo.lucroEvidenciado = resumo.receitaTotal - resumo.despesaComprovada;

    return resumo;
  }, [movimentacoes]);

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
          <button onClick={() => setCarteiraAtiva('PJ')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${carteiraAtiva === 'PJ' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}>
            <Briefcase size={14} /> Caixa PJ
          </button>
          <button onClick={() => setCarteiraAtiva('PF')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${carteiraAtiva === 'PF' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}>
            <User size={14} /> Caixa PF
          </button>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner overflow-x-auto max-w-full custom-scrollbar">
          <button onClick={() => setActiveTab('fluxo')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'fluxo' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <DollarSign size={16} /> O Dia a Dia
          </button>
          <button onClick={() => setActiveTab('irpf')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'irpf' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <ShieldCheck size={16} /> Blindagem IRPF
          </button>
        </div>
      </div>

      {/* ABA 1: FLUXO DE CAIXA (O DIA A DIA) */}
      {activeTab === 'fluxo' && (
        <div className="space-y-6">
          
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

              <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Valor (R$)</label>
                <input type="number" step="0.01" required value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 mt-1 text-sm font-bold" />
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
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">Total Registros: {movimentacoesFiltradas.length}</span>
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
                    {movimentacoesFiltradas.length === 0 ? (
                      <tr><td colSpan="5" className="p-12 text-center text-gray-500">Nenhuma movimentação registrada nesta carteira.</td></tr>
                    ) : (
                      movimentacoesFiltradas.map(mov => (
                        <tr key={mov.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 pl-6 text-sm font-bold text-gray-300 whitespace-nowrap">
                            {new Date(mov.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{mov.descricao}</div>
                            <div className="text-[10px] text-gray-500 uppercase mt-0.5">{mov.categoria}</div>
                          </td>
                          <td className="p-4 text-center">
                            {mov.tipo === 'Receita' && <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-[10px] font-bold"><ArrowUpCircle size={12} className="inline mr-1"/> Receita</span>}
                            {mov.tipo === 'Despesa Operacional' && <span className="text-rose-400 bg-rose-400/10 px-2 py-1 rounded text-[10px] font-bold"><ArrowDownCircle size={12} className="inline mr-1"/> Despesa</span>}
                            {mov.tipo === 'Aporte/Capital' && <span className="text-blue-400 bg-blue-400/10 px-2 py-1 rounded text-[10px] font-bold">Aporte</span>}
                            {mov.tipo === 'Retirada (Sócio)' && <span className="text-amber-400 bg-amber-400/10 px-2 py-1 rounded text-[10px] font-bold">Retirada</span>}
                          </td>
                          <td className={`p-4 font-black text-right ${mov.tipo === 'Receita' || mov.tipo === 'Aporte/Capital' ? 'text-green-400' : 'text-rose-400'}`}>
                            {mov.tipo === 'Receita' || mov.tipo === 'Aporte/Capital' ? '+' : '-'} {formatCurrency(parseSafeNumber(mov.valor))}
                          </td>
                          <td className="p-4 pr-6 text-center flex items-center justify-center gap-2">
                             {mov.linkComprovante && (
                               <a href={mov.linkComprovante} target="_blank" rel="noopener noreferrer" className="p-2 text-indigo-300 hover:text-indigo-100 bg-indigo-500/20 hover:bg-indigo-500/40 rounded-xl transition-colors" title="Ver Comprovante">
                                 <FileText size={14}/>
                               </a>
                             )}
                             <button onClick={() => handleExcluir(mov.id)} className="p-2 text-gray-500 hover:text-red-400 bg-white/5 rounded-xl transition-colors" title="Excluir">
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

    </div>
  );
}

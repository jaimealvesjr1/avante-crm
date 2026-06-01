import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CheckCircle, Clock, Search, FileText, TrendingDown, Edit2, Briefcase, X, Save, Plus, Trash2, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
// IMPORTANTE: Adicionámos addDoc e deleteDoc para gerir a nova coleção de despesas
import { collection, onSnapshot, doc, updateDoc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export default function FinanceDashboard({ db, dashboardData, formatCurrency, canEdit }) {
  // 1. ESTADOS DO COMPONENTE
  const [activeTab, setActiveTab] = useState('clientes'); 
  const [recebimentos, setRecebimentos] = useState([]);
  const [despesas, setDespesas] = useState([]); // NOVO: Estado para armazenar as despesas
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 1.1 Estados para a edição Completa do Cliente
  const [contratoEmEdicao, setContratoEmEdicao] = useState(null); 
  const [contratoForm, setContratoForm] = useState({ name: '', feeType: 'percent', feePercent: 0, fixedFee: 0 });

  // 1.2 Estado para o formulário de nova Despesa
  const [despesaForm, setDespesaForm] = useState({ 
    descricao: '', 
    valor: '', 
    categoria: 'Folha de Pagamento', 
    data: new Date().toISOString().split('T')[0] 
  });

  // 2. EFEITOS PARA BUSCAR DADOS NO FIREBASE (Recebimentos e Despesas)
  useEffect(() => {
    if (!db) return;
    
    // Busca os recebimentos
    const unsubRecebimentos = onSnapshot(collection(db, "financeiro_recebimentos"), (snapshot) => {
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      dados.sort((a, b) => new Date(b.dataEmissao) - new Date(a.dataEmissao));
      setRecebimentos(dados);
      setLoading(false);
    });

    // NOVO: Busca as despesas
    const unsubDespesas = onSnapshot(collection(db, "financeiro_despesas"), (snapshot) => {
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar da mais recente para a mais antiga
      dados.sort((a, b) => new Date(b.data) - new Date(a.data));
      setDespesas(dados);
    });

    return () => {
      unsubRecebimentos();
      unsubDespesas();
    };
  }, [db]);

  // 3. VARIÁVEIS CALCULADAS (Para Resumo e Contas a Receber)
  const totalReceitaAgencia = dashboardData.totalAgencyRevenueActual || 0;
  const projecaoReceitaAgencia = dashboardData.totalAgencyRevenue || 0;

  const recebimentosFiltrados = recebimentos.filter(rec => 
    rec.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || 
    rec.mesReferencia.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPendente = recebimentos.filter(r => r.status === 'Pendente').reduce((acc, curr) => acc + curr.valorAgencia, 0);
  
  // A nossa "Entrada" de Caixa Oficial é o que já foi marcado como 'Pago'
  const totalPago = recebimentos.filter(r => r.status === 'Pago').reduce((acc, curr) => acc + curr.valorAgencia, 0);

  // NOVO: Variáveis para o Fluxo de Caixa
  const totalSaidas = despesas.reduce((acc, curr) => acc + curr.valor, 0);
  const saldoLiquido = totalPago - totalSaidas;
  const margemLucro = totalPago > 0 ? (saldoLiquido / totalPago) * 100 : 0;

  const dataAtual = new Date();
  dataAtual.setMonth(dataAtual.getMonth() - 1);
  const mesesNomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const mesPassadoExato = `${mesesNomes[dataAtual.getMonth()]}/${String(dataAtual.getFullYear()).slice(-2)}`;

  // 4. FUNÇÕES UTILITÁRIAS E DE NEGÓCIO
  const renderGrowthBadge = (currentValue, pastValue) => {
    if (pastValue === 0) return null;
    const percent = ((currentValue - pastValue) / pastValue) * 100;
    const isPositive = percent >= 0;
    return (
      <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 w-max ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {Math.abs(percent).toFixed(1)}%
      </span>
    );
  };

  const marcarComoPago = async (idFatura, cliente, mes) => {
    if (!canEdit) return toast.error("Sem permissão.");
    if(window.confirm(`Confirmar o recebimento de ${cliente} referente a ${mes}?`)) {
      try {
        await updateDoc(doc(db, "financeiro_recebimentos", idFatura), {
          status: 'Pago',
          dataPagamentoRealizado: new Date().toISOString()
        });
        toast.success("Pagamento confirmado!");
      } catch (error) {
        toast.error("Erro ao registar pagamento.");
      }
    }
  };

  const ajustarFatura = async (fatura) => {
    if (!canEdit) return toast.error("Sem permissão.");
    const novoValorStr = window.prompt(`Ajustar valor da fatura de ${fatura.cliente} (${fatura.mesReferencia}).\nValor atual: ${fatura.valorAgencia}\nDigite o novo valor final (use ponto para centavos):`, fatura.valorAgencia);
    if (novoValorStr === null) return;
    const novoValor = Number(novoValorStr.replace(',', '.'));
    if (isNaN(novoValor)) return toast.error("Valor inválido.");

    const diasAdicionaisStr = window.prompt("Quantos dias a partir de hoje o cliente tem para pagar? (Ex: 5, 15, 30)", "10");
    if (diasAdicionaisStr === null) return;
    const dias = parseInt(diasAdicionaisStr, 10);
    const novaDataVencimento = new Date();
    novaDataVencimento.setDate(novaDataVencimento.getDate() + (isNaN(dias) ? 10 : dias));

    try {
      await updateDoc(doc(db, "financeiro_recebimentos", fatura.id), {
        valorAgencia: novoValor,
        dataVencimento: novaDataVencimento.toISOString(),
        historicoAjuste: `Ajustado de ${fatura.valorAgencia} para ${novoValor}`
      });
      toast.success("Fatura ajustada com sucesso!");
    } catch (error) {
      toast.error("Erro ao ajustar fatura.");
    }
  };

  const iniciarEdicaoCliente = (grupo) => {
    setContratoEmEdicao(grupo.client);
    setContratoForm({
      name: grupo.client,
      feeType: grupo.feeType || 'percent',
      feePercent: grupo.feePercent || 0,
      fixedFee: grupo.fixedFee || 0
    });
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
      toast.success(`Dados de ${upperNewName} atualizados!`);
      setContratoEmEdicao(null);
    } catch (error) {
      toast.error("Erro ao salvar os dados.");
    }
  };

  // NOVA FUNÇÃO: Adicionar uma nova despesa
  const handleAdicionarDespesa = async (e) => {
    e.preventDefault();
    if (!canEdit) return toast.error("Sem permissão para adicionar despesas.");
    
    const numValor = Number(String(despesaForm.valor).replace(',', '.'));
    if (!despesaForm.descricao.trim() || isNaN(numValor) || numValor <= 0) {
      return toast.error("Preencha a descrição e um valor válido.");
    }

    try {
      await addDoc(collection(db, "financeiro_despesas"), {
        descricao: despesaForm.descricao.trim(),
        valor: numValor,
        categoria: despesaForm.categoria,
        data: despesaForm.data,
        criadoEm: new Date().toISOString()
      });
      toast.success("Despesa registada com sucesso!");
      // Limpa o formulário
      setDespesaForm({ descricao: '', valor: '', categoria: 'Folha de Pagamento', data: new Date().toISOString().split('T')[0] });
    } catch (error) {
      toast.error("Erro ao registar a despesa.");
    }
  };

  // NOVA FUNÇÃO: Excluir uma despesa
  const handleExcluirDespesa = async (idDespesa) => {
    if (!canEdit) return toast.error("Sem permissão.");
    if (window.confirm("Deseja realmente apagar este registo de despesa?")) {
      try {
        await deleteDoc(doc(db, "financeiro_despesas", idDespesa));
        toast.success("Despesa apagada.");
      } catch (error) {
        toast.error("Erro ao apagar despesa.");
      }
    }
  };


  // 5. RENDERIZAÇÃO DA INTERFACE
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="text-green-400" size={28} />
            HUB Financeiro
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gestão de clientes, contratos e fluxo de caixa.</p>
        </div>

        {/* Abas */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner overflow-x-auto max-w-full">
          <button onClick={() => setActiveTab('clientes')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'clientes' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>
            <Briefcase size={16} /> Clientes & Contratos
          </button>
          <button onClick={() => setActiveTab('receber')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'receber' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>
            Contas a Receber
            {recebimentos.filter(r => r.status === 'Pendente').length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {recebimentos.filter(r => r.status === 'Pendente').length}
                </span>
            )}
          </button>
          <button onClick={() => setActiveTab('caixa')} className={`px-4 py-2 whitespace-nowrap text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'caixa' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>
            <Activity size={16} /> Fluxo de Caixa
          </button>
        </div>
      </div>

      {/* ABA: CLIENTES & CONTRATOS (Mantida) */}
      {activeTab === 'clientes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg border-l-4 border-l-green-500">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Receita da Agência (Realizado)</p>
              <h2 className="text-3xl font-black text-white">{formatCurrency(totalReceitaAgencia)}</h2>
            </div>
            <div className="bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg border-l-4 border-l-indigo-500">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Projeção Final do Mês</p>
              <h2 className="text-3xl font-black text-white">{formatCurrency(projecaoReceitaAgencia)}</h2>
            </div>
            <div className="bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total a Receber (Aberto)</p>
              <h2 className="text-3xl font-black text-amber-400 mt-1">{formatCurrency(totalPendente)}</h2>
            </div>
          </div>

          <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="text-indigo-400" size={18} /> Base de Clientes e Rentabilidade
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Cliente</th>
                    <th className="p-4 font-semibold">Regra de Comissão</th>
                    <th className="p-4 font-semibold">GMV Gerado (Atual)</th>
                    <th className="p-4 font-semibold text-green-400">Receita Agência</th>
                    <th className="p-4 font-semibold text-center">Ações</th>
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
                        <td className="p-4">
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
                                <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md">Fixo: {formatCurrency(group.fixedFee)}</span>
                              ) : (
                                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md">Variável: {group.feePercent}% s/ Fat.</span>
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
                        <td className="p-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => salvarEdicaoCliente(group.client)} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors shadow-md" title="Salvar Alterações"><Save size={16} /></button>
                              <button onClick={() => setContratoEmEdicao(null)} className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors" title="Cancelar"><X size={16} /></button>
                            </div>
                          ) : (
                            <button onClick={() => iniciarEdicaoCliente(group)} className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-indigo-400 rounded-lg transition-colors" title="Editar Cliente"><Edit2 size={16} /></button>
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

      {/* ABA: CONTAS A RECEBER (Mantida) */}
      {activeTab === 'receber' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Buscar por cliente ou mês..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-2 pl-10 pr-4 outline-none focus:border-green-500 transition-colors shadow-inner" />
            </div>
            <div className="flex gap-4 items-center bg-[#0B0F19]/80 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10">
                <span className="text-sm font-bold text-amber-400">Pendente: {formatCurrency(totalPendente)}</span>
                <div className="w-px h-4 bg-white/20"></div>
                <span className="text-sm font-bold text-green-400">Recebido: {formatCurrency(totalPago)}</span>
            </div>
          </div>

          <div className="bg-[#0B0F19]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Carregando recebimentos...</div>
              ) : recebimentosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                    <CheckCircle size={40} className="mb-3 text-white/20" />
                    <p>Nenhuma fatura encontrada.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/20 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">Cliente</th>
                      <th className="p-4 font-semibold">Ref.</th>
                      <th className="p-4 font-semibold">Vencimento</th>
                      <th className="p-4 font-semibold text-right">Valor Final</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                      <th className="p-4 font-semibold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recebimentosFiltrados.map((rec) => {
                      const dataVenc = new Date(rec.dataVencimento);
                      const isAtrasado = rec.status === 'Pendente' && dataVenc < new Date();
                      return (
                        <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold text-white flex items-center gap-2"><FileText size={16} className="text-gray-500" />{rec.cliente}</td>
                          <td className="p-4 text-sm font-bold text-indigo-300">{rec.mesReferencia}</td>
                          <td className={`p-4 text-sm font-bold ${isAtrasado ? 'text-red-400' : 'text-gray-300'}`}>
                            {dataVenc.toLocaleDateString('pt-BR')}
                            {isAtrasado && <span className="ml-2 text-[10px] bg-red-500/20 px-1 rounded text-red-400">Atrasado</span>}
                          </td>
                          <td className="p-4 font-bold text-white text-right">
                            <div className="flex items-center justify-end gap-2">
                                {formatCurrency(rec.valorAgencia)}
                                {rec.status === 'Pendente' && (
                                    <button onClick={() => ajustarFatura(rec)} className="text-gray-500 hover:text-indigo-400 transition-colors" title="Ajustar Fatura"><Edit2 size={14} /></button>
                                )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {rec.status === 'Pago' ? (
                              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><CheckCircle size={12} /> Pago</span>
                            ) : (
                              <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><Clock size={12} /> Pendente</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                              {rec.status === 'Pendente' ? (
                                  <button onClick={() => marcarComoPago(rec.id, rec.cliente, rec.mesReferencia)} className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-md">Dar Baixa</button>
                              ) : (
                                  <span className="text-xs text-gray-500">{new Date(rec.dataPagamentoRealizado).toLocaleDateString('pt-BR')}</span>
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

      {/* NOVA ABA: FLUXO DE CAIXA */}
      {activeTab === 'caixa' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Indicadores Globais do Caixa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg border-t-4 border-t-green-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Entradas (Recebido)</p>
                <ArrowUpRight size={18} className="text-green-400" />
              </div>
              <h2 className="text-2xl font-black text-white">{formatCurrency(totalPago)}</h2>
            </div>
            
            <div className="bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg border-t-4 border-t-rose-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Saídas (Despesas)</p>
                <ArrowDownRight size={18} className="text-rose-400" />
              </div>
              <h2 className="text-2xl font-black text-white">{formatCurrency(totalSaidas)}</h2>
            </div>

            <div className={`bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg border-t-4 ${saldoLiquido >= 0 ? 'border-t-indigo-500' : 'border-t-red-500'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Saldo Líquido</p>
                <DollarSign size={18} className={saldoLiquido >= 0 ? 'text-indigo-400' : 'text-red-400'} />
              </div>
              <h2 className={`text-2xl font-black ${saldoLiquido >= 0 ? 'text-indigo-300' : 'text-red-400'}`}>
                {formatCurrency(saldoLiquido)}
              </h2>
            </div>

            <div className="bg-[#0B0F19]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg border-t-4 border-t-amber-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Margem de Lucro</p>
                <Activity size={18} className="text-amber-400" />
              </div>
              <h2 className="text-2xl font-black text-white">{margemLucro.toFixed(1)}%</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lado Esquerdo: Formulário de Nova Despesa */}
            <div className="lg:col-span-1 bg-[#0B0F19]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg p-5 h-max">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Plus size={18} className="text-rose-400" /> Registar Despesa
              </h3>
              
              <form onSubmit={handleAdicionarDespesa} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                  <input 
                    type="text" 
                    value={despesaForm.descricao} 
                    onChange={e => setDespesaForm({...despesaForm, descricao: e.target.value})}
                    placeholder="Ex: Assinatura do Bling" 
                    className="w-full bg-black/40 border border-white/10 text-white rounded-lg p-2.5 outline-none focus:border-rose-500 text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={despesaForm.valor} 
                    onChange={e => setDespesaForm({...despesaForm, valor: e.target.value})}
                    placeholder="0.00" 
                    className="w-full bg-black/40 border border-white/10 text-white rounded-lg p-2.5 outline-none focus:border-rose-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Categoria</label>
                  <select 
                    value={despesaForm.categoria} 
                    onChange={e => setDespesaForm({...despesaForm, categoria: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 text-white rounded-lg p-2.5 outline-none focus:border-rose-500 text-sm cursor-pointer"
                  >
                    <option value="Folha de Pagamento" className="bg-gray-900">Folha de Pagamento</option>
                    <option value="Ferramentas/Software" className="bg-gray-900">Ferramentas/Software</option>
                    <option value="Tráfego Agência" className="bg-gray-900">Tráfego Agência</option>
                    <option value="Impostos" className="bg-gray-900">Impostos</option>
                    <option value="Infraestrutura/Escritório" className="bg-gray-900">Infra/Escritório</option>
                    <option value="Outros" className="bg-gray-900">Outros</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Data de Pagamento</label>
                  <input 
                    type="date" 
                    value={despesaForm.data} 
                    onChange={e => setDespesaForm({...despesaForm, data: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 text-white rounded-lg p-2.5 outline-none focus:border-rose-500 text-sm cursor-pointer"
                  />
                </div>

                <button type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg shadow-md transition-colors mt-2">
                  Adicionar Despesa
                </button>
              </form>
            </div>

            {/* Lado Direito: Listagem do Histórico de Despesas */}
            <div className="lg:col-span-2 bg-[#0B0F19]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden">
              <div className="p-5 border-b border-white/10 bg-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-gray-400" /> Histórico de Saídas
                </h3>
              </div>
              
              <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                {despesas.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nenhuma despesa registada ainda.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-900 z-10 border-b border-white/10">
                      <tr className="text-gray-400 text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold">Data</th>
                        <th className="p-4 font-semibold">Descrição</th>
                        <th className="p-4 font-semibold">Categoria</th>
                        <th className="p-4 font-semibold text-right">Valor</th>
                        <th className="p-4 font-semibold text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {despesas.map(desp => {
                        const dataFormatoPT = new Date(desp.data + 'T12:00:00').toLocaleDateString('pt-BR');
                        return (
                          <tr key={desp.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 text-sm text-gray-300 whitespace-nowrap">{dataFormatoPT}</td>
                            <td className="p-4 font-bold text-white">{desp.descricao}</td>
                            <td className="p-4">
                              <span className="bg-gray-800 text-gray-300 text-[10px] px-2 py-1 rounded-md border border-gray-700 whitespace-nowrap">
                                {desp.categoria}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-rose-400 text-right whitespace-nowrap">
                              - {formatCurrency(desp.valor)}
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => handleExcluirDespesa(desp.id)} 
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                title="Apagar Despesa"
                              >
                                <Trash2 size={16} />
                              </button>
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
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Package, DollarSign, Upload, Plus, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

export default function ProductDrawer({ isOpen, onClose, initialData, onSave }) {
  const [productForm, setProductForm] = useState({
    fotoUrl: '', descricao: '', custo: '', variacoes: [], 
    canais: [{ id: Date.now(), canal: 'Shopee', modalidade: '', observacoes: '', ofertas: [{ id: Date.now()+1, quantidade: 1, precoDe: '', precoPor: '', lucro: '' }] }]
  });

  // Carrega os dados sempre que a gaveta for aberta
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setProductForm(initialData);
      } else {
        setProductForm({
          fotoUrl: '', descricao: '', custo: '', observacoes: '', variacoes: [], 
          canais: [{ id: Date.now(), canal: 'Shopee', modalidade: '', observacoes: '', ofertas: [{ id: Date.now()+1, quantidade: 1, precoDe: '', precoPor: '', lucro: '' }] }]
        });
      }
    }
  }, [isOpen, initialData]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300; 
        const scaleSize = MAX_WIDTH / img.width;
        
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setProductForm({...productForm, fotoUrl: compressedBase64});
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddVariacao = () => {
    setProductForm({
      ...productForm,
      variacoes: [...(productForm.variacoes || []), { id: Date.now(), cor: '', tamanhos: [] }]
    });
  };

  const handleUpdateCor = (id, novaCor) => {
    const novasVariacoes = productForm.variacoes.map(v => v.id === id ? { ...v, cor: novaCor } : v);
    setProductForm({ ...productForm, variacoes: novasVariacoes });
  };

  const handleRemoveVariacao = (id) => {
    setProductForm({ ...productForm, variacoes: productForm.variacoes.filter(v => v.id !== id) });
  };

  const handleAddTamanho = (e, variacaoId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const novoTamanho = e.target.value.trim();
      if (novoTamanho) {
        const novasVariacoes = productForm.variacoes.map(v => {
          if (v.id === variacaoId && !v.tamanhos.includes(novoTamanho)) {
            return { ...v, tamanhos: [...v.tamanhos, novoTamanho] };
          }
          return v;
        });
        setProductForm({ ...productForm, variacoes: novasVariacoes });
        e.target.value = ''; 
      }
    }
  };

  const handleRemoveTamanho = (variacaoId, tamanhoParaRemover) => {
    const novasVariacoes = productForm.variacoes.map(v => {
      if (v.id === variacaoId) {
        return { ...v, tamanhos: v.tamanhos.filter(t => t !== tamanhoParaRemover) };
      }
      return v;
    });
    setProductForm({ ...productForm, variacoes: novasVariacoes });
  };

  const handleAddOferta = (canalIdx) => {
    const novosCanais = [...productForm.canais];
    const ofertasAtuais = novosCanais[canalIdx].ofertas || [];
    const ultimaQtd = ofertasAtuais.length > 0 ? Math.max(...ofertasAtuais.map(o => Number(o.quantidade) || 0)) : 0;
    
    novosCanais[canalIdx].ofertas.push({
        id: Date.now() + Math.random(),
        quantidade: ultimaQtd + 1,
        precoDe: '',
        precoPor: '',
        lucro: ''
    });
    setProductForm({...productForm, canais: novosCanais});
  };

  const handleUpdateOferta = (canalIdx, ofertaIdx, field, value) => {
    const novosCanais = [...productForm.canais];
    novosCanais[canalIdx].ofertas[ofertaIdx][field] = value;
    setProductForm({...productForm, canais: novosCanais});
  };

  const handleRemoveOferta = (canalIdx, ofertaIdx) => {
    const novosCanais = [...productForm.canais];
    novosCanais[canalIdx].ofertas = novosCanais[canalIdx].ofertas.filter((_, i) => i !== ofertaIdx);
    setProductForm({...productForm, canais: novosCanais});
  };

  const calcularLucroOferta = (precoVenda, custoBase, quantidade) => {
    const venda = Number(precoVenda) || 0;
    const custoUnico = Number(custoBase) || 0;
    const qtdPares = Number(quantidade) || 1;
    if (venda === 0) return { valor: 0, margem: 0 };
    const custoTotal = custoUnico * qtdPares;
    const lucro = venda - custoTotal;
    const margem = (lucro / venda) * 100;
    return { valor: lucro, margem: margem };
  };

  const triggerSave = () => {
    if (!productForm.descricao.trim()) return toast.error("A descrição do produto é obrigatória.");
    onSave(productForm, !!initialData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/60 backdrop-blur-sm flex justify-end z-[9999]">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-gray-900 border-l border-white/10 w-full max-w-xl h-full shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center shrink-0 border-b border-white/5 p-6 bg-black/20">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Package size={20} className="text-indigo-400"/> 
            {initialData ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg">
            <X size={20}/>
          </button>
        </div>

        {/* Corpo do Formulário com Rolagem Interna */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-32">
          
          {/* BLOCO 1: INFOS GERAIS DO PRODUTO */}
          <div className="space-y-4 border-b border-white/5 pb-6">
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">1. Informações Base</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição / Nome do Produto</label>
                <input type="text" value={productForm.descricao} onChange={e => setProductForm({...productForm, descricao: e.target.value})} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 mt-1 shadow-inner text-sm transition-colors" placeholder="Ex: Tênis Esportivo Runner X" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1"><DollarSign size={10}/> Custo Fixo Unitário</label>
                <input type="number" step="0.01" value={productForm.custo} onChange={e => setProductForm({...productForm, custo: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 text-emerald-400 rounded-xl p-3 outline-none focus:border-emerald-500 mt-1 shadow-inner text-sm transition-colors placeholder:text-emerald-500/20" placeholder="R$ 0,00" />
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Foto do Modelo (Thumbnail)</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {productForm.fotoUrl ? (
                    <img src={productForm.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={20} className="text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="w-full cursor-pointer bg-black/40 border border-white/10 hover:border-indigo-500 text-gray-300 rounded-xl p-3 text-sm transition-colors flex items-center justify-center gap-2 border-dashed">
                    <Upload size={16} className="text-indigo-400" />
                    <span>Fazer Upload de Imagem</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* BLOCO 2: VARIAÇÕES */}
          <div className="space-y-4 border-b border-white/5 pb-6">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">2. Variações do Produto</h4>
              <button onClick={handleAddVariacao} className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center gap-1">
                <Plus size={14}/> Nova Cor
              </button>
            </div>

            {(productForm.variacoes || []).map((variacao, vIdx) => (
              <div key={variacao.id} className="bg-black/20 border border-white/5 p-3 rounded-xl flex flex-col gap-3 relative animate-in fade-in">
                <button onClick={() => handleRemoveVariacao(variacao.id)} className="absolute top-3 right-3 text-gray-500 hover:text-red-400 transition-colors" title="Excluir Cor">
                  <Trash2 size={14}/>
                </button>
                
                <div className="flex flex-col sm:flex-row gap-3 pr-6">
                  <div className="w-full sm:w-1/3">
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Cor Primária</label>
                    <input type="text" value={variacao.cor} onChange={e => handleUpdateCor(variacao.id, e.target.value)} placeholder="Ex: Preto" className="w-full bg-black/40 border border-white/10 text-white rounded-lg p-2 outline-none focus:border-indigo-500 text-xs transition-colors" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Tamanhos Disponíveis (Aperte Enter)</label>
                    <input type="text" onKeyDown={e => handleAddTamanho(e, variacao.id)} placeholder="Ex: 38 e dê Enter" className="w-full bg-black/40 border border-white/10 text-white rounded-lg p-2 outline-none focus:border-indigo-500 text-xs transition-colors mb-2" />
                    
                    <div className="flex flex-wrap gap-1">
                      {variacao.tamanhos.map(t => (
                        <span key={t} className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded-md border border-indigo-500/30 flex items-center gap-1">
                          {t} <X size={10} className="cursor-pointer hover:text-red-400" onClick={() => handleRemoveTamanho(variacao.id, t)}/>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!productForm.variacoes || productForm.variacoes.length === 0) && (
              <p className="text-[10px] text-gray-500 italic text-center">Nenhuma variação adicionada.</p>
            )}
          </div>

          {/* BLOCO 3: TABELA DE PREÇOS POR CANAL */}
          <div className="space-y-4 pb-6">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">3. Tabela de Preços e Lucros</h4>
              <button 
                onClick={() => setProductForm({
                  ...productForm, 
                  canais: [...productForm.canais, { id: Date.now(), canal: 'Novo Canal', modalidade: '', observacoes: '', ofertas: [{ id: Date.now()+1, quantidade: 1, precoDe: '', precoPor: '', lucro: '' }] }] 
                })} 
                className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
              >
                <Plus size={14}/> Ativar Canal
              </button>
            </div>

            <div className="space-y-5">
              {(productForm.canais || []).map((c, idx) => (
                <div key={c.id} className="bg-black/30 border border-white/10 rounded-2xl p-4 relative group">
                  
                  <button 
                    onClick={() => {
                      const novosCanais = productForm.canais.filter((_, i) => i !== idx);
                      setProductForm({...productForm, canais: novosCanais});
                    }} 
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                    title="Remover este canal"
                  >
                    <Trash2 size={14}/>
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 pr-10">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Marketplace</label>
                      <select value={c.canal || 'Shopee'} onChange={e => {
                        const novosCanais = [...productForm.canais];
                        novosCanais[idx].canal = e.target.value;
                        setProductForm({...productForm, canais: novosCanais});
                      }} className="w-full bg-white/5 border border-white/10 text-white font-bold rounded-lg p-2 text-xs outline-none focus:border-indigo-500 transition-colors cursor-pointer">
                        {ALL_MARKETPLACES.map(m => <option key={m} value={m} className="bg-gray-900">{m.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Modalidade / Conta</label>
                      <input type="text" value={c.modalidade || ''} onChange={e => {
                        const novosCanais = [...productForm.canais];
                        novosCanais[idx].modalidade = e.target.value;
                        setProductForm({...productForm, canais: novosCanais});
                      }} placeholder="Ex: CPF, Premium, Full" className="w-full bg-black/40 border border-white/10 text-white rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                  </div>

                  {/* NOVA TABELA DE LINHAS DE PREÇO (OFERTAS) */}
                  <div className="mt-2">
                     <div className="flex justify-between items-end mb-2">
                       <label className="text-[10px] font-bold text-gray-500 uppercase">Configuração de Venda</label>
                       <button 
                         onClick={() => handleAddOferta(idx)}
                         className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/30 transition-colors flex items-center gap-1"
                       >
                         <Plus size={10}/> Adicionar Quantidade
                       </button>
                     </div>

                     <div className="overflow-x-auto">
                       <table className="w-full text-left">
                         <thead>
                           <tr className="text-[9px] text-gray-500 uppercase tracking-wider border-b border-white/10">
                             <th className="pb-1.5 w-16">Pares</th>
                             <th className="pb-1.5 w-24">P. Cheio</th>
                             <th className="pb-1.5 w-24 text-emerald-400">P. Promo</th>
                             <th className="pb-1.5 min-w-[80px] text-center text-indigo-400">Lucro (R$)</th>
                             <th className="pb-1.5 w-8"></th>
                           </tr>
                         </thead>
                         <tbody>
                           {(c.ofertas || []).map((of, oIdx) => {
                              return (
                                <tr key={of.id} className="border-b border-white/5 last:border-0">
                                   <td className="py-2 pr-2">
                                      <input type="number" min="1" value={of.quantidade} onChange={e => handleUpdateOferta(idx, oIdx, 'quantidade', e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded p-1.5 text-xs outline-none focus:border-indigo-500 text-center" />
                                   </td>
                                   <td className="py-2 pr-2">
                                      <input type="number" step="0.01" value={of.precoDe} onChange={e => handleUpdateOferta(idx, oIdx, 'precoDe', e.target.value)} className="w-full bg-black/40 border border-white/10 text-gray-300 rounded p-1.5 text-xs outline-none focus:border-indigo-500" placeholder="R$" />
                                   </td>
                                   <td className="py-2 pr-2">
                                      <input type="number" step="0.01" value={of.precoPor} onChange={e => handleUpdateOferta(idx, oIdx, 'precoPor', e.target.value)} className="w-full bg-emerald-500/10 border border-emerald-500/30 text-white font-bold rounded p-1.5 text-xs outline-none focus:border-emerald-500 placeholder:text-emerald-500/30" placeholder="R$" />
                                   </td>
                                   <td className="py-2 pr-2">
                                      <input type="number" step="0.01" value={of.lucro || ''} onChange={e => handleUpdateOferta(idx, oIdx, 'lucro', e.target.value)} className="w-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold rounded p-1.5 text-xs outline-none focus:border-indigo-500 placeholder:text-indigo-500/30 text-center" placeholder="R$" />
                                   </td>
                                   <td className="py-2 text-right">
                                      <button onClick={() => handleRemoveOferta(idx, oIdx)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Remover Linha">
                                        <X size={12}/>
                                      </button>
                                   </td>
                                </tr>
                              )
                           })}
                         </tbody>
                       </table>
                     </div>

                     {/* CAMPO DE OBSERVAÇÃO DO CANAL */}
                     <div className="mt-3">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Observações Internas do Canal (Links, Regras)</label>
                        <textarea 
                          value={c.observacoes || ''} 
                          onChange={e => {
                            const novosCanais = [...productForm.canais];
                            novosCanais[idx].observacoes = e.target.value;
                            setProductForm({...productForm, canais: novosCanais});
                          }}
                          placeholder="Cole aqui links dos anúncios ou regras de separação para este canal..."
                          className="w-full h-16 bg-black/40 border border-white/10 text-gray-300 rounded-xl p-2 outline-none focus:border-indigo-500 shadow-inner text-xs transition-colors resize-none custom-scrollbar"
                        />
                     </div>
                  </div>

                </div>
              ))}
              {(!productForm?.canais || productForm.canais.length === 0) && (
                <div className="text-center p-6 border border-dashed border-white/10 rounded-xl">
                  <p className="text-xs text-gray-500">Nenhum canal ativo para este produto.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Botão Salvar Fixo (Rodapé da Gaveta) */}
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-white/10 bg-gray-900/95 backdrop-blur-xl z-10">
          <button onClick={triggerSave} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2">
            {initialData ? <Save size={18}/> : <Plus size={18}/>}
            {initialData ? 'Salvar Tabela de Preços' : 'Finalizar Cadastro'}
          </button>
        </div>

      </div>
    </div>
  );
}

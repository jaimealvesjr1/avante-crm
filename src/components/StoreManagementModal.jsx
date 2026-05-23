import React, { useState, useEffect } from 'react';
import { X, Archive, GitMerge, Save, Briefcase, Store, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

// 🌟 LISTA PADRONIZADA DE MARKETPLACES (IGUAL AO RADAR DE EXPANSÃO)
const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

export default function StoreManagementModal({ 
  isOpen, 
  onClose, 
  clientGroup, 
  stores, 
  setStores, 
  updateStoreInCloud 
}) {
  // ==========================================
  // ESTADOS: EDIÇÃO DE CLIENTE
  // ==========================================
  const [clientName, setClientName] = useState('');
  const [feeType, setFeeType] = useState('percent');
  const [feePercent, setFeePercent] = useState('');
  const [fixedFee, setFixedFee] = useState('');

  // ==========================================
  // ESTADOS: EDIÇÃO DE LOJAS
  // ==========================================
  const [storeEdits, setStoreEdits] = useState({});
  
  // Estados para o fluxo de Mesclagem (Merge) inline
  const [mergeSourceId, setMergeSourceId] = useState(null);
  const [mergeTargetId, setMergeTargetId] = useState('');

  const activeStores = stores.filter(s => s.client === clientGroup?.client && !s.arquivada);

  // Carrega os dados sempre que o modal abre ou sofre mutações externas
  useEffect(() => {
    if (clientGroup && isOpen) {
      setClientName(clientGroup.client);
      setFeeType(clientGroup.feeType || 'percent');
      setFeePercent(clientGroup.feePercent || '');
      setFixedFee(clientGroup.fixedFee || '');

      // Preenche o estado interno de edição de cada loja ativa
      const initialEdits = {};
      activeStores.forEach(s => {
        initialEdits[s.id] = {
          store: s.store || '',
          marketplace: s.marketplace || '',
          gmvBase: s.gmvBase || '',
          customGrowth: s.customGrowth !== undefined ? s.customGrowth : ''
        };
      });
      setStoreEdits(initialEdits);
      setMergeSourceId(null);
      setMergeTargetId('');
    }
  }, [clientGroup, isOpen, stores.length]);

  if (!isOpen || !clientGroup) return null;

  // Altera os valores temporários da loja antes de submeter ao banco
  const handleStoreEditChange = (storeId, field, value) => {
    setStoreEdits(prev => ({
      ...prev,
      [storeId]: { ...prev[storeId], [field]: value }
    }));
  };

  // --- FUNÇÃO: SALVAR CLIENTE ---
  const handleSaveClient = async () => {
    if (!clientName.trim()) return toast.error("O nome do cliente não pode ficar vazio.");
    
    const batch = writeBatch(db);
    const upperNewName = clientName.trim().toUpperCase();
    
    const updatedStores = stores.map(s => {
      if (s.client === clientGroup.client) {
        const updatedStore = {
           ...s,
           client: upperNewName,
           feeType: feeType,
           feePercent: Number(feePercent) || 0,
           fixedFee: feeType === 'fixed' ? (Number(fixedFee) || 0) : 0
        };
        batch.set(doc(db, "stores", s.id.toString()), updatedStore);
        return updatedStore;
      }
      return s;
    });

    try {
      await batch.commit();
      setStores(updatedStores);
      toast.success("Dados do cliente atualizados com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar o cliente no banco de dados.");
    }
  };

  // --- FUNÇÃO: SALVAR LOJA ---
  const handleSaveStore = (storeId) => {
    const store = activeStores.find(s => s.id === storeId);
    const edits = storeEdits[storeId];
    if (!store || !edits) return;

    if (!edits.store.trim()) return toast.error("O nome da loja é obrigatório.");

    const updatedStore = {
       ...store,
       store: edits.store.trim().toUpperCase(),
       marketplace: edits.marketplace.trim().toUpperCase(),
       gmvBase: Number(edits.gmvBase) || 0,
    };
    
    if (edits.customGrowth !== '') {
       updatedStore.customGrowth = Number(edits.customGrowth);
    } else {
       delete updatedStore.customGrowth; 
    }

    updateStoreInCloud(updatedStore);
    setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
    toast.success(`Loja ${updatedStore.store} salva com sucesso!`);
  };

  // --- FUNÇÃO: ARQUIVAR LOJA ---
  const handleArchiveStore = (storeId, storeName) => {
    if (!window.confirm(`Tem certeza que deseja arquivar a loja ${storeName}?`)) return;

    const store = stores.find(s => s.id === storeId);
    const updatedStore = { ...store, arquivada: true, status: 'archived' };
    
    updateStoreInCloud(updatedStore);
    setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
    toast.success("Loja arquivada com sucesso!");
  };

  // --- FUNÇÃO: CONFIRMAR MESCLAGEM ---
  const handleConfirmMerge = (sourceStoreId) => {
    if (!mergeTargetId) return toast.error("Selecione a loja destino para receber os dados.");
    
    const sourceStore = stores.find(s => s.id === sourceStoreId);
    const targetStore = stores.find(s => s.id.toString() === mergeTargetId);

    if (!window.confirm(`ATENÇÃO: Os dados de ${sourceStore.store} serão fundidos com ${targetStore.store}. A loja de origem será arquivada. Continuar?`)) return;

    const updatedTargetStore = {
      ...targetStore,
      history: [...(targetStore.history || []), ...(sourceStore.history || [])],
      taskLogs: [...(targetStore.taskLogs || []), ...(sourceStore.taskLogs || [])],
      checklists: [...(targetStore.checklists || []), ...(sourceStore.checklists || [])],
      gmvBase: (Number(targetStore.gmvBase) || 0) + (Number(sourceStore.gmvBase) || 0),
      currentRevenue: (Number(targetStore.currentRevenue) || 0) + (Number(sourceStore.currentRevenue) || 0),
      adsInvestment: (Number(targetStore.adsInvestment) || 0) + (Number(sourceStore.adsInvestment) || 0),
    };

    const archivedSourceStore = { ...sourceStore, arquivada: true, status: 'archived' };

    updateStoreInCloud(updatedTargetStore);
    updateStoreInCloud(archivedSourceStore);

    setStores(stores.map(s => {
      if (s.id === updatedTargetStore.id) return updatedTargetStore;
      if (s.id === archivedSourceStore.id) return archivedSourceStore;
      return s;
    }));

    toast.success("Lojas mescladas com sucesso!");
    setMergeSourceId(null);
    setMergeTargetId('');
  };

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in">
      <div className="bg-[#111827] border border-white/10 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* CABEÇALHO */}
        <div className="p-5 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Central de Configurações do Cliente
            </h2>
            <p className="text-sm text-gray-400 mt-1">Gerencie os metadados do grupo e todas as lojas vinculadas.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl text-gray-400 transition-colors"><X size={20}/></button>
        </div>

        {/* CORPO DO MODAL (DUAS COLUNAS) */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* COLUNA 1: INFORMAÇÕES DO CLIENTE (Grupo) */}
          <div className="w-full lg:w-1/3 border-r border-white/5 p-6 overflow-y-auto bg-black/10">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <Briefcase size={18} />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Dados do Grupo</h3>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Nome do Grupo</label>
                <input 
                  type="text" value={clientName} onChange={e => setClientName(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-sm font-bold transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Modelo de Fee</label>
                <select 
                  value={feeType} onChange={e => setFeeType(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-sm transition-all shadow-inner"
                >
                  <option value="percent" className="bg-gray-900 text-white">Porcentagem (%)</option>
                  <option value="fixed" className="bg-gray-900 text-white">Fixo Mensal (R$)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Valor da Taxa</label>
                {feeType === 'percent' ? (
                  <div className="relative">
                    <input type="number" step="0.1" value={feePercent} onChange={e => setFeePercent(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 pr-8 outline-none focus:border-emerald-500 text-sm font-bold shadow-inner" placeholder="Ex: 3" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                    <input type="number" value={fixedFee} onChange={e => setFixedFee(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-xl p-3 pl-9 outline-none focus:border-emerald-500 text-sm font-bold shadow-inner" placeholder="Ex: 1500" />
                  </div>
                )}
              </div>

              <button onClick={handleSaveClient} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.2)]">
                <Save size={18} /> Salvar Alterações
              </button>
            </div>
          </div>

          {/* COLUNA 2: LISTAGEM E EDIÇÃO DAS LOJAS */}
          <div className="w-full lg:w-2/3 p-6 overflow-y-auto custom-scrollbar bg-transparent">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                <Store size={18} />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lojas Ativas ({activeStores.length})</h3>
            </div>

            <div className="space-y-4">
              {activeStores.map(store => {
                const edits = storeEdits[store.id] || {};
                const isMerging = mergeSourceId === store.id;

                return (
                  <div key={store.id} className="bg-white/[0.03] p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-colors shadow-sm">
                    
                    {/* INTERFACE DE MESCLAGEM ATIVA (INLINE) */}
                    {isMerging ? (
                      <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 animate-in fade-in">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle size={18} className="text-rose-400" />
                          <h4 className="text-sm font-bold text-rose-300">Migração de Dados</h4>
                        </div>
                        <p className="text-xs text-rose-200/80 mb-3">
                          Selecione a loja de destino. Todos os históricos, notas e checklists de <strong>{store.store}</strong> serão transferidos para ela. Esta loja de origem será arquivada automaticamente.
                        </p>
                        <select 
                          value={mergeTargetId} 
                          onChange={(e) => setMergeTargetId(e.target.value)}
                          className="w-full bg-black/50 border border-rose-500/30 text-white rounded-lg p-2.5 outline-none focus:border-rose-400 text-sm mb-3"
                        >
                          <option value="">-- Selecione a loja destino --</option>
                          {activeStores.filter(s => s.id !== store.id).map(s => (
                            <option key={`m-${s.id}`} value={s.id}>{s.store} ({s.marketplace || 'N/A'})</option>
                          ))}
                        </select>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setMergeSourceId(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold rounded-lg transition-colors">Cancelar</button>
                          <button onClick={() => handleConfirmMerge(store.id)} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md flex items-center gap-2">
                            <Check size={14} /> Confirmar Mesclagem
                          </button>
                        </div>
                      </div>
                    ) : (
                      // INTERFACE REGULAR DE EDIÇÃO DE CAMPOS DA LOJA
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Loja</label>
                            <input type="text" value={edits.store || ''} onChange={e => handleStoreEditChange(store.id, 'store', e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-lg p-2 outline-none focus:border-indigo-500 text-sm font-bold" />
                          </div>
                          
                          {/* 🛍️ CAMPO ALTERADO: AGORA É UM SELECT DE OPÇÕES FIXAS */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Marketplace</label>
                            <select 
                              value={edits.marketplace?.toLowerCase() || ''} 
                              onChange={e => handleStoreEditChange(store.id, 'marketplace', e.target.value.toUpperCase())} 
                              className="w-full bg-black/40 border border-white/10 text-indigo-300 rounded-lg p-2 outline-none focus:border-indigo-500 text-sm font-bold uppercase cursor-pointer"
                            >
                              <option value="" className="bg-gray-900 text-gray-400">Selecione...</option>
                              {ALL_MARKETPLACES.map(mkt => (
                                <option key={mkt} value={mkt} className="bg-gray-900 text-white">
                                  {mkt.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">GMV Base (R$)</label>
                            <input type="number" value={activeStores.find(as => as.id === store.id) ? edits.gmvBase : ''} onChange={e => handleStoreEditChange(store.id, 'gmvBase', e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-lg p-2 outline-none focus:border-indigo-500 text-sm font-bold" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Cresc. (%) Opcional</label>
                            <input type="number" value={edits.customGrowth !== undefined ? edits.customGrowth : ''} onChange={e => handleStoreEditChange(store.id, 'customGrowth', e.target.value)} className="w-full bg-black/40 border border-white/10 text-emerald-400 rounded-lg p-2 outline-none focus:border-indigo-500 text-sm font-bold" placeholder="Padrão Global" />
                          </div>
                        </div>

                        {/* BARRA DE AÇÕES INLINE DA LOJA */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 mt-2 border-t border-white/5">
                          <button onClick={() => handleSaveStore(store.id)} className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                            <Save size={14} /> Salvar Edição
                          </button>
                          
                          <div className="w-px h-5 bg-white/10 mx-1"></div>
                          
                          <button onClick={() => setMergeSourceId(store.id)} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5" title="Transferir dados para outra conta e arquivar esta.">
                            <GitMerge size={14} /> Mesclar
                          </button>
                          <button onClick={() => handleArchiveStore(store.id, store.store)} className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5" title="Remover dos cálculos gerais e ocultar de leituras operacionais.">
                            <Archive size={14} /> Arquivar
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}

              {activeStores.length === 0 && (
                <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl text-gray-500 text-sm">
                  Nenhuma loja ativa para este cliente.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

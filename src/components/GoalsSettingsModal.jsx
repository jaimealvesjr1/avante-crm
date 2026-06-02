import React, { useState, useMemo } from 'react';
import { X, Target, Save, TrendingUp, ShoppingBag, Briefcase, Globe, ArrowRight } from 'lucide-react';
import { doc, writeBatch, deleteField } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export default function GoalsSettingsModal({ 
  isOpen, onClose, stores, globalGrowth, clientGrowthMap, marketplaceGrowthMap, 
  formatCurrency, db 
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('global');
  const [isSaving, setIsSaving] = useState(false);

  // Estados locais para rascunho das edições
  const [localGlobal, setLocalGlobal] = useState(globalGrowth || 10);
  const [localClientMap, setLocalClientMap] = useState({ ...(clientGrowthMap || {}) });
  const [localMktMap, setLocalMktMap] = useState({ ...(marketplaceGrowthMap || {}) });
  const [localStoreMap, setLocalStoreMap] = useState({});

  // Motor de Simulação: Descobre qual taxa será aplicada na loja com base no rascunho atual
  const getSimulatedTarget = (store) => {
    const customG = localStoreMap[store.id] !== undefined ? localStoreMap[store.id] : store.customGrowth;
    const clientG = localClientMap[store.client];
    const mktG = store.marketplace ? localMktMap[store.marketplace.toUpperCase()] : undefined;

    let rate = localGlobal;
    let appliedRule = 'Global';

    if (customG !== undefined && customG !== null && customG !== '') {
      rate = Number(customG); appliedRule = 'Loja';
    } else if (clientG !== undefined && clientG !== null && clientG !== '') {
      rate = Number(clientG); appliedRule = 'Cliente';
    } else if (mktG !== undefined && mktG !== null && mktG !== '') {
      rate = Number(mktG); appliedRule = 'Canal';
    }

    return { target: (Number(store.gmvBase) || 0) * (1 + (rate / 100)), rule: appliedRule, rate };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);

      // Salva Configurações Globais, Clientes e Canais
      batch.set(doc(db, "settings", "global"), {
        globalGrowth: Number(localGlobal),
        clientGrowthMap: localClientMap,
        marketplaceGrowthMap: localMktMap
      }, { merge: true });

      // Salva edições individuais de Loja
      Object.entries(localStoreMap).forEach(([storeId, val]) => {
        const finalVal = (val === '' || val === null) ? deleteField() : Number(val);
        batch.update(doc(db, "stores", storeId.toString()), { customGrowth: finalVal });
      });

      await batch.commit();
      toast.success("Sistema de Metas atualizado com sucesso!");
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar metas.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const clients = useMemo(() => [...new Set(stores.map(s => s.client))].filter(Boolean).sort(), [stores]);
  const activeMkts = useMemo(() => [...new Set(stores.map(s => s.marketplace?.toUpperCase()))].filter(Boolean).sort(), [stores]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0B0F19] border border-white/10 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Target className="text-indigo-400" /> Control Center: Metas (MoM)
            </h2>
            <p className="text-sm text-gray-400 mt-1">Simule e defina a hierarquia de crescimento. Prioridade: <strong className="text-white">Loja &gt; Cliente &gt; Canal &gt; Global</strong>.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CORPO: SIDEBAR + CONTEÚDO */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* TABS SIDEBAR */}
          <div className="w-full md:w-64 border-r border-white/10 bg-black/20 p-4 space-y-2 shrink-0 overflow-x-auto md:overflow-y-auto flex md:flex-col custom-scrollbar">
            <button onClick={() => setActiveTab('global')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'global' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Globe size={18} /> Meta Global
            </button>
            <button onClick={() => setActiveTab('canais')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'canais' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <ShoppingBag size={18} /> Marketplaces
            </button>
            <button onClick={() => setActiveTab('clientes')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'clientes' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Briefcase size={18} /> Clientes
            </button>
            <button onClick={() => setActiveTab('lojas')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'lojas' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <TrendingUp size={18} /> Lojas (Individual)
            </button>
          </div>

          {/* ÁREA DE CONTEÚDO E SIMULAÇÃO */}
          <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar">
            
            {activeTab === 'global' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">Meta Global Base</h3>
                  <p className="text-sm text-indigo-200/70 mb-6">Taxa de crescimento padrão aplicada a todas as lojas que não possuam regras específicas.</p>
                  <div className="flex items-center gap-3">
                    <input type="number" value={localGlobal} onChange={e => setLocalGlobal(e.target.value)} className="bg-black/40 border border-white/10 text-white rounded-xl p-3 w-32 outline-none font-black text-2xl text-center focus:border-indigo-500" />
                    <span className="text-xl font-bold text-gray-500">%</span>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-sm">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Simulação de Impacto</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Meta Total Atual</p>
                      <p className="text-xl font-bold text-gray-400">{formatCurrency(stores.reduce((acc, s) => acc + (s.gmvTarget || 0), 0))}</p>
                    </div>
                    <ArrowRight className="text-gray-600" />
                    <div className="text-right">
                      <p className="text-[10px] text-indigo-400 uppercase font-bold">Nova Meta Total Esperada</p>
                      <p className="text-2xl font-black text-indigo-400">{formatCurrency(stores.reduce((acc, s) => acc + getSimulatedTarget(s).target, 0))}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'canais' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-sm text-gray-400 mb-4">Metas específicas por Canal de Venda. Sobrepõe a Meta Global.</p>
                {activeMkts.map(mkt => {
                  const mktStores = stores.filter(s => s.marketplace?.toUpperCase() === mkt);
                  const currentTarget = mktStores.reduce((acc, s) => acc + (s.gmvTarget || 0), 0);
                  const expectedTarget = mktStores.reduce((acc, s) => acc + getSimulatedTarget(s).target, 0);

                  return (
                    <div key={mkt} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-[150px]">
                        <h4 className="font-bold text-white uppercase">{mkt}</h4>
                        <p className="text-xs text-gray-500 mt-1">{mktStores.length} lojas ativas</p>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 w-max">
                        <input type="number" placeholder="Usa Global" value={localMktMap[mkt] !== undefined ? localMktMap[mkt] : ''} onChange={e => { const val = e.target.value; setLocalMktMap(p => { const newMap = {...p}; if(val === '') delete newMap[mkt]; else newMap[mkt] = val; return newMap; })}} className="bg-transparent text-white w-20 outline-none font-bold text-center text-sm placeholder:text-gray-600 placeholder:font-normal" />
                        <span className="text-gray-500 font-bold text-sm">%</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm md:ml-auto">
                        <div className="text-right"><p className="text-[9px] text-gray-500 uppercase font-bold">Atual</p><p className="text-gray-400 font-medium">{formatCurrency(currentTarget)}</p></div>
                        <ArrowRight size={14} className="text-gray-600" />
                        <div className="text-right"><p className="text-[9px] text-indigo-400 uppercase font-bold">Esperado</p><p className="text-indigo-400 font-bold">{formatCurrency(expectedTarget)}</p></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'clientes' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-sm text-gray-400 mb-4">Metas específicas por Cliente. Sobrepõe Metas de Canal e Global.</p>
                {clients.map(client => {
                  const clientStores = stores.filter(s => s.client === client && !s.arquivada);
                  const currentTarget = clientStores.reduce((acc, s) => acc + (s.gmvTarget || 0), 0);
                  const expectedTarget = clientStores.reduce((acc, s) => acc + getSimulatedTarget(s).target, 0);

                  return (
                    <div key={client} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-[150px]">
                        <h4 className="font-bold text-white">{client}</h4>
                        <p className="text-xs text-gray-500 mt-1">{clientStores.length} lojas ativas</p>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 w-max">
                        <input type="number" placeholder="Usa Inferior" value={localClientMap[client] !== undefined ? localClientMap[client] : ''} onChange={e => { const val = e.target.value; setLocalClientMap(p => { const newMap = {...p}; if(val === '') delete newMap[client]; else newMap[client] = val; return newMap; })}} className="bg-transparent text-amber-400 w-20 outline-none font-bold text-center text-sm placeholder:text-gray-600 placeholder:font-normal" />
                        <span className="text-gray-500 font-bold text-sm">%</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm md:ml-auto">
                        <div className="text-right"><p className="text-[9px] text-gray-500 uppercase font-bold">Atual</p><p className="text-gray-400 font-medium">{formatCurrency(currentTarget)}</p></div>
                        <ArrowRight size={14} className="text-gray-600" />
                        <div className="text-right"><p className="text-[9px] text-amber-400 uppercase font-bold">Esperado</p><p className="text-amber-400 font-bold">{formatCurrency(expectedTarget)}</p></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'lojas' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-sm text-gray-400 mb-4">Metas específicas por Loja. Regra máxima, sobrepõe todas as outras metas.</p>
                <div className="grid grid-cols-1 gap-3">
                  {stores.filter(s => !s.arquivada).map(store => {
                    const currentTarget = store.gmvTarget || 0;
                    const sim = getSimulatedTarget(store);

                    return (
                      <div key={store.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors">
                        <div className="flex-1 min-w-[200px]">
                          <h4 className="font-bold text-white">{store.store}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">{store.client}</span>
                            <span className="text-[10px] text-indigo-300 uppercase tracking-widest">{store.marketplace}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 w-max shrink-0">
                          <input type="number" placeholder="Usa Inferior" value={localStoreMap[store.id] !== undefined ? localStoreMap[store.id] : (store.customGrowth !== undefined ? store.customGrowth : '')} onChange={e => setLocalStoreMap(p => ({...p, [store.id]: e.target.value}))} className="bg-transparent text-emerald-400 w-24 outline-none font-bold text-center text-sm placeholder:text-gray-600 placeholder:font-normal" />
                          <span className="text-gray-500 font-bold text-sm">%</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm shrink-0 md:ml-auto w-[250px] justify-end">
                          <div className="text-right">
                            <p className="text-[9px] text-gray-500 uppercase font-bold">Atual</p>
                            <p className="text-gray-400 font-medium">{formatCurrency(currentTarget)}</p>
                          </div>
                          <ArrowRight size={14} className="text-gray-600" />
                          <div className="text-right">
                            <p className="text-[9px] text-emerald-400 uppercase font-bold">Esperado ({sim.rate}% - {sim.rule})</p>
                            <p className="text-emerald-400 font-bold">{formatCurrency(sim.target)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-white/10 bg-black/40 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white transition-colors text-sm">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all text-sm flex items-center gap-2 disabled:opacity-50">
            {isSaving ? '⏳ Salvando...' : <><Save size={16} /> Salvar Hierarquia de Metas</>}
          </button>
        </div>
      </div>
    </div>
  );
}

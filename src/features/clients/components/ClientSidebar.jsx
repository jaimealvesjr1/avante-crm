import React, { useState } from 'react';
import { Lock, Copy, EyeOff, Eye, Loader2, Save, Target, StickyNote, Eraser } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ALL_MARKETPLACES = ['shopee', 'mercado livre', 'tiktok shop', 'shein', 'amazon', 'magalu', 'netshoes', 'temu', 'kwai', 'aliexpress'];

export default function ClientSidebar({ store, stores, setStores, updateStoreInCloud, clientGroup, username, activeMarketplaces }) {
  
  // 1. Estados Locais movidos do componente pai
  const [acessoEmail, setAcessoEmail] = useState(clientGroup?.acessoEmail || '');
  const [acessoSenha, setAcessoSenha] = useState(clientGroup?.acessoSenha || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingAcesso, setIsSavingAcesso] = useState(false);

  const [fixedNotes, setFixedNotes] = useState(clientGroup?.notasFixas || '');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateTargetId, setDuplicateTargetId] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // 2. Funções de Lógica de Negócio Locais
  const handleCopy = (text, type) => {
    if (!text) return toast.error(`Nenhum ${type.toLowerCase()} para copiar.`);
    navigator.clipboard.writeText(text);
    toast.success(`${type} copiado para a área de transferência!`);
  };

  const saveAcesso = () => {
    setIsSavingAcesso(true);
    updateStoreInCloud({ ...store, acessoEmail, acessoSenha });
    setStores(stores.map(s => s.id === store.id ? { ...store, acessoEmail, acessoSenha } : s));
    setTimeout(() => { setIsSavingAcesso(false); toast.success('Credenciais salvas com sucesso!'); }, 500);
  };

  const saveFixedNotes = () => {
    setIsSavingNotes(true);
    updateStoreInCloud({ ...store, notasFixas: fixedNotes });
    setStores(stores.map(s => s.id === store.id ? { ...store, notasFixas: fixedNotes } : s));
    setTimeout(() => { setIsSavingNotes(false); toast.success('Lembretes fixos atualizados!'); }, 500);
  };

  const deleteFixedNotes = () => {
    if (window.confirm("Apagar todas as notas fixas desta conta?")) {
      setFixedNotes('');
      updateStoreInCloud({ ...store, notasFixas: '' });
      setStores(stores.map(s => s.id === store.id ? { ...store, notasFixas: '' } : s));
      toast.success('Notas apagadas!');
    }
  };

  const confirmDuplication = () => {
    if (!duplicateTargetId) return toast.error("Selecione um destino.");
    const destinationStore = stores.find(s => s.id === Number(duplicateTargetId));
    if (!destinationStore) return;
    const updatedDestStore = { ...destinationStore, notasFixas: fixedNotes };
    updateStoreInCloud(updatedDestStore);
    setStores(stores.map(s => s.id === updatedDestStore.id ? updatedDestStore : s));
    toast.success(`Nota duplicada para ${destinationStore.store}!`);
    setIsDuplicating(false); setDuplicateTargetId('');
  };

  return (
    <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
      {/* 1. ACESSO DA CONTA */}
      <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/10 shadow-sm flex flex-col">
        <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2 mb-4">
          <Lock size={14} /> Acesso Principal
        </h4>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={acessoEmail} 
              onChange={(e) => setAcessoEmail(e.target.value)} 
              placeholder="Login / E-mail principal"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-gray-300 outline-none focus:border-blue-500 transition-colors"
            />
            <button onClick={() => handleCopy(acessoEmail, 'Login')} className="p-2.5 bg-black/20 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors" title="Copiar Login">
              <Copy size={14}/>
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type={showPassword ? "text" : "password"} 
                value={acessoSenha} 
                onChange={(e) => setAcessoSenha(e.target.value)} 
                placeholder="Senha de Acesso"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 pr-10 text-xs text-gray-300 outline-none focus:border-blue-500 transition-colors"
              />
              <button 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button onClick={() => handleCopy(acessoSenha, 'Senha')} className="p-2.5 bg-black/20 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors" title="Copiar Senha">
              <Copy size={14}/>
            </button>
          </div>
          <button onClick={saveAcesso} disabled={isSavingAcesso} className="w-full bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/40 disabled:opacity-50 text-blue-400 font-bold py-2 rounded-xl text-xs flex justify-center items-center gap-2 shadow-sm transition-all mt-1">
            {isSavingAcesso ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Salvar Credenciais</>}
          </button>
        </div>
      </div>

      {/* 2. RADAR DE EXPANSÃO */}
      <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/10 shadow-sm">
        <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2 mb-3">
          <Target size={14}/> Canais Ativos
        </h4>
        <div className="flex flex-wrap gap-2">
          {ALL_MARKETPLACES.map(mkt => {
            const isActive = activeMarketplaces.has(mkt);
            if(!isActive) return null;
            return <span key={mkt} className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{mkt}</span>;
          })}
        </div>
      </div>

      {/* 3. BLOCO DE NOTAS FIXAS */}
      <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/10 flex flex-col flex-1 min-h-[300px] shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
            <StickyNote size={14} /> Bloco de Notas Fixas
          </h4>
          {!isDuplicating && (
            <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
              <button onClick={() => setIsDuplicating(true)} className="p-1.5 text-gray-400 hover:text-white rounded-md transition-colors" title="Duplicar Nota"><Copy size={12}/></button>
              <button onClick={deleteFixedNotes} className="p-1.5 text-gray-400 hover:text-red-400 rounded-md transition-colors" title="Apagar Notas"><Eraser size={12}/></button>
            </div>
          )}
        </div>
        
        {isDuplicating ? (
          <div className="flex flex-col gap-2 flex-1 justify-center animate-in fade-in">
            <p className="text-[10px] text-gray-400 font-medium mb-1 uppercase tracking-wider">Copiar bloco para:</p>
            <select value={duplicateTargetId} onChange={e => setDuplicateTargetId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-gray-200 outline-none mb-3">
              <option value="">Selecionar destino...</option>
              {stores.filter(s => s.id !== store.id).map(s => <option key={s.id} value={s.id}>{s.client} - {s.store}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setIsDuplicating(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] py-2.5 rounded-xl transition-all">Cancelar</button>
              <button onClick={confirmDuplication} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] py-2.5 rounded-xl transition-all shadow-md">Confirmar</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 flex-1">
            <textarea 
              value={fixedNotes} onChange={(e) => setFixedNotes(e.target.value)} 
              placeholder="Regras de frete, links de catálogos padrão, etc..."
              className="w-full flex-1 bg-black/20 border border-white/10 rounded-xl p-3.5 text-sm text-gray-300 outline-none resize-none focus:border-emerald-500/50 custom-scrollbar transition-colors leading-relaxed"
            />
            <button onClick={saveFixedNotes} disabled={isSavingNotes} className="w-full bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/40 disabled:opacity-50 text-emerald-400 font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-2 shadow-sm transition-all mt-auto">
              {isSavingNotes ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Salvar Anotações</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, CopyPlus, CheckSquare, Square, Eraser, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BulkTaskModal({ isOpen, onClose, stores, onSave, teamMembers, initialData }) {
  const [taskText, setTaskText] = useState('');
  const [taskResp, setTaskResp] = useState('');
  
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [taskRecurrence, setTaskRecurrence] = useState('none');
  const [bulkWeight, setBulkWeight] = useState('media');

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const allUniqueTasks = useMemo(() => {
    const taskSet = new Set();
    stores.forEach(s => {
      if (s.checklists) {
        s.checklists.forEach(t => {
          if (t.texto && t.texto.trim().length > 3) taskSet.add(t.texto.trim());
        });
      }
    });
    return Array.from(taskSet);
  }, [stores]);

  const handleTaskTextChange = (e) => {
    const val = e.target.value;
    setTaskText(val);
    if (val.trim().length >= 2) {
      const filtered = allUniqueTasks.filter(t => t.toLowerCase().includes(val.toLowerCase()) && t.toLowerCase() !== val.toLowerCase());
      setSuggestions(filtered.slice(0, 6)); 
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [mktFilter, setMktFilter] = useState(''); 
  const [selectedStores, setSelectedStores] = useState([]);

  const teamNames = teamMembers?.map(m => m.nomeCompleto || m.nome || m.email.split('@')[0]).filter(Boolean) || [];
  const clients = [...new Set(stores.map(s => s.client))].filter(Boolean).sort();
  const mkts = [...new Set(stores.map(s => s.marketplace))].filter(Boolean).sort();

  useEffect(() => {
    if (isOpen && initialData) {
      setTaskText(initialData.texto || '');
      setTaskResp(initialData.responsavel || '');
      setTaskDate(initialData.data || '');
      setTaskTime(initialData.hora || '');
      setTaskRecurrence(initialData.recorrencia || 'none');
      setBulkWeight(initialData.peso || 'media');
    } else if (isOpen && !initialData) {
      const now = new Date();
      setTaskText('');
      setTaskResp('');
      setTaskDate(new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
      setTaskTime(now.toTimeString().substring(0, 5));
      setTaskRecurrence('none');
      setBulkWeight('media');
    }
  }, [isOpen, initialData]);

  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      if (clientFilter && s.client !== clientFilter) return false;
      if (mktFilter && s.marketplace !== mktFilter) return false; 
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchStore = s.store.toLowerCase().includes(search);
        const matchClient = s.client.toLowerCase().includes(search);
        const matchMkt = s.marketplace?.toLowerCase().includes(search);
        if (!matchStore && !matchClient && !matchMkt) return false;
      }
      return true;
    }).sort((a, b) => {
      // 1. Ordem por Cliente
      const clientCompare = (a.client || '').localeCompare(b.client || '');
      if (clientCompare !== 0) return clientCompare;

      // 2. Ordem por Marketplace (Desempate 1)
      const mktCompare = (a.marketplace || '').localeCompare(b.marketplace || '');
      if (mktCompare !== 0) return mktCompare;

      // 3. Ordem por Nome/Número da Loja (Desempate 2)
      return (a.store || '').localeCompare(b.store || '');
    });
  }, [stores, clientFilter, mktFilter, searchTerm]);

  const toggleStore = (id) => {
    setSelectedStores(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const allIds = filteredStores.map(s => s.id);
    const newSelection = [...new Set([...selectedStores, ...allIds])];
    setSelectedStores(newSelection);
  };

  const deselectAll = () => {
    const filteredIds = filteredStores.map(s => s.id);
    setSelectedStores(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  const handleSave = () => {
    if (!taskText.trim()) return toast.error('A tarefa precisa de uma descrição.');
    if (selectedStores.length === 0) return toast.error('Selecione pelo menos uma loja para receber a tarefa.');

    onSave(selectedStores, {
      text: taskText,
      responsavel: taskResp,
      resp: taskResp,
      data: taskDate,
      hora: taskTime,
      recorrencia: taskRecurrence,
      peso: bulkWeight
    });
    
    const now = new Date();
    setTaskText('');
    setTaskResp('');
    setTaskDate(new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
    setTaskTime(now.toTimeString().substring(0, 5));
    setTaskRecurrence('none');
    setBulkWeight('media');
    setSelectedStores([]);
    setSearchTerm('');
    setClientFilter('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* CABEÇALHO */}
        <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CopyPlus className="text-indigo-400" size={20}/> Tarefa em Massa
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          
          {/* CONFIGURAÇÃO DA TAREFA */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 ml-1">1. Configurações Base da Tarefa</h4>
            <div className="bg-gray-900/50 border border-gray-700 p-3 rounded-xl shadow-inner">
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr_1fr_1fr_auto] gap-3 w-full">
                    
                    {/* COLUNA 1: Responsável e Peso */}
                    <div className="flex flex-col justify-between gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Delegar Para:</label>
                            <select 
                                value={taskResp} 
                                onChange={e => setTaskResp(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-xs text-white outline-none focus:border-indigo-500 h-8"
                            >
                                <option value="">Sem Responsável</option>
                                {teamNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Tamanho (Peso):</label>
                            <select 
                                value={bulkWeight} 
                                onChange={e => setBulkWeight(e.target.value)} 
                                className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-xs text-white outline-none focus:border-indigo-500 h-8"
                            >
                                <option value="baixa">🟢 Rápida</option>
                                <option value="media">🟡 Média</option>
                                <option value="alta">🔴 Demorada</option>
                            </select>
                        </div>
                    </div>

                    {/* COLUNA 2: Descrição da Tarefa (Esticada) */}
                    <div className="flex flex-col gap-1 relative h-full">
                        <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Descrição da Tarefa:</label>
                        <textarea 
                            value={taskText} 
                            onChange={handleTaskTextChange}
                            onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder="Ex: Atualizar banners da campanha..." 
                            className="w-full h-full min-h-[44px] bg-gray-800 border border-gray-600 rounded-md p-2 text-xs text-white outline-none focus:border-indigo-500 resize-none custom-scrollbar"
                        />
                        {showSuggestions && suggestions.length > 0 && (
                            <ul className="absolute top-full left-0 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50 mt-1">
                                {suggestions.map((sug, idx) => (
                                    <li 
                                        key={idx} 
                                        onMouseDown={(e) => { e.preventDefault(); setTaskText(sug); setShowSuggestions(false); }} 
                                        className="px-3 py-2 text-xs text-gray-300 hover:bg-indigo-600 hover:text-white cursor-pointer transition-colors border-b border-gray-700 last:border-0 truncate"
                                    >
                                        {sug}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* COLUNA 3: Prazo e Hora */}
                    <div className="flex flex-col justify-between gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Data limite:</label>
                            <input 
                                type="date" 
                                value={taskDate} 
                                onChange={e => setTaskDate(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-xs text-white outline-none focus:border-indigo-500 h-8 cursor-pointer"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Hora Limite:</label>
                            <input 
                                type="time" 
                                value={taskTime} 
                                onChange={e => setTaskTime(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-xs text-white outline-none focus:border-indigo-500 h-8 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* COLUNA 4: Recorrência */}
                    <div className="flex flex-col justify-between gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Repetição:</label>
                            <select 
                                value={taskRecurrence} 
                                onChange={e => setTaskRecurrence(e.target.value)} 
                                className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-xs text-white outline-none focus:border-indigo-500 h-8 cursor-pointer"
                            >
                                <option value="none">Nenhuma</option>
                                <option value="daily">🔁 Diária</option>
                                <option value="weekly">🔁 Semanal</option>
                                <option value="monthly">🔁 Mensal</option>
                            </select>
                        </div>
                        <div className="h-8 w-full flex items-end">
                            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1 leading-none pb-1.5">
                                <AlertCircle size={10} /> O SLA define o prazo!
                            </span>
                        </div>
                    </div>

                    {/* COLUNA 5: Botão Limpar alinhado na altura */}
                    <div className="flex flex-col h-full pt-[14px]">
                        <button 
                            onClick={() => { setTaskDate(''); setTaskTime(''); setTaskRecurrence('none'); setBulkWeight('media'); }} 
                            className="h-full w-full lg:w-16 bg-gray-800 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-gray-400 font-bold rounded-md shadow-sm transition-colors flex flex-col justify-center items-center gap-1 border border-gray-600"
                            title="Limpar Prazos e Configurações"
                        >
                            <Eraser size={16}/>
                        </button>
                    </div>
                </div>
            </div>
          </div>

          {/* SELEÇÃO DE LOJAS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase">2. Onde aplicar? ({selectedStores.length} selecionadas)</h4>
              <div className="flex gap-2 text-xs">
                <button onClick={selectAll} className="text-indigo-400 hover:text-indigo-300 font-bold underline">Selecionar Visíveis</button>
                <span className="text-gray-600">|</span>
                <button onClick={deselectAll} className="text-gray-400 hover:text-gray-300 font-bold underline">Limpar Visíveis</button>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                <input 
                  type="text" 
                  placeholder="Buscar loja ou cliente..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 pl-9 outline-none text-xs" 
                />
              </div>
              <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="bg-gray-900 border border-gray-700 text-white rounded-lg p-2 outline-none text-xs w-40 cursor-pointer">
                <option value="">Todos Clientes</option>
                {clients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={mktFilter} onChange={e => setMktFilter(e.target.value)} className="bg-gray-900 border border-gray-700 text-white rounded-lg p-2 outline-none text-xs w-32 cursor-pointer">
                <option value="">Marketplaces</option>
                {mkts.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 max-h-72 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredStores.map(store => {
                  const isSelected = selectedStores.includes(store.id);
                  return (
                    <div key={store.id} onClick={() => toggleStore(store.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all overflow-hidden ${isSelected ? 'bg-indigo-900/30 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.1)]' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500'}`}>
                      <div className="shrink-0">
                        {isSelected ? <CheckSquare className="text-indigo-400" size={18}/> : <Square className="text-gray-500" size={18}/>}
                      </div>
                      <div className="flex flex-col overflow-hidden w-full">
                        <span className={`text-sm font-bold truncate w-full ${isSelected ? 'text-indigo-100' : 'text-gray-300'}`} title={store.store}>
                          {store.store}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate w-full" title={`${store.client} ${store.marketplace ? `• ${store.marketplace}` : ''}`}>
                          {store.client} {store.marketplace && `• ${store.marketplace}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredStores.length === 0 && <div className="text-center p-4 text-gray-500 text-sm">Nenhuma loja encontrada com estes filtros.</div>}
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="p-4 border-t border-gray-700 bg-gray-900 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition-colors flex items-center gap-2">
            <CopyPlus size={16}/> Aplicar Tarefa
          </button>
        </div>

      </div>
    </div>
  );
}

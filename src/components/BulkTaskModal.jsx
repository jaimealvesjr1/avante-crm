import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, User, CheckSquare, Layers } from 'lucide-react';

export default function BulkTaskModal({ isOpen, onClose, onSave, stores, TeamMembers, clients }) {
  const [distributionType, setDistributionType] = useState('all');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  
  const [texto, setTexto] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('08:00');
  const [responsavel, setResponsavel] = useState('');
  const [recorrencia, setRecorrencia] = useState('none');

  // Listagem única de clientes para o select
  const uniqueClients = useMemo(() => {
    if (clients && clients.length > 0) return clients;
    return [...new Set(stores.map(s => s.client))].filter(Boolean).sort();
  }, [stores, clients]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!texto.trim() || !responsavel) return;

    let targetStoreIds = [];

    if (distributionType === 'all') {
      targetStoreIds = stores.map(s => s.id);
    } else if (distributionType === 'store') {
      if (!selectedStoreId) return;
      targetStoreIds = [Number(selectedStoreId)];
    } else if (distributionType === 'client') {
      if (!selectedClient) return;
      targetStoreIds = stores.filter(s => s.client === selectedClient).map(s => s.id);
    }

    if (targetStoreIds.length === 0) {
      alert('Nenhuma loja encontrada para o critério selecionado.');
      return;
    }

    // Dispara a criação para as lojas encontradas
    onSave({
      targetStoreIds,
      taskData: {
        texto: texto.trim(),
        data,
        hora,
        responsavel,
        recorrencia,
        feita: false,
        dataCriacao: new Date().toLocaleDateString('pt-BR')
      }
    });

    // Limpa o formulário
    setTexto('');
    setResponsavel('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#151b2c] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Criar Nova Tarefa</h3>
              <p className="text-xs text-gray-400">Agende para múltiplos escopos ou lojas únicas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Seletor de Escopo / Destino */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Atribuir Destino Para:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDistributionType('all')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${distributionType === 'all' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
              >
                Em Massa (Todas)
              </button>
              <button
                type="button"
                onClick={() => setDistributionType('client')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${distributionType === 'client' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
              >
                Por Cliente
              </button>
              <button
                type="button"
                onClick={() => setDistributionType('store')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${distributionType === 'store' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
              >
                Por Loja Única
              </button>
            </div>
          </div>

          {/* Renderização Condicional com base na escolha */}
          {distributionType === 'client' && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
              <label className="text-xs font-semibold text-gray-400">Selecione o Cliente Corporativo</label>
              <select
                required
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="" disabled className="bg-[#151b2c]">Escolha um cliente...</option>
                {uniqueClients.map(cli => (
                  <option key={cli} value={cli} className="bg-[#151b2c]">{cli}</option>
                ))}
              </select>
            </div>
          )}

          {distributionType === 'store' && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
              <label className="text-xs font-semibold text-gray-400">Selecione a Conta / Loja</label>
              <select
                required
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="" disabled className="bg-[#151b2c]">Escolha uma loja...</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#151b2c]">{s.store} ({s.marketplace})</option>
                ))}
              </select>
            </div>
          )}

          {/* Campo Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5"><CheckSquare size={14} /> Descrição da Tarefa</label>
            <textarea
              required
              rows={3}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite as instruções ou checklist..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5"><Calendar size={14} /> Data Limite</label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5"><Clock size={14} /> Hora Alerta</label>
              <input
                type="time"
                required
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Responsável e Recorrência */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5"><User size={14} /> Responsável</label>
              <select
                required
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="" disabled className="bg-[#151b2c]">Selecione...</option>
                {TeamMembers.map(m => (
                  <option key={m.id || m.nome} value={m.nome} className="bg-[#151b2c]">{m.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400">Recorrência</label>
              <select
                value={recorrencia}
                onChange={(e) => setRecorrencia(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="none" className="bg-[#151b2c]">Nenhuma</option>
                <option value="daily" className="bg-[#151b2c]">Diária</option>
                <option value="weekly" className="bg-[#151b2c]">Semanal</option>
                <option value="monthly" className="bg-[#151b2c]">Mensal</option>
              </select>
            </div>
          </div>

          {/* Ações */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              Criar Atribuições
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

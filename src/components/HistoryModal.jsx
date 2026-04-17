import React from 'react';
import { X, Plus, Trash2, CalendarDays, ArchiveRestore, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts';

export default function HistoryModal({
  canEdit,
  historyModalOpen, setHistoryModalOpen, activeStore, chartTab, setChartTab,
  formatCurrency, activeStorePacingData, currentDay, newHistoryDay, setNewHistoryDay,
  newHistoryRevenue, setNewHistoryRevenue, addHistoryEntry, deleteHistoryEntry,
  activeStoreMonthlyData, newNoteText, setNewNoteText, addNote, deleteNote
}) {
  if (!historyModalOpen || !activeStore) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-full max-w-3xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900">
          <div className="flex items-center gap-6">
            <div>
              <h3 className="text-lg font-bold text-white">Dashboard Analítico</h3>
              <p className="text-xs text-gray-400 mt-1">{activeStore.client} - {activeStore.store}</p>
            </div>
            <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 ml-4">
              <button onClick={() => setChartTab('pacing')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${chartTab === 'pacing' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Pacing</button>
              <button onClick={() => setChartTab('monthly')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${chartTab === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Mensal</button>
              <button onClick={() => setChartTab('notes')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${chartTab === 'notes' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                Diário {activeStore.notes?.length > 0 && `(${activeStore.notes.length})`}
              </button>
            </div>
          </div>
          <button onClick={() => setHistoryModalOpen(false)} className="p-1 hover:bg-gray-700 rounded-lg transition-colors"><X size={20} className="text-gray-400 hover:text-white" /></button>
        </div>
        <div className="p-5">
          {chartTab === 'pacing' && (
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1 flex flex-col">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex justify-between"><span>Curva de Velocidade</span><span className="text-xs font-normal text-gray-500">Meta: {formatCurrency(activeStore.gmvTarget)}</span></h4>
                <div className="h-64 w-full bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeStorePacingData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} tickMargin={10} />
                      <YAxis stroke="#9CA3AF" fontSize={10} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} formatter={(value) => formatCurrency(value)} labelFormatter={(label) => `Dia ${label}`} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="ideal" name="Meta Ideal" stroke="#6B7280" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="actual" name="Realizado" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 6 }} connectNulls />
                      <ReferenceLine x={currentDay} stroke="#3B82F6" strokeDasharray="3 3" label={{ position: 'top', value: 'Hoje', fill: '#3B82F6', fontSize: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="w-full md:w-64 flex flex-col gap-4">
                {canEdit && (
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Check-in Diário</h4>
                    <div className="flex gap-2 items-end">
                      <div className="w-16"><label className="text-[10px] text-gray-500 mb-1 block">Dia</label><input type="number" value={newHistoryDay} onChange={e => setNewHistoryDay(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-1.5 text-white outline-none text-sm" /></div>
                      <div className="flex-1"><label className="text-[10px] text-gray-500 mb-1 block">R$ Acumulado</label><input type="number" value={newHistoryRevenue} onChange={e => setNewHistoryRevenue(e.target.value)} placeholder="15000" className="w-full bg-gray-800 border border-gray-600 rounded p-1.5 text-white outline-none text-sm" /></div>
                      <button onClick={addHistoryEntry} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded text-sm h-[34px]"><Plus size={16}/></button>
                    </div>
                  </div>
                )}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Arquivo</h4>
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-40">
                    {activeStore.history?.length > 0 ? activeStore.history.map(h => (
                      <div key={h.id} className="flex justify-between items-center bg-gray-700/30 p-2 rounded border border-gray-700">
                        <div className="font-bold text-gray-200 text-xs">Dia {h.day}</div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-green-400 text-xs">{formatCurrency(h.revenue)}</span>
                          {canEdit && <button onClick={() => deleteHistoryEntry(activeStore.id, h.id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14}/></button>}
                        </div>
                      </div>
                    )) : <div className="text-center p-4 border border-dashed border-gray-700 rounded text-gray-500 text-xs">Sem lançamentos.</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
          {chartTab === 'monthly' && (
            <div className="flex flex-col">
              <div className="flex justify-between items-end mb-4">
                <h4 className="text-sm font-semibold text-gray-300">Fechamentos Anteriores</h4>
                <div className="text-xs text-gray-500 flex items-center gap-1"><CalendarDays size={14} /> Dados históricos da loja</div>
              </div>
              <div className="h-72 w-full bg-gray-900 rounded-lg p-4 border border-gray-700 flex flex-col justify-center items-center">
                {activeStoreMonthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeStoreMonthlyData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="month" stroke="#9CA3AF" tickMargin={10} />
                      <YAxis stroke="#9CA3AF" tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} />
                      <RechartsTooltip cursor={{ fill: '#374151', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} formatter={(value) => [formatCurrency(value), 'Faturamento']} />
                      <Bar dataKey="revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500 text-center flex flex-col items-center gap-2"><ArchiveRestore size={32} className="opacity-50" /><p>Nenhum histórico mensal.</p></div>
                )}
              </div>
            </div>
          )}
          {chartTab === 'notes' && (
            <div className="flex flex-col h-72">
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4">
                {activeStore.notes && activeStore.notes.length > 0 ? (
                  activeStore.notes.map(note => (
                    <div key={note.id} className="bg-gray-900 p-3 rounded-lg border border-gray-700 relative group">
                      <div className="text-[10px] font-bold text-indigo-400 mb-1">{note.date}</div>
                      <p className="text-sm text-gray-300">{note.text}</p>
                      {canEdit && <button onClick={() => deleteNote(activeStore.id, note.id)} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm border border-dashed border-gray-700 rounded-lg">Nenhuma anotação registrada.</div>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newNoteText || ''} 
                    onChange={e => setNewNoteText(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && addNote()} 
                    placeholder="Registre ocorrências de estoque, conversas sobre ads..." 
                    className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white outline-none focus:border-indigo-500" 
                  />
                  <button onClick={addNote} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg font-bold transition-colors">Salvar</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

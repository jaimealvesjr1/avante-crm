import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function StoreEntryRow({ store, handleSaveIndividualEntry }) {
    // Busca o último dia registrado no histórico para sugerir o próximo dia
    const lastDayRecorded = store.history && store.history.length > 0 
        ? Math.max(...store.history.map(h => h.day)) 
        : 0;
    
    // Estados locais da linha da tabela
    const [day, setDay] = useState(lastDayRecorded < 31 ? lastDayRecorded + 1 : 31);
    const [rev, setRev] = useState(store.currentRevenue || '');
    const [ord, setOrd] = useState(store.orders || '');
    const [uni, setUni] = useState(store.units || '');
    const [ads, setAds] = useState(store.adsInvestment || '');
    const [isSaving, setIsSaving] = useState(false);

    // Função para tratar o salvamento individual
    const onSave = async () => {
        if (!day || rev === '') return toast.error("Dia e Faturamento são obrigatórios.");
        setIsSaving(true);

        const numRev = Number(String(rev).replace(',', '.'));
        const numAds = Number(String(ads).replace(',', '.')) || 0;
        const numOrd = Number(ord) || 0;
        const numUni = Number(uni) || 0;

        await handleSaveIndividualEntry(store.id, day, numRev, numAds, numOrd, numUni);
        
        // Avança o dia automaticamente para agilizar a digitação
        setDay(prev => prev < 31 ? Number(prev) + 1 : 31);
        setIsSaving(false);
    };

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <td className="p-4">
                <div className="flex items-center gap-2">
                    <div>
                        <div className="font-bold text-gray-200 truncate max-w-[150px]" title={store.store}>
                            {store.store}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                            {store.marketplace || 'Marketplace'}
                        </div>
                    </div>
                </div>
            </td>
            <td className="p-3">
                <input 
                    type="number" min="1" max="31" 
                    value={day} onChange={e => setDay(e.target.value)} 
                    className="w-16 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white text-center font-bold outline-none focus:border-amber-500 shadow-inner" 
                />
            </td>
            <td className="p-3">
                <input 
                    type="text" 
                    value={rev} onChange={e => setRev(e.target.value)} 
                    placeholder="0.00" 
                    className="w-24 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-blue-400 font-bold outline-none focus:border-blue-500 shadow-inner" 
                />
            </td>
            <td className="p-3">
                <input 
                    type="number" 
                    value={ord} onChange={e => setOrd(e.target.value)} 
                    placeholder="0" 
                    className="w-16 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500 shadow-inner" 
                />
            </td>
            <td className="p-3">
                <input 
                    type="number" 
                    value={uni} onChange={e => setUni(e.target.value)} 
                    placeholder="0" 
                    className="w-16 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-purple-400 font-bold outline-none focus:border-purple-500 shadow-inner" 
                />
            </td>
            <td className="p-3">
                <input 
                    type="text" 
                    value={ads} onChange={e => setAds(e.target.value)} 
                    placeholder="0.00" 
                    className="w-24 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-amber-400 font-bold outline-none focus:border-amber-500 shadow-inner" 
                />
            </td>
            <td className="p-4 text-right">
                <button 
                    onClick={onSave} disabled={isSaving} 
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                    {isSaving ? '⏳' : 'Salvar'}
                </button>
            </td>
        </tr>
    );
}

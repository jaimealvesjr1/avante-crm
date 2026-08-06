import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { History, Save, ToggleLeft, ToggleRight } from 'lucide-react';

export default function StoreEntryRow({ store, handleSaveIndividualEntry, formatCurrency, openTaskModal, openHistoryModal }) {
    const lastDayRecorded = store.history && store.history.length > 0 
        ? Math.max(...store.history.map(h => h.day)) 
        : 0;
    
    // Estados locais da linha da tabela
    const [day, setDay] = useState(lastDayRecorded < 31 ? lastDayRecorded + 1 : 31);
    const [isSaving, setIsSaving] = useState(false);
    const [isDaily, setIsDaily] = useState(false);

    const [rev, setRev] = useState(store.currentRevenue || '');
    const [ord, setOrd] = useState(store.orders || '');
    const [uni, setUni] = useState(store.units || '');
    const [ads, setAds] = useState(store.adsInvestment || '');

    // Efeito para limpar ou preencher os campos instantaneamente ao alternar a chavinha
    React.useEffect(() => {
        if (isDaily) {
            setRev(''); 
            setOrd(''); 
            setUni(''); 
            setAds('');
        } else {
            setRev(store.currentRevenue || '');
            setOrd(store.orders || '');
            setUni(store.units || '');
            setAds(store.adsInvestment || '');
        }
    }, [isDaily, store]);

    // Função para tratar o salvamento individual
    const onSave = async () => {
        if (!day || rev === '') return toast.error("Dia e Faturamento são obrigatórios.");
        setIsSaving(true);

        // Converte as strings em números
        let numRev = Number(String(rev).replace(',', '.')) || 0;
        let numAds = Number(String(ads).replace(',', '.')) || 0;
        let numOrd = Number(ord) || 0;
        let numUni = Number(uni) || 0;

        // Força a formatação contábil (2 casas decimais)
        numRev = Number(numRev.toFixed(2));
        numAds = Number(numAds.toFixed(2));

        // Se a chavinha estiver no modo "Diário", soma o valor digitado com o que já existe
        if (isDaily) {
            numRev = Number(((Number(store.currentRevenue) || 0) + numRev).toFixed(2));
            numAds = Number(((Number(store.adsInvestment) || 0) + numAds).toFixed(2));
            numOrd = (Number(store.orders) || 0) + numOrd;
            numUni = (Number(store.units) || 0) + numUni;
        }

        await handleSaveIndividualEntry(store.id, day, numRev, numAds, numOrd, numUni);
        
        // Se foi um lançamento diário, limpamos os campos para não gerar confusão no próximo input
        if (isDaily) {
            setRev(''); setAds(''); setOrd(''); setUni('');
        }
        
        setDay(prev => prev < 31 ? Number(prev) + 1 : 31);
        setIsSaving(false);
    };

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            {/* Coluna 1: Nome e Canal (Largura Flexível) */}
            <td className="p-4 w-[28%]">
                <div className="flex items-center gap-2">
                    <div>
                        <div 
                            onClick={() => { if(openTaskModal) openTaskModal(store); }}
                            className="font-bold text-gray-200 hover:text-indigo-400 cursor-pointer transition-colors truncate max-w-[180px]" 
                            title="Abrir Tarefas e Senhas"
                        >
                            {store.store}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                            {store.marketplace || 'Marketplace'}
                        </div>
                    </div>
                </div>
            </td>

            {/* Coluna 2: Dia + Chavinha ao lado */}
            <td className="p-3 w-[20%]">
                <div className="flex items-center gap-2">
                    <input 
                        type="number" min="1" max="31" 
                        value={day} onChange={e => setDay(e.target.value)} 
                        className="w-14 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white text-center font-bold outline-none focus:border-amber-500 shadow-inner shrink-0" 
                    />
                    <button 
                        onClick={() => setIsDaily(!isDaily)}
                        className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-[10px] font-bold transition-all border shrink-0 ${isDaily ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                        title="Alternar entre Diário (soma) ou Acumulado (substitui)"
                    >
                        {isDaily ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        <span>{isDaily ? 'Diário' : 'Acumulado'}</span>
                    </button>
                </div>
            </td>

            {/* Coluna 3: Faturamento */}
            <td className="p-3 w-[13%]">
                <input 
                    type="number" step="0.01"
                    value={rev} onChange={e => setRev(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-blue-400 font-bold outline-none focus:border-blue-500 shadow-inner" 
                />
            </td>

            {/* Coluna 4: Pedidos */}
            <td className="p-3 w-[10%]">
                <input 
                    type="number" 
                    value={ord} onChange={e => setOrd(e.target.value)} 
                    placeholder="0" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500 shadow-inner" 
                />
            </td>

            {/* Coluna 5: Unidades */}
            <td className="p-3 w-[10%]">
                <input 
                    type="number" 
                    value={uni} onChange={e => setUni(e.target.value)} 
                    placeholder="0" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-purple-400 font-bold outline-none focus:border-purple-500 shadow-inner" 
                />
            </td>

            {/* Coluna 6: Ads */}
            <td className="p-3 w-[13%]">
                <input 
                    type="number" step="0.01"
                    value={ads} onChange={e => setAds(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-amber-400 font-bold outline-none focus:border-amber-500 shadow-inner" 
                />
            </td>

            {/* Coluna 7: Ações */}
            <td className="p-4 text-right w-[16%]">
                <div className="flex justify-end gap-2 items-center">
                    {openHistoryModal && (
                        <button 
                            onClick={() => openHistoryModal(store)} 
                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl transition-all shadow-sm"
                            title="Auditoria Diária e Mensal"
                        >
                            <History size={16} />
                        </button>
                    )}
                    <button 
                        onClick={onSave} disabled={isSaving} 
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                    >
                        <Save size={14} /> {isSaving ? '⏳' : 'Salvar'}
                    </button>
                </div>
            </td>
        </tr>
    );
}

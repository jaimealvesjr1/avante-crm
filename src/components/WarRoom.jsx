import React, { useState, useMemo } from 'react';
import { Flame, Search, Target, CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const EventEntryRow = ({ store, activeEvent, onSaveDelta, canAccessWarRoom }) => {
    const pastEventData = (store.eventLogs && store.eventLogs[activeEvent.name]) || { gmv: '', ads: '', orders: '', units: '' };
    
    const [rev, setRev] = useState(pastEventData.gmv);
    const [ads, setAds] = useState(pastEventData.ads);
    const [ord, setOrd] = useState(pastEventData.orders);
    const [uni, setUni] = useState(pastEventData.units);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const numRev = Number(String(rev).replace(',', '.')) || 0;
        const numAds = Number(String(ads).replace(',', '.')) || 0;
        const numOrd = Number(ord) || 0;
        const numUni = Number(uni) || 0;

        await onSaveDelta(store.id, activeEvent.name, numRev, numAds, numOrd, numUni);
        setIsSaving(false);
    };

    const isUpdated = 
        Number(rev) !== Number(pastEventData.gmv) || 
        Number(ads) !== Number(pastEventData.ads) || 
        Number(ord) !== Number(pastEventData.orders);

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <td className="p-4">
                <div>
                    <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">{store.client}</div>
                    <div className="font-bold text-gray-200 truncate max-w-[200px]" title={store.store}>{store.store}</div>
                    <div className="text-[10px] font-bold text-indigo-400/70 uppercase tracking-widest mt-0.5">{store.marketplace || 'Marketplace'}</div>
                </div>
            </td>
            <td className="p-3">
                <input 
                    disabled={!canAccessWarRoom}
                    type="number" 
                    placeholder="0.00" 
                    value={rev} 
                    onChange={e => setRev(e.target.value)} 
                    className="w-28 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-blue-400 font-bold outline-none focus:border-blue-500 shadow-inner disabled:opacity-50" 
                />
            </td>
            <td className="p-3">
                <input 
                    disabled={!canAccessWarRoom} 
                    type="number" 
                    placeholder="0" 
                    value={ord} 
                    onChange={e => setOrd(e.target.value)} 
                    className="w-20 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500 shadow-inner disabled:opacity-50" 
                />
            </td>
            <td className="p-3">
                <input 
                    disabled={!canAccessWarRoom} 
                    type="number" 
                    placeholder="0" 
                    value={uni} 
                    onChange={e => setUni(e.target.value)} 
                    className="w-20 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-purple-400 font-bold outline-none focus:border-purple-500 shadow-inner disabled:opacity-50" 
                />
            </td>
            <td className="p-3">
                <input 
                    disabled={!canAccessWarRoom} 
                    type="number" 
                    placeholder="0.00" 
                    value={ads} 
                    onChange={e => setAds(e.target.value)} 
                    className="w-28 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-amber-400 font-bold outline-none focus:border-amber-500 shadow-inner disabled:opacity-50" 
                />
            </td>
            <td className="p-4 text-right">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving || !isUpdated} 
                    className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors ${!isUpdated ? 'bg-white/5 text-gray-600' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}
                >
                    {isSaving ? '⏳' : isUpdated ? 'Atualizar' : 'Salvo'}
                </button>
            </td>
        </tr>
    );
};

export default function WarRoom({ stores, setStores, updateStoreInCloud, formatCurrency, formatNumber, canEdit, activeEvent, onEndEvent, canAccessWarRoom, sortBy, currentDay }) {
    const [search, setSearch] = useState('');

    const handleSaveDelta = async (storeId, eName, newGmv, newAds, newOrders, newUnits) => {
        if (!canAccessWarRoom) return toast.error("Você não tem permissão para esta ação.");

        const store = stores.find(s => s.id === storeId);
        if (!store) return;

        const eventLogs = store.eventLogs || {};
        const pastEventData = eventLogs[eName] || { gmv: 0, ads: 0, orders: 0, units: 0 };

        const deltaGmv = newGmv - Number(pastEventData.gmv);
        const deltaAds = newAds - Number(pastEventData.ads);
        const deltaOrders = newOrders - Number(pastEventData.orders);
        const deltaUnits = newUnits - Number(pastEventData.units);

        const updatedStore = {
            ...store,
            currentRevenue: (Number(store.currentRevenue) || 0) + deltaGmv,
            adsInvestment: (Number(store.adsInvestment) || 0) + deltaAds,
            orders: (Number(store.orders) || 0) + deltaOrders,
            units: (Number(store.units) || 0) + deltaUnits,
            eventLogs: {
                ...eventLogs,
                [eName]: { gmv: newGmv, ads: newAds, orders: newOrders, units: newUnits, updatedAt: new Date().toISOString() }
            }
        };

        updateStoreInCloud(updatedStore);
        setStores(stores.map(s => s.id === storeId ? updatedStore : s));
        toast.success("Evento atualizado e somado ao mês!");
    };

    const filteredStores = useMemo(() => {
        let result = stores.filter(s => {
            if (s.arquivada) return false;
            if (activeEvent.channels && activeEvent.channels.length > 0) {
                if (!s.marketplace || !activeEvent.channels.includes(s.marketplace.toUpperCase())) return false;
            }
            if (search && !s.store.toLowerCase().includes(search.toLowerCase()) && !s.client.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });

        result.sort((a, b) => {
            if (sortBy === 'name') return a.client.localeCompare(b.client);
            if (sortBy === 'gmv') {
                const gmvA = (a.eventLogs && a.eventLogs[activeEvent.name]) ? Number(a.eventLogs[activeEvent.name].gmv) || 0 : 0;
                const gmvB = (b.eventLogs && b.eventLogs[activeEvent.name]) ? Number(b.eventLogs[activeEvent.name].gmv) || 0 : 0;
                return gmvB - gmvA; // Ordem decrescente de GMV no Evento
            }
            if (sortBy === 'status') {
                const w = { danger: 1, warning: 2, success: 3 };
                return (w[a.status] || 0) - (w[b.status] || 0);
            }
            return 0;
        });

        return result;
    }, [stores, search, activeEvent, sortBy]);

    const eventStats = useMemo(() => {
        let totalGmv = 0, totalAds = 0, totalOrders = 0, totalAgencyRevenue = 0, totalGmvBefore = 0;
        
        const daysBefore = Math.max(1, currentDay - 1); 

        stores.forEach(s => {
            if (s.eventLogs && s.eventLogs[activeEvent.name]) {
                const eventGmv = Number(s.eventLogs[activeEvent.name].gmv) || 0;
                totalGmv += eventGmv;
                totalAds += Number(s.eventLogs[activeEvent.name].ads) || 0;
                totalOrders += Number(s.eventLogs[activeEvent.name].orders) || 0;
                
                const feePercent = Number(s.feePercent) || 0;
                if (s.feeType !== 'fixed') {
                    totalAgencyRevenue += eventGmv * (feePercent / 100);
                }

                const currentRev = Number(s.currentRevenue) || 0;
                totalGmvBefore += Math.max(0, currentRev - eventGmv);
            }
        });

        const avgDailyBefore = totalGmvBefore / daysBefore;
        const boostPercentage = avgDailyBefore > 0 ? ((totalGmv - avgDailyBefore) / avgDailyBefore) * 100 : 0;

        return { 
            totalGmv, 
            totalAds, 
            totalOrders, 
            totalAgencyRevenue,
            avgDailyBefore,
            boostPercentage,
            roas: totalAds > 0 ? (totalGmv / totalAds).toFixed(1) : 0 
        };
    }, [stores, activeEvent, currentDay]);

    // ==== GERAÇÃO DE RELATÓRIO PDF EXCLUSIVO DO EVENTO ====
    const exportEventReport = async () => {
        toast.loading("Compilando dados do evento...", { id: 'event-export' });
        try {
            const docPdf = new jsPDF();
            
            // Agrupa as lojas filtradas (presentes no evento) por Cliente
            const clientsGroup = {};
            filteredStores.forEach(store => {
                const cName = store.client || 'Sem Cliente';
                if (!clientsGroup[cName]) clientsGroup[cName] = [];
                clientsGroup[cName].push(store);
            });

            const clientNames = Object.keys(clientsGroup).sort();
            if (clientNames.length === 0) throw new Error("Nenhuma loja ativa no evento para exportar.");

            const loadLogo = () => new Promise((resolve) => {
                const img = new Image();
                img.src = '/logo b2x.jpg'; 
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
            });
            const logoImg = await loadLogo();
            const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            clientNames.forEach((clientName, index) => {
                if (index > 0) docPdf.addPage();
                
                // Ordena as lojas do cliente do maior para o menor GMV no evento
                const clientStores = clientsGroup[clientName].sort((a, b) => {
                    const gmvA = (a.eventLogs && a.eventLogs[activeEvent.name]?.gmv) ? Number(a.eventLogs[activeEvent.name].gmv) : 0;
                    const gmvB = (b.eventLogs && b.eventLogs[activeEvent.name]?.gmv) ? Number(b.eventLogs[activeEvent.name].gmv) : 0;
                    return gmvB - gmvA;
                });

                let totalGmv = 0, totalAds = 0, totalOrders = 0, totalUnits = 0;
                const canaisAtendidos = new Set();
                const storeRows = [];

                const eventDate = activeEvent.date ? new Date(activeEvent.date + 'T12:00:00') : new Date();
                const eventDay = eventDate.getDate();
                const daysBefore = Math.max(1, eventDay - 1);

                clientStores.forEach((s, idx) => {
                    const ev = (s.eventLogs && s.eventLogs[activeEvent.name]) || { gmv: 0, ads: 0, orders: 0, units: 0 };
                    const gmv = Number(ev.gmv) || 0;
                    const ads = Number(ev.ads) || 0;
                    const orders = Number(ev.orders) || 0;
                    const units = Number(ev.units) || 0;
                    const roas = ads > 0 ? gmv / ads : 0;

                    const totalAccumulatedNow = Number(s.currentRevenue) || 0;
                    const revenueBefore = Math.max(0, totalAccumulatedNow - gmv);
                    const dailyAvgBefore = eventDay > 1 ? revenueBefore / daysBefore : 0;
                    const vsMedia = dailyAvgBefore > 0 ? ((gmv - dailyAvgBefore) / dailyAvgBefore) * 100 : 0;

                    totalGmv += gmv; totalAds += ads; totalOrders += orders; totalUnits += units;
                    if(s.marketplace) canaisAtendidos.add(s.marketplace);

                    storeRows.push([
                        `${idx + 1}º`,
                        s.marketplace || '-',
                        s.store || '-',
                        formatCurrency(gmv),
                        vsMedia > 0 ? `+${vsMedia.toFixed(1)}%` : (vsMedia < 0 ? `${vsMedia.toFixed(1)}%` : '-'),
                        `${orders}`,
                        formatCurrency(ads),
                        roas > 0 ? `${roas.toFixed(2)}x` : '-'
                    ]);
                });

                const totalRoas = totalAds > 0 ? totalGmv / totalAds : 0;

                // ================= CABEÇALHO DO PDF =================
                docPdf.setFillColor(15, 23, 42); 
                docPdf.rect(0, 0, 210, 46, 'F'); 
                
                docPdf.setFontSize(22); 
                docPdf.setTextColor(255, 255, 255); 
                docPdf.text(clientName.toUpperCase(), 14, 22);
                
                docPdf.setFontSize(9); 
                docPdf.setTextColor(148, 163, 184); 
                docPdf.text('RELATÓRIO DE DESEMPENHO - EVENTO', 14, 29); 
                
                docPdf.setFontSize(9); 
                docPdf.setTextColor(250, 204, 21);
                docPdf.text(`Campanha Sazonal: ${activeEvent.name}`, 14, 35);

                if (logoImg) {
                    docPdf.addImage(logoImg, 'JPEG', 178, 12, 18, 18);
                } else {
                    docPdf.setFontSize(14); 
                    docPdf.setTextColor(255, 255, 255); 
                    docPdf.text('B2X', 196, 22, { align: 'right' });
                }

                docPdf.setFontSize(8); 
                docPdf.setTextColor(107, 114, 128); 
                docPdf.text(`Gerado em: ${dataGeracao}`, 196, 40, { align: 'right' });

                // ================= BLOCO DE MÉTRICAS =================
                docPdf.setFontSize(11); 
                docPdf.setTextColor(75, 85, 99); 
                docPdf.text('Faturamento Exclusivo do Evento:', 14, 58);
                docPdf.setFontSize(22); 
                docPdf.setTextColor(234, 88, 12); // Laranja (Tema War Room)
                docPdf.text(formatCurrency(totalGmv), 14, 68);

                // ================= TABELA =================
                autoTable(docPdf, {
                    startY: 78,
                    head: [['Rk', 'Canal', 'Loja', 'Faturamento', 'Vs Média/Dia', 'Pedidos', 'ADS', 'ROAS']],
                    body: storeRows, theme: 'grid',
                    headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 4 },
                    columnStyles: { 0: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 7: { halign: 'center' } },
                    alternateRowStyles: { fillColor: [255, 247, 237] } // Laranja bem clarinho
                });

                // ================= RODAPÉ (RESUMO) =================
                let finalY = docPdf.lastAutoTable.finalY + 12;
                if (finalY + 40 > docPdf.internal.pageSize.height) { docPdf.addPage(); finalY = 20; }
                
                docPdf.setFillColor(255, 247, 237); 
                docPdf.setDrawColor(253, 186, 116);
                docPdf.roundedRect(14, finalY, 182, 35, 3, 3, 'FD');

                docPdf.setFontSize(11); docPdf.setTextColor(154, 52, 18); 
                docPdf.setFont('helvetica', 'bold');
                docPdf.text('Resumo da Operação', 20, finalY + 8);

                docPdf.setFontSize(9); docPdf.setTextColor(194, 65, 12); docPdf.setFont('helvetica', 'normal');
                docPdf.text(`Canais Ativados: ${Array.from(canaisAtendidos).join(', ')}`, 20, finalY + 18);
                docPdf.text(`Total de Unidades Vendidas: ${totalUnits} unidades`, 20, finalY + 26);
                
                docPdf.text(`Investimento Total em ADS: ${formatCurrency(totalAds)}`, 110, finalY + 18);
                docPdf.text(`ROAS Médio do Evento: ${totalRoas > 0 ? totalRoas.toFixed(2) + 'x' : '-'}`, 110, finalY + 26);
            });
            
            // O nome do arquivo limpa caracteres especiais do nome do evento
            docPdf.save(`B2X_Evento_${activeEvent.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
            toast.success("Relatório Sazonal gerado e baixado!", { id: 'event-export' });
        } catch (error) {
            console.error(error);
            toast.error("Erro ao gerar PDF: " + error.message, { id: 'event-export' });
        }
    };

    const renderProgressBar = () => {
        const target = activeEvent.target || 1;
        const currentWidth = Math.min((eventStats.totalGmv / target) * 80, 100);
        const currentPercent = ((eventStats.totalGmv / target) * 100).toFixed(1);

        return (
            <div className="bg-black/30 p-6 rounded-3xl border border-white/5 mb-6 relative">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Meta do Evento</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(target)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-orange-500 uppercase font-bold tracking-wider">Atingido ({currentPercent}%)</p>
                        <p className="text-3xl font-black text-orange-400">{formatCurrency(eventStats.totalGmv)}</p>
                    </div>
                </div>
                <div className="relative pt-6 pb-2">
                    <div className="h-6 bg-black/60 rounded-full border border-white/10 shadow-inner overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(245,158,11,0.4)]" style={{ width: `${currentWidth}%` }}></div>
                    </div>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-white to-gray-300 shadow-[0_0_15px_rgba(255,255,255,1)] z-10" style={{ left: '80%' }}>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg">META</div>
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-gray-400 text-[9px] font-bold">100%</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* CABEÇALHO */}
            <div className="bg-gradient-to-r from-orange-600/20 to-black/20 p-6 rounded-3xl border border-orange-500/30 shadow-[0_8px_30px_rgba(234,88,12,0.15)] flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-3xl font-black text-white flex items-center gap-2">
                            <Flame className="text-orange-500" size={32} /> {activeEvent.name}
                        </h2>
                        <span className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-lg">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> Ao Vivo
                        </span>
                        {activeEvent.channels && activeEvent.channels.length > 0 && (
                            <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                Canais: {activeEvent.channels.join(', ')}
                            </span>
                        )}
                    </div>
                    <p className="text-gray-400 mt-2 text-sm max-w-lg leading-relaxed">
                        Os valores lançados aqui <strong>somam a diferença automaticamente</strong> no faturamento do mês.
                    </p>
                </div>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <button onClick={exportEventReport} className="bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-colors justify-center">
                        <Download size={18} /> Relatório
                    </button>
                    <button onClick={() => { if(window.confirm("Deseja realmente encerrar este evento e fechar a War Room?")) onEndEvent(); }} className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center gap-2 transition-colors justify-center">
                        <XCircle size={18} /> Fechar
                    </button>
                </div>
            </div>

            {/* PROGRESSO E MÉTRICAS */}
            {renderProgressBar()}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Pedidos do Evento</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{formatNumber(eventStats.totalOrders)} <span className="text-sm font-medium text-gray-500">ped</span></p>
                </div>
                
                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">ROAS do Evento</span>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-2xl font-black text-white">{eventStats.roas}x</p>
                        <div className="flex flex-col border-l border-white/10 pl-3">
                            <span className="text-[9px] text-gray-500 font-bold uppercase">Ads Gasto</span>
                            <span className="text-xs text-amber-500 font-bold">{formatCurrency(eventStats.totalAds)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 shadow-sm">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Faturamento Avante</span>
                    <p className="text-2xl font-black text-indigo-400 mt-1">{formatCurrency(eventStats.totalAgencyRevenue)}</p>
                </div>

                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Desempenho vs Média Diária</span>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-2xl font-black text-orange-400">{formatCurrency(eventStats.totalGmv)}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${eventStats.boostPercentage >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {eventStats.boostPercentage > 0 ? '+' : ''}{eventStats.boostPercentage.toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Média diária dos dias anteriores: <strong className="text-gray-300">{formatCurrency(eventStats.avgDailyBefore)}/dia</strong>
                        </p>
                    </div>
                    {/* Efeito de brilho de fundo opcional */}
                    {eventStats.boostPercentage > 50 && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl z-0 -mr-10 -mt-10"></div>
                    )}
                </div>
            </div>

            {/* TABELA */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
                <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/20">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Target className="text-orange-500" size={18}/> Lançamento Dinâmico</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input type="text" placeholder="Buscar loja ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-orange-500 transition-colors" />
                    </div>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className="bg-black/40 text-gray-400 text-[10px] uppercase tracking-wider">
                            <tr>
                                <th className="p-4 pl-6">Cliente / Loja</th>
                                <th className="p-4 text-blue-400">GMV ({activeEvent.name})</th>
                                <th className="p-4 text-emerald-400">Pedidos</th>
                                <th className="p-4 text-purple-400">Unidades</th>
                                <th className="p-4 text-amber-400">Ads ({activeEvent.name})</th>
                                <th className="p-4 text-right pr-6">Sincronizar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredStores.map(store => (
                                <EventEntryRow 
                                    key={store.id} 
                                    store={store} 
                                    activeEvent={activeEvent} 
                                    onSaveDelta={handleSaveDelta} 
                                    canAccessWarRoom={canAccessWarRoom}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

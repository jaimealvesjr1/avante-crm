import React, { useState, useEffect, useMemo } from 'react';
import { Flame, CalendarDays, Activity, Clock, CheckCircle, AlertCircle, Search, CalendarClock, X, Briefcase, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { doc, onSnapshot, updateDoc, deleteField } from "firebase/firestore";
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

export default function TeamFeedView({ currentUserData, user, stores, teamMembers, searchTerm, openTaskModal, scheduledEvents, activeEvent, formatCurrency, scheduledVisits, handleVisitAction, canEdit }) {
    const myName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Membro';
    const teamNames = teamMembers?.map(m => m.nomeCompleto || m.nome || m.email.split('@')[0]).filter(Boolean) || [];
    
    const isAdmin = currentUserData?.role === 'Admin' || currentUserData?.role === 'admin' || currentUserData?.role === 'manager' || currentUserData?.role === 'Analista';
    const isGestor = currentUserData?.role === 'Supervisor';

    const canScheduleVisits = isAdmin || isGestor;
    const canCompleteVisits = isAdmin || isGestor;
    const canDeleteVisits = isAdmin;

    const nextEvent = useMemo(() => {
        if (scheduledEvents && scheduledEvents.length > 0) {
            return [...scheduledEvents].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
        }
        return null;
    }, [scheduledEvents]);

    const [showVisitForm, setShowVisitForm] = useState(false);
    const [visitForm, setVisitForm] = useState({ id: null, client: '', date: '', time: '', responsavel: '' });
    
    // NOVO ESTADO: Controla qual utilizador tem o histórico de XP expandido
    const [expandedUserXP, setExpandedUserXP] = useState(null);

    const uniqueClients = useMemo(() => {
        return [...new Set(stores.map(s => s.client))].filter(Boolean).sort();
    }, [stores]);

    const submitVisit = (e) => {
        e.preventDefault();
        if (!visitForm.client || !visitForm.date || !visitForm.time) {
        toast.error("Preencha cliente, data e hora da visita.");
        return;
        }
        handleVisitAction('schedule', visitForm);
        setShowVisitForm(false);
        setVisitForm({ id: null, client: '', date: '', time: '', responsavel: '' });
    };

    const editVisit = (visit) => {
        setVisitForm(visit);
        setShowVisitForm(true);
    };

    const handleDeleteSpecificTask = async (e, storeId, taskId, isRoutine) => {
        e.stopPropagation(); 
        
        if (isRoutine) {
            if (!window.confirm("Remover o alerta de visita de rotina desta loja?")) return;
            const storeRef = doc(db, "stores", storeId.toString());
            await updateDoc(storeRef, { dataProximoAcesso: '' });
            toast.success("Alerta de rotina removido!");
            return;
        }

        if (!window.confirm("Deseja realmente forçar a exclusão desta tarefa específica?")) return;

        const store = stores.find(s => s.id === storeId);
        if (store) {
            try {
                const updatedChecklists = (store.checklists || []).filter(t => t.id !== taskId);
                const storeRef = doc(db, "stores", storeId.toString());
                await updateDoc(storeRef, { checklists: updatedChecklists });
                toast.success("Tarefa removida com sucesso!");
            } catch (error) {
                console.error("Erro ao remover tarefa:", error);
                toast.error("Erro ao remover a tarefa do banco.");
            }
        }
    };

    const pacingLogs = useMemo(() => {
        const grouped = {};
        stores.forEach(s => {
        if (s.arquivada) return;
        if (!grouped[s.client]) grouped[s.client] = { client: s.client, gmvBase: 0, currentGmv: 0 };
        grouped[s.client].gmvBase += Number(s.gmvBase) || 0;
        grouped[s.client].currentGmv += Number(s.currentRevenue) || 0;
        });

        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();

        return Object.values(grouped).map(g => {
        const target = g.gmvBase * 1.1; 
        const projected = currentDay > 0 ? (g.currentGmv / currentDay) * daysInMonth : 0;
        const percent = target > 0 ? (projected / target) * 100 : 0;
        
        return {
            client: g.client,
            percentReached: percent,
            type: percent >= 95 ? 'success' : percent >= 80 ? 'warning' : 'danger'
        };
        }).filter(g => g.type !== 'success').sort((a,b) => a.percentReached - b.percentReached);
    }, [stores]);
    
    const [liveStatus, setLiveStatus] = useState({});
    const [radarFilter, setRadarFilter] = useState(myName);
    
    useEffect(() => {
        const unsubFocus = onSnapshot(doc(db, "settings", "atividades_equipe"), (docSnap) => {
            if (docSnap.exists()) setLiveStatus(docSnap.data());
        });
        return () => unsubFocus();
    }, []);
    
    const handleOpenStore = (storeName) => {
        const targetStore = stores.find(s => s.store === storeName);
        if (targetStore && openTaskModal) openTaskModal(targetStore);
    };
    
    const now = new Date();
    const localTodayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    // === NOVA CONTAGEM DE XP: COM HISTÓRICO E AUDITORIA ===
    const rankingDiario = useMemo(() => {
        const stats = {};

        const globalAverages = {
            baixa: { totalTime: 0, count: 0, avg: 15 * 60000 }, 
            media: { totalTime: 0, count: 0, avg: 30 * 60000 },
            alta:  { totalTime: 0, count: 0, avg: 60 * 60000 }
        };

        stores.forEach(store => {
            (store.checklists || []).forEach(task => {
                if (task.feita) {
                    let duration = task.accumulatedTimeMs || 0;
                    if (!duration && task.startedAt && task.completedAtFull) {
                        duration = new Date(task.completedAtFull) - new Date(task.startedAt);
                    }
                    if (duration > 60000 && duration < 86400000) { 
                        const weight = task.peso || 'media';
                        if (globalAverages[weight]) {
                            globalAverages[weight].totalTime += duration;
                            globalAverages[weight].count += 1;
                        }
                    }
                }
            });
        });

        Object.keys(globalAverages).forEach(w => {
            if (globalAverages[w].count > 0) {
                globalAverages[w].avg = globalAverages[w].totalTime / globalAverages[w].count;
            }
        });

        stores.forEach(store => {
            (store.checklists || []).forEach(task => {
                // 1. XP POR CRIAÇÃO
                if (task.id && task.criadoPor && task.recorrencia !== 'ghost') {
                    const timestamp = Math.floor(task.id);
                    if (timestamp > 1600000000000) { 
                        const creationDate = new Date(timestamp - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                        if (creationDate === localTodayStr) {
                            const creator = task.criadoPor;
                            if (!stats[creator]) {
                                stats[creator] = { name: creator, tasks: 0, points: 0, times: { baixa: { t: 0, c: 0 }, media: { t: 0, c: 0 }, alta: { t: 0, c: 0 } }, history: [] };
                            }
                            stats[creator].points += 2;
                            stats[creator].history.push({
                                id: `crt-${task.id}`,
                                points: 2,
                                desc: `Proatividade: Criou tarefa para ${store.store}`
                            });
                        }
                    }
                }

                // 2. XP POR CONCLUSÃO
                if (task.feita && task.completedAt === localTodayStr) {
                    const author = task.completedBy || 'Sistema';
                    if (!stats[author]) {
                        stats[author] = { name: author, tasks: 0, points: 0, times: { baixa: { t: 0, c: 0 }, media: { t: 0, c: 0 }, alta: { t: 0, c: 0 } }, history: [] };
                    }
                    
                    stats[author].tasks += 1;
                    const weight = task.peso || 'media';
                    
                    let earnedPoints = 0;
                    let detailsArr = [];

                    // Base por dificuldade
                    if (weight === 'baixa') { earnedPoints += 10; detailsArr.push('Baixa (+10)'); }
                    else if (weight === 'media') { earnedPoints += 20; detailsArr.push('Média (+20)'); }
                    else if (weight === 'alta') { earnedPoints += 30; detailsArr.push('Alta (+30)'); }

                    // Prazos
                    if (task.data) {
                        if (task.data >= localTodayStr) { earnedPoints += 5; detailsArr.push('No Prazo (+5)'); }
                        else { earnedPoints -= 10; detailsArr.push('Atrasada (-10)'); }
                    }

                    // Velocidade vs Média
                    let taskDuration = 0;
                    if (task.accumulatedTimeMs) {
                        taskDuration = task.accumulatedTimeMs;
                    } else if (task.startedAt && task.completedAtFull) {
                        taskDuration = new Date(task.completedAtFull) - new Date(task.startedAt);
                    }

                    if (taskDuration > 0 && taskDuration < 86400000) {
                        const expectedTimeMs = globalAverages[weight].avg;
                        const tolerance = 60000; 

                        if (taskDuration < (expectedTimeMs - tolerance)) {
                            earnedPoints += 5; detailsArr.push('Rápida (+5)');
                        } else if (taskDuration > (expectedTimeMs + tolerance)) {
                            earnedPoints -= 5; detailsArr.push('Lenta (-5)');
                        } 

                        stats[author].times[weight].t += taskDuration;
                        stats[author].times[weight].c += 1;
                    }
                    
                    stats[author].points += earnedPoints;
                    stats[author].history.push({
                        id: `cmp-${task.id}`,
                        points: earnedPoints,
                        desc: `Concluiu "${task.texto}" em ${store.store}`,
                        details: detailsArr.join(' | ')
                    });
                }
            });
        });

        return Object.values(stats).map(r => {
            const avgBaixa = r.times.baixa.c > 0 ? Math.round(r.times.baixa.t / r.times.baixa.c / 60000) : 0;
            const avgMedia = r.times.media.c > 0 ? Math.round(r.times.media.t / r.times.media.c / 60000) : 0;
            const avgAlta = r.times.alta.c > 0 ? Math.round(r.times.alta.t / r.times.alta.c / 60000) : 0;
            
            // Ordenar o histórico (do mais alto XP para o menor)
            r.history.sort((a, b) => b.points - a.points);
            
            return { ...r, avgBaixa, avgMedia, avgAlta };
        }).sort((a, b) => b.points - a.points);
    }, [stores, localTodayStr]);

    const deadlinesData = useMemo(() => {
        const items = [];
        const rightNow = new Date();

        stores.forEach(store => {
            const isBeingWorkedOn = Object.values(liveStatus).some(status => status.storeId === store.id && !status.texto?.includes('⏸️'));

            let hasPendingTasks = false;

            if (store.checklists && store.checklists.length > 0) {
                store.checklists.filter(t => !t.feita).forEach(task => {
                    hasPendingTasks = true;
                    let timeDiff = null; 
                    let statusColor = 'blue'; 
                    let timeLabel = 'Sem Prazo';

                    if (task.data && !task.data.includes('NaN')) {
                        const timeString = task.hora || '23:59';
                        const deadlineDate = new Date(`${task.data}T${timeString}:00`);
                        timeDiff = deadlineDate.getTime() - rightNow.getTime();
                        
                        if (!isNaN(timeDiff)) {
                            const isPast = timeDiff < 0;
                            const absDiff = Math.abs(timeDiff);
                            const hours = Math.floor(absDiff / (1000 * 60 * 60));
                            const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

                            if (isPast) {
                                statusColor = 'red';
                                timeLabel = `Atraso: ${hours}h ${minutes}m`;
                            } else if (hours < 24) {
                                statusColor = 'orange';
                                timeLabel = `Vence em: ${hours}h ${minutes}m`;
                            } else {
                                statusColor = 'blue';
                                timeLabel = `Vence em: ${Math.floor(hours / 24)} dias`;
                            }
                        }
                    }

                    items.push({
                        id: `task-${store.id}-${task.id}`,
                        originalTaskId: task.id,
                        storeId: store.id,
                        storeName: store.store,
                        clientName: store.client,
                        type: 'task',
                        title: task.texto,
                        responsavel: task.responsavel || task.resp || '',
                        statusColor,
                        timeLabel,
                        timeDiff: timeDiff !== null ? timeDiff : Infinity,
                        isBeingWorkedOn
                    });
                });
            }

            if (!hasPendingTasks && store.dataProximoAcesso) {
                const nextAccessDate = new Date(store.dataProximoAcesso);
                const timeDiff = nextAccessDate.getTime() - rightNow.getTime();
                
                const isPast = timeDiff < 0;
                const absDiff = Math.abs(timeDiff);
                const hours = Math.floor(absDiff / (1000 * 60 * 60));
                const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

                if (hours <= 24 || isPast) {
                    items.push({
                        id: `routine-${store.id}`,
                        storeId: store.id,
                        storeName: store.store,
                        clientName: store.client,
                        type: 'routine',
                        title: 'Visita de Rotina',
                        responsavel: store.responsavel || store.resp || '',
                        statusColor: isPast ? 'red' : 'orange',
                        timeLabel: isPast ? `Atraso: ${hours}h ${minutes}m` : `Vence em: ${hours}h ${minutes}m`,
                        timeDiff: timeDiff,
                        isBeingWorkedOn
                    });
                }
            }
        });

        let filteredItems = items;
        
        if (radarFilter !== '') {
            const filterTarget = radarFilter.toLowerCase().trim();

            filteredItems = items.filter(item => {
                let resp = (item.responsavel || '').toLowerCase().trim();
                const termosGenericos = ['equipe', 'equipa', 'sem resp.', 'sem responsavel'];
                if (termosGenericos.includes(resp)) resp = '';

                if (radarFilter === 'unassigned') {
                    return resp === '';
                }

                return resp === filterTarget || 
                       (resp !== '' && filterTarget !== '' && (resp.includes(filterTarget) || filterTarget.includes(resp)));
            });
        }

        if (searchTerm) {
            const termo = searchTerm.toLowerCase().trim();
            filteredItems = filteredItems.filter(item => {
                return item.storeName?.toLowerCase().includes(termo) || 
                       item.clientName?.toLowerCase().includes(termo) ||
                       item.title?.toLowerCase().includes(termo) ||
                       item.responsavel?.toLowerCase().includes(termo);
            });
        }

        return filteredItems.sort((a, b) => a.timeDiff - b.timeDiff);

    }, [stores, radarFilter, liveStatus, searchTerm]);

    const upcomingVisits = useMemo(() => {
        if (!scheduledVisits || scheduledVisits.length === 0) return [];
        
        const todayStr = new Date().toISOString().split('T')[0];

        return [...scheduledVisits]
        .filter(visit => visit.date >= todayStr) 
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time || '00:00'}:00`);
            const dateB = new Date(`${b.date}T${b.time || '00:00'}:00`);
            return dateA - dateB;
        });
    }, [scheduledVisits]);
    
    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LADO ESQUERDO: Radar de Prazos (SLA) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700 shadow-lg relative overflow-hidden flex flex-col flex-1 min-h-[600px] lg:h-[calc(100vh-120px)]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-blue-500"></div>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-5 border-b border-gray-700 pb-4 mt-2 shrink-0">
                            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Clock size={18} className="text-indigo-400" />
                                Radar de Tarefas
                                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{deadlinesData.length}</span>
                            </h3>
                            
                            <div className="flex w-full sm:w-auto">
                                <select
                                    value={radarFilter}
                                    onChange={(e) => setRadarFilter(e.target.value)}
                                    className="w-full sm:w-auto bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 cursor-pointer shadow-sm transition-colors"
                                >
                                    <option value={myName}>🎯 Meu Foco ({myName})</option>
                                    <option value="">🌍 Visão Global (Todas)</option>
                                    <option value="unassigned">👻 Sem Responsável</option>
                                    {teamNames.filter(name => name !== myName).length > 0 && (
                                        <optgroup label="Outros Membros da Equipe">
                                            {teamNames.filter(name => name !== myName).map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                                {deadlinesData.map(item => {
                                    const isOverdue = item.statusColor === 'red';
                                    const isWarning = item.statusColor === 'orange';
                                    const isRoutine = item.type === 'routine';

                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => handleOpenStore(item.storeName)}
                                            className={`group relative p-3.5 rounded-xl border cursor-pointer transition-colors duration-200 flex flex-col justify-between gap-3 shadow-sm min-h-[110px] ${
                                                isOverdue ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50' : 
                                                isWarning ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50' : 
                                                'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40'
                                            }`}
                                        >
                                            {isAdmin && (
                                                <button 
                                                    onClick={(e) => handleDeleteSpecificTask(e, item.storeId, item.originalTaskId, item.type === 'routine')}
                                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 z-10"
                                                    title="Forçar exclusão desta tarefa"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}

                                            {item.isBeingWorkedOn && (
                                                <div className="absolute top-3 right-2 flex h-3 w-3">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-gray-900"></span>
                                                </div>
                                            )}

                                            <div className="flex items-start gap-2.5">
                                                <div className={`p-1.5 rounded-md shrink-0 ${
                                                    isOverdue ? 'bg-red-500/20 text-red-400' : 
                                                    isWarning ? 'bg-orange-500/20 text-orange-400' : 
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                    {isRoutine ? <CalendarClock size={14} /> : <AlertCircle size={14} />}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <h4 className="font-bold text-white text-xs truncate" title={item.storeName}>{item.storeName}</h4>
                                                    <span className="text-[9px] text-gray-500 font-medium uppercase tracking-wider truncate block" title={item.clientName}>{item.clientName}</span>
                                                </div>
                                            </div>

                                            <p className={`text-[11px] font-medium leading-tight line-clamp-2 ${isRoutine ? 'italic text-gray-400' : 'text-gray-300'}`} title={item.title}>
                                                {item.title}
                                            </p>

                                            <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-auto">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shadow-sm truncate max-w-[60%] ${
                                                    isOverdue ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                                                    isWarning ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 
                                                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                                }`}>
                                                    ⏱️ {item.timeLabel}
                                                </span>
                                                <span className="text-[9px] text-gray-500 truncate max-w-[40%]" title={item.responsavel || 'Equipe'}>
                                                    Resp: <strong className="text-gray-300">{item.responsavel || 'Equipe'}</strong>
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {deadlinesData.length === 0 && (
                                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-700 rounded-xl bg-gray-900/30 h-full text-emerald-400 text-sm font-medium">
                                    <CheckCircle size={32} className="opacity-50 mb-2" /> 
                                    <span>Excelente! Nenhum prazo pendente nesta visão.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUNA DIREITA: Trabalhando Agora -> Pacing -> Ranking */}
                <div className="lg:col-span-1 flex flex-col gap-6">


                    {/* BANNER DE DESTAQUE SAZONAL */}
                    {activeEvent ? (
                        <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 p-5 rounded-3xl shadow-[0_4px_20px_rgba(234,88,12,0.15)] flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500/20 rounded-2xl border border-orange-500/30 shrink-0">
                                    <Flame className="text-orange-500 animate-pulse" size={28} />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-xl flex items-center gap-2">
                                        {activeEvent.name} 
                                        <span className="bg-red-500 text-white text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full animate-pulse shadow-md">
                                            Ao Vivo
                                        </span>
                                    </h3>
                                    <p className="text-orange-200/70 text-xs mt-1 leading-tight">O evento está acontecendo agora! Acesse a War Room para mais detalhes.</p>
                                </div>
                            </div>
                        </div>
                    ) : nextEvent ? (
                        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 p-5 rounded-3xl shadow-[0_4px_20px_rgba(99,102,241,0.1)] flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 shrink-0">
                                    <CalendarDays className="text-indigo-400" size={28} />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-xl">
                                        Próximo: <span className="text-indigo-300">{nextEvent.name}</span>
                                    </h3>
                                    <p className="text-indigo-200/70 text-xs mt-1 leading-tight">
                                        Marcado para <strong className="text-white">{new Date(nextEvent.date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                                    </p>
                                </div>
                            </div>
                            {nextEvent.channels && nextEvent.channels.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {nextEvent.channels.map(mkt => (
                                        <span key={mkt} className="bg-black/30 border border-indigo-500/20 text-indigo-300 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
                                            {mkt}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                                  
                    {/* Bloco Exclusivo de CRM: Próximas Visitas */}
                    {(upcomingVisits.length > 0 || canScheduleVisits) && (
                    <div className="mb-6 bg-blue-900/10 border border-blue-500/20 p-5 rounded-2xl w-full">
                        
                        <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                            <Briefcase size={16} /> Visitas Presenciais
                        </h3>
                        {canScheduleVisits && (
                            <button 
                            onClick={() => setShowVisitForm(!showVisitForm)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${showVisitForm ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md border-blue-500/50'}`}
                            >
                            {showVisitForm ? '✕ Cancelar' : '+ Agendar'}
                            </button>
                        )}
                        </div>

                        {showVisitForm && canScheduleVisits && (
                        <form onSubmit={submitVisit} className="bg-black/40 border border-blue-500/30 p-4 rounded-xl mb-4 flex flex-col gap-3 items-end animate-in fade-in slide-in-from-top-2">                            
                            <div className="flex flex-col gap-1 w-full">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Cliente</label>
                            <select 
                                value={visitForm.client} 
                                onChange={e => setVisitForm({...visitForm, client: e.target.value})}
                                className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                            >
                                <option value="">Selecione...</option>
                                {uniqueClients.map(client => (
                                <option key={client} value={client}>{client}</option>
                                ))}
                            </select>
                            </div>

                            <div className="flex gap-2 w-full">
                                <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Data</label>
                                <input 
                                    type="date" 
                                    value={visitForm.date} 
                                    onChange={e => setVisitForm({...visitForm, date: e.target.value})}
                                    className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                                />
                                </div>

                                <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Hora</label>
                                <input 
                                    type="time" 
                                    value={visitForm.time} 
                                    onChange={e => setVisitForm({...visitForm, time: e.target.value})}
                                    className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                                />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 w-full">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Responsável</label>
                            <select 
                                value={visitForm.responsavel} 
                                onChange={e => setVisitForm({...visitForm, responsavel: e.target.value})}
                                className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                            >
                                <option value="">Selecione...</option>
                                {teamMembers.map(m => (
                                <option key={m.email} value={m.nomeCompleto || m.nome}>{m.nomeCompleto || m.nome}</option>
                                ))}
                            </select>
                            </div>

                            <div className="w-full flex justify-end mt-2">
                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-md transition-colors">
                                Confirmar Agendamento
                            </button>
                            </div>
                        </form>
                        )}

                        {upcomingVisits.length === 0 && !showVisitForm ? null : (
                        <div className="flex flex-col gap-3 pb-2">
                            {upcomingVisits.length === 0 ? (
                            <div className="text-xs text-gray-500 italic p-2 text-center">Nenhuma visita agendada.</div>
                            ) : (
                            upcomingVisits.map(visit => {
                                const now = new Date();
                                const visitDateTime = new Date(`${visit.date}T${visit.time}:00`);
                                const diffMs = visitDateTime - now;
                                const diffHours = diffMs / (1000 * 60 * 60);

                                const isToday = now.toISOString().split('T')[0] === visit.date;
                                const isWithin3Hours = diffHours > 0 && diffHours <= 3;
                                const isLate = diffHours <= 0 && isToday;

                                let cardClasses = "bg-black/40 border-white/5";
                                let badgeClasses = "text-blue-300 bg-blue-900/30 border-blue-500/20";
                                
                                if (isLate || isWithin3Hours) {
                                    cardClasses = "bg-red-900/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]";
                                    badgeClasses = "text-red-300 bg-red-900/50 border-red-500/50 animate-pulse";
                                } else if (isToday) {
                                    cardClasses = "bg-amber-900/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
                                    badgeClasses = "text-amber-300 bg-amber-900/50 border-amber-500/50";
                                }

                                return (
                                    <div key={visit.id} className={`w-full p-4 rounded-xl border flex flex-col gap-2 shadow-sm transition-all ${cardClasses}`}>
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-sm font-black text-white truncate">{visit.client}</span>
                                        <span className={`text-[9px] font-bold px-2 py-1 rounded border whitespace-nowrap ${badgeClasses}`}>
                                        {visit.date.split('-').reverse().join('/')} às {visit.time}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium">
                                        Responsável: <span className="text-gray-200">{visit.responsavel || 'A Definir'}</span>
                                    </div>
                                    
                                    {(canScheduleVisits || canCompleteVisits || canDeleteVisits) && (
                                        <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-white/5">
                                        {canScheduleVisits && (
                                            <button onClick={() => editVisit(visit)} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                            ✎ Editar
                                            </button>
                                        )}
                                        {canCompleteVisits && (
                                            <button onClick={() => handleVisitAction('complete', visit)} className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
                                            ✓ Finalizar
                                            </button>
                                        )}
                                        {canDeleteVisits && (
                                            <button onClick={() => handleVisitAction('delete', visit)} className="text-[10px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors">
                                            ✕ Cancelar
                                            </button>
                                        )}
                                        </div>
                                    )}
                                    </div>
                                );
                                })
                            )}
                        </div>
                        )}
                    </div>
                    )}

                    {/* RADAR DA EQUIPE */}
                    <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700 shadow-lg">
                        <h3 className="text-lg font-bold tracking-wide text-emerald-400 uppercase flex items-center gap-2 mb-5">
                            <Activity size={18} /> trabalhando agora
                        </h3>
                        
                        {Object.keys(liveStatus).length > 0 ? (
                            <div className="grid grid-cols-1 gap-3.5">
                                {Object.entries(liveStatus).map(([userName, data]) => {
                                    const isPaused = data.texto?.includes('⏸️');
                                    
                                    const memberData = teamMembers?.find(m => m.nomeCompleto === userName || m.nome === userName);
                                    const userColor = memberData?.avatarColor || 'from-indigo-500 to-purple-600';
                                    const userPhoto = memberData?.avatarUrl || null;

                                    return (
                                        <div key={userName} 
                                            onClick={() => {
                                                if (data.storeId) {
                                                    const targetStore = stores.find(s => s.id === data.storeId);
                                                    if (targetStore && openTaskModal) openTaskModal(targetStore);
                                                }
                                            }}
                                            className={`bg-gray-900/80 p-4 rounded-xl border flex items-center gap-4 relative overflow-hidden cursor-pointer transition-colors ${
                                                isPaused ? 'border-amber-500/30 hover:border-amber-500' : 'border-gray-700 hover:border-emerald-500'
                                            }`}>
                                            <div className={`absolute top-0 left-0 h-full w-1.5 transition-all ${
                                                isPaused ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                                            }`}></div>
                                            
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/10 bg-gradient-to-br ${userColor} overflow-hidden shrink-0`}>
                                                {userPhoto ? (
                                                    <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                                                ) : (
                                                    userName.charAt(0).toUpperCase()
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white flex items-center justify-between mb-1">
                                                    <span className="uppercase tracking-wider flex items-center gap-2">
                                                        {userName}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                                        isPaused ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-500/70 bg-emerald-500/10'
                                                    }`}>
                                                        {data.timestamp}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-gray-300 mt-1 font-medium leading-relaxed">{data.texto}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-700 rounded-xl bg-gray-900/30">
                                <Activity size={32} className="text-gray-600 mb-3" />
                                <p className="text-sm text-gray-500 font-medium italic text-center">Ninguém está executando tarefas rastreadas no momento.</p>
                            </div>
                        )}
                    </div>

                    {/* RANKING DE EXECUÇÃO COM HISTÓRICO EXPANSÍVEL */}
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col h-fit">
                        <div className="mb-4 border-b border-gray-700 pb-4">
                            <h3 className="text-lg font-bold tracking-wide text-blue-400 uppercase flex items-center gap-2">🏆 Execução Diária</h3>
                        </div>
                        
                        <div className="space-y-3 pr-2">
                            {rankingDiario.map((rank, i) => {
                                const memberData = teamMembers?.find(m => m.nomeCompleto === rank.name || m.nome === rank.name);
                                const userColor = memberData?.avatarColor || 'from-indigo-500 to-purple-600';
                                const userPhoto = memberData?.avatarUrl || null;
                                const isExpanded = expandedUserXP === rank.name;

                                return (
                                    <div key={rank.name} className="bg-gray-900 p-3.5 rounded-xl border border-gray-700 flex flex-col gap-2 hover:border-gray-500 transition-colors cursor-pointer" onClick={() => setExpandedUserXP(isExpanded ? null : rank.name)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shadow-inner shrink-0 ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white border border-yellow-300' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                                                    {i + 1}
                                                </span>
                                                
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/10 bg-gradient-to-br ${userColor} overflow-hidden shrink-0`}>
                                                    {userPhoto ? (
                                                        <img src={userPhoto} alt={rank.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        rank.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>

                                                <div>
                                                    <p className="text-sm font-bold text-gray-200 leading-none flex items-center gap-1.5">
                                                        {rank.name} {isExpanded ? <ChevronUp size={14} className="text-gray-500"/> : <ChevronDown size={14} className="text-gray-500"/>}
                                                    </p>
                                                    <p className="text-xs text-amber-500 font-bold mt-1">{rank.points} XP</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-gray-300 font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 flex items-center gap-1">
                                                    {rank.tasks} <CheckCircle size={14} className="text-emerald-500"/>
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-black/40 rounded-lg px-3 py-2 flex justify-between items-center mt-1">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1.5"><Clock size={12}/> Tempos Médios</span>
                                            <div className="flex gap-2 text-[10px] font-bold">
                                                <span className={rank.avgBaixa > 0 ? 'text-emerald-400' : 'text-gray-600'}>🟢 {rank.avgBaixa > 0 ? `${rank.avgBaixa}m` : '--'}</span>
                                                <span className={rank.avgMedia > 0 ? 'text-amber-400' : 'text-gray-600'}>🟡 {rank.avgMedia > 0 ? `${rank.avgMedia}m` : '--'}</span>
                                                <span className={rank.avgAlta > 0 ? 'text-red-400' : 'text-gray-600'}>🔴 {rank.avgAlta > 0 ? `${rank.avgAlta}m` : '--'}</span>
                                            </div>
                                        </div>

                                        {/* CAIXA DE AUDITORIA DE XP EXPANSÍVEL */}
                                        {isExpanded && (
                                            <div className="mt-2 pt-2 border-t border-gray-700/50 flex flex-col gap-2 cursor-default" onClick={(e) => e.stopPropagation()}>
                                                <h5 className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1">Extrato de XP (Hoje)</h5>
                                                {rank.history.length > 0 ? rank.history.map((hItem) => (
                                                    <div key={hItem.id} className="bg-black/30 p-2 rounded flex justify-between items-start gap-2">
                                                        <div className="flex-1">
                                                            <p className="text-[11px] text-gray-300 font-medium leading-tight">{hItem.desc}</p>
                                                            {hItem.details && <p className="text-[9px] text-gray-500 mt-0.5">{hItem.details}</p>}
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${hItem.points > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                            {hItem.points > 0 ? '+' : ''}{hItem.points}
                                                        </span>
                                                    </div>
                                                )) : (
                                                    <p className="text-[10px] text-gray-500 italic text-center py-2">Nenhum evento registrado.</p>
                                                )}
                                            </div>
                                        )}
                                    </div> 
                                );
                            })}
                            {rankingDiario.length === 0 && <div className="text-center p-6 text-gray-500 italic text-sm border border-dashed border-gray-700 rounded-xl mt-4">Nenhuma entrega registrada hoje.</div>}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700/50 text-[10px] text-gray-400 text-center leading-relaxed">
                            <strong>XP Base:</strong> Baixa (+10) • Média (+20) • Alta (+30) | <strong>Criação:</strong> (+2 XP)<br/>
                            <strong>Prazos:</strong> No prazo (+5) • Atrasada (-10)<br/>
                            <strong>Agilidade:</strong> Rápida (+5) • Na média (0) • Lenta (-5)
                        </div>
                    </div>

                    {/* RADAR DE PACING */}
                    <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700 shadow-lg overflow-hidden flex flex-col max-h-[400px]">
                        <h3 className="text-lg font-bold text-amber-400 uppercase tracking-wide flex items-center gap-2 mb-5 shrink-0">
                            <AlertTriangle size={18} /> Radar de Pacing
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {pacingLogs.map((log, i) => (
                            <div key={i} className={`flex flex-col gap-2 p-3 rounded-xl border backdrop-blur-md transition-all ${log.type === 'danger' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg shrink-0 ${log.type === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {log.type === 'danger' ? <AlertTriangle size={14} /> : <Clock size={14} />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white text-xs truncate" title={log.client}>{log.client}</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Operando a <strong className={log.type === 'danger' ? 'text-red-400' : 'text-amber-400'}>{log.percentReached.toFixed(1)}%</strong> da meta.</p>
                                </div>
                                </div>
                            </div>
                            ))}
                            {pacingLogs.length === 0 && (
                            <div className="flex flex-col items-center justify-center gap-3 p-6 text-emerald-400 text-sm font-medium text-center h-full bg-gray-900/30 rounded-xl border border-dashed border-gray-700">
                                <CheckCircle size={28} className="opacity-50" /> 
                                <span>Tudo verde! Todas as contas no ritmo da meta.</span>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

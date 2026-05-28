import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Bell, Clock, CheckCircle, AlertCircle, SquareStack, Play, Search, CalendarClock } from 'lucide-react';
import { doc, onSnapshot, updateDoc, deleteField } from "firebase/firestore";
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

export default function TeamFeedView({ currentUserData, user, stores, openTaskModal, teamMembers }) {
    const myName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Membro';
    const teamNames = teamMembers?.map(m => m.nomeCompleto || m.nome || m.email.split('@')[0]).filter(Boolean) || [];
    
    const isAdmin = currentUserData?.role === 'Admin' || currentUserData?.role === 'admin' || currentUserData?.role === 'manager' || currentUserData?.role === 'Analista';

    const handleClearGhostTask = async (ghostUserName, e) => {
        e.stopPropagation();
        if (window.confirm(`Forçar a remoção da tarefa de ${ghostUserName} do radar?`)) {
            try {
                const docRef = doc(db, "settings", "atividades_equipe");
                await updateDoc(docRef, {
                    [ghostUserName]: deleteField()
                });
                toast.success("Tarefa fantasma removida com sucesso!");
            } catch (error) {
                console.error("Erro ao limpar fantasma:", error);
                toast.error("Erro ao remover do radar.");
            }
        }
    };
    
    const [feedClearedAt, setFeedClearedAt] = useState(() => Number(localStorage.getItem('avante_feed_cleared_at')) || 0);
    const [liveStatus, setLiveStatus] = useState({});
    const [feedFilter, setFeedFilter] = useState('all');
    
    // NOVO ESTADO: Filtro Global do Radar (Padrão: Vazio = Todas as Tarefas)
    const [radarFilter, setRadarFilter] = useState('');
    
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
    const localToday = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const allLogs = stores.flatMap(s => (s.taskLogs || []).map(l => ({ ...l, storeName: s.store, clientName: s.client })));
    
    const rankingDiario = useMemo(() => {
        const stats = {};
        const localTodayStr = localToday; 

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
                if (task.id && task.criadoPor && task.recorrencia !== 'ghost') {
                    const timestamp = Math.floor(task.id);
                    if (timestamp > 1600000000000) { 
                        const creationDate = new Date(timestamp - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                        if (creationDate === localTodayStr) {
                            const creator = task.criadoPor;
                            if (!stats[creator]) {
                                stats[creator] = { name: creator, tasks: 0, points: 0, times: { baixa: { t: 0, c: 0 }, media: { t: 0, c: 0 }, alta: { t: 0, c: 0 } } };
                            }
                            stats[creator].points += 2; 
                        }
                    }
                }

                if (task.feita && task.completedAt === localTodayStr) {
                    const author = task.completedBy || 'Sistema';
                    if (!stats[author]) {
                        stats[author] = { name: author, tasks: 0, points: 0, times: { baixa: { t: 0, c: 0 }, media: { t: 0, c: 0 }, alta: { t: 0, c: 0 } } };
                    }
                    
                    stats[author].tasks += 1;
                    const weight = task.peso || 'media';
                    
                    let earnedPoints = 10;
                    if (weight === 'baixa') earnedPoints = 10;
                    else if (weight === 'media') earnedPoints = 20;
                    else if (weight === 'alta') earnedPoints = 30;

                    if (task.data) {
                        if (task.data >= localTodayStr) earnedPoints += 5;
                        else earnedPoints = Math.max(5, earnedPoints - 10);
                    }

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
                            earnedPoints += 5; 
                        } else if (taskDuration > (expectedTimeMs + tolerance)) {
                            earnedPoints = Math.max(0, earnedPoints - 5); 
                        } 

                        stats[author].times[weight].t += taskDuration;
                        stats[author].times[weight].c += 1;
                    }
                    stats[author].points += earnedPoints;
                }
            });
        });

        return Object.values(stats).map(r => {
            const avgBaixa = r.times.baixa.c > 0 ? Math.round(r.times.baixa.t / r.times.baixa.c / 60000) : 0;
            const avgMedia = r.times.media.c > 0 ? Math.round(r.times.media.t / r.times.media.c / 60000) : 0;
            const avgAlta = r.times.alta.c > 0 ? Math.round(r.times.alta.t / r.times.alta.c / 60000) : 0;
            
            return { ...r, avgBaixa, avgMedia, avgAlta };
        }).sort((a, b) => b.points - a.points);
    }, [stores, localToday]);

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

                    if (task.data) {
                        const timeString = task.hora || '23:59';
                        const deadlineDate = new Date(`${task.data}T${timeString}:00`);
                        timeDiff = deadlineDate.getTime() - rightNow.getTime();
                        
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

                    items.push({
                        id: task.id,
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

        // APLICAÇÃO DO NOVO FILTRO GLOBAL
        let filteredItems = items;
        
        if (radarFilter !== '') {
            const filterTarget = radarFilter.toLowerCase().trim();

            filteredItems = items.filter(item => {
                let resp = (item.responsavel || '').toLowerCase().trim();
                const termosGenericos = ['equipe', 'equipa', 'sem resp.', 'sem responsavel'];
                if (termosGenericos.includes(resp)) resp = '';

                // Se filtrou por "sem responsável"
                if (radarFilter === 'unassigned') {
                    return resp === '';
                }

                // Se filtrou por um nome específico (ex: "Jonas", "Maria")
                return resp === filterTarget || 
                       (resp !== '' && filterTarget !== '' && (resp.includes(filterTarget) || filterTarget.includes(resp)));
            });
        }

        return filteredItems.sort((a, b) => a.timeDiff - b.timeDiff);

    }, [stores, radarFilter, liveStatus]); // O myName foi removido como dependência fixa aqui, dependemos apenas do radarFilter
    
    const visibleLogs = useMemo(() => {
        return allLogs
            .filter(l => l.id > feedClearedAt)
            .filter(l => {
                if (feedFilter === 'tasks') return l.texto?.includes('✅ Tarefa concluída');
                if (feedFilter === 'mine') return l.author === myName;
                return true;
            })
            .sort((a, b) => b.id - a.id);
    }, [allLogs, feedClearedAt, feedFilter, myName]);
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            {/* LADO ESQUERDO: Radar de Prazos (SLA) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                
                <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700 shadow-lg relative overflow-hidden flex flex-col flex-1 min-h-[600px] lg:h-[calc(100vh-120px)]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-blue-500"></div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-5 border-b border-gray-700 pb-4 mt-2 shrink-0">
                        <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Clock size={18} className="text-indigo-400" />
                            Radar SLA
                            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{deadlinesData.length}</span>
                        </h3>
                        
                        {/* NOVO FILTRO GLOBAL NO RADAR */}
                        <div className="flex w-full sm:w-auto">
                            <select
                                value={radarFilter}
                                onChange={(e) => setRadarFilter(e.target.value)}
                                className="w-full sm:w-auto bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 cursor-pointer shadow-sm transition-colors"
                                title="Filtrar Radar por Responsável"
                            >
                                <option value="">🌍 Visão Global (Todas)</option>
                                <option value={myName}>🎯 Meu Foco ({myName})</option>
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
                                        className={`relative p-3.5 rounded-xl border cursor-pointer transition-colors duration-200 flex flex-col justify-between gap-3 shadow-sm min-h-[110px] ${
                                            isOverdue ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50' : 
                                            isWarning ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50' : 
                                            'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40'
                                        }`}
                                    >
                                        {item.isBeingWorkedOn && (
                                            <div className="absolute -top-1 -right-1 flex h-3 w-3">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-gray-900"></span>
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

            {/* COLUNA DIREITA: Trabalhando Agora -> Timeline -> Ranking */}
            <div className="lg:col-span-1 flex flex-col gap-6">

                {/* 1. RADAR DA EQUIPE (Trabalhando Agora) */}
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
                                            <p className="text-sm text-gray-300 mt-1 font-medium leading-relaxed">{data.texto}</p>
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

                {/* 2. TIMELINE MOVIDA PARA CÁ */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col max-h-[400px]">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4 shrink-0">
                        <h3 className="text-base font-bold tracking-wide text-gray-300 uppercase flex items-center gap-2">
                            <SquareStack size={20}/>
                            Timeline <span className="text-xs bg-gray-700 text-gray-300 px-2.5 py-0.5 rounded-full">{visibleLogs.length}</span>
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700 hidden sm:flex">
                                <button onClick={() => setFeedFilter('all')} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-colors ${feedFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Tudo</button>
                                <button onClick={() => setFeedFilter('tasks')} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-colors ${feedFilter === 'tasks' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Tarefas</button>
                            </div>
                            {visibleLogs.length > 0 && (
                                <button 
                                    onClick={() => { 
                                        setFeedClearedAt(Date.now()); 
                                        localStorage.setItem('avante_feed_cleared_at', Date.now()); 
                                        toast.success("Mural limpo!"); 
                                    }} 
                                    className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold px-3 py-1.5 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-3 space-y-4 custom-scrollbar border-l-2 border-gray-700/50 ml-2 pl-5 pb-2">
                        {visibleLogs.map(log => {
                            const isTask = log.texto?.includes('✅ Tarefa concluída');
                            return (
                                <div key={log.id} onClick={() => handleOpenStore(log.storeName)} className="relative group cursor-pointer">
                                    <div className={`absolute -left-[27px] top-2 w-3 h-3 rounded-full border-[3px] border-gray-800 ${isTask ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                                    <div className={`p-4 rounded-xl border flex flex-col gap-1.5 transition-colors hover:brightness-125 ${isTask ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-gray-900/50 border-gray-700'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="text-xs font-black text-indigo-400 uppercase truncate pr-2">{log.clientName} <span className="text-gray-500 mx-1.5">•</span> {log.storeName}</div>
                                            <span className="text-[10px] text-gray-500 font-medium shrink-0">{log.data}</span>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${isTask ? 'text-emerald-100 font-medium' : 'text-gray-300'}`}>{log.texto}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Por: <span className="text-gray-400 font-bold">{log.author}</span></p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. RANKING DE EXECUÇÃO
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col h-fit">
                    <div className="mb-4 border-b border-gray-700 pb-4">
                        <h3 className="text-lg font-bold tracking-wide text-amber-400 uppercase flex items-center gap-2">🏆 Execução Diária</h3>
                    </div>
                    
                    <div className="space-y-3 pr-2">
                        {rankingDiario.map((rank, i) => {
                            const memberData = teamMembers?.find(m => m.nomeCompleto === rank.name || m.nome === rank.name);
                            const userColor = memberData?.avatarColor || 'from-indigo-500 to-purple-600';
                            const userPhoto = memberData?.avatarUrl || null;

                            return (
                                <div key={rank.name} className="bg-gray-900 p-3.5 rounded-xl border border-gray-700 flex flex-col gap-2 hover:border-gray-500 transition-colors">
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
                                                <p className="text-sm font-bold text-gray-200 leading-none">{rank.name}</p>
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
                                            <span className={rank.projectedGmv > 0 ? 'text-emerald-400' : 'text-gray-600'}>🟢 {rank.avgBaixa > 0 ? `${rank.avgBaixa}m` : '--'}</span>
                                            <span className={rank.avgMedia > 0 ? 'text-amber-400' : 'text-gray-600'}>🟡 {rank.avgMedia > 0 ? `${rank.avgMedia}m` : '--'}</span>
                                            <span className={rank.avgAlta > 0 ? 'text-red-400' : 'text-gray-600'}>🔴 {rank.avgAlta > 0 ? `${rank.avgAlta}m` : '--'}</span>
                                        </div>
                                    </div>
                                </div> 
                            );
                        })}
                        {rankingDiario.length === 0 && <div className="text-center p-6 text-gray-500 italic text-sm border border-dashed border-gray-700 rounded-xl mt-4">Nenhuma entrega registrada hoje.</div>}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700/50 text-[10px] text-gray-400 text-center leading-relaxed">
                        <strong>XP Base:</strong> Baixa (+10) • Média (+20) • Alta (+30) | <strong>Criação:</strong> (+2 XP)<br/>
                        <strong>Prazos:</strong> No prazo (+5) • Atrasada (-10)<br/>
                        <strong>Agilidade:</strong> Rápida (+5) • Na média (0) • Lenta (-5) comparado ao histórico geral.
                    </div>
                </div>
                 */}
            </div>
        </div>
    );
}

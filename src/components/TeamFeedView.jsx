import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Bell, Clock, CheckCircle, AlertCircle, SquareStack, X } from 'lucide-react';
import { doc, onSnapshot, updateDoc, deleteField } from "firebase/firestore";
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

export default function TeamFeedView({ currentUserData, user, stores, openTaskModal, teamMembers }) {
    const myName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Membro';
    
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

        // 1. CALCULADORA DE MÉDIAS HISTÓRICAS
        // O sistema descobre quanto tempo a equipa costuma levar em cada complexidade.
        const globalAverages = {
            baixa: { totalTime: 0, count: 0, avg: 15 * 60000 }, // Padrão base se não houver histórico
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
                    if (duration > 60000 && duration < 86400000) { // Conta tarefas entre 1 min e 24h
                        const weight = task.peso || 'media';
                        if (globalAverages[weight]) {
                            globalAverages[weight].totalTime += duration;
                            globalAverages[weight].count += 1;
                        }
                    }
                }
            });
        });

        // Define a média real baseada nos dados encontrados
        Object.keys(globalAverages).forEach(w => {
            if (globalAverages[w].count > 0) {
                globalAverages[w].avg = globalAverages[w].totalTime / globalAverages[w].count;
            }
        });

        // 2. APLICAÇÃO DE PONTOS PARA HOJE
        stores.forEach(store => {
            (store.checklists || []).forEach(task => {
                
                // --- NOVO: PONTOS POR CRIAÇÃO DE TAREFA (+2 XP) ---
                if (task.id && task.criadoPor && task.recorrencia !== 'ghost') {
                    const timestamp = Math.floor(task.id);
                    // Garante que o ID é um timestamp válido
                    if (timestamp > 1600000000000) { 
                        const creationDate = new Date(timestamp - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                        
                        if (creationDate === localTodayStr) {
                            const creator = task.criadoPor;
                            if (!stats[creator]) {
                                stats[creator] = { name: creator, tasks: 0, points: 0, times: { baixa: { t: 0, c: 0 }, media: { t: 0, c: 0 }, alta: { t: 0, c: 0 } } };
                            }
                            stats[creator].points += 2; // +2 XP por criar a tarefa hoje
                        }
                    }
                }

                // --- PONTOS POR CONCLUSÃO ---
                if (task.feita && task.completedAt === localTodayStr) {
                    const author = task.completedBy || 'Sistema';
                    
                    if (!stats[author]) {
                        stats[author] = { name: author, tasks: 0, points: 0, times: { baixa: { t: 0, c: 0 }, media: { t: 0, c: 0 }, alta: { t: 0, c: 0 } } };
                    }
                    
                    stats[author].tasks += 1;
                    const weight = task.peso || 'media';
                    
                    // XP Base
                    let earnedPoints = 10;
                    if (weight === 'baixa') earnedPoints = 10;
                    else if (weight === 'media') earnedPoints = 20;
                    else if (weight === 'alta') earnedPoints = 30;

                    // XP Pontualidade
                    if (task.data) {
                        if (task.data >= localTodayStr) earnedPoints += 5;
                        else earnedPoints = Math.max(5, earnedPoints - 10);
                    }

                    // Bónus de Agilidade Inteligente
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

        // Converte os milissegundos em minutos para o visual
        return Object.values(stats).map(r => {
            const avgBaixa = r.times.baixa.c > 0 ? Math.round(r.times.baixa.t / r.times.baixa.c / 60000) : 0;
            const avgMedia = r.times.media.c > 0 ? Math.round(r.times.media.t / r.times.media.c / 60000) : 0;
            const avgAlta = r.times.alta.c > 0 ? Math.round(r.times.alta.t / r.times.alta.c / 60000) : 0;
            
            return { ...r, avgBaixa, avgMedia, avgAlta };
        }).sort((a, b) => b.points - a.points);
    }, [stores, localToday]);
    
    const groupedInbox = useMemo(() => {
        if (!myName) return [];
        const groups = {};
        const now = new Date();
        const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const currentTimeStr = now.toTimeString().substring(0, 5);

        stores.forEach(store => {
            const notificationReasons = [];

            // 1. Puxa só as tarefas que o usuário precisa focar
            const pendingForMe = store.checklists?.filter(c => {
                if (c.feita) return false;
                if (c.responsavel !== myName) return false;
                if (!c.data) return true;
                if (c.data < todayStr) return true;
                if (c.data === todayStr) return !c.hora || c.hora <= currentTimeStr;
                return false;
            }) || [];

            // 2. Calcula a maior prioridade dentro do bolo
            let highestPriority = 'baixa';
            pendingForMe.forEach(t => {
                if (t.peso === 'alta') highestPriority = 'alta';
                else if (t.peso === 'media' && highestPriority !== 'alta') highestPriority = 'media';
            });

            if (pendingForMe.length > 0) notificationReasons.push(`${pendingForMe.length} tarefa(s) pendente(s)`);

            if (notificationReasons.length > 0) {
                if (!groups[store.client]) groups[store.client] = { clientName: store.client, stores: [], lastAccess: store.dataUltimoAcesso || 0 };
                // SALVA A PRIORIDADE AQUI ->
                groups[store.client].stores.push({ ...store, highlightMessages: notificationReasons, priority: highestPriority });
                const currentStoreAccess = new Date(store.dataUltimoAcesso || 0);
                const groupOldestAccess = new Date(groups[store.client].lastAccess);
                if (currentStoreAccess < groupOldestAccess) groups[store.client].lastAccess = store.dataUltimoAcesso;
            }
        });
        return Object.values(groups).sort((a, b) => new Date(a.lastAccess || 0) - new Date(b.lastAccess || 0));
    }, [stores, myName]);

    const isVisitante = currentUserData?.role === 'Visitante';

    // RADAR DE ATRASOS
    const groupedOverdue = useMemo(() => {
        const groups = {};
        const now = new Date();
        const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        stores.forEach(store => {
            let storeTasks = store.checklists || [];
            if (isVisitante) storeTasks = storeTasks.filter(t => t.responsavel === myName);

            const overdueTasks = storeTasks.filter(c => !c.feita && c.data && c.data < todayStr);
            
            // Calcula a maior prioridade dos atrasos
            let highestPriority = 'baixa';
            overdueTasks.forEach(t => {
                if (t.peso === 'alta') highestPriority = 'alta';
                else if (t.peso === 'media' && highestPriority !== 'alta') highestPriority = 'media';
            });

            const isStoreOverdue = !isVisitante && store.dataProximoAcesso && store.dataProximoAcesso.split('T')[0] < todayStr;
            const reasons = [];
            if (overdueTasks.length > 0) reasons.push(`${overdueTasks.length} tarefa(s) atrasada(s)`);
            else if (isStoreOverdue) reasons.push(`Acesso atrasado`);

            if (reasons.length > 0) {
                if (!groups[store.client]) groups[store.client] = { clientName: store.client, stores: [] };
                // SALVA A PRIORIDADE AQUI ->
                groups[store.client].stores.push({ ...store, highlightMessages: reasons, priority: highestPriority });
            }
        });
        return Object.values(groups).sort((a, b) => a.clientName.localeCompare(b.clientName));
    }, [stores, currentUserData]);
    
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
            
            <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* CONTAINER DOS RADARES (Lado a lado em telas grandes) */}
                <div className="flex flex-col xl:flex-row gap-6 w-full">
                    
                    {/* NOVO NOME: FOCO IMEDIATO */}
                    {groupedInbox && groupedInbox.length > 0 && (
                        <div className="flex-1 bg-indigo-500/10 border border-indigo-500/30 p-5 rounded-xl shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 mb-4">
                                <Bell size={16} className="animate-pulse" /> Foco Imediato ({groupedInbox.length} Clientes)
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {groupedInbox.map(group => (
                                    <div key={group.clientName} className="bg-gray-900/60 border border-indigo-500/20 rounded-xl p-4">
                                        <h4 className="font-bold text-white text-sm mb-3 truncate">{group.clientName}</h4>
                                        <div className="space-y-2.5">
                                            {group.stores.map(store => (
                                                <div key={store.id} onClick={() => openTaskModal && openTaskModal(store)} className="relative bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/30 cursor-pointer hover:bg-indigo-500/30 hover:border-indigo-400 transition-colors group/radar">
                                                    
                                                    {/* NOVA BOLINHA DE PRIORIDADE */}
                                                    <div className="absolute top-2.5 right-2.5 flex gap-1">
                                                        {store.priority === 'alta' && <span className="block w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" title="Prioridade Alta"></span>}
                                                        {store.priority === 'media' && <span className="block w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" title="Prioridade Média"></span>}
                                                        {store.priority === 'baixa' && <span className="block w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]" title="Prioridade Baixa"></span>}
                                                    </div>

                                                    <p className="text-xs font-bold text-indigo-200 truncate pr-4 group-hover/radar:text-white transition-colors">{store.store}</p>
                                                    {store.highlightMessages?.map((msg, i) => (
                                                        <span key={i} className="text-[11px] text-indigo-400 block mt-1 group-hover/radar:text-indigo-300">{msg}</span>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* NOVO NOME: ALERTAS DE ATRASO */}
                    {groupedOverdue && groupedOverdue.length > 0 && (
                        <div className="flex-1 bg-red-500/10 border border-red-500/30 p-5 rounded-xl shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                                <AlertCircle size={16} className="animate-pulse" /> Alertas de Atraso ({groupedOverdue.length} Clientes)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {groupedOverdue.map(group => (
                                    <div key={group.clientName} className="bg-gray-900/60 border border-red-500/20 rounded-xl p-4">
                                        <h4 className="font-bold text-white text-sm mb-3 truncate">{group.clientName}</h4>
                                        <div className="space-y-2.5">
                                            {group.stores.map(store => (
                                                <div key={store.id} onClick={() => openTaskModal && openTaskModal(store)} className="relative bg-red-500/10 p-3 rounded-lg border border-red-500/30 cursor-pointer hover:bg-red-500/30 hover:border-red-400 transition-colors group/radar">
    
                                                    <div className="absolute top-2.5 right-2.5 flex gap-1">
                                                        {store.priority === 'alta' && <span className="block w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" title="Prioridade Alta"></span>}
                                                        {store.priority === 'media' && <span className="block w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" title="Prioridade Média"></span>}
                                                        {store.priority === 'baixa' && <span className="block w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]" title="Prioridade Baixa"></span>}
                                                    </div>

                                                    <p className="text-xs font-bold text-red-200 truncate pr-4 group-hover/radar:text-white transition-colors">{store.store}</p>
                                                    {store.highlightMessages?.map((msg, i) => (
                                                        <span key={i} className="text-[11px] text-red-400 block mt-1 group-hover/radar:text-red-300">{msg}</span>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* TIMELINE */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col flex-1 min-h-[50vh]">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                        <h3 className="text-lg font-bold tracking-wide text-gray-300 uppercase flex items-center gap-2">
                            <SquareStack size={28}/>
                            Timeline <span className="text-xs bg-gray-700 text-gray-300 px-2.5 py-0.5 rounded-full">{visibleLogs.length}</span>
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                                <button onClick={() => setFeedFilter('all')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${feedFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Tudo</button>
                                <button onClick={() => setFeedFilter('tasks')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${feedFilter === 'tasks' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Tarefas</button>
                            </div>
                            {visibleLogs.length > 0 && (
                                <button onClick={() => { setFeedClearedAt(Date.now()); localStorage.setItem('avante_feed_cleared_at', Date.now()); toast.success("Mural limpo!"); }} className="text-xs bg-red-500 hover:bg-red-400 text-white font-bold px-4 py-2 border border-white rounded-lg transition-colors">Limpar</button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-3 space-y-4 custom-scrollbar border-l-2 border-gray-700/50 ml-2 pl-5">
                        {visibleLogs.map(log => {
                            const isTask = log.texto?.includes('✅ Tarefa concluída');
                            return (
                                <div key={log.id} onClick={() => handleOpenStore(log.storeName)} className="relative group cursor-pointer">
                                    <div className={`absolute -left-[27px] top-2 w-3 h-3 rounded-full border-[3px] border-gray-800 ${isTask ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                                    <div className={`p-4 rounded-xl border flex flex-col gap-1.5 transition-colors hover:brightness-125 ${isTask ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-gray-900/50 border-gray-700'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="text-xs font-black text-indigo-400 uppercase">{log.clientName} <span className="text-gray-500 mx-1.5">•</span> {log.storeName}</div>
                                            <span className="text-[11px] text-gray-500 font-medium">{log.data}</span>
                                        </div>
                                        <p className={`text-base leading-relaxed ${isTask ? 'text-emerald-100 font-medium' : 'text-gray-300'}`}>{log.texto}</p>
                                        <p className="text-xs text-gray-500 mt-1">Por: <span className="text-gray-400 font-bold">{log.author}</span></p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* COLUNA DIREITA (Secundária: Equipe + Ranking) */}
            <div className="lg:col-span-1 flex flex-col gap-6">

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
                                        
                                        {/* AVATAR DO COLABORADOR ONLINE */}
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

                {/* RANKING DE EXECUÇÃO - ALTURA CORRIGIDA PARA H-FIT */}
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
                                            {/* Posição em pílula pequena */}
                                            <span className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shadow-inner shrink-0 ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white border border-yellow-300' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                                                {i + 1}
                                            </span>
                                            
                                            {/* FOTO DO USUÁRIO NO RANKING */}
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
                                    
                                    {/* Bloco de tempos médios continua igual abaixo */}
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

                    {/* RODAPÉ DE REGRAS DE XP EM PT-BR */}
                    <div className="mt-4 pt-4 border-t border-gray-700/50 text-[10px] text-gray-400 text-center leading-relaxed">
                        <strong>XP Base:</strong> Baixa (+10) • Média (+20) • Alta (+30) | <strong>Criação:</strong> (+2 XP)<br/>
                        <strong>Prazos:</strong> No prazo (+5) • Atrasada (-10)<br/>
                        <strong>Agilidade:</strong> Rápida (+5) • Na média (0) • Lenta (-5) comparado ao histórico geral.
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Bell, Clock, CheckCircle } from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

export default function TeamFeedView({ currentUserData, user, stores, openTaskModal }) {
    const myName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Membro';
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

        stores.forEach(store => {
            (store.checklists || []).forEach(task => {
                if (task.feita && task.completedAt === localTodayStr) {
                    const author = task.completedBy || 'Sistema';
                    if (!stats[author]) stats[author] = { name: author, tasks: 0, points: 0, totalTimeMs: 0, trackedTasks: 0 };
                    
                    stats[author].tasks += 1;
                    
                    let earnedPoints = 10;
                    if (task.peso === 'baixa') earnedPoints = 10;
                    else if (task.peso === 'media') earnedPoints = 20;
                    else if (task.peso === 'alta') earnedPoints = 30;

                    if (task.data) {
                        if (task.data >= localTodayStr) earnedPoints += 5;
                        else earnedPoints = Math.max(5, earnedPoints - 10);
                    }
                    stats[author].points += earnedPoints;

                    let taskDuration = 0;
                    if (task.accumulatedTimeMs) {
                        taskDuration = task.accumulatedTimeMs;
                    } else if (task.startedAt && task.completedAtFull) {
                        taskDuration = new Date(task.completedAtFull) - new Date(task.startedAt);
                    }

                    if (taskDuration > 0 && taskDuration < 86400000) {
                        stats[author].totalTimeMs += taskDuration;
                        stats[author].trackedTasks += 1;
                    }
                }
            });
        });

        return Object.values(stats).map(r => {
            const avgMinutes = r.trackedTasks > 0 ? Math.round((r.totalTimeMs / r.trackedTasks) / 60000) : 0;
            return { ...r, avgMinutes };
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

            const delegatedTasksCount = store.checklists?.filter(c => {
                if (c.feita) return false;
                const isAssignedToMe = c.responsavel === myName;
                if (!isAssignedToMe) return false;
                if (!c.data) return true;
                if (c.data < todayStr) return true;
                if (c.data === todayStr) return !c.hora || c.hora <= currentTimeStr;
                return false;
            }).length || 0;

            if (delegatedTasksCount > 0) notificationReasons.push(`${delegatedTasksCount} tarefa(s) pendente(s)`);

            if (notificationReasons.length > 0) {
                if (!groups[store.client]) groups[store.client] = { clientName: store.client, stores: [], lastAccess: store.dataUltimoAcesso || 0 };
                groups[store.client].stores.push({ ...store, highlightMessages: notificationReasons });
                const currentStoreAccess = new Date(store.dataUltimoAcesso || 0);
                const groupOldestAccess = new Date(groups[store.client].lastAccess);
                if (currentStoreAccess < groupOldestAccess) groups[store.client].lastAccess = store.dataUltimoAcesso;
            }
        });
        return Object.values(groups).sort((a, b) => new Date(a.lastAccess || 0) - new Date(b.lastAccess || 0));
    }, [stores, myName]);
    
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
            
            {/* COLUNA ESQUERDA (Principal: Radar de Atenção + Timeline) */}
            <div className="lg:col-span-2 flex flex-col gap-6">

                {/* RADAR DE ATENÇÃO (LARGURA TOTAL DA COLUNA) */}
                <div className="bg-indigo-500/10 border border-indigo-500/30 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                    <h3 className="text-lg font-bold tracking-wide text-indigo-300 uppercase flex items-center gap-2 mb-4">
                        <Bell size={18} className="animate-pulse" /> Radar de Atenção ({groupedInbox.length} Clientes)
                    </h3>
                    
                    {groupedInbox && groupedInbox.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {groupedInbox.map(group => (
                                <div key={group.clientName} className="bg-gray-900/60 border border-indigo-500/20 rounded-xl p-4">
                                    <h4 className="font-bold text-white text-sm mb-3 truncate">{group.clientName}</h4>
                                    <div className="space-y-2.5">
                                        {group.stores.map(store => (
                                            <div key={store.id} onClick={() => openTaskModal && openTaskModal(store)} className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/30 cursor-pointer hover:bg-indigo-500/30 hover:border-indigo-400 transition-colors group/radar">
                                                <p className="text-xs font-bold text-indigo-200 truncate group-hover/radar:text-white transition-colors">{store.store}</p>
                                                {store.highlightMessages?.map((msg, i) => (
                                                    <span key={i} className="text-[11px] text-indigo-400 block mt-1 group-hover/radar:text-indigo-300">{msg}</span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-indigo-500/30 rounded-xl bg-indigo-900/10 h-32">
                            <CheckCircle size={28} className="text-indigo-400/50 mb-2" />
                            <p className="text-sm text-indigo-300/80 font-medium italic">Caixa de entrada limpa! Nenhum alerta pendente.</p>
                        </div>
                    )}
                </div>

                {/* TIMELINE */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col flex-1 min-h-[50vh]">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                        <h3 className="text-lg font-bold tracking-wide text-gray-300 uppercase flex items-center gap-2">
                            Timeline <span className="text-xs bg-gray-700 text-gray-300 px-2.5 py-0.5 rounded-full">{visibleLogs.length}</span>
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                                <button onClick={() => setFeedFilter('all')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${feedFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Tudo</button>
                                <button onClick={() => setFeedFilter('tasks')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${feedFilter === 'tasks' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Tarefas</button>
                            </div>
                            {visibleLogs.length > 0 && (
                                <button onClick={() => { setFeedClearedAt(Date.now()); localStorage.setItem('avante_feed_cleared_at', Date.now()); toast.success("Mural limpo!"); }} className="text-xs bg-gray-900 hover:bg-gray-700 text-gray-400 font-bold px-4 py-2 border border-gray-700 rounded-lg transition-colors">Limpar</button>
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
                        <Activity size={18} /> Radar da Equipe (Agora)
                    </h3>
                    
                    {Object.keys(liveStatus).length > 0 ? (
                        <div className="grid grid-cols-1 gap-3.5">
                            {Object.entries(liveStatus).map(([userName, data]) => {
                                const isPaused = data.texto?.includes('⏸️');
                                return (
                                    <div key={userName} 
                                        onClick={() => {
                                            if (data.storeId) {
                                                const targetStore = stores.find(s => s.id === data.storeId);
                                                if (targetStore && openTaskModal) openTaskModal(targetStore);
                                            } else {
                                                const parts = data.texto?.split(' | ');
                                                if (parts && parts.length > 1) handleOpenStore(parts[1]);
                                            }
                                        }}
                                        className={`bg-gray-900/80 p-4 rounded-xl border flex items-start gap-4 relative overflow-hidden cursor-pointer transition-colors ${
                                            isPaused ? 'border-amber-500/30 hover:border-amber-500' : 'border-gray-700 hover:border-emerald-500'
                                        }`}>
                                        <div className={`absolute top-0 left-0 h-full w-1.5 transition-all ${
                                            isPaused ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                                        }`}></div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white flex items-center justify-between mb-1">
                                                <span className="uppercase tracking-wider">{userName}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all ${
                                                    isPaused ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-500/70 bg-emerald-500/10'
                                                }`}>{data.timestamp}</span>
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

                {/* RANKING DE EXECUÇÃO */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col flex-1 min-h-[40vh]">
                    <div className="mb-4 border-b border-gray-700 pb-4">
                        <h3 className="text-lg font-bold tracking-wide text-amber-400 uppercase flex items-center gap-2">🏆 Execução Diária</h3>
                    </div>
                    
                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {rankingDiario.map((rank, i) => (
                            <div key={rank.name} className="bg-gray-900 p-3.5 rounded-xl border border-gray-700 flex flex-col gap-2 hover:border-gray-500 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shadow-inner ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white border border-yellow-300' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                                            {i + 1}
                                        </span>
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
                                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1.5"><Clock size={12}/> Tempo Méd/Tarefa</span>
                                    <span className={`text-xs font-bold ${rank.avgMinutes > 0 && rank.avgMinutes < 15 ? 'text-emerald-400' : rank.avgMinutes >= 30 ? 'text-amber-400' : 'text-gray-300'}`}>
                                        {rank.avgMinutes > 0 ? `${rank.avgMinutes}m` : '--'}
                                    </span>
                                </div>
                            </div> 
                        ))}
                        {rankingDiario.length === 0 && <div className="text-center p-6 text-gray-500 italic text-sm border border-dashed border-gray-700 rounded-xl mt-4">Nenhuma entrega registrada hoje.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

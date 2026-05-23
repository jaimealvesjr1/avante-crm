import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Bell, Clock } from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

export default function TeamFeedView({ currentUserData, user, stores, openTaskModal }) {
    const myName = currentUserData?.nomeCompleto || currentUserData?.nome || user?.email?.split('@')[0] || 'Membro';
    const [feedClearedAt, setFeedClearedAt] = useState(() => Number(localStorage.getItem('avante_feed_cleared_at')) || 0);
    const [liveStatus, setLiveStatus] = useState({});
    const [feedFilter, setFeedFilter] = useState('all');
    const [internalTasks, setInternalTasks] = useState([]);
    
    
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
    const [year, month, day] = localToday.split('-');
    const todayDateStr = `${day}/${month}/${year}`;
    
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
            if (task.data) {
            if (task.data >= localTodayStr) earnedPoints = 15;
            else earnedPoints = 5;
            }
            stats[author].points += earnedPoints;

            // Calcula o tempo de execução (se a pessoa clicou em iniciar antes de concluir)
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

    // Finaliza convertendo os milissegundos para média em minutos
    return Object.values(stats).map(r => {
        const avgMinutes = r.trackedTasks > 0 ? Math.round((r.totalTimeMs / r.trackedTasks) / 60000) : 0;
        return { ...r, avgMinutes };
    }).sort((a, b) => b.points - a.points);
    }, [stores, localToday]);
    
    // INBOX: Notificações Inteligentes
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
    
    // Aplicação dos Filtros de Ruído
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
        
        <div className="lg:col-span-2 space-y-6">

        {/* BLOCO DE FOCO */}
        <div className="bg-gray-800/80 p-5 rounded-xl border border-gray-700 shadow-lg">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Activity size={16} /> Radar da Equipe (Agora)
            </h3>
            
            {Object.keys(liveStatus).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(liveStatus).map(([userName, data]) => {

                        const isPaused = data.texto?.includes('⏸️');

                        return (
                        <div key={userName} 
                            onClick={() => {
                                const parts = data.texto.split(' | ');
                                if (parts.length > 1) handleOpenStore(parts[1]);
                            }}
                            className={`bg-gray-900/80 p-3.5 rounded-lg border flex items-start gap-3 relative overflow-hidden cursor-pointer transition-colors ${
                                isPaused ? 'border-amber-500/30 hover:border-amber-500' : 'border-gray-700 hover:border-emerald-500'
                            }`}>
                            {/* Linha indicadora lateral dinâmica */}
                            <div className={`absolute top-0 left-0 h-full w-1 transition-all ${
                                isPaused ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                            }`}></div>
                            <div className="flex-1">
                            <p className="text-[11px] font-bold text-white flex items-center justify-between">
                                <span className="uppercase tracking-wider">{userName}</span>
                                {/* Badge de Horário Dinâmico */}
                                <span className={`text-[9px] px-1.5 rounded font-bold transition-all ${
                                    isPaused ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-500/70 bg-emerald-500/10'
                                }`}>{data.timestamp}</span>
                            </p>
                            <p className="text-xs text-gray-300 mt-1.5 font-medium leading-relaxed">{data.texto}</p>
                            </div>
                        </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-gray-700 rounded-xl bg-gray-900/30">
                    <Activity size={24} className="text-gray-600 mb-2" />
                    <p className="text-xs text-gray-500 italic">Equipe livre. Nenhuma tarefa em execução no momento.</p>
                </div>
            )}
        </div>

        {/* RADAR DE ATENÇÃO */}
        {groupedInbox && groupedInbox.length > 0 && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 p-5 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Bell size={16} className="animate-pulse" /> Radar de Atenção ({groupedInbox.length} Clientes)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {groupedInbox.map(group => (
                <div key={group.clientName} className="bg-gray-900/60 border border-indigo-500/20 rounded-lg p-3">
                    <h4 className="font-bold text-white text-xs mb-2 truncate">{group.clientName}</h4>
                    <div className="space-y-2">
                    {group.stores.map(store => (
                        <div 
                        key={store.id} 
                        onClick={() => openTaskModal && openTaskModal(store)}
                        className="bg-indigo-500/10 p-2 rounded border border-indigo-500/30 cursor-pointer hover:bg-indigo-500/30 hover:border-indigo-400 transition-colors group/radar"
                        >
                        <p className="text-[10px] font-bold text-indigo-200 truncate group-hover/radar:text-white transition-colors">{store.store}</p>
                        {store.highlightMessages?.map((msg, i) => (
                            <span key={i} className="text-[9px] text-indigo-400 block mt-0.5 group-hover/radar:text-indigo-300">{msg}</span>
                        ))}
                        </div>
                    ))}
                    </div>
                </div>
                ))}
            </div>
            </div>
        )}

        {/* MURAL COM FILTROS */}
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg flex flex-col h-[50vh]">
            <div className="flex justify-between items-center mb-5 border-b border-gray-700 pb-4">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                Timeline <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{visibleLogs.length}</span>
            </h3>
            <div className="flex items-center gap-2">
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                <button onClick={() => setFeedFilter('all')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors ${feedFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Tudo</button>
                <button onClick={() => setFeedFilter('tasks')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors ${feedFilter === 'tasks' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Tarefas</button>
                </div>
                {visibleLogs.length > 0 && (
                <button onClick={() => { setFeedClearedAt(Date.now()); localStorage.setItem('avante_feed_cleared_at', Date.now()); toast.success("Mural limpo!"); }} className="text-[10px] bg-gray-900 hover:bg-gray-700 text-gray-400 font-bold px-3 py-2 border border-gray-700 rounded-lg">Limpar</button>
                )}
            </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar border-l-2 border-gray-700/50 ml-2 pl-4">
            {visibleLogs.map(log => {
                const isTask = log.texto?.includes('✅ Tarefa concluída');
                return (
                <div key={log.id}
                onClick={() => handleOpenStore(log.storeName)}
                className="relative group cursor-pointer">
                    <div className={`absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-gray-800 ${isTask ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                    <div className={`p-3.5 rounded-xl border flex flex-col gap-1 transition-colors hover:brightness-125 ${isTask ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-gray-900/50 border-gray-700'}`}>
                    <div className="flex justify-between items-start">
                        <div className="text-[10px] font-black text-indigo-400 uppercase">{log.clientName} <span className="text-gray-500 mx-1">•</span> {log.storeName}</div>
                        <span className="text-[9px] text-gray-500">{log.data}</span>
                    </div>
                    <p className={`text-sm ${isTask ? 'text-emerald-100 font-medium' : 'text-gray-300'}`}>{log.texto}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Por: <span className="text-gray-400 font-bold">{log.author}</span></p>
                    </div>
                </div>
                );
            })}
            </div>
        </div>
        </div>

        {/* COLUNA 3: RANKING DE EXECUÇÃO */}
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg flex flex-col">
        <div className="mb-4 border-b border-gray-700 pb-4">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">🏆 Execução Diária</h3>
            <p className="text-[10px] text-gray-400 mt-1">Pontuação e tempo médio por tarefa.</p>
        </div>
        
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {rankingDiario.map((rank, i) => (
            <div key={rank.name} className="bg-gray-900 p-3.5 rounded-xl border border-gray-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shadow-inner ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white border border-yellow-300' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                    {i + 1}
                    </span>
                    <div>
                    <p className="text-sm font-bold text-gray-200">{rank.name}</p>
                    <p className="text-[10px] text-amber-500 font-bold">{rank.points} XP</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg font-bold border border-emerald-500/20 block mb-1">
                    {rank.tasks} Entregas
                    </span>
                </div>
                </div>
                
                {/* DISPLAY DO TEMPO MÉDIO (NOVO) */}
                <div className="bg-black/40 rounded px-3 py-1.5 flex justify-between items-center">
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1"><Clock size={10}/> Tempo Médio/Tarefa</span>
                <span className={`text-[11px] font-bold ${rank.avgMinutes > 0 && rank.avgMinutes < 15 ? 'text-emerald-400' : rank.avgMinutes >= 30 ? 'text-amber-400' : 'text-gray-300'}`}>
                    {rank.avgMinutes > 0 ? `${rank.avgMinutes} min` : '--'}
                </span>
                </div>
            </div>
            ))}
            {rankingDiario.length === 0 && <div className="text-center p-8 text-gray-500 italic text-xs border border-dashed border-gray-700 rounded-xl">Nenhuma entrega registrada.</div>}
        </div>
        </div>

    </div>
    );
}

import React, { useState, useMemo } from 'react';
import { X, Play, Pause, CheckCircle, ListMinus, Zap, Clock, AlertTriangle, Coffee } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { processTaskCompletion, processTaskStart, processTaskPause, calculateNextAccess } from '../utils/taskEngine';
import { useAppStore } from '../store/useAppStore';

export default function DailyDiaryDrawer({ 
    isOpen, onClose, stores, setStores, updateStoreInCloud, currentUserData, broadcastTaskFocus 
}) {
    const myName = currentUserData?.nomeCompleto || currentUserData?.nome;
    const { isDayStarted, toggleDayStarted } = useAppStore();

    // 1. Coletar todas as tarefas do usuário que estão no pipeline do Diário
    const diaryTasks = useMemo(() => {
        let tasks = [];
        stores.forEach(store => {
            if (store.arquivada || !store.checklists) return;
            
            store.checklists.forEach(task => {
                // Pega tarefas não feitas, que eu sou o responsável, e que estão programadas, rodando ou pausadas
                if (!task.feita && task.responsavel === myName && ['scheduled', 'playing', 'paused'].includes(task.executingStatus)) {
                    tasks.push({ ...task, storeId: store.id, storeName: store.store, clientName: store.client });
                }
            });
        });

        // Ordena: Em execução (playing) primeiro, Pausadas, e Programadas por último
        return tasks.sort((a, b) => {
            const weight = { 'playing': 1, 'paused': 2, 'scheduled': 3 };
            return (weight[a.executingStatus] || 4) - (weight[b.executingStatus] || 4);
        });
    }, [stores, myName]);

    // 2. Funções de Ação Rápida no Diário
    const saveStoreChanges = (store, updatedChecklists, newLog) => {
        const nextAccess = calculateNextAccess(updatedChecklists);
        const finalStore = { 
            ...store, 
            checklists: updatedChecklists, 
            taskLogs: newLog ? [...(store.taskLogs || []), newLog] : store.taskLogs,
            dataProximoAcesso: nextAccess || store.dataProximoAcesso || '',
            dataUltimoAcesso: new Date().toISOString()
        };
        updateStoreInCloud(finalStore);
        setStores(stores.map(s => s.id === store.id ? finalStore : s));
    };

    const handleStart = (taskInfo) => {
        const store = stores.find(s => s.id === taskInfo.storeId);
        const { updatedChecklists, newLog } = processTaskStart(store, taskInfo, myName);
        saveStoreChanges(store, updatedChecklists, newLog);
        if (broadcastTaskFocus) broadcastTaskFocus(`▶️ Executando: ${taskInfo.texto} | ${store.store}`, 'set', store.id, taskInfo.id);
    };

    const handlePause = (taskInfo) => {
        const store = stores.find(s => s.id === taskInfo.storeId);
        const { updatedChecklists, newLog } = processTaskPause(store, taskInfo, myName);
        saveStoreChanges(store, updatedChecklists, newLog);
        if (broadcastTaskFocus) broadcastTaskFocus(`⏸️ Pausada: ${taskInfo.texto} | ${store.store}`, 'set', store.id, taskInfo.id);
        toast.success("Tarefa pausada.");
    };

    const handleComplete = (taskInfo) => {
        const store = stores.find(s => s.id === taskInfo.storeId);
        const { updatedChecklists, newLog } = processTaskCompletion(store, taskInfo, myName);
        saveStoreChanges(store, updatedChecklists, newLog);
        if (broadcastTaskFocus) broadcastTaskFocus('', 'clear');
        toast.success("✅ Tarefa finalizada e XP computado!");
    };

    const handleReturnToBacklog = (taskInfo) => {
        const store = stores.find(s => s.id === taskInfo.storeId);
        // Retorna a tarefa para 'none' (Backlog)
        const updatedChecklists = store.checklists.map(c => 
            c.id === taskInfo.id ? { ...c, executingStatus: 'none', startedAt: null } : c
        );
        const newLog = { 
            id: Date.now(), data: new Date().toLocaleString('pt-BR'), 
            texto: `↩️ Devolveu ao Backlog: "${taskInfo.texto}"`, author: myName 
        };
        saveStoreChanges(store, updatedChecklists, newLog);
        if (taskInfo.executingStatus === 'playing' && broadcastTaskFocus) broadcastTaskFocus('', 'clear');
        toast.success("Tarefa devolvida ao backlog da loja.");
    };

    // 3. Regra de Encerrar Expediente
    const handleToggleDay = () => {
        if (isDayStarted && diaryTasks.length > 0) {
            toast.error("Você não pode encerrar o dia com tarefas no Roteiro. Conclua ou devolva ao backlog!");
            return;
        }
        
        toggleDayStarted();
        if (!isDayStarted) toast.success("🚀 Bom trabalho! Expediente iniciado.");
        else toast.success("👋 Expediente encerrado. Bom descanso!");
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[400]" onClick={onClose}></div>
            <div className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-[#0B0F19] border-l border-white/10 shadow-2xl z-[500] flex flex-col animate-in slide-in-from-right duration-300">
                
                {/* Header */}
                <div className="p-5 border-b border-white/10 bg-gray-900/50 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            {isDayStarted ? <Zap className="text-emerald-400 animate-pulse" size={20}/> : <Clock className="text-gray-400" size={20}/>}
                            Meu Diário
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Seu roteiro de tarefas do dia</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Área de Controle do Diário */}
                <div className="p-5 border-b border-white/5 shrink-0 bg-black/20">
                    {(() => {
                        // Verifica se existe alguma tarefa pendente que impeça o encerramento 
                        // (tarefas que estão em execução 'playing' ou programadas 'scheduled')
                        const hasActiveOrScheduledTasks = diaryTasks.some(t => t.executingStatus === 'playing' || t.executingStatus === 'scheduled');

                        return (
                            <>
                                <button 
                                    onClick={handleToggleDay}
                                    disabled={isDayStarted && hasActiveOrScheduledTasks}
                                    className={`w-full py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                                        isDayStarted 
                                            ? (hasActiveOrScheduledTasks 
                                                ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed opacity-60' 
                                                : 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40')
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50'
                                    }`}
                                >
                                    {isDayStarted ? (
                                        <>Encerrar Diário</>
                                    ) : (
                                        <>🚀 Iniciar Diário</>
                                    )}
                                </button>
                                {isDayStarted && hasActiveOrScheduledTasks && (
                                    <p className="text-[10px] text-amber-500/80 mt-2 text-center flex items-center justify-center gap-1">
                                        <AlertTriangle size={12}/> Conclua ou pause as tarefas ativas para encerrar o diário.
                                    </p>
                                )}
                            </>
                        );
                    })()}
                </div>

                {/* Lista de Tarefas do Diário */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/10">
                    {!isDayStarted ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                            <Coffee size={40} className="mb-3 opacity-30" />
                            <p className="text-sm font-bold text-gray-400 mb-1">Você está de folga.</p>
                            <p className="text-xs">Inicie o expediente para gerenciar seu roteiro.</p>
                        </div>
                    ) : diaryTasks.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                            <CheckCircle size={40} className="mb-3 opacity-30" />
                            <p className="text-sm font-bold text-emerald-500/80 mb-1">Roteiro Limpo!</p>
                            <p className="text-xs">Puxe tarefas do backlog das lojas para começar.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {diaryTasks.map(task => (
                                <div key={`${task.storeId}-${task.id}`} className="bg-gray-800/60 border border-white/5 p-3 rounded-xl shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                                    {task.executingStatus === 'playing' && <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>}
                                    
                                    <div className="flex flex-col ml-1">
                                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{task.clientName} - {task.storeName}</span>
                                        <span className="text-sm font-medium text-gray-200 mt-0.5 leading-snug">{task.texto}</span>
                                    </div>

                                    <div className="flex gap-2 mt-2 pt-2 border-t border-white/5 ml-1">
                                        <button onClick={() => handleReturnToBacklog(task)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors" title="Devolver ao Backlog da Loja">
                                            <ListMinus size={14}/>
                                        </button>
                                        
                                        <div className="flex-1 flex justify-end gap-1.5">
                                            {task.executingStatus === 'playing' ? (
                                                <button onClick={() => handlePause(task)} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors">
                                                    <Pause size={12}/> Pausar
                                                </button>
                                            ) : (
                                                <button onClick={() => handleStart(task)} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors">
                                                    <Play size={12}/> {task.executingStatus === 'paused' ? 'Retomar' : 'Iniciar'}
                                                </button>
                                            )}
                                            <button onClick={() => handleComplete(task)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-md transition-colors">
                                                <CheckCircle size={12}/> Concluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Flame, CalendarDays, Activity, Clock, CheckCircle, AlertCircle, 
    Search, CalendarClock, X, Briefcase, AlertTriangle, 
    ChevronDown, ChevronUp, Play, Pause, Target } from 'lucide-react';
import { doc, onSnapshot, updateDoc, deleteField } from "firebase/firestore";
import { db } from '../services/firebase';
import { toast } from 'react-hot-toast';
import { processTaskCompletion, processTaskStart, processTaskPause, calculateNextAccess } from '../utils/taskEngine';

export default function TeamFeedView({ 
  currentUserData, user, stores, teamMembers, searchTerm, openTaskModal, openBulkTaskModal, 
  updateStoreInCloud, broadcastTaskFocus, scheduledEvents, activeEvent, formatCurrency, 
  scheduledVisits, handleVisitAction, canEdit 
}) {
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
    const [visitForm, setVisitForm] = useState({ id: null, client: '', date: '', time: '' });
    
    // Gerenciamento de notificações dispensadas no localStorage para persistência
    const [dismissedNotifs, setDismissedNotifs] = useState(() => {
        const saved = localStorage.getItem('dismissedMentions');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('dismissedMentions', JSON.stringify(dismissedNotifs));
    }, [dismissedNotifs]);

    const notifications = useMemo(() => {
        const notifs = [];
        const myFirstName = myName.split(' ')[0];
        
        stores.forEach(store => {
            if (store.arquivada) return;
            (store.checklists || []).forEach(task => {
                
                // CONDIÇÃO 1: Fui selecionado no dropdown de responsável por OUTRA pessoa
                const isDelegatedToMe = (task.responsavel === myName || task.resp === myName) && task.criadoPor !== myName;
                
                // CONDIÇÃO 2: Fui mencionado manualmente no texto com @
                const isMentionedInText = task.texto && (task.texto.includes(`@${myName}`) || task.texto.includes(`@${myFirstName}`));

                const isRecurring = task.recorrencia && task.recorrencia !== 'none';

                // CONDIÇÃO 3: Eu criei a tarefa, OUTRA pessoa concluiu, e NÃO é uma rotina
                const iCreatedAndWasCompleted = task.feita && task.criadoPor === myName && (task.completedBy && task.completedBy !== myName) && !isRecurring;

                // PROCESSA PENDENTES (Fazer)
                if (!task.feita && (isDelegatedToMe || isMentionedInText)) {
                    if (!dismissedNotifs.includes(task.id)) {
                        notifs.push({
                            id: task.id,
                            storeId: store.id,
                            storeName: store.store,
                            text: task.texto,
                            time: task.data ? `${task.data.split('-').reverse().join('/')} ${task.hora || ''}` : 'Sem prazo',
                            type: 'mention',
                            sortKey: task.id
                        });
                    }
                } 
                // PROCESSA CONCLUÍDAS (Aviso de finalização)
                else if (iCreatedAndWasCompleted) {
                    const notifId = `${task.id}_completed`; // Modifica o ID para não dar conflito se já foi ocultada antes
                    if (!dismissedNotifs.includes(notifId)) {
                        notifs.push({
                            id: notifId,
                            storeId: store.id,
                            storeName: store.store,
                            text: `✅ ${task.completedBy.split(' ')[0]} concluiu: "${task.texto}"`,
                            time: task.completedAtFull ? new Date(task.completedAtFull).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : 'Concluída',
                            type: 'completed',
                            sortKey: task.id
                        });
                    }
                }
            });
        });
        
        // Ordena usando a chave de criação para os mais recentes ficarem no topo
        return notifs.sort((a, b) => b.sortKey - a.sortKey);
    }, [stores, myName, dismissedNotifs]);

    // Função para ocultar a notificação sem abrir o modal
    const handleDismissNotif = (e, notifId) => {
        e.stopPropagation();
        setDismissedNotifs(prev => [...prev, notifId]);
    };

    const [expandedUserXP, setExpandedUserXP] = useState(null);
    const [showPausedTasks, setShowPausedTasks] = useState(false);
    const [rankingPeriod, setRankingPeriod] = useState('semana');
    const [animatingTasks, setAnimatingTasks] = useState([]);
    const [pendingStartInfo, setPendingStartInfo] = useState(null);

    const minhasTarefasPausadas = useMemo(() => {
        const pausadas = [];
        stores.forEach(store => {
            if (store.checklists) {
                store.checklists.forEach(task => {
                    if (!task.feita && task.executingStatus === 'paused' && (task.responsavel === myName || task.startedBy === myName)) {
                        pausadas.push({ storeId: store.id, storeName: store.store, ...task });
                    }
                });
            }
        });
        return pausadas;
    }, [stores, myName]);

    const [showClientTaskForm, setShowClientTaskForm] = useState(false);
    const [clientTaskForm, setClientTaskForm] = useState(() => {
        const now = new Date();
        const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const localTime = now.toTimeString().substring(0, 5);
        return { client: '', texto: '', data: localDate, hora: localTime, responsavel: '' };
    });

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const allUniqueTasks = useMemo(() => {
        const taskSet = new Set();
        stores.forEach(s => {
            if (s.checklists) {
                s.checklists.forEach(t => {
                    if (t.texto && t.texto.trim().length > 3) taskSet.add(t.texto.trim());
                });
            }
        });
        return Array.from(taskSet);
    }, [stores]);

    const handleClientTaskChange = (e) => {
        const val = e.target.value;
        setClientTaskForm({...clientTaskForm, texto: val});
        if (val.trim().length >= 2) {
            const filtered = allUniqueTasks.filter(t => t.toLowerCase().includes(val.toLowerCase()) && t.toLowerCase() !== val.toLowerCase());
            setSuggestions(filtered.slice(0, 6)); 
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const submitClientTask = (e) => {
        e.preventDefault();
        if (!clientTaskForm.client || !clientTaskForm.texto) {
            toast.error("Preencha o cliente e a descrição da tarefa.");
            return;
        }

        const masterStore = stores.find(s => s.client === clientTaskForm.client && !s.arquivada);
        if (!masterStore) {
            toast.error("Nenhuma loja ativa encontrada para este cliente.");
            return;
        }

        const newTask = { 
            id: Date.now(), 
            texto: clientTaskForm.texto, 
            feita: false, 
            responsavel: clientTaskForm.responsavel.trim(), 
            criadoPor: myName, 
            dataCriacao: new Date().toLocaleDateString('pt-BR'), 
            data: clientTaskForm.data || '',
            hora: clientTaskForm.hora || '', 
            recorrencia: 'none',
            peso: 'media',
            escopo: 'cliente' // 🚨 O crachá da tarefa de cliente!
        };

        const updatedChecklists = [...(masterStore.checklists || []), newTask];
        const nextAccess = calculateNextAccess(updatedChecklists);

        updateStoreInCloud({ 
            ...masterStore, 
            checklists: updatedChecklists, 
            dataProximoAcesso: nextAccess || masterStore.dataProximoAcesso || '',
            dataUltimoAcesso: new Date().toISOString()
        });

        toast.success("Tarefa do cliente delegada com sucesso!");
        setShowClientTaskForm(false);
        const now = new Date();
        const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const localTime = now.toTimeString().substring(0, 5);
        setClientTaskForm({ client: '', texto: '', data: localDate, hora: localTime, responsavel: '' });
    };

    const uniqueClients = useMemo(() => {
        return [...new Set(stores.map(s => s.client))].filter(Boolean).sort();
    }, [stores]);

    const submitVisit = (e) => {
        e.preventDefault();
        if (!visitForm.client || !visitForm.date || !visitForm.time) {
        toast.error("Preencha o evento, data e hora.");
        return;
        }
        handleVisitAction('schedule', visitForm);
        setShowVisitForm(false);
        setVisitForm({ id: null, client: '', date: '', time: '' });
    };

    const editVisit = (visit) => {
        setVisitForm(visit);
        setShowVisitForm(true);
    };

    const handlePostponeTask = (store, task, hoursToAdd) => {
        if (!updateStoreInCloud) return;

        let taskDate = new Date();
        taskDate.setHours(taskDate.getHours() + hoursToAdd);
        
        const newDate = new Date(taskDate.getTime() - (taskDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const newTime = taskDate.toTimeString().substring(0, 5);

        const updatedChecklists = store.checklists.map(c => 
            c.id === task.id ? { ...c, data: newDate, hora: newTime } : c
        );

        const nextAccess = calculateNextAccess(updatedChecklists);

        updateStoreInCloud({ 
            ...store, 
            checklists: updatedChecklists,
            dataProximoAcesso: nextAccess || store.dataProximoAcesso || ''
        });
        toast.success(`Tarefa adiada para ${newDate.split('-').reverse().join('/')} às ${newTime}`);
    };

    const handleToggleTimer = (e, storeId, taskId) => {
        e.stopPropagation();
        if (!updateStoreInCloud) return;

        const store = stores.find(s => s.id === storeId);
        if (!store) return;
        
        const task = store.checklists?.find(t => t.id === taskId);
        if (!task) return;

        const isPlaying = task.executingStatus === 'playing';

        if (!isPlaying) {
            const runningTask = stores
                .flatMap(s => (s.checklists || []).map(t => ({ ...t, storeObject: s })))
                .find(t => t.executingStatus === 'playing' && t.startedBy === myName && !t.feita);
            
            if (runningTask) {
                // Abre o popup mágico de resolução de conflitos
                setPendingStartInfo({ currentStoreId: storeId, currentTaskId: taskId, currentTaskText: task.texto, runningTask });
                return;
            }
        }
        
        executeStartOrPause(store, task, isPlaying);
    };

    const executeStartOrPause = (store, task, isPlaying) => {
        const result = isPlaying 
            ? processTaskPause(store, task, myName)
            : processTaskStart(store, task, myName);

        updateStoreInCloud({ 
            ...store, 
            checklists: result.updatedChecklists,
            taskLogs: [...(store.taskLogs || []), result.newLog],
            dataUltimoAcesso: new Date().toISOString()
        });
        
        if (broadcastTaskFocus) {
            const statusMsg = isPlaying ? `⏸️ Pausada: ${task.texto} | ${store.store}` : `▶️ Executando: ${task.texto} | ${store.store}`;
            broadcastTaskFocus(statusMsg, 'set', store.id, task.id);
        }
        
        toast.success(isPlaying ? "Tarefa pausada." : "Tarefa iniciada!");
    };

    const resolveConflictAndStart = async (action) => {
        if (!pendingStartInfo) return;
        const { currentStoreId, currentTaskId, currentTaskText, runningTask } = pendingStartInfo;

        const oldStore = stores.find(s => s.id === runningTask.storeObject.id);
        const currentStore = stores.find(s => s.id === currentStoreId);
        
        if (!oldStore || !currentStore) {
            setPendingStartInfo(null);
            return;
        }

        const oldTask = oldStore.checklists.find(t => t.id === runningTask.id);
        
        // 1. Resolve a tarefa antiga (Pausa ou Completa)
        const resultOld = action === 'complete' 
            ? processTaskCompletion(oldStore, oldTask, myName)
            : processTaskPause(oldStore, oldTask, myName);

        const newNextAccessOld = calculateNextAccess(resultOld.updatedChecklists);
        
        // Vamos guardar a velha temporariamente na memória
        const oldStoreToSave = { 
            ...oldStore, 
            checklists: resultOld.updatedChecklists, 
            taskLogs: [...(oldStore.taskLogs || []), resultOld.newLog], 
            dataUltimoAcesso: new Date().toISOString(),
            dataProximoAcesso: newNextAccessOld || oldStore.dataProximoAcesso || ''
        };

        // 2. Resolve a matemática do Firebase para evitar bugs se for na mesma loja
        if (oldStore.id === currentStore.id) {
            // É a mesma loja! A "currentStore" agora tem que ser a "oldStoreToSave" para não apagar a edição anterior
            const currentTask = oldStoreToSave.checklists.find(t => t.id === currentTaskId);
            const resultNew = processTaskStart(oldStoreToSave, currentTask, myName);
            const newNextAccessNew = calculateNextAccess(resultNew.updatedChecklists);
            
            updateStoreInCloud({
                ...oldStoreToSave,
                checklists: resultNew.updatedChecklists,
                taskLogs: [...oldStoreToSave.taskLogs, resultNew.newLog],
                dataProximoAcesso: newNextAccessNew || oldStoreToSave.dataProximoAcesso || ''
            });
        } else {
            // São lojas diferentes, salvamos a velha e pegamos a nova fresca
            updateStoreInCloud(oldStoreToSave);
            
            const currentTask = currentStore.checklists.find(t => t.id === currentTaskId);
            const resultNew = processTaskStart(currentStore, currentTask, myName);
            const newNextAccessNew = calculateNextAccess(resultNew.updatedChecklists);
            
            updateStoreInCloud({
                ...currentStore,
                checklists: resultNew.updatedChecklists,
                taskLogs: [...(currentStore.taskLogs || []), resultNew.newLog],
                dataUltimoAcesso: new Date().toISOString(),
                dataProximoAcesso: newNextAccessNew || currentStore.dataProximoAcesso || ''
            });
        }

        if (broadcastTaskFocus) {
            broadcastTaskFocus(`▶️ Executando: ${currentTaskText} | ${currentStore.store}`, 'set', currentStore.id, currentTaskId);
        }

        setPendingStartInfo(null); // Esconde o Popup
        toast.success(action === 'complete' ? "Anterior concluída e nova iniciada!" : "Anterior pausada e nova iniciada!");
    };

    const handleCompleteFromRadar = (e, storeId, userName) => {
        e.stopPropagation();
        if (!updateStoreInCloud) return;
        
        const store = stores.find(s => s.id === storeId);
        if (!store) return;
        
        const task = store.checklists?.find(t => 
            !t.feita && 
            (t.executingStatus === 'playing' || t.executingStatus === 'paused') && 
            (t.responsavel === userName || t.startedBy === userName)
        );
        
        if (!task) {
            toast.error("Nenhuma tarefa ativa encontrada para concluir.");
            return;
        }

        setAnimatingTasks(prev => [...prev, task.id]);

        setTimeout(() => {
            try {
                const { updatedChecklists, newLog } = processTaskCompletion(store, task, myName);
                const nextAccess = calculateNextAccess(updatedChecklists);

                updateStoreInCloud({ 
                    ...store, 
                    checklists: updatedChecklists,
                    taskLogs: [...(store.taskLogs || []), newLog],
                    dataProximoAcesso: nextAccess || store.dataProximoAcesso || '',
                    dataUltimoAcesso: new Date().toISOString()
                });

                if (broadcastTaskFocus && userName === myName) {
                    broadcastTaskFocus('', 'clear', store.id);
                }
                
                toast.success("✅ Tarefa finalizada e XP computado!");
                
                // 3. Limpamos a memória da animação
                setAnimatingTasks(prev => prev.filter(id => id !== task.id));
                
            } catch (error) {
                console.error("Erro ao concluir a tarefa pelo radar:", error);
                toast.error("Ocorreu um erro ao atualizar a tarefa.");
                setAnimatingTasks(prev => prev.filter(id => id !== task.id)); // Limpa em caso de erro também
            }
        }, 600);
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

    const rankingEquipe = useMemo(() => {
        const stats = {};
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let startMs, endMs;
        if (rankingPeriod === 'hoje') {
            startMs = today.getTime();
            endMs = startMs + 86399999;
        } else if (rankingPeriod === 'semana') {
            const day = today.getDay(); 
            const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
            const monday = new Date(today.getFullYear(), today.getMonth(), diff);
            startMs = monday.getTime();
            endMs = startMs + (7 * 86400000) - 1;
        } else { 
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            startMs = firstDay.getTime();
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            endMs = lastDay.getTime();
        }

        const globalAverages = {
            baixa: { totalTime: 0, count: 0, avg: 15 * 60000 }, 
            media: { totalTime: 0, count: 0, avg: 30 * 60000 },
            alta:  { totalTime: 0, count: 0, avg: 60 * 60000 }
        };

        stores.forEach(store => {
            (store.checklists || []).forEach(task => {
                if (task.feita && task.completedAtFull && task.startedAt) {
                    let duration = task.accumulatedTimeMs || 0;
                    if (!duration) {
                        duration = new Date(task.completedAtFull).getTime() - new Date(task.startedAt).getTime();
                    }
                    
                    if (duration > 60000) { 
                        const weight = task.peso || 'media';
                        
                        const maxAllowedTimeMs = globalAverages[weight].avg * 4;
                        
                        if (duration <= maxAllowedTimeMs && globalAverages[weight]) {
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
                
                if (task.id && task.criadoPor && !task.isAutoGenerated && task.recorrencia !== 'ghost') {
                    const timestampCriacao = Math.floor(task.id);
                    if (timestampCriacao > 1600000000000 && timestampCriacao >= startMs && timestampCriacao <= endMs) { 
                        const creator = task.criadoPor;
                        if (!stats[creator]) {
                            stats[creator] = { name: creator, tasks: 0, points: 0, times: { baixa: { t: 0, c: 0 }, media: { t: 0, c: 0 }, alta: { t: 0, c: 0 } }, history: [] };
                        }
                        stats[creator].points += 2;
                        stats[creator].history.push({
                            id: `crt-${task.id}`,
                            points: 2,
                            desc: `Proatividade: Criou tarefa para ${store.store}`,
                            timestamp: timestampCriacao
                        });
                    }
                }

                // 2. PONTOS DE CONCLUSÃO (XP BASE, PRAZO E AGILIDADE)
                if (task.feita) {
                    let completedTimestamp = 0;
                    if (task.completedAtFull) {
                        completedTimestamp = new Date(task.completedAtFull).getTime();
                    } else if (task.completedAt) {
                        completedTimestamp = new Date(`${task.completedAt}T12:00:00`).getTime();
                    }

                    if (completedTimestamp > 0 && completedTimestamp >= startMs && completedTimestamp <= endMs) {
                        const author = task.completedBy || 'Sistema';
                        if (!stats[author]) {
                            stats[author] = { name: author, tasks: 0, points: 0, times: { baixa: { t: 0, c: 0 }, media: { t: 0, c: 0 }, alta: { t: 0, c: 0 } }, history: [] };
                        }
                        
                        stats[author].tasks += 1;
                        const weight = task.peso || 'media';
                        
                        let earnedPoints = 0;
                        let detailsArr = [];

                        if (weight === 'baixa') { earnedPoints += 10; detailsArr.push('Baixa (+10)'); }
                        else if (weight === 'media') { earnedPoints += 20; detailsArr.push('Média (+20)'); }
                        else if (weight === 'alta') { earnedPoints += 30; detailsArr.push('Alta (+30)'); }

                        if (task.data) {
                            const timeString = task.hora || '23:59';
                            const deadlineTimestamp = new Date(`${task.data}T${timeString}:00`).getTime();
                            
                            if (completedTimestamp <= deadlineTimestamp) { 
                                earnedPoints += 5; detailsArr.push('No Prazo (+5)'); 
                            } else { 
                                earnedPoints -= 10; detailsArr.push('Atrasada (-10)'); 
                            }
                        }

                        let taskDuration = 0;
                        if (task.accumulatedTimeMs) {
                            taskDuration = task.accumulatedTimeMs;
                        } else if (task.startedAt && task.completedAtFull) {
                            taskDuration = new Date(task.completedAtFull).getTime() - new Date(task.startedAt).getTime();
                        }

                        if (taskDuration > 60000 && taskDuration < 86400000) {
                            const expectedTimeMs = globalAverages[weight]?.avg || 1800000;
                            const tolerance = 60000; // 1 min de tolerância

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
                            details: detailsArr.join(' | '),
                            timestamp: completedTimestamp
                        });
                    }
                }
            });
        });

        return Object.values(stats).map(r => {
            const avgBaixa = r.times.baixa.c > 0 ? Math.round(r.times.baixa.t / r.times.baixa.c / 60000) : 0;
            const avgMedia = r.times.media.c > 0 ? Math.round(r.times.media.t / r.times.media.c / 60000) : 0;
            const avgAlta = r.times.alta.c > 0 ? Math.round(r.times.alta.t / r.times.alta.c / 60000) : 0;
            
            r.history.sort((a, b) => b.timestamp - a.timestamp);
            
            return { ...r, avgBaixa, avgMedia, avgAlta };
        }).sort((a, b) => b.points - a.points); 

    }, [stores, rankingPeriod]);

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
                        isBeingWorkedOn,
                        executingStatus: task.executingStatus || 'none',
                        escopo: task.escopo || 'loja'
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
            {/* GRID 10 COLUNAS: 10/70/20 em telas gigantes | 20/60/20 em XL | 25/50/25 em LG */}
            <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-10 gap-4 xl:gap-6 items-start">
                
                {/* COLUNA ESQUERDA (10% no Ultrawide)*/}
                <div className="lg:col-span-3 xl:col-span-2 min-[1920px]:col-span-1 flex flex-col gap-3 sticky top-[170px]">
                    <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                        <Activity size={14} /> Notificações
                    </h3>
                    
                    <div className="flex flex-col gap-2">
                        {notifications.length > 0 ? notifications.map(notif => (
                            <div 
                                key={notif.id} 
                                onClick={() => {
                                    handleOpenStore(notif.storeName);
                                    setDismissedNotifs(prev => [...prev, notif.id]);
                                }}
                                className="bg-white/5 border border-white/10 p-2.5 rounded-xl cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all relative group shadow-sm"
                                title={`Abrir tarefas da loja ${notif.storeName}`}
                            >
                                <div 
                                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    onClick={(e) => handleDismissNotif(e, notif.id)}
                                >
                                    <X size={12} className="text-gray-500 hover:text-red-400" />
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <div className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${notif.type === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.8)]'}`}></div>
                                    <div className="flex flex-col pr-3">
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase mb-0.5">{notif.storeName}</p>
                                        <p className="text-[12px] text-gray-300 font-medium leading-tight break-words line-clamp-3">{notif.text}</p>
                                        <span className="text-[10px] text-gray-500 mt-1 font-bold">{notif.time}</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center p-3 border border-dashed border-white/5 rounded-xl text-[12px] text-gray-500 italic">
                                Nenhuma menção pendente.
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUNA CENTRAL (70% no Ultrawide): O Radar de Tarefas */}
                <div className="lg:col-span-6 xl:col-span-6 min-[1920px]:col-span-7 flex flex-col gap-6">
                    <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700 shadow-lg relative overflow-hidden flex flex-col flex-1 min-h-[600px] lg:h-[calc(100vh-120px)]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-blue-500"></div>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-5 border-b border-gray-700 pb-4 mt-2 shrink-0">
                            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Clock size={18} className="text-indigo-400" />
                                Radar de Tarefas
                                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{deadlinesData.length}</span>
                            </h3>
                            
                            <div className="flex w-full sm:w-auto items-center gap-3">
                                {canEdit && (
                                <>
                                <button 
                                    onClick={() => setShowClientTaskForm(!showClientTaskForm)} 
                                    className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all font-bold shrink-0 border ${showClientTaskForm ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border-blue-500/30'}`}
                                >
                                    {showClientTaskForm ? '✕ Cancelar' : '+ Tarefa Cliente'}
                                </button>
                                <button 
                                    onClick={openBulkTaskModal} 
                                    className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs px-3 py-1.5 rounded-lg items-center gap-2 transition-all font-bold shrink-0 hidden sm:flex"
                                >
                                    + Tarefa em Massa
                                </button>
                                </>
                                )}         

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

                        {showClientTaskForm && canEdit && (
                            <form onSubmit={submitClientTask} className="bg-black/40 border border-blue-500/30 p-3 rounded-xl mb-5 mx-5 animate-in fade-in slide-in-from-top-2 shadow-inner">
                                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr_1fr_auto] gap-3 w-full">
                                    
                                    {/* COLUNA 1: Cliente (Cima) e Responsável (Baixo) */}
                                    <div className="flex flex-col justify-between gap-2">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Cliente:</label>
                                            <select 
                                                value={clientTaskForm.client} 
                                                onChange={e => setClientTaskForm({...clientTaskForm, client: e.target.value})}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-md p-1.5 text-xs text-white outline-none focus:border-blue-500 h-8"
                                            >
                                                <option value="">Selecione...</option>
                                                {uniqueClients.map(client => (
                                                    <option key={client} value={client}>{client}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Delegar Para:</label>
                                            <select 
                                                value={clientTaskForm.responsavel} 
                                                onChange={e => setClientTaskForm({...clientTaskForm, responsavel: e.target.value})}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-md p-1.5 text-xs text-white outline-none focus:border-blue-500 h-8"
                                            >
                                                <option value="">Sem responsável</option>
                                                {teamMembers.map(m => (
                                                    <option key={m.email} value={m.nomeCompleto || m.nome}>{m.nomeCompleto || m.nome}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* COLUNA 2: Descrição ocupando a altura total */}
                                    <div className="flex flex-col gap-1 relative h-full">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Descrição da Tarefa:</label>
                                        <textarea 
                                            value={clientTaskForm.texto} 
                                            onChange={handleClientTaskChange}
                                            onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            placeholder="O que precisa ser feito para o cliente?"
                                            className="w-full h-full min-h-[44px] bg-gray-900 border border-gray-700 rounded-md p-2 text-xs text-white outline-none focus:border-blue-500 resize-none custom-scrollbar"
                                        />
                                        {showSuggestions && suggestions.length > 0 && (
                                            <ul className="absolute top-full left-0 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden z-50 mt-1">
                                                {suggestions.map((sug, idx) => (
                                                    <li 
                                                        key={idx} 
                                                        onMouseDown={(e) => { e.preventDefault(); setClientTaskForm({...clientTaskForm, texto: sug}); setShowSuggestions(false); }} 
                                                        className="px-3 py-2 text-xs text-gray-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors border-b border-gray-700 last:border-0 truncate"
                                                    >
                                                        {sug}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* COLUNA 3: Prazo (Cima) e Hora (Baixo) */}
                                    <div className="flex flex-col justify-between gap-2">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Data limite:</label>
                                            <input 
                                                type="date" 
                                                value={clientTaskForm.data} 
                                                onChange={e => setClientTaskForm({...clientTaskForm, data: e.target.value})}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-md p-1.5 text-xs text-white outline-none focus:border-blue-500 h-8"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase leading-none">Hora Limite:</label>
                                            <input 
                                                type="time" 
                                                value={clientTaskForm.hora} 
                                                onChange={e => setClientTaskForm({...clientTaskForm, hora: e.target.value})}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-md p-1.5 text-xs text-white outline-none focus:border-blue-500 h-8"
                                            />
                                        </div>
                                    </div>

                                    {/* COLUNA 4: Botão Criar alinhado à direita/base */}
                                    <div className="flex flex-col h-full pt-[14px]">
                                        <button type="submit" className="h-full w-full lg:w-24 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-md shadow-md 
                                        transition-colors flex flex-col justify-center items-center gap-1 border border-orange-500/50">
                                            <Target size={18} className="text-orange-300"/>
                                            Criar
                                        </button>
                                    </div>

                                </div>
                            </form>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                                {deadlinesData.map(item => {
                                    const isOverdue = item.statusColor === 'red';
                                    const isWarning = item.statusColor === 'orange';
                                    const isRoutine = item.type === 'routine';
                                    const isClientTask = item.escopo === 'cliente';

                                    let cardClasses = isOverdue ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50' : 
                                                      isWarning ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50' : 
                                                      'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40';

                                    // Se for tarefa de cliente, o fundo ganha um tom Indigo (roxo/azul), a menos que esteja atrasado/em risco.
                                    if (isClientTask && !isOverdue && !isWarning) {
                                        cardClasses = 'bg-indigo-500/10 border-indigo-500/40 hover:bg-indigo-500/20 hover:border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]';
                                    }

                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => handleOpenStore(item.storeName)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-colors duration-200 flex flex-col gap-3 shadow-sm min-h-[120px] ${cardClasses}`}
                                        >
                                            {/* CABEÇALHO DO CARD: Identificação e Prazo */}
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex items-start gap-2.5 overflow-hidden">
                                                    <div className={`mt-0.5 shrink-0 ${
                                                        isOverdue ? 'text-red-400' : 
                                                        isWarning ? 'text-orange-400' : 
                                                        isClientTask ? 'text-indigo-400' :
                                                        'text-blue-400'
                                                    }`}>
                                                        {item.isBeingWorkedOn ? (
                                                            <div className="relative flex h-3.5 w-3.5 mt-0.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-gray-900"></span>
                                                            </div>
                                                        ) : (
                                                            isRoutine ? <CalendarClock size={16} /> : isClientTask ? <Target size={16} /> : <AlertCircle size={16} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        {isClientTask ? (
                                                            <h4 className="font-bold text-indigo-400 text-xs truncate leading-none mb-1">TAREFA DE CLIENTE</h4>
                                                        ) : (
                                                            <h4 className="font-bold text-white text-[13px] truncate leading-none mb-1">{item.storeName}</h4>
                                                        )}
                                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate block leading-none">{item.clientName}</span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shadow-sm whitespace-nowrap ${
                                                        isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                                        isWarning ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    }`}>
                                                        {item.timeLabel}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* CORPO: Descrição da Tarefa */}
                                            <p className={`text-xs font-medium leading-relaxed line-clamp-2 flex-1 ${isRoutine ? 'italic text-gray-400' : 'text-gray-300'}`} title={item.title}>
                                                {item.title}
                                            </p>

                                            {/* RODAPÉ FIXO: Responsável e Ações Diretas */}
                                            <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
                                                <span className="text-[10px] text-gray-500 truncate max-w-[40%] flex items-center gap-1.5" title={item.responsavel || 'Equipe'}>
                                                    <strong className="text-gray-300 truncate">{item.responsavel || 'Equipe'}</strong>
                                                </span>

                                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                    {!isRoutine && (
                                                        <>
                                                            <div className="flex items-center bg-black/40 rounded-md border border-white/5 mr-1">
                                                                <button onClick={(e) => { const s = stores.find(x => x.id === item.storeId); const t = s?.checklists?.find(x => x.id === item.originalTaskId); if (s && t) handlePostponeTask(s, t, 3); }} className="text-[10px] font-bold text-gray-400 hover:text-amber-400 hover:bg-white/10 px-2 py-1 border-r border-white/5 transition-colors">+3h</button>
                                                                <button onClick={(e) => { const s = stores.find(x => x.id === item.storeId); const t = s?.checklists?.find(x => x.id === item.originalTaskId); if (s && t) handlePostponeTask(s, t, 6); }} className="text-[10px] font-bold text-gray-400 hover:text-indigo-400 hover:bg-white/10 px-2 py-1 border-r border-white/5 transition-colors">+6h</button>
                                                                <button onClick={(e) => { const s = stores.find(x => x.id === item.storeId); const t = s?.checklists?.find(x => x.id === item.originalTaskId); if (s && t) handlePostponeTask(s, t, 24); }} className="text-[10px] font-bold text-gray-400 hover:text-red-400 hover:bg-white/10 px-2 py-1 transition-colors">+24h</button>
                                                            </div>
                                                            <button
                                                                onClick={(e) => handleToggleTimer(e, item.storeId, item.originalTaskId)}
                                                                className={`p-1.5 rounded-md transition-colors ${item.executingStatus === 'playing' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                                                            >
                                                                {item.executingStatus === 'playing' ? <Pause size={14} /> : <Play size={14} />}
                                                            </button>
                                                        </>
                                                    )}
                                                    {isAdmin && (
                                                        <button onClick={(e) => handleDeleteSpecificTask(e, item.storeId, item.originalTaskId, isRoutine)} className="text-gray-500 hover:text-red-400 p-1.5 ml-1 transition-colors">
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
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

                {/* COLUNA DIREITA (20% no Ultrawide): Agenda, Trabalhando Agora, Ranking, Pacing */}
                <div className="lg:col-span-3 xl:col-span-2 min-[1920px]:col-span-2 flex flex-col gap-5">
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
                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl w-full flex flex-col gap-3">
                        
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                <Briefcase size={16} /> Agenda
                            </h3>
                            {canScheduleVisits && (
                            <button 
                                onClick={() => setShowVisitForm(!showVisitForm)}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors border ${showVisitForm ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md border-blue-500/50'}`}
                                >
                                {showVisitForm ? '✕ Fechar' : '+ Agendar'}
                                </button>
                            )}
                        </div>

                        {showVisitForm && canScheduleVisits && (
                        <form onSubmit={submitVisit} className="bg-black/40 border border-blue-500/30 p-4 rounded-xl flex flex-col gap-3 items-end animate-in fade-in slide-in-from-top-2 mt-2">
                            <div className="flex flex-col gap-1 w-full">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Evento / Cliente</label>
                            <input 
                                type="text"
                                list="clientes-list"
                                placeholder="Digite o evento ou escolha um cliente..."
                                value={visitForm.client} 
                                onChange={e => setVisitForm({...visitForm, client: e.target.value})}
                                className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                            />
                            <datalist id="clientes-list">
                                {uniqueClients.map(client => (
                                    <option key={client} value={client} />
                                ))}
                            </datalist>
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

                            <div className="w-full flex justify-end mt-2">
                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-md transition-colors">
                                Confirmar Agendamento
                            </button>
                            </div>
                        </form>
                        )}

                        {upcomingVisits.length > 0 && !showVisitForm && (
                        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-blue-500/10">
                            {upcomingVisits.length === 0 ? (
                            <div className="col-span-1 md:col-span-2 text-xs text-gray-500 italic p-2 text-center">Nenhum evento agendado.</div>
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
                                    <div key={visit.id} className={`w-full p-3 rounded-xl border flex flex-col gap-2 shadow-sm transition-all ${cardClasses}`}>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-sm font-black text-white line-clamp-2">{visit.client}</span>
                                        <span className={`w-fit text-[9px] font-bold px-2 py-1 rounded border whitespace-nowrap ${badgeClasses}`}>
                                        {visit.date.split('-').reverse().join('/')} às {visit.time}
                                        </span>
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
                    <div className="bg-gray-800/80 p-4 xl:p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col h-fit">
                        
                        <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-3 shrink-0">
                            <h3 className="text-sm font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                                <Activity size={14} /> Trabalhando Agora
                            </h3>
                            
                            {minhasTarefasPausadas.length > 0 && (
                                <button 
                                    onClick={() => setShowPausedTasks(!showPausedTasks)}
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 outline-none ${showPausedTasks ? 'text-amber-400 bg-amber-500/10' : 'text-gray-400 hover:text-white'}`}
                                    title="Ver minhas tarefas pausadas"
                                >
                                    PAUSADAS ({minhasTarefasPausadas.length}) {showPausedTasks ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col overflow-y-auto custom-scrollbar pr-1 gap-1">
                            {/* LISTA DE PAUSADAS */}
                            {showPausedTasks && minhasTarefasPausadas.length > 0 && (
                                <div className="mb-2 flex flex-col gap-1 border-b border-gray-700/50 pb-2 animate-in fade-in slide-in-from-top-1">
                                    {minhasTarefasPausadas.map(task => (
                                        <div key={task.id} className="flex items-center justify-between bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 p-2 rounded-lg transition-colors">
                                            <div className="flex flex-col overflow-hidden pr-2">
                                                <span className="text-[9px] text-amber-500/70 font-bold uppercase tracking-widest truncate">{task.storeName}</span>
                                                <span className="text-[11px] text-gray-300 font-medium truncate" title={task.texto}>{task.texto}</span>
                                            </div>
                                            <button 
                                                onClick={(e) => handleToggleTimer(e, task.storeId, task.id)}
                                                className="w-6 h-6 flex items-center justify-center bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-md transition-colors shrink-0"
                                                title="Retomar Tarefa"
                                            >
                                                <Play size={12} className="ml-0.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* LISTA DE ATIVAS */}
                            {Object.keys(liveStatus).length > 0 ? (
                                Object.entries(liveStatus).map(([userName, data]) => {
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
                                            className="group flex flex-col py-2.5 border-b border-gray-700/50 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between w-full mb-1.5">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPaused ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></div>
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm bg-gradient-to-br ${userColor} overflow-hidden shrink-0`}>
                                                        {userPhoto ? (
                                                            <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            userName.substring(0, 2).toUpperCase()
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-200 truncate group-hover:text-white transition-colors">
                                                        {userName}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40 ${isPaused ? 'text-amber-400 border border-amber-500/20' : 'text-emerald-500 border border-emerald-500/20'}`}>
                                                        {data.timestamp}
                                                    </span>
                                                    {userName === myName && (
                                                        <button 
                                                            onClick={(e) => handleCompleteFromRadar(e, data.storeId, userName)}
                                                            className="w-5 h-5 flex items-center justify-center rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                                                            title="Concluir Tarefa"
                                                        >
                                                            <CheckCircle size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <p className={`text-[11px] font-medium leading-tight pl-3.5 transition-all duration-300 line-clamp-2 ${
                                                (data.taskId && animatingTasks.includes(data.taskId)) 
                                                    ? 'text-gray-600 line-through' 
                                                    : isPaused ? 'text-gray-400' : 'text-gray-300'
                                            }`}>
                                                {data.texto}
                                            </p>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-gray-500 text-xs font-medium text-center h-full">
                                    <Activity size={20} className="opacity-30 mb-2" />
                                    <span>Nenhuma tarefa ativa no momento.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RANKING DE EXECUÇÃO COM HISTÓRICO EXPANSÍVEL */}
                    <div className="bg-gray-800/80 p-4 xl:p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col h-fit">
                        <div className="mb-3 border-b border-gray-700 pb-3 flex justify-between items-center">
                            <h3 className="text-sm font-bold tracking-wider text-blue-400 uppercase flex items-center gap-1.5">
                                🏆 Ranking
                            </h3>
                            <select
                                value={rankingPeriod}
                                onChange={e => setRankingPeriod(e.target.value)}
                                className="bg-transparent text-[10px] font-bold text-gray-400 hover:text-white outline-none cursor-pointer text-right"
                            >
                                <option value="hoje" className="bg-gray-900">HOJE</option>
                                <option value="semana" className="bg-gray-900">SEMANA</option>
                                <option value="mes" className="bg-gray-900">MÊS</option>
                            </select>
                        </div>
                        
                        <div className="flex flex-col">
                            {rankingEquipe.map((rank, i) => {
                                const memberData = teamMembers?.find(m => m.nomeCompleto === rank.name || m.nome === rank.name);
                                const userColor = memberData?.avatarColor || 'from-indigo-500 to-purple-600';
                                const userPhoto = memberData?.avatarUrl || null;
                                const isExpanded = expandedUserXP === rank.name;

                                return (
                                    <div key={rank.name} className="group flex flex-col gap-2 py-2.5 border-b border-gray-700/50 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setExpandedUserXP(isExpanded ? null : rank.name)}>
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <span className={`text-[10px] font-black w-3 text-center shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                                                    {i + 1}
                                                </span>
                                                
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm bg-gradient-to-br ${userColor} overflow-hidden shrink-0`}>
                                                    {userPhoto ? (
                                                        <img src={userPhoto} alt={rank.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        rank.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>

                                                <span className="text-xs font-bold text-gray-200 truncate group-hover:text-white transition-colors">{rank.name}</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] text-amber-500 font-bold">{rank.points} XP</span>
                                                <span className="text-[9px] text-gray-400 font-bold bg-black/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    {rank.tasks} <CheckCircle size={10} className="text-emerald-500"/>
                                                </span>
                                            </div>
                                        </div>

                                        {/* CAIXA DE AUDITORIA DE XP EXPANSÍVEL (Sem bordas agressivas) */}
                                        {isExpanded && (
                                            <div className="mt-1 pl-6 pr-1 flex flex-col gap-2 cursor-default animate-in fade-in slide-in-from-top-1" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex gap-2 text-[9px] font-bold bg-black/20 p-1.5 rounded text-center justify-between mb-1 border border-white/5">
                                                    <span className={rank.avgBaixa > 0 ? 'text-emerald-400' : 'text-gray-600'}>🟢 {rank.avgBaixa > 0 ? `${rank.avgBaixa}m` : '--'}</span>
                                                    <span className={rank.avgMedia > 0 ? 'text-amber-400' : 'text-gray-600'}>🟡 {rank.avgMedia > 0 ? `${rank.avgMedia}m` : '--'}</span>
                                                    <span className={rank.avgAlta > 0 ? 'text-red-400' : 'text-gray-600'}>🔴 {rank.avgAlta > 0 ? `${rank.avgAlta}m` : '--'}</span>
                                                </div>

                                                {rank.history.length > 0 ? rank.history.map((hItem) => (
                                                    <div key={hItem.id} className="flex justify-between items-start gap-2 py-1 border-b border-gray-700/30 last:border-0">
                                                        <div className="flex-1">
                                                            <p className="text-[10px] text-gray-400 font-medium leading-tight">{hItem.desc}</p>
                                                            {hItem.details && <p className="text-[8px] text-gray-600 mt-0.5 uppercase tracking-wide">{hItem.details}</p>}
                                                        </div>
                                                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded bg-black/40 ${hItem.points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {hItem.points > 0 ? '+' : ''}{hItem.points}
                                                        </span>
                                                    </div>
                                                )) : (
                                                    <p className="text-[9px] text-gray-600 italic text-center py-1">Nenhum evento.</p>
                                                )}
                                            </div>
                                        )}
                                    </div> 
                                );
                            })}
                            {rankingEquipe.length === 0 && <div className="text-center py-4 text-gray-500 italic text-xs">Nenhuma entrega no período.</div>}
                        </div>
                    </div>

                    {/* RADAR DE PACING */}
                    <div className="bg-gray-800/80 p-4 xl:p-5 rounded-2xl border border-gray-700 shadow-lg overflow-hidden flex flex-col max-h-[400px]">
                        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-3 shrink-0">
                            <AlertTriangle size={14} /> Faturamento em Risco
                        </h3>
                        
                        <div className="flex flex-col overflow-y-auto custom-scrollbar pr-1">
                            {pacingLogs.map((log, i) => (
                            <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-700/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.type === 'danger' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'}`}></div>
                                    <span className="text-xs font-bold text-gray-200 truncate">{log.client}</span>
                                </div>
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded bg-black/40 shrink-0 ${log.type === 'danger' ? 'text-red-400 border border-red-500/20' : 'text-amber-400 border border-amber-500/20'}`}>
                                    {log.percentReached.toFixed(1)}%
                                </span>
                            </div>
                            ))}
                            {pacingLogs.length === 0 && (
                            <div className="flex flex-col items-center justify-center gap-2 py-6 text-emerald-400 text-xs font-medium text-center h-full">
                                <CheckCircle size={20} className="opacity-50" /> 
                                <span>Todas as contas batendo a meta diária.</span>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* POPUP FICA AQUI, ANTES DE FECHAR O DIV PRINCIPAL */}
            {pendingStartInfo && (
                <div className="fixed inset-0 bg-[#0B0F19]/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                <div className="bg-gray-900 border border-white/10 p-6 rounded-2xl max-w-md w-full shadow-2xl flex flex-col gap-4">
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                    ⚠️ Tarefa já em execução
                    </h4>
                    <p className="text-sm text-gray-300 leading-relaxed">
                    Você já possui a tarefa <strong className="text-indigo-400">"{pendingStartInfo.runningTask.texto}"</strong> ativa na loja <strong className="text-white">{pendingStartInfo.runningTask.storeObject.store}</strong>.
                    </p>
                    <p className="text-xs text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    Você deseja pausar ou concluir a tarefa anterior para poder iniciar esta nova?
                    </p>
                    <div className="flex gap-2 mt-2">
                    <button 
                        onClick={() => setPendingStartInfo(null)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-2.5 rounded-xl text-xs transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => resolveConflictAndStart('pause')}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1"
                    >
                        Pausar
                    </button>
                    <button 
                        onClick={() => resolveConflictAndStart('complete')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1"
                    >
                        Concluir
                    </button>
                    </div>
                </div>
                </div>
            )}

        </div>
    );
}

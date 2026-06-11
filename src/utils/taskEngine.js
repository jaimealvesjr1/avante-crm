export const processTaskCompletion = (store, task, myName) => {
    const now = new Date();
    const localTodayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const nowTime = now.getTime();

    let sessionTime = 0;
    if (task.startedAt && task.executingStatus === 'playing') {
        sessionTime = nowTime - new Date(task.startedAt).getTime();
    }
    const totalAccumulated = (task.accumulatedTimeMs || 0) + sessionTime;

    // 2. Marca a tarefa original como concluída
    let updatedChecklists = store.checklists.map(c => 
        c.id === task.id ? { 
            ...c, 
            feita: true,
            completedAt: localTodayStr,
            completedAtFull: now.toISOString(),
            completedBy: myName,
            executingStatus: 'completed',
            accumulatedTimeMs: totalAccumulated
        } : c
    );

    // 3. Motor de Recorrência (Gera a próxima do ciclo)
    if (task.recorrencia && task.recorrencia !== 'none' && task.recorrencia !== 'ghost' && task.data) {
        const [year, month, day] = task.data.split('-').map(Number);
        let nextDateObj = new Date(year, month - 1, day);
        
        if (task.recorrencia === 'daily') nextDateObj.setDate(nextDateObj.getDate() + 1);
        if (task.recorrencia === 'weekly') nextDateObj.setDate(nextDateObj.getDate() + 7);
        if (task.recorrencia === 'monthly') nextDateObj.setMonth(nextDateObj.getMonth() + 1);

        const nextDateStr = `${nextDateObj.getFullYear()}-${String(nextDateObj.getMonth() + 1).padStart(2, '0')}-${String(nextDateObj.getDate()).padStart(2, '0')}`;
        
        updatedChecklists.push({
            ...task,
            id: Date.now() + Math.random(),
            data: nextDateStr,
            feita: false,
            executingStatus: 'none',
            accumulatedTimeMs: 0,
            startedAt: null,
            startedBy: null,
            completedAt: null,
            completedAtFull: null,
            completedBy: null
        });
    }

    // 4. Geração Automática do Log
    let logTexto = `✅ Tarefa concluída: "${task.texto}"`;
    if (task.criadoPor && task.criadoPor !== myName) {
        logTexto = `✅ @${task.criadoPor}, a tarefa "${task.texto}" foi concluída!`;
    }

    const newLog = {
        id: Date.now() + Math.random(),
        data: now.toLocaleString('pt-BR'),
        texto: logTexto,
        author: myName
    };

    return { updatedChecklists, newLog };
};

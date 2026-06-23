import { useState, useEffect, useCallback } from 'react';
// Importamos query, where e getDocs do Firestore para fazer as buscas filtradas
import { collection, onSnapshot, doc, setDoc, query, where, getDocs } from "firebase/firestore";
import { db } from '../services/firebase';
import { toast } from 'react-hot-toast';

// Importamos a nossa nova função de utilidade (saindo da pasta hooks e entrando na utils)
import { getMonthBoundaries } from '../utils/dateUtils';

/**
 * Hook Principal de Dados
 * Escuta as Lojas em tempo real e gere erros assíncronos.
 */
export function useAvanteData(user) {
  const [stores, setStores] = useState([]);
  const [isDbLoading, setIsDbLoading] = useState(true);

  // 1. NOVO: Estado para guardar o erro assíncrono
  const [asyncError, setAsyncError] = useState(null);

  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    if (!user) {
      setStores([]);
      return;
    }
    
    // O onSnapshot escuta as mudanças.
    const unsub = onSnapshot(collection(db, "stores"), 
      (snapshot) => {
        const loadedStores = snapshot.docs.map(doc => doc.data()).sort((a, b) => b.id - a.id);
        setStores(loadedStores); 
        setIsDbLoading(false);
      }, 
      (error) => {
        console.error("FALHA CRÍTICA NO FIRESTORE:", error);
        toast.error(`Acesso negado ou falha de ligação: ${error.message}`);
        setIsDbLoading(false);
        
        if (error.code === 'permission-denied' || error.code === 'unavailable') {
           setAsyncError(new Error("A ligação à base de dados falhou. Verifique a sua internet ou permissões."));
        }
      }
    );

    return () => unsub();
  }, [user]);

  const updateStoreInCloud = useCallback(async (updatedStore) => {
    try {
      const safeStore = { ...updatedStore };

      if (safeStore.taskLogs && safeStore.taskLogs.length > 50) {
        safeStore.taskLogs = safeStore.taskLogs.slice(-50);
      }

      if (safeStore.checklists) {
        const tarefasPendentes = safeStore.checklists.filter(t => !t.feita);
        const tarefasConcluidas = safeStore.checklists.filter(t => t.feita);
        
        if (tarefasConcluidas.length > 30) {
          const ultimasConcluidas = tarefasConcluidas.slice(-30);
          safeStore.checklists = [...tarefasPendentes, ...ultimasConcluidas];
        }
      }

      Object.keys(safeStore).forEach(key => {
        if (safeStore[key] === undefined) {
          delete safeStore[key];
        }
      });

      await setDoc(doc(db, "stores", safeStore.id.toString()), safeStore, { merge: true });
    } catch (e) {
      console.error("Erro ao guardar:", e);
      toast.error("Falha ao sincronizar com o servidor. A sua ação não foi guardada.");
    }
  }, []);

  return { stores, setStores, isDbLoading, setIsDbLoading, updateStoreInCloud };
}


/**
 * NOVA FUNÇÃO: Busca dados de uma coleção específica filtrando pelo mês.
 * Ideal para buscar "Tarefas" (tasks) ou "Histórico" (history).
 * @param {string} collectionName - Nome da coleção no Firebase (ex: "tasks")
 * @param {number} monthOffset - 0 (Mês atual), -1 (Mês anterior), etc.
 */
export const fetchAppDataForMonth = async (collectionName, monthOffset = 0) => {
  const { startOfMonth, endOfMonth } = getMonthBoundaries(monthOffset);

  const colRef = collection(db, collectionName);

  const q = query(
    colRef,
    where("createdAt", ">=", startOfMonth),
    where("createdAt", "<=", endOfMonth)
  );

  try {
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return data;
  } catch (error) {
    console.error(`Erro ao buscar dados da coleção ${collectionName} para o mês:`, error);
    toast.error("Não foi possível carregar os dados históricos. Tente novamente.");
    return []; 
  }
};

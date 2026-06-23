import { useState, useEffect, useCallback } from 'react';
// Importamos query, where e getDocs do Firestore para fazer as buscas filtradas
import { collection, onSnapshot, doc, setDoc, query, where, getDocs } from "firebase/firestore";
import { db } from '../services/firebase';
import { toast } from 'react-hot-toast';

// Importamos a nossa nova função de utilidade (saindo da pasta hooks e entrando na utils)
import { getMonthBoundaries } from '../utils/dateUtils';

/**
 * Hook Principal de Dados (Mantido exatamente como o seu original)
 * Escuta as Lojas em tempo real.
 */
export function useAvanteData(user) {
  const [stores, setStores] = useState([]);
  const [isDbLoading, setIsDbLoading] = useState(true);

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
        toast.error(`Acesso negado: ${error.message}`);
        setIsDbLoading(false);
      }
    );

    return () => unsub(); // Limpa a escuta se o usuário deslogar
  }, [user]);

  const updateStoreInCloud = useCallback(async (updatedStore) => {
    try {
      const safeStore = { ...updatedStore };
      Object.keys(safeStore).forEach(key => {
        if (safeStore[key] === undefined) {
          delete safeStore[key];
        }
      });

      await setDoc(doc(db, "stores", safeStore.id.toString()), safeStore, { merge: true });
    } catch (e) {
      console.error("Erro ao salvar:", e);
      toast.error("Falha de sincronização com o banco.");
    }
  }, []);

  return { stores, setStores, isDbLoading, setIsDbLoading, updateStoreInCloud };
}


/**
 * NOVA FUNÇÃO: Busca dados de uma coleção específica filtrando pelo mês.
 * Ideal para buscar "Tarefas" (tasks) ou "Histórico" (history).
 * * @param {string} collectionName - Nome da coleção no Firebase (ex: "tasks")
 * @param {number} monthOffset - 0 (Mês atual), -1 (Mês anterior), etc.
 */
export const fetchAppDataForMonth = async (collectionName, monthOffset = 0) => {
  // 1. Calculamos as datas de início e fim do mês desejado
  const { startOfMonth, endOfMonth } = getMonthBoundaries(monthOffset);

  // 2. Referenciamos a coleção no banco
  const colRef = collection(db, collectionName);

  // 3. Montamos a Query: "Traga os documentos onde a data de criação esteja dentro deste mês"
  // ATENÇÃO: Seu banco precisa ter um campo de data (ex: 'createdAt') salvo como Timestamp ou Date.
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
    return [];
  }
};

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

export function useAvanteData(user) {
  const [stores, setStores] = useState([]);
  const [isDbLoading, setIsDbLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStores([]);
      return;
    }
    
    // O onSnapshot escuta as mudanças. Mantemos ele isolado aqui para não sofrer re-renders do App.
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

    return () => unsub(); // Limpa a escuta se o usuário deslogar (economiza leituras)
  }, [user]);

  // Função centralizada e memoizada para atualizar o banco
  const updateStoreInCloud = useCallback(async (updatedStore) => {
    try {
      await setDoc(doc(db, "stores", updatedStore.id.toString()), updatedStore, { merge: true });
    } catch (e) {
      console.error("Erro ao salvar:", e);
      toast.error("Falha de sincronização com o banco.");
    }
  }, []);

  return { stores, setStores, isDbLoading, setIsDbLoading, updateStoreInCloud };
}

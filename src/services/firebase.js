import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB1VkKVr9otSxz-oTNq4hTRcjYKo6j2i5k",
  authDomain: "avante-crm.firebaseapp.com",
  projectId: "avante-crm",
  storageBucket: "avante-crm.firebasestorage.app",
  messagingSenderId: "869884346734",
  appId: "1:869884346734:web:3df6529418e094e155817f"
};

// Inicializa o App Principal
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Inicializa o Firestore JÁ com o cache persistente ativado (Substitui o enableIndexedDbPersistence)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Inicializa o App Secundário (Usado para criar usuários sem deslogar o admin atual)
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

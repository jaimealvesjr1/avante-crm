import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB1VkKVr9otSxz-oTNq4hTRcjYKo6j2i5k",
  authDomain: "avante-crm.firebaseapp.com",
  projectId: "avante-crm",
  storageBucket: "avante-crm.firebasestorage.app",
  messagingSenderId: "869884346734",
  appId: "1:869884346734:web:3df6529418e094e155817f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn("Múltiplas abas abertas, o cache funciona em apenas uma.");
  } else if (err.code == 'unimplemented') {
    console.warn("O navegador atual não suporta cache offline.");
  }
});

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

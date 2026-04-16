import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1VkKVr9otSxz-oTNq4hTRcjYKo6j2i5k",
  authDomain: "avante-crm.firebaseapp.com",
  projectId: "avante-crm",
  storageBucket: "avante-crm.firebasestorage.app",
  messagingSenderId: "869884346734",
  appId: "1:869884346734:web:3df6529418e094e155817f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

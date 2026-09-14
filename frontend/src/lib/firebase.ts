import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB5pzuz_xuzMCy8ZOIHdFRf-9RlfNzS3Ek",
  authDomain: "f1-race-replay-6941f.firebaseapp.com",
  projectId: "f1-race-replay-6941f",
  storageBucket: "f1-race-replay-6941f.firebasestorage.app",
  messagingSenderId: "906652869876",
  appId: "1:906652869876:web:d5652ef772ced014aeaaa1",
};

const app = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export default app;

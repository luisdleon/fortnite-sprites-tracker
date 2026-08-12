import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPBTRPZyWNOPvusdawFMFq2CJe4iYPP_M",
  authDomain: "fornite-spirits.firebaseapp.com",
  projectId: "fornite-spirits",
  storageBucket: "fornite-spirits.firebasestorage.app",
  messagingSenderId: "969449262672",
  appId: "1:969449262672:web:37108ae0b470103dce4b55",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function normalizeUsername(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

async function loadUserData(username) {
  const id = normalizeUsername(username);
  const snap = await getDoc(doc(db, "spiritsTrackerUsers", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { owned: data.owned || [], mastered: data.mastered || [] };
}

async function saveUserData(username, { owned, mastered }) {
  const id = normalizeUsername(username);
  await setDoc(
    doc(db, "spiritsTrackerUsers", id),
    { owned, mastered, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

window.FirebaseSync = { loadUserData, saveUserData };
window.dispatchEvent(new Event("firebase-sync-ready"));

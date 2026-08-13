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
  return {
    owned: data.owned || [],
    mastered: data.mastered || [],
    avatar: data.avatar || "",
    friends: data.friends || [],
    displayName: data.displayName || username,
  };
}

async function saveUserData(username, { owned, mastered, avatar, friends, displayName }) {
  const id = normalizeUsername(username);
  const payload = { owned, mastered, updatedAt: serverTimestamp() };
  if (avatar !== undefined) payload.avatar = avatar;
  if (friends !== undefined) payload.friends = friends;
  if (displayName !== undefined) payload.displayName = displayName;
  await setDoc(doc(db, "spiritsTrackerUsers", id), payload, { merge: true });
}

window.FirebaseSync = { loadUserData, saveUserData, normalizeUsername };
window.dispatchEvent(new Event("firebase-sync-ready"));

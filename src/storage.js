import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";

// Mimics the Claude window.storage API so the rest of Docket.jsx doesn't need
// to change: get(key) -> { key, value, shared } | null, set(key, value) -> result.
// Signed in  -> Firestore, one document per key under users/{uid}/docket/{key}.
// Signed out -> browser localStorage, namespaced so it can't collide with anything else.
export const appStorage = {
  async get(key) {
    const user = auth.currentUser;
    if (user) {
      const snap = await getDoc(doc(db, "users", user.uid, "docket", key));
      if (!snap.exists()) return null;
      return { key, value: snap.data().value, shared: false };
    }
    const raw = localStorage.getItem(`docket:${key}`);
    if (raw === null) return null;
    return { key, value: raw, shared: false };
  },

  async set(key, value) {
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, "users", user.uid, "docket", key), { value });
      return { key, value, shared: false };
    }
    localStorage.setItem(`docket:${key}`, value);
    return { key, value, shared: false };
  },
};

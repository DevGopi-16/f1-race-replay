import {
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import { firebaseAuth } from "../../lib/firebase";

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export async function signInWithGoogleFirebase() {
  const result = await signInWithPopup(
    firebaseAuth,
    googleProvider,
  );

  const idToken = await result.user.getIdToken();

  return {
    user: result.user,
    idToken,
  };
}

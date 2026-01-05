import { initializeApp } from "firebase/app";
import {
    getAuth, 
    GoogleAuthProvider, 
    GithubAuthProvider
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD_o8kVCFaS6cvVjaBoQb-94JihLOWxzMY",
    authDomain: "naoufaltbeu.firebaseapp.com",
    projectId: "naoufaltbeu",
    storageBucket: "naoufaltbeu.appspot.com",
    messagingSenderId: "406476370814",
    appId: "1:406476370814:web:eafbff2df5baebe2c2f92f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export {
  auth,
  db,
  googleProvider,
  githubProvider
};
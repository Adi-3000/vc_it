
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth,GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCRZQvPF6EKPTyYhxUOOF1eVrCDWlYoeJg",
    authDomain: "vcdemo-85754.firebaseapp.com",
    projectId: "vcdemo-85754",
    storageBucket: "vcdemo-85754.appspot.com",
    messagingSenderId: "739340744495",
    appId: "1:739340744495:web:0565d6852025581e1f93da"};






// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth=getAuth()
export const firestore=getFirestore()
export const storage=getStorage()
export const provider=new GoogleAuthProvider();

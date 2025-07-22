// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration (테스트용)
const firebaseConfig = {
  apiKey: "AIzaSyB4AdSE-AxX8xBr5gDZOt_h1CgPFvgV1qo",
  authDomain: "family-music-app-test.firebaseapp.com",
  projectId: "family-music-app-test",
  storageBucket: "family-music-app-test.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
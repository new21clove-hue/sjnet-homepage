// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLQ5BHbqmkkAmWia9ApYY2jkRaTnEwMnw",
  authDomain: "sjnet-data.firebaseapp.com",
  databaseURL: "https://sjnet-data-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sjnet-data",
  storageBucket: "sjnet-data.firebasestorage.app",
  messagingSenderId: "902913557657",
  appId: "1:902913557657:web:3f3af56dbd0ebe8c5a2408",
  measurementId: "G-HJ0VY8687N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const firebaseConfig = {
  apiKey: "AIzaSy...YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com", // <-- Realtime Database URL 확인
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "...",
  appId: "1:..."
};


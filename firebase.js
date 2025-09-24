// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCRyA_LYMiQsSGar9MCkhwrVw6kF2nTaXQ",
  authDomain: "draw-database-9eeba.firebaseapp.com",
  databaseURL: "https://draw-database-9eeba-default-rtdb.firebaseio.com",
  projectId: "draw-database-9eeba",
  storageBucket: "draw-database-9eeba.firebasestorage.app",
  messagingSenderId: "351896382644",
  appId: "1:351896382644:web:a2cd022686853da146fbe1",
  measurementId: "G-9TJ9926RHS"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const analytics = getAnalytics(app);

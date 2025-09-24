// ✅ Import Firebase via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { 
  getDatabase, ref, push, set, remove, onChildAdded, onChildRemoved, onValue 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ✅ Your Firebase config
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

// ✅ Init Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const strokesRef = ref(db, "strokes");
const onlineRef = ref(db, "online");

// 🎨 Canvas setup
const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let drawing = false;
let erasing = false;
let size = 5;
let color = "rgb(0,0,0)";

// UI elements
const drawBtn = document.getElementById("drawBtn");
const eraseBtn = document.getElementById("eraseBtn");
const clearBtn = document.getElementById("clearBtn");
const sizeSlider = document.getElementById("sizeSlider");
const rSlider = document.getElementById("rSlider");
const gSlider = document.getElementById("gSlider");
const bSlider = document.getElementById("bSlider");
const colorPreview = document.getElementById("colorPreview");
const onlineCount = document.getElementById("onlineCount");
const menuToggle = document.getElementById("menuToggle");
const menu = document.getElementById("menu");

// Toggle menu
menuToggle.addEventListener("click", () => {
  menu.classList.toggle("hidden");
});

// Button actions
drawBtn.addEventListener("click", () => { erasing = false; });
eraseBtn.addEventListener("click", () => { erasing = true; });
clearBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear the canvas for everyone?")) {
    remove(strokesRef);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

// Size slider
sizeSlider.addEventListener("input", e => { size = e.target.value; });

// Color sliders
function updateColor() {
  color = `rgb(${rSlider.value},${gSlider.value},${bSlider.value})`;
  colorPreview.style.background = color;
}
[rSlider, gSlider, bSlider].forEach(slider => slider.addEventListener("input", updateColor));
updateColor();

// Draw function
function drawCircle(x, y, clr, sz) {
  ctx.beginPath();
  ctx.arc(x, y, sz / 2, 0, Math.PI * 2);
  ctx.fillStyle = clr;
  ctx.fill();
}

// Drawing events
function startDraw(e) {
  drawing = true;
  draw(e);
}
function endDraw() { drawing = false; }
function draw(e) {
  if (!drawing) return;
  e.preventDefault();

  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;

  if (erasing) {
    // Remove nearby strokes
    remove(push(strokesRef)); // dummy write to trigger sync
    ctx.clearRect(x - size/2, y - size/2, size, size);
  } else {
    drawCircle(x, y, color, size);
    push(strokesRef, { x, y, color, size });
  }
}

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("touchstart", startDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("touchmove", draw);
canvas.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseleave", endDraw);
canvas.addEventListener("touchend", endDraw);

// Firebase listeners
onChildAdded(strokesRef, snap => {
  const s = snap.val();
  if (s) drawCircle(s.x, s.y, s.color, s.size);
});
onChildRemoved(strokesRef, () => {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  onValue(strokesRef, snap => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    snap.forEach(child => {
      const { x,y,color,size } = child.val();
      drawCircle(x,y,color,size);
    });
  }, { onlyOnce: true });
});

// Online counter with heartbeat
let userId = localStorage.getItem("drawUserId");
if (!userId) {
  userId = "user_" + Math.floor(Math.random() * 1e6);
  localStorage.setItem("drawUserId", userId);
}
const userRef = ref(db, "online/" + userId);
set(userRef, { active: true, lastActive: Date.now() });
window.addEventListener("beforeunload", () => remove(userRef));
setInterval(() => {
  set(userRef, { active: true, lastActive: Date.now() });
}, 30000);

onValue(onlineRef, snap => {
  const now = Date.now();
  let count = 0;
  snap.forEach(child => {
    const val = child.val();
    if (val.lastActive && now - val.lastActive < 60000) count++;
  });
  onlineCount.textContent = "Online: " + count;
});

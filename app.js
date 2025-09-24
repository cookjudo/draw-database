import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  onChildAdded, 
  onChildRemoved, 
  push, 
  remove, 
  onValue, 
  set 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ✅ Your Firebase config (safe to use on client)
const firebaseConfig = {
  apiKey: "AIzaSyBOVGJ-wo9TFlzxZNm-C8MWfJDRYHEv_o4",
  authDomain: "fir-draw-f6f6b.firebaseapp.com",
  databaseURL: "https://fir-draw-f6f6b-default-rtdb.firebaseio.com",
  projectId: "fir-draw-f6f6b",
  storageBucket: "fir-draw-f6f6b.appspot.com",
  messagingSenderId: "278260217358",
  appId: "1:278260217358:web:1a306b40537e5ae6fefb97"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const strokesRef = ref(db, "strokes");
const onlineRef = ref(db, "onlineUsers");

// 🎨 Canvas setup
const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 🖌️ Drawing state
let drawing = false;
let erasing = false;
let size = 5;
let color = "rgb(0,0,0)";

// 🟢 Controls
const drawBtn = document.getElementById("drawBtn");
const eraseBtn = document.getElementById("eraseBtn");
const clearBtn = document.getElementById("clearBtn");
const sizeSlider = document.getElementById("sizeSlider");
const rSlider = document.getElementById("rSlider");
const gSlider = document.getElementById("gSlider");
const bSlider = document.getElementById("bSlider");
const colorPreview = document.getElementById("colorPreview");
const onlineCount = document.getElementById("onlineCount");

// 🎛 Menu toggle
const menu = document.getElementById("menu");
document.getElementById("menuToggle").addEventListener("click", () => {
  menu.classList.toggle("hidden");
});

// 🖌️ Button actions
drawBtn.addEventListener("click", () => {
  erasing = false;
});
eraseBtn.addEventListener("click", () => {
  erasing = true;
});
clearBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear the canvas for everyone?")) {
    remove(strokesRef);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

// 🎚️ Size slider
sizeSlider.addEventListener("input", e => {
  size = e.target.value;
});

// 🎨 Color sliders
function updateColor() {
  color = `rgb(${rSlider.value},${gSlider.value},${bSlider.value})`;
  colorPreview.style.background = color;
}
[rSlider, gSlider, bSlider].forEach(slider =>
  slider.addEventListener("input", updateColor)
);
updateColor();

// 🖌️ Drawing events
function drawCircle(x, y, clr, sz) {
  ctx.beginPath();
  ctx.arc(x, y, sz / 2, 0, Math.PI * 2);
  ctx.fillStyle = clr;
  ctx.fill();
}

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("touchstart", startDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("touchmove", draw);
canvas.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseleave", endDraw);
canvas.addEventListener("touchend", endDraw);

function startDraw(e) {
  drawing = true;
  draw(e);
}
function endDraw() {
  drawing = false;
}
function draw(e) {
  if (!drawing) return;
  e.preventDefault();

  const x = (e.touches ? e.touches[0].clientX : e.clientX);
  const y = (e.touches ? e.touches[0].clientY : e.clientY);

  if (erasing) {
    const eraseRef = push(strokesRef);
    remove(eraseRef);
    ctx.clearRect(x - size / 2, y - size / 2, size, size);
  } else {
    drawCircle(x, y, color, size);
    push(strokesRef, { x, y, color, size });
  }
}

// 📡 Firebase listeners
onChildAdded(strokesRef, snapshot => {
  const { x, y, color, size } = snapshot.val();
  drawCircle(x, y, color, size);
});
onChildRemoved(strokesRef, () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  onValue(strokesRef, snap => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    snap.forEach(child => {
      const { x, y, color, size } = child.val();
      drawCircle(x, y, color, size);
    });
  }, { onlyOnce: true });
});

// 👥 Online presence
const myId = push(onlineRef).key;
set(ref(db, `onlineUsers/${myId}`), true);
window.addEventListener("beforeunload", () => {
  remove(ref(db, `onlineUsers/${myId}`));
});
onValue(onlineRef, snapshot => {
  onlineCount.textContent = snapshot.size;
});

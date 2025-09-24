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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let drawing = false;
let eraseMode = false;
let lineWidth = 4;
let prevX = null, prevY = null;

const drawEraseBtn = document.getElementById("drawEraseBtn");
const clearBtn = document.getElementById("clearBtn");
const sizeSlider = document.getElementById("sizeSlider");
const onlineCounter = document.getElementById("onlineCounter");

sizeSlider.addEventListener("input", () => { lineWidth = parseInt(sizeSlider.value); });

function getCanvasCoords(e){
  const rect = canvas.getBoundingClientRect();
  let x, y;
  if(e.touches && e.touches.length>0){ x=e.touches[0].clientX; y=e.touches[0].clientY; }
  else { x=e.clientX; y=e.clientY; }
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  return [x*scaleX - rect.left*scaleX, y*scaleY - rect.top*scaleY];
}

function startDraw(e){ 
  e.preventDefault(); 
  drawing = true; 
  [prevX, prevY] = getCanvasCoords(e); 
}

function endDraw(e){ 
  e.preventDefault(); 
  drawing = false; 
  prevX = prevY = null;
}

// Batches for smooth drawing
let strokeBatch = [];
const BATCH_INTERVAL = 50; // ms

function draw(e){
  if(!drawing) return;
  e.preventDefault();
  const [x, y] = getCanvasCoords(e);
  if(prevX === null || prevY === null){ prevX = x; prevY = y; }

  const dx = x - prevX;
  const dy = y - prevY;
  const distance = Math.hypot(dx, dy);
  const step = Math.max(lineWidth * 0.25, 1);

  for(let i=0; i<distance; i+=step){
    const cx = prevX + dx * (i/distance);
    const cy = prevY + dy * (i/distance);
    if(eraseMode) eraseLocally(cx, cy);
    else drawLocally(cx, cy);
  }

  prevX = x;
  prevY = y;
}

function drawLocally(x, y){
  ctx.beginPath();
  ctx.arc(x, y, lineWidth/2, 0, Math.PI*2);
  ctx.fillStyle="black";
  ctx.fill();
  strokeBatch.push({x, y, size: lineWidth});
}

function eraseLocally(x, y){
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, lineWidth/2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // Remove strokes from database that are within eraser circle
  db.ref("strokes").once("value", snapshot => {
    snapshot.forEach(child => {
      const s = child.val();
      const dx = s.x - x;
      const dy = s.y - y;
      if(Math.hypot(dx, dy) <= lineWidth/2){
        db.ref("strokes/" + child.key).remove();
      }
    });
  });
}

// Push strokes to database
setInterval(()=>{
  if(strokeBatch.length>0){
    const batch = {};
    strokeBatch.forEach(s=>{
      const key = db.ref("strokes").push().key;
      batch[key] = s;
    });
    db.ref("strokes").update(batch);
    strokeBatch = [];
  }
}, BATCH_INTERVAL);

// Canvas events
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mouseup", endDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("touchstart", startDraw);
canvas.addEventListener("touchend", endDraw);
canvas.addEventListener("touchmove", draw);

// Draw/Erase toggle
drawEraseBtn.addEventListener("click", ()=>{
  eraseMode = !eraseMode;
  drawEraseBtn.textContent = eraseMode?"Draw":"Erase";
  drawEraseBtn.style.backgroundColor = eraseMode?"#2196F3":"#4CAF50";
});

// Clear canvas with warning for everyone
clearBtn.addEventListener("click", ()=>{
  const confirmClear = confirm("Are you sure you want to clear the canvas for everyone?");
  if(!confirmClear) return;

  ctx.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  strokeBatch = [];
  db.ref("strokes").remove();
});

// Render strokes
db.ref("strokes").on("child_added", snapshot=>{
  const {x, y, size} = snapshot.val();
  ctx.beginPath();
  ctx.arc(x, y, size/2, 0, Math.PI*2);
  ctx.fillStyle="black";
  ctx.fill();
});

// Listen for database removals (clear canvas or erased strokes)
db.ref("strokes").on("child_removed", () => {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // Re-render remaining strokes
  db.ref("strokes").once("value", snapshot=>{
    snapshot.forEach(child=>{
      const {x, y, size} = child.val();
      ctx.beginPath();
      ctx.arc(x, y, size/2, 0, Math.PI*2);
      ctx.fillStyle="black";
      ctx.fill();
    });
  });
});

// Online counter with heartbeat
let userId = localStorage.getItem("drawUserId");
if(!userId){
  userId = "user_" + Math.floor(Math.random()*1000000);
  localStorage.setItem("drawUserId", userId);
}

let userRef = db.ref("online/" + userId);

// Set initial presence
userRef.set({ active: true, lastActive: Date.now() });
userRef.onDisconnect().remove();

// Heartbeat every 30s
setInterval(()=>{
  userRef.update({ lastActive: Date.now() });
}, 30000);

// Count only active users in last 1 min
db.ref("online").on("value", snapshot=>{
  const now = Date.now();
  let count = 0;
  snapshot.forEach(child=>{
    const user = child.val();
    if(user.lastActive && now - user.lastActive < 60000){
      count++;
    }
  });
  onlineCounter.textContent = "Online: " + count;
});


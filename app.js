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

  if(eraseMode) {
    eraseLocally(x, y);
  } else {
    drawLocally(x, y);
  }

  prevX = x;
  prevY = y;
}

function drawLocally(x, y){
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "black";
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(x, y);
  ctx.stroke();

  strokeBatch.push({x1: prevX, y1: prevY, x2: x, y2: y, size: lineWidth, erase: false});
}

function eraseLocally(x, y){
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, lineWidth/2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  strokeBatch.push({x1: x, y1: y, x2: x, y2: y, size: lineWidth, erase: true});
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

// Render strokes from DB
db.ref("strokes").on("child_added", snapshot=>{
  const s = snapshot.val();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = s.size;

  if(s.erase){
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(s.x1, s.y1, s.size/2, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
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

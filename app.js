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
let eraseBatch = [];
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
  eraseBatch.push({x, y, size: lineWidth});
}

// Push strokes and erase events
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
  if(eraseBatch.length>0){
    const batch = {};
    eraseBatch.forEach(e=>{
      const key = db.ref("erase").push().key;
      batch[key] = e;
    });
    db.ref("erase").update(batch);
    eraseBatch = [];
  }
}, BATCH_INTERVAL);

// Events
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

// Clear canvas immediately for everyone
clearBtn.addEventListener("click", ()=>{
  ctx.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  strokeBatch = [];
  eraseBatch = [];
  db.ref("strokes").remove();
  db.ref("erase").remove();
});

// Render strokes
db.ref("strokes").on("child_added", snapshot=>{
  const {x, y, size} = snapshot.val();
  ctx.beginPath();
  ctx.arc(x, y, size/2, 0, Math.PI*2);
  ctx.fillStyle="black";
  ctx.fill();
});

// Render erases
db.ref("erase").on("child_added", snapshot=>{
  const {x, y, size} = snapshot.val();
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, size/2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
});

// Listen for database removals (clear canvas)
db.ref("strokes").on("child_removed", () => {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
});
db.ref("erase").on("child_removed", () => {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
});

// Online counter with persistent user ID
let userId = localStorage.getItem("drawUserId");
if(!userId){
  userId = "user_" + Math.floor(Math.random()*1000000);
  localStorage.setItem("drawUserId", userId);
}

let userRef = db.ref("online/" + userId);
userRef.set(true);
userRef.onDisconnect().remove();

db.ref("online").on("value", snapshot=>{
  onlineCounter.textContent = "Online: " + snapshot.numChildren();
});

document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState === "visible"){
    userRef.set(true);
    userRef.onDisconnect().remove();
  }
});

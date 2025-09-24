// app.js
import { db } from "./firebase.js";
import { ref, push, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

// Example: writing a stroke
function saveStroke(stroke) {
  const strokesRef = ref(db, "strokes");
  push(strokesRef, stroke);
}

// Example: listening for strokes
const strokesRef = ref(db, "strokes");
onValue(strokesRef, (snapshot) => {
  const data = snapshot.val();
  console.log("Updated strokes:", data);
});

// Example: clear canvas
function clearCanvas() {
  const strokesRef = ref(db, "strokes");
  remove(strokesRef);
}

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

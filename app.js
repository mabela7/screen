const status = document.getElementById("status");
const events = document.getElementById("events");

function report(type) {
  const item = document.createElement("li");
  item.textContent = `${new Date().toLocaleString()} — ${type}`;
  events.prepend(item);
}

document.getElementById("test").addEventListener("click", () => {
  report("Manual test event");
});

document.addEventListener("native-screenshot", () => {
  report("Screenshot detected in this app");
});

document.addEventListener("visibilitychange", () => {
  report(document.hidden ? "App tab hidden" : "App tab visible");
});

window.addEventListener("blur", () => report("App lost focus"));
window.addEventListener("focus", () => report("App regained focus"));

report("Capture Watch started");

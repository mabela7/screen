// Capture Watch — configure Firebase below if you want cloud reporting.
// This app intentionally reports only events the operating system actually exposes.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAi27biKcUGvCB4kXsXEdgeq85JLBb7a_Y",
  authDomain: "library-a60e3.firebaseapp.com",
  databaseURL: "https://library-a60e3-default-rtdb.firebaseio.com",
  projectId: "library-a60e3",
  storageBucket: "library-a60e3.firebasestorage.app",
  messagingSenderId: "933820691428",
  appId: "1:933820691428:web:25dcddcfc078ac910acdf1"
};

const $ = id => document.getElementById(id);
const sessionId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
const sessionStarted = new Date().toISOString();
let count = 0;
let firebaseReady = false;
let db = null;
let user = null;

const device = {
  userAgent: navigator.userAgent,
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  screen: { width: screen.width, height: screen.height, pixelRatio: devicePixelRatio },
  viewport: { width: innerWidth, height: innerHeight }
};

$("started").textContent = new Date(sessionStarted).toLocaleTimeString();
$("platform").textContent = device.userAgent;
$("state").textContent = "Waiting for Android events";

function addLog(type, details = {}) {
  const event = {
    type,
    sessionId,
    timestamp: new Date().toISOString(),
    epochMs: Date.now(),
    device,
    details
  };

  count++;
  $("count").textContent = String(count);

  const empty = $("events").querySelector(".empty");
  if (empty) empty.remove();

  const item = document.createElement("div");
  item.className = "event";
  const title = document.createElement("b");
  title.textContent = type;
  const time = document.createElement("small");
  time.textContent = event.timestamp;
  const data = document.createElement("small");
  data.textContent = JSON.stringify(details);
  item.append(title, time, data);
  $("events").prepend(item);

  if (firebaseReady && user && db) {
    import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js")
      .then(({ ref, push, set }) => set(push(ref(db, `captureReports/${sessionId}`)), {
        ...event,
        uid: user.uid
      }))
      .catch(err => console.error("Firebase report failed:", err));
  }
  return event;
}

// Android MainActivity sends this event after Android reports a screenshot
// of this app's own Activity (Android 14+).
window.addEventListener("native-screenshot", event => {
  addLog("ANDROID_SCREENSHOT_OF_THIS_APP", event.detail || {});
  $("state").textContent = "Screenshot event received";
});

$("test").addEventListener("click", () => {
  addLog("MANUAL_TEST_EVENT", { note: "This is a test, not a detected screenshot." });
});

$("clear").addEventListener("click", () => {
  $("events").replaceChildren();
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = "On-screen log cleared. Cloud reports are not deleted.";
  $("events").append(empty);
});

addLog("APP_SESSION_STARTED", {
  sessionStarted,
  androidScreenshotCallback: "Available on Android 14+ for this app's activity only"
});

// Optional Firebase setup. Anonymous auth must be enabled in Firebase Console.
// Realtime Database rules should require auth != null.
(async () => {
  const configured = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" &&
                     FIREBASE_CONFIG.projectId !== "YOUR_PROJECT" &&
                     FIREBASE_CONFIG.databaseURL.startsWith("https://");
  if (!configured) {
    $("status").textContent = "LOCAL ONLY";
    $("status").style.color = "#f2c879";
    return;
  }

  try {
    const [{ initializeApp }, { getAuth, signInAnonymously }, { getDatabase }] =
      await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js")
      ]);
    const app = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    db = getDatabase(app);
    const credential = await signInAnonymously(auth);
    user = credential.user;
    firebaseReady = true;
    $("status").textContent = "CLOUD CONNECTED";
    $("status").style.color = "#a9e9c7";
    addLog("CLOUD_REPORTING_READY", { uid: user.uid });
  } catch (error) {
    console.error(error);
    $("status").textContent = "CLOUD ERROR";
    $("status").style.color = "#ff9b9b";
  }
})();

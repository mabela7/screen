
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getDatabase, ref, push, set
} from
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import {
  getAuth, signInAnonymously
} from
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyAi27biKcUGvCB4kXsXEdgeq85JLBb7a_Y",
  authDomain: "library-a60e3.firebaseapp.com",
  databaseURL: "https://library-a60e3-default-rtdb.firebaseio.com",
  projectId: "library-a60e3",
  storageBucket: "library-a60e3.firebasestorage.app",
  messagingSenderId: "933820691428",
  appId: "1:933820691428:web:25dcddcfc078ac910acdf1"

};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// 2. SESSION INFORMATION
const sessionId = crypto.randomUUID();
let eventCount = 0;
let shareStarted = null;
let shareTimer = null;
let authenticated = false;

const $ = id => document.getElementById(id);

const deviceInfo = {
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  languages: navigator.languages,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  screen: {
    width: screen.width,
    height: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: devicePixelRatio
  },
  viewport: {
    width: innerWidth,
    height: innerHeight
  },
  online: navigator.onLine,
  cookiesEnabled: navigator.cookieEnabled,
  referrer: document.referrer
};

// 3. AUTHENTICATION
try {
  await signInAnonymously(auth);
  authenticated = true;
  $("status").textContent = "CONNECTED";
  $("status").style.color = "#76e6ae";

  await report("SESSION_STARTED", {
    sessionId,
    deviceInfo
  });
} catch (error) {
  $("status").textContent = "OFFLINE";
  console.error("Firebase error:", error);
}

// 4. REPORT EVENTS
async function report(type, details = {}) {
  const event = {
    type,
    sessionId,
    timestamp: new Date().toISOString(),
    unixTime: Date.now(),
    deviceInfo: {
      ...deviceInfo,
      currentViewport: {
        width: innerWidth,
        height: innerHeight
      },
      currentOnline: navigator.onLine
    },
    details
  };

  eventCount++;
  $("events").textContent = eventCount;

  const log = document.createElement("div");
  log.className = "log";

  const title = document.createElement("b");
  title.textContent = type;

  const time = document.createElement("small");
  time.textContent = new Date().toLocaleString();

  const detail = document.createElement("small");
  detail.textContent = JSON.stringify(details);

  log.append(title, time, detail);
  $("logs").prepend(log);

  if (authenticated) {
    try {
      await set(
        push(ref(db, "captureReports/" + sessionId)),
        event
      );
    } catch (error) {
      console.error("Report failed:", error);
    }
  }

  return event;
}

// 5. SCREEN SHARING
$("share").addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    alert("Screen sharing is not supported here.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    });

    shareStarted = Date.now();

    $("monitor").textContent = "Screen sharing active";
    $("description").textContent = "A browser capture session is active.";
    $("share").textContent = "Sharing active";

    await report("SCREEN_SHARING_STARTED", {
      startedAt: new Date(shareStarted).toISOString(),
      tracks: stream.getTracks().map(track => ({
        kind: track.kind,
        label: track.label,
        settings: track.getSettings()
      }))
    });

    const track = stream.getVideoTracks()[0];

    shareTimer = setInterval(() => {
      if (shareStarted !== null) {
        $("duration").textContent =
          Math.floor((Date.now() - shareStarted) / 1000) + "s";
      }
    }, 500);

    track.addEventListener("ended", async () => {
      if (shareStarted === null) return;

      const stopped = Date.now();
      const seconds = (stopped - shareStarted) / 1000;

      clearInterval(shareTimer);
      shareTimer = null;

      await report("SCREEN_SHARING_STOPPED", {
        startedAt: new Date(shareStarted).toISOString(),
        stoppedAt: new Date(stopped).toISOString(),
        durationMilliseconds: stopped - shareStarted,
        durationSeconds: seconds
      });

      shareStarted = null;

      $("monitor").textContent = "Monitoring active";
      $("description").textContent = "Screen sharing ended.";
      $("share").textContent = "Start screen sharing";
    });

  } catch (error) {
    await report("SCREEN_SHARING_ERROR", {
      name: error.name,
      message: error.message
    });
  }
});

// 6. TAB VISIBILITY
document.addEventListener("visibilitychange", () => {
  report(document.hidden ? "TAB_HIDDEN" : "TAB_VISIBLE", {
    visibilityState: document.visibilityState
  });
});

// 7. WINDOW FOCUS
window.addEventListener("blur", () => {
  report("WINDOW_BLUR");
});

window.addEventListener("focus", () => {
  report("WINDOW_FOCUS");
});

// 8. NETWORK
window.addEventListener("online", () => {
  report("NETWORK_ONLINE");
});

window.addEventListener("offline", () => {
  report("NETWORK_OFFLINE");
});

// 9. RESIZE
window.addEventListener("resize", () => {
  report("VIEWPORT_RESIZED", {
    width: innerWidth,
    height: innerHeight
  });
});

// 10. SESSION END
window.addEventListener("pagehide", () => {
  report("PAGE_HIDDEN_OR_CLOSED", {
    sessionId,
    time: Date.now()
  });
});

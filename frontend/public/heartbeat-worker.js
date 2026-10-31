// background-heartbeat-worker.js
// Runs in background thread - never throttled by browser tab inactive state
let timer = null;

self.onmessage = function (e) {
    if (e.data === "start") {
        if (!timer) {
            // Send pulse every 30 seconds
            timer = setInterval(() => {
                self.postMessage("tick");
            }, 30000);
        }
    } else if (e.data === "stop") {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }
};


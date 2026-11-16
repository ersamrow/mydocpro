// Partytown serializes an arguments object as numbered keys without a length.
// Keep gtag commands distinct from ordinary dataLayer entries across the worker.
function forwardEntry(entry) {
  const commands = window.mydocproAnalyticsQueue;
  if (!commands) return;
  if (Object.prototype.toString.call(entry) === "[object Arguments]") {
    const args = Array.from(entry);
    if (args[0] === "js" && args[1] instanceof Date)
      args[1] = args[1].getTime();
    commands.push({ args });
  } else {
    commands.push({ data: entry });
  }
}

// This function runs inside the analytics worker and must be self-contained.
function receiveAnalytics() {
  window.dataLayer ||= [];
  const commands = (window.mydocproAnalyticsQueue ||= []);
  function gtag() {
    window.dataLayer.push(arguments);
  }
  function deliver(message) {
    if (!message.args) {
      window.dataLayer.push(message.data);
      return;
    }
    const args = message.args;
    if (args[0] === "js" && typeof args[1] === "number")
      args[1] = new Date(args[1]);
    gtag(...args);
  }
  commands.forEach(deliver);
  commands.push = (...messages) => messages.forEach(deliver);
}

export function loadAnalyticsWorker(tag) {
  const layer = window.dataLayer;
  const originalPush = layer.push;
  window.mydocproAnalyticsQueue = [];
  layer.forEach(forwardEntry);
  layer.push = function (...entries) {
    const length = originalPush.apply(this, entries);
    entries.forEach(forwardEntry);
    return length;
  };
  window.partytown = { forward: ["mydocproAnalyticsQueue.push"] };
  const bridge = document.createElement("script");
  bridge.type = "text/partytown";
  bridge.setAttribute("data-ptworkeronly", "");
  bridge.textContent = "(" + receiveAnalytics.toString() + ")()";
  tag.type = "text/partytown";
  tag.async = false;
  document.head.append(bridge, tag);

  const loader = document.createElement("script");
  loader.src = "/~partytown/partytown.js";
  loader.onerror = () => {
    layer.push = originalPush;
    delete window.mydocproAnalyticsQueue;
    bridge.remove();
    const fallback = document.createElement("script");
    fallback.id = tag.id;
    fallback.src = tag.src;
    fallback.async = true;
    tag.replaceWith(fallback);
  };
  document.head.appendChild(loader);
}

<script>
  import { createEventDispatcher, onDestroy } from "svelte";

  export let targetSelector = "main";

  /* Design preview size (for your layout) */
  export let width = 3840;
  export let height = 2160;

  /* Encoded resolution (can exceed monitor) */
  export let captureWidth = width;
  export let captureHeight = height;

  export let frameRate = 30;
  export let filename = "export.webm";

  /* Loops: single file, multiple timed segments */
  export let loops = 1; // how many segments
  export let perLoopDurationMs = null; // e.g., 5000; null = no auto loop boundaries
  export let loopSafetySlackMs = 30; // guard for timer drift

  /* Classic props */
  export let enforceSize = true;
  export let hideCursor = true;
  export let fitViewport = true;
  export let gridTemplateDuringRecord = null;

  export let videoBitsPerSecond = 40_000_000;
  export let preferCodecs = [
    "video/webm;codecs=av01",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  export let fullscreenOnStart = false;

  const dispatch = createEventDispatcher();

  let el;
  let recording = false;
  let mediaStream,
    recorder,
    chunks = [];
  let startedAt = 0,
    elapsed = 0,
    tmr;
  let vvResize, winResize, fsChange, dprMql;

  // loop timers
  let currentLoopIndex = 0; // 0-based
  let loopBoundaryAt = 0;
  let loopTimer;

  // save original styles
  let orig = {
    width: "",
    height: "",
    cursor: "",
    overflow: "",
    position: "",
    transform: "",
    transformOrigin: "",
    contain: "",
    isolation: "",
    zIndex: "",
    containerType: "",
    gridTemplateColumns: "",
    backgroundColor: "",
  };
  let bodyOrig = { overflow: "", overscrollBehavior: "" };

  const mmss = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  function ensureTarget() {
    el = document.querySelector(targetSelector);
    if (!el) throw new Error(`Target not found: ${targetSelector}`);
  }

  function viewportSize() {
    const vv = window.visualViewport;
    return vv
      ? { w: vv.width, h: vv.height }
      : { w: innerWidth, h: innerHeight };
  }

  // center/letterbox preview of the capture frame inside viewport
  function scaleToFitViewport() {
    if (!fitViewport) return { k: 1, x: 0, y: 0 };
    const { w, h } = viewportSize();
    const sx = w / captureWidth;
    const sy = h / captureHeight;
    const k = Math.min(sx, sy, 1); // don't upscale preview
    const x = Math.max(0, (w - captureWidth * k) / 2);
    const y = Math.max(0, (h - captureHeight * k) / 2);
    return { k, x, y };
  }

  function applyScale() {
    const { k, x, y } = scaleToFitViewport();
    el.style.transformOrigin = "top left";
    el.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
  }

  function ensurePaintable() {
    try {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch {}
    // Avoid transparent backgrounds -> black in encoder
    const bg = getComputedStyle(el).backgroundColor;
    if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
      orig.backgroundColor = el.style.backgroundColor;
      el.style.backgroundColor =
        getComputedStyle(document.body).backgroundColor || "#000";
    }
    el.style.backdropFilter = "none";
    el.style.webkitBackdropFilter = "none";
  }

  function lockLayout() {
    // save original
    orig.width = el.style.width;
    orig.height = el.style.height;
    orig.cursor = el.style.cursor;
    orig.overflow = el.style.overflow;
    orig.position = el.style.position;
    orig.transform = el.style.transform;
    orig.transformOrigin = el.style.transformOrigin;
    orig.contain = el.style.contain;
    orig.isolation = el.style.isolation;
    orig.zIndex = el.style.zIndex;
    orig.containerType = el.style.containerType;
    orig.gridTemplateColumns = el.style.gridTemplateColumns;

    // size element to the encoded frame so the encoder has real pixels
    if (enforceSize) {
      el.style.width = captureWidth + "px";
      el.style.height = captureHeight + "px";
    }
    el.style.containerType = "size";
    el.style.position = el.style.position || "relative";
    el.style.overflow = "hidden";
    el.style.isolation = "isolate";
    el.style.contain = "layout paint size";

    if (gridTemplateDuringRecord)
      el.style.gridTemplateColumns = gridTemplateDuringRecord;

    ensurePaintable();
    applyScale();
    if (hideCursor) el.style.cursor = "none";

    bodyOrig.overflow = document.body.style.overflow;
    bodyOrig.overscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    addNoScrollHandlers();
    addViewportListeners();
  }

  function unlockLayout() {
    el.style.width = orig.width;
    el.style.height = orig.height;
    el.style.cursor = orig.cursor || "";
    el.style.overflow = orig.overflow || "";
    el.style.position = orig.position || "";
    el.style.transform = orig.transform || "";
    el.style.transformOrigin = orig.transformOrigin || "";
    el.style.contain = orig.contain || "";
    el.style.isolation = orig.isolation || "";
    el.style.zIndex = orig.zIndex || "";
    el.style.containerType = orig.containerType || "";
    el.style.gridTemplateColumns = orig.gridTemplateColumns || "";
    if (orig.backgroundColor !== undefined)
      el.style.backgroundColor = orig.backgroundColor || "";

    document.body.style.overflow = bodyOrig.overflow || "";
    document.body.style.overscrollBehavior = bodyOrig.overscrollBehavior || "";

    removeNoScrollHandlers();
    removeViewportListeners();
  }

  let wheelHandler, touchHandler, keyHandler;
  function addNoScrollHandlers() {
    wheelHandler = (e) => e.preventDefault();
    touchHandler = (e) => e.preventDefault();
    keyHandler = (e) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (
        ["input", "textarea"].includes(tag) ||
        document.activeElement?.isContentEditable
      )
        return;
      const keys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "PageUp",
        "PageDown",
        "Home",
        "End",
        " ",
      ];
      if (keys.includes(e.key)) e.preventDefault();
    };
    window.addEventListener("wheel", wheelHandler, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchmove", touchHandler, {
      passive: false,
      capture: true,
    });
    window.addEventListener("keydown", keyHandler, {
      passive: false,
      capture: true,
    });
    el.addEventListener(
      "scroll",
      () => {
        el.scrollTop = el.scrollLeft = 0;
      },
      { passive: true }
    );
  }
  function removeNoScrollHandlers() {
    window.removeEventListener("wheel", wheelHandler, { capture: true });
    window.removeEventListener("touchmove", touchHandler, { capture: true });
    window.removeEventListener("keydown", keyHandler, { capture: true });
  }

  function addViewportListeners() {
    const vv = window.visualViewport;
    if (fitViewport && vv) {
      vvResize = () => applyScale();
      vv.addEventListener("resize", vvResize, { passive: true });
    }
    winResize = () => applyScale();
    window.addEventListener("resize", winResize, { passive: true });

    fsChange = () => setTimeout(applyScale, 0);
    document.addEventListener("fullscreenchange", fsChange);

    try {
      dprMql = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      dprMql.addEventListener?.("change", applyScale);
    } catch {}
  }
  function removeViewportListeners() {
    const vv = window.visualViewport;
    if (vv && vvResize) vv.removeEventListener("resize", vvResize);
    vvResize = null;

    if (winResize) window.removeEventListener("resize", winResize);
    winResize = null;

    if (fsChange) document.removeEventListener("fullscreenchange", fsChange);
    fsChange = null;

    if (dprMql?.removeEventListener)
      dprMql.removeEventListener("change", applyScale);
    dprMql = null;
  }
  onDestroy(removeViewportListeners);

  function scheduleNextLoopBoundary() {
    if (!perLoopDurationMs) return; // nothing to schedule
    // already at last loop?
    if (currentLoopIndex >= loops - 1) return;

    // expected time for next boundary
    const now = performance.now();
    const elapsedSinceStart = now - startedAt;
    const loopsPassed = Math.floor(elapsedSinceStart / perLoopDurationMs);
    currentLoopIndex = Math.max(currentLoopIndex, loopsPassed);
    loopBoundaryAt = startedAt + (currentLoopIndex + 1) * perLoopDurationMs;

    const delay = Math.max(0, loopBoundaryAt - now - loopSafetySlackMs);
    clearTimeout(loopTimer);
    loopTimer = setTimeout(() => {
      // announce boundary so host can reset slides if it wants
      dispatch("loop", { index: currentLoopIndex, total: loops });
      currentLoopIndex++;
      // if we just finished the last planned loop, stop recording
      if (currentLoopIndex >= loops) {
        stopRecording(); // one file, ends here
      } else {
        scheduleNextLoopBoundary(); // schedule the next one
      }
    }, delay);
  }

  async function startRecording() {
    if (recording) return;
    ensureTarget();

    if (fullscreenOnStart) {
      try {
        await (document.documentElement.requestFullscreen?.() ||
          el.requestFullscreen?.());
      } catch {}
    }

    lockLayout();
    dispatch("recordstart");

    const postPromptRescales = () => {
      applyScale();
      setTimeout(applyScale, 50);
      setTimeout(applyScale, 200);
      setTimeout(applyScale, 500);
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate, cursor: "never" },
        audio: false,
        preferCurrentTab: true,
        surfaceSwitching: "exclude",
        systemAudio: "exclude",
      });
    } catch {
      unlockLayout();
      return;
    }

    postPromptRescales();

    const [track] = stream.getVideoTracks();

    try {
      if ("CropTarget" in window && "cropTo" in track) {
        const target = await window.CropTarget.fromElement(el);
        await track.cropTo(target);
      }

      try {
        track.contentHint = "detail";
      } catch {}

      try {
        await track.applyConstraints({
          width: { exact: captureWidth },
          height: { exact: captureHeight },
          frameRate: { ideal: frameRate, max: frameRate },
        });
      } catch {
        try {
          await track.applyConstraints({
            width: captureWidth,
            height: captureHeight,
            frameRate,
          });
        } catch {}
      }
    } catch {}

    const mimeType =
      preferCodecs.find((t) => MediaRecorder.isTypeSupported(t)) ||
      "video/webm";
    chunks = [];
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
    recorder.ondataavailable = (e) => e.data && chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 20000);

      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {}
      unlockLayout();
      dispatch("recordstop");
    };

    recorder.start(1000);
    recording = true;
    startedAt = performance.now();
    elapsed = 0;
    currentLoopIndex = 0;
    clearInterval(tmr);
    tmr = setInterval(() => {
      elapsed = performance.now() - startedAt;
      // if no perLoopDurationMs, we don't auto stop; user can stop manually
      if (
        perLoopDurationMs &&
        loops === 1 &&
        elapsed >= perLoopDurationMs - loopSafetySlackMs
      ) {
        stopRecording();
      }
    }, 200);

    // schedule loop boundaries (without stopping recorder)
    clearTimeout(loopTimer);
    scheduleNextLoopBoundary();

    mediaStream = stream;
  }

  function stopRecording() {
    if (!recording) return;
    recording = false;
    clearInterval(tmr);
    clearTimeout(loopTimer);
    try {
      recorder?.stop();
    } catch {}
    mediaStream?.getTracks()?.forEach((t) => t.stop());
    mediaStream = null;
  }

  function toggle() {
    recording ? stopRecording() : startRecording();
  }
</script>

<button class="rec" on:click={toggle} aria-label="Record / Stop">
  {#if recording}⏹ {mmss(elapsed)} ({loops > 1 && perLoopDurationMs
      ? `${Math.min(currentLoopIndex + 1, loops)}/${loops}`
      : ""}){:else}⏺ Record{/if}
</button>

<style>
  .rec {
    background: black;
    color: #eee;
    cursor: pointer;
  }
</style>

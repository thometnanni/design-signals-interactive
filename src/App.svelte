<script>
  import Scatter from "./lib/Scatter.svelte";
  import { onMount } from "svelte";
  import data from "./data.json";
  import slides from "./slides.json";
  import Markdown from "./lib/Markdown.svelte";
  import Record from "./lib/Record.svelte";

  const slideDuration = 4;

  let xParam = $state("Norm PCI");
  let groupParam = $state(null);
  let allSections = $state(false);
  let scaleType = $state("symlog");
  let scaleParam = $state(500000000);

  let progress = $state(0);
  let slideId = $state(0);

  let animationFrame = null;
  let slideStart = $state(performance.now());

  function loop(t) {
    const slideMs = slideDuration * 1000;
    const elapsed = t - slideStart;
    progress = Math.min(100, (elapsed / slideMs) * 100);
    if (elapsed >= slideMs) {
      slideId = (slideId + 1) % slides.length;
      slideStart = t;
      progress = 0;
    }
    animationFrame = requestAnimationFrame(loop);
  }

  let slide = $derived(
    await fetch(`slides/${slides[slideId]}`).then((d) =>
      d.text().then((text) => {
        const [, json, md] = text.split("---\n").map((t) => t?.trim());
        const config = JSON.parse(json || '{"products":[]}');
        const filter = {
          key: config.products.length > 0 ? "HS92-4" : null,
          values: config.products.map(({ code }) => code),
        };
        return { filter, md, products: config.products, config };
      })
    )
  );

  onMount(() => {
    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  });

  function resetSlides() {
    slideId = 0;
    progress = 0;
    slideStart = performance.now();
    if (!animationFrame) animationFrame = requestAnimationFrame(loop);
  }

  onMount(() => {
    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  });

  function goToSlide(n) {
    const len = slides.length;
    slideId = ((n % len) + len) % len;
    progress = 0;
    slideStart = performance.now();
    if (!animationFrame) animationFrame = requestAnimationFrame(loop);
  }
  function prevSlide() {
    goToSlide(slideId - 1);
  }
  function nextSlide() {
    goToSlide(slideId + 1);
  }

  function onRecordStart() {
    resetSlides();
  }
  function onLoop(e) {
    resetSlides();
    console.log("Loop reached", e.detail);
  }
  function onRecordStop() {
    console.log("Recording finished");
  }

  const loops = 1;
  const durationMs = slideDuration * slides.length * loops * 1000;
</script>

<nav>
  <Record
    targetSelector="#record"
    width={3840}
    height={2160}
    captureWidth={3840}
    captureHeight={2160}
    frameRate={30}
    videoBitsPerSecond={80_000_000}
    enforceSize
    hideCursor
    fitViewport
    gridTemplateDuringRecord="2160px 1fr"
    {loops}
    perLoopDurationMs={durationMs}
    on:recordstart={onRecordStart}
    on:loop={onLoop}
    on:recordstop={onRecordStop}
  />

  <button onclick={prevSlide} aria-label="previous chapter">prev</button>
  <button onclick={nextSlide} aria-label="next chapter">next</button>
</nav>

<main id="record">
  <Scatter
    {data}
    {xParam}
    {groupParam}
    {allSections}
    {scaleType}
    {scaleParam}
    filter={slide?.filter}
    products={slide?.products}
    config={slide?.config}
  />

  <Markdown md={slide?.md} {progress} {slideId} totalSlides={slides.length} />
</main>

<style>
  main {
    display: grid;
    width: 100%;
    height: 100vh;
    grid-template-columns: 50% 1fr;
    grid-template-rows: 1fr;
    margin: 0;
    padding: 0;
  }

  nav {
    position: fixed;
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 20px;
    opacity: 0;
  }
  nav:hover {
    opacity: 1;
  }
</style>

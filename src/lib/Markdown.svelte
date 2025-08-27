<script>
  import { marked } from "marked";
  import { fade } from "svelte/transition";

  let { md, progress, slideId, totalSlides } = $props();

  let newHtml = $derived(md && marked.parse(md));

  let currentHtml = $state(marked.parse(md)); // what is currently shown
  let pendingHtml = null; // next html waiting
  let show = $state(true); // controls visibility for fade

  // Detect content change -> start fade out first

  $effect(() => {
    if (newHtml && newHtml !== currentHtml && newHtml !== pendingHtml) {
      pendingHtml = newHtml;
      if (show) show = false;
    }
  });

  function handleOutroEnd() {
    if (pendingHtml) {
      currentHtml = pendingHtml;
      pendingHtml = null;
    }
    show = true; // triggers in:fade after old fully gone
  }
</script>

<section class="info">
  <div class="progress-row">
    <span class="counter">{slideId + 1} / {totalSlides}</span>
    <div
      class="progress"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(progress)}
    >
      <div
        class="progress__bar"
        style={`transform: scaleX(${progress / 100});`}
      ></div>
    </div>
  </div>

  {#if show}
    <div
      class="markdown-fragment"
      in:fade={{ duration: 750 }}
      out:fade={{ duration: 750 }}
      onoutroend={handleOutroEnd}
    >
      {@html currentHtml}
    </div>
  {/if}
</section>

<style>
  .info {
    padding: 0.5vw 1vw;
    border-left: 1px solid var(--secondary);
    color: var(--primary);
    font-size: 2vw;
    line-height: 1.2;
    height: calc(100vh - 2vw);
    overflow: hidden;
    background: var(--background);
    /* display: flex;
    align-content: flex-end;
    flex-direction: column-reverse; */

    :global(p) {
      margin: 0 0 1ch 0;
      font-weight: 500;
    }

    :global(h1) {
      font-size: 1.1vw;
      line-height: 1;
      color: var(--primary);
      margin: 0 0 2ch 0;
      font-weight: 400;
      margin-left: calc(3vw + 10px);
    }
    /* 
    :global(strong) {
      font-style: normal;
      color: var(--secondary);
    } */

    :global(em) {
      font-style: normal;
      color: var(--secondary);
    }

    .progress-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 0.2ch;
    }

    .counter {
      font-size: 1vw;
      color: var(--secondary);
      width: 3vw;
    }

    .progress {
      flex: 1;
      height: 5px;
      background: color-mix(in srgb, var(--secondary) 20%, transparent);
      overflow: hidden;

      .progress__bar {
        height: 100%;
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 120ms linear;
        background: var(--secondary);
      }
    }
  }
</style>

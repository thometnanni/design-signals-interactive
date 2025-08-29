<script>
  import { marked } from "marked";
  import { fade } from "svelte/transition";

  let { md, progress, slideId, totalSlides } = $props();

  function splitByHrAndWrap(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    let titleEl = null;
    let node = tmp.firstChild;
    while (node && node.nodeType === 3 && !node.textContent.trim())
      node = node.nextSibling;
    if (node && node.nodeType === 1 && /^H1$/i.test(node.tagName)) {
      titleEl = node;
      tmp.removeChild(node);
    }

    const hr = tmp.querySelector("hr");

    const ro = document.createElement("div");
    ro.className = "lang ro";
    if (hr) {
      let n = tmp.firstChild;
      while (n && n !== hr) {
        const next = n.nextSibling;
        ro.appendChild(n);
        n = next;
      }
      hr.remove();
    } else {
      while (tmp.firstChild) ro.appendChild(tmp.firstChild);
    }

    const en = document.createElement("div");
    en.className = "lang en";
    while (tmp.firstChild) en.appendChild(tmp.firstChild);

    const titleHtml = titleEl ? titleEl.outerHTML : "";
    return `${titleHtml}${ro.outerHTML}${en.outerHTML}`;
  }

  let newHtml = $derived(md ? splitByHrAndWrap(marked.parse(md)) : "");

  let currentHtml = $state(newHtml);
  let pendingHtml = null;
  let show = $state(true);

  $effect(() => {
    const parsed = md ? splitByHrAndWrap(marked.parse(md)) : "";
    if (parsed && parsed !== currentHtml && parsed !== pendingHtml) {
      pendingHtml = parsed;
      if (show) show = false;
    }
  });

  function handleOutroEnd() {
    if (pendingHtml) {
      currentHtml = pendingHtml;
      pendingHtml = null;
    }
    show = true;
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
    padding: 0.5cqh 1cqh;
    border-left: 1px solid var(--secondary);
    color: var(--primary);
    font-size: 1.9cqw;
    line-height: 1.2;
    height: calc(100cqh - 1cqh);
    overflow: hidden;
    background: var(--background);

    :global(p) {
      margin: 0 0 1ch 0;
      font-weight: 500;
    }

    :global(h1) {
      font-size: 1.1cqw;
      line-height: 1;
      color: var(--primary);
      margin: 0 0 2ch 0;
      font-weight: 400;
      margin-left: calc(3cqw + 10px);
    }

    .progress-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 0.2ch;
    }

    .counter {
      font-size: 0.8cqw;
      color: var(--secondary);
      width: 3cqw;
    }

    .progress {
      flex: 1;
      height: 5px;
      background: color-mix(in srgb, var(--secondary) 20%, transparent);
      overflow: hidden;
    }
    .progress .progress__bar {
      height: 100%;
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 120ms linear;
      background: var(--secondary);
    }

    :global(.lang) {
      height: 43cqh;
    }

    :global(.lang:first-of-type) {
      border-bottom: 1px solid var(--secondary);
      margin-bottom: 1em;
    }

    :global(.markdown-fragment .lang.ro *:first-child)::before,
    :global(.markdown-fragment .lang.en *:first-child)::before {
      display: inline-flex;
      align-items: center;
      justify-content: center;

      width: 1.2em;
      height: 1.2em;
      margin-right: 0.2em;

      font-size: 0.8em;
      padding: 0 0.2ch;
      background: var(--secondary);
      color: var(--background);
    }

    :global(.markdown-fragment .lang.ro *:first-child)::before {
      content: "RO";
    }

    :global(.markdown-fragment .lang.en *:first-child)::before {
      content: "EN";
    }
  }
</style>

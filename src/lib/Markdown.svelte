<script>
  import { marked } from "marked";
  import { fade } from "svelte/transition";

  let { md } = $props();

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
    padding: 1vh 5vh;
    border-left: 1px solid var(--secondary);
    color: var(--primary);
    font-size: 24px;
    height: 98vh;
    overflow: hidden;

    :global(h1) {
      font-size: 3em;
      color: var(--primary);
    }

    :global(em) {
      font-style: normal;
      color: var(--secondary);
    }
  }
</style>

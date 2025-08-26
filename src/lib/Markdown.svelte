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
    padding: 1vw;
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
  }
</style>

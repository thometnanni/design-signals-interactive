<script>
  import { marked } from "marked";

  let { md } = $props();

  let markdown = $derived(md && marked.parse(md));
</script>

<section class="info">
  {@html markdown}
</section>

<style>
  .info {
    /* background-color: var(--secondary); */
    padding: 1vh 5vh;

    border-left: 1px solid var(--secondary);

    color: var(--primary);

    font-size: 24px;

    :global(h1) {
      font-size: 3em;
      color: var(--secondary);
    }
  }
</style>

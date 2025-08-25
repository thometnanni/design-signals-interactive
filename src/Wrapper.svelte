<script>
  import App from "./App.svelte";
</script>

<svelte:boundary>
  <App />

  {#snippet pending()}
    <p>loading...</p>
  {/snippet}
</svelte:boundary>

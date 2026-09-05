<script>
  import App from "./App.svelte";
  import Home from "./Home.svelte";

  let showApp = $state(window.location.hash === "#app");

  function enterApp() {
    showApp = true;
    window.location.hash = "app";
  }

  window.addEventListener("hashchange", () => {
    showApp = window.location.hash === "#app";
  });
</script>

<svelte:boundary>
  {#if showApp}
    <App />
  {:else}
    <Home onEnter={enterApp} />
  {/if}

  {#snippet pending()}
    <p>loading...</p>
  {/snippet}
</svelte:boundary>

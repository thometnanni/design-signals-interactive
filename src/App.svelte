<script>
  import Scatter from "./lib/Scatter.svelte";
  import data from "./data.json";

  const parameters = $derived(data.parameterKeys);
  let xParam = $state("Norm PCI");
  let allSections = $state(false);
</script>

<main>
  <nav>
    <select bind:value={xParam}>
      {#each parameters as param}
        <option value={param}>{param}</option>
      {/each}
    </select>
    <label>
      <input type="checkbox" bind:checked={allSections} />
      All sections
    </label>
  </nav>
  <Scatter {data} {xParam} {allSections} />
</main>

<style>
  main {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 40px 1fr;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;

    nav {
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 20px;
    }
  }
</style>

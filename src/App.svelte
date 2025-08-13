<script>
  import Scatter from "./lib/Scatter.svelte";
  import data from "./data.json";

  const parameters = $derived(data.parameterKeys);
  const verticals = $derived(
    [
      null,
      ...new Set(data.items.map((item) => item["Chemical Vertical"])),
    ].filter((vertical) => vertical !== "Non-chemical")
  );
  const scales = ["linear", "pow", "symlog"];

  $effect(() => console.log(verticals));
  let xParam = $state("Norm PCI");

  let groupParam = $state(null);
  let allSections = $state(false);
  let scaleType = $state("symlog");
  let scaleParam = $state(500000000);
</script>

<main>
  <nav>
    <select bind:value={xParam}>
      {#each parameters as param}
        <option value={param}>{param}</option>
      {/each}
    </select>

    <select bind:value={groupParam}>
      {#each verticals as param}
        <option value={param}>{param ?? "No grouping"}</option>
      {/each}
    </select>

    <label>
      <input type="checkbox" bind:checked={allSections} />
      All sections
    </label>

    <select bind:value={scaleType}>
      {#each scales as type}
        <option value={type}>{type}</option>
      {/each}
    </select>

    <label>
      <input type="number" bind:value={scaleParam} />
      scale parameter
    </label>
  </nav>
  <Scatter
    {data}
    {xParam}
    {groupParam}
    {allSections}
    {scaleType}
    {scaleParam}
  />
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

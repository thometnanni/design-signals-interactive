<script>
  import Scatter from "./lib/Scatter.svelte";
  import { onMount } from "svelte";
  import data from "./data.json";
  import slides from "./slides.json";
  import Markdown from "./lib/Markdown.svelte";

  const slideDuration = 50;

  const parameters = $derived(data.parameterKeys);
  const verticals = $derived(
    [
      null,
      ...new Set(data.items.map((item) => item["Chemical Vertical"])),
    ].filter((vertical) => vertical !== "Non-chemical")
  );
  const scales = ["linear", "pow", "symlog"];

  let xParam = $state("Norm PCI");
  let groupParam = $state(null);
  let allSections = $state(false);
  let scaleType = $state("symlog");
  let scaleParam = $state(500000000);

  let progress = $state(0);
  let slideId = $state(0);

  let animationFrame = null;
  let plays = $state(false);
  function loop(t) {
    // if (!play) return;

    const p = (t / 1000 / slideDuration) % slides.length;

    progress = (p % 1) * 100;
    slideId = Math.floor(p);
    plays = true;
    animationFrame = requestAnimationFrame(loop);
  }

  // let slide = $derived.by(async () => {
  //   console.log(`slide ${slideId}`);
  //   const slide = await fetch(`slides/${slides[slideId]}`).then((d) =>
  //     d.text()
  //   );
  //   console.log(slide);

  //   return slide;
  // });

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

  function goToSlide(n) {
    const len = slides.length;
    slideId = ((n % len) + len) % len;
    progress = 0;
  }

  function prevSlide() {
    if (plays) {
      cancelAnimationFrame(animationFrame);
      plays = false;
    }
    goToSlide(slideId - 1);
  }

  function nextSlide() {
    if (plays) {
      cancelAnimationFrame(animationFrame);
      plays = false;
    }
    goToSlide(slideId + 1);
  }
</script>

<main>
  <nav>
    <button onclick={prevSlide} aria-label="previous chapter">prev</button>

    <button onclick={nextSlide} aria-label="next chapter">next </button>

    <!-- <select bind:value={xParam}>
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
    </label> -->
  </nav>
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
  <Markdown md={slide?.md} />
</main>

<style>
  main {
    display: grid;
    grid-template-columns: 100vh 1fr;
    grid-template-rows: 1fr;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;

    nav {
      opacity: 0;
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 20px;
      position: absolute;

      &:hover {
        opacity: 1;
      }
    }
  }
</style>

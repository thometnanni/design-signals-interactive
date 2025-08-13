<script>
  import SmallMultiple from "./SmallMultiple.svelte";
  import { scaleLinear } from "d3-scale";
  let { data, xParam, allSections, groupParam } = $props();

  let chartWidth = $state(0);
  let chartHeight = $state(0);
  let svgEl;
  let hoveredItem = $state(null);

  const paddingTop = 50;
  const paddingBottom = 50;
  const paddingRight = 50;
  const paddingLeft = 50;

  const smallMultipleWidth = 150;
  const smallMultipleHeight = 300;

  // const xParam = "PCI";

  let mostRecent = $derived(data.years.length - 1);

  let innerChartHeight = $derived(
    chartHeight - paddingTop - paddingBottom - smallMultipleHeight
  );
  let innerChartWidth = $derived(
    chartWidth - paddingLeft - paddingRight - smallMultipleWidth
  );

  function handleItemHover(item) {
    hoveredItem = item;
  }

  function handleItemMouseOut() {
    hoveredItem = null;
  }

  const yDomain = $derived.by(() => {
    const max = data.items
      .map(({ parameters }) => parameters.tradeBalanceDiff[mostRecent])
      .reduce((a, b) => Math.max(Math.abs(a), Math.abs(b)), 0);

    return [max, -max];
  });
  const yScale = $derived.by(() => {
    const [max, min] = yDomain;
    const maxAsinh = Math.asinh(max / 3000000); // Adjust divisor for scaling
    const minAsinh = Math.asinh(min / 3000000);

    return (value) => {
      const asinhValue = Math.asinh(value / 3000000);
      const normalized = (asinhValue - minAsinh) / (maxAsinh - minAsinh);
      return innerChartHeight * (1 - normalized); // Flip for SVG
    };
  });

  const xDomain = $derived.by(() => {
    const min = Math.min(
      ...data.items.map(({ parameters }) => parameters[xParam][mostRecent])
    );
    const max = Math.max(
      ...data.items.map(({ parameters }) => parameters[xParam][mostRecent])
    );

    return [min, max];
  });

  const xScale = $derived(
    scaleLinear().domain(xDomain).range([0, innerChartWidth])
  );

  $effect(() => {
    console.log("Data loaded:", data);
  });

  $effect(() => {
    console.log(xScale(xDomain[1]), xDomain[1].toLocaleString(), xDomain[1]);
  });
</script>

<svg
  width="100%"
  height="100%"
  bind:this={svgEl}
  bind:clientWidth={chartWidth}
  bind:clientHeight={chartHeight}
>
  <g
    transform="translate({paddingLeft + smallMultipleWidth / 2}, {paddingTop +
      smallMultipleHeight / 2})"
  >
    <g class="items">
      {#each data.items as item}
        {#if allSections || item["HS92 Section"] === "Chemicals"}
          <g
            transform="translate({xScale(
              item.parameters[xParam][mostRecent]
            )}, {yScale(item.parameters.tradeBalanceDiff[mostRecent])})"
          >
            <SmallMultiple
              {item}
              values={item.parameters.tradeBalanceDiff}
              years={data.years}
              {yDomain}
              width={smallMultipleWidth}
              height={smallMultipleHeight}
              onHover={handleItemHover}
              onMouseOut={handleItemMouseOut}
              {groupParam}
            ></SmallMultiple>
          </g>
        {/if}
      {/each}
    </g>
  </g>

  <!-- Metadata display -->
  {#if hoveredItem}
    <g class="metadata" transform="translate(20, 20)">
      <rect
        width="300"
        height="140"
        fill="white"
        stroke="black"
        rx="5"
        opacity="0.9"
      ></rect>
      <text x="10" y="20" font-family="Arial" font-size="14" font-weight="bold">
        {hoveredItem["HS92-4 Short Label"]}
      </text>
      <text x="10" y="40" font-family="Arial" font-size="12">
        Section: {hoveredItem["HS92 Section"]}
      </text>
      <text x="10" y="60" font-family="Arial" font-size="12">
        HS92-4: {hoveredItem["HS92-4"]}
      </text>
      <text x="10" y="80" font-family="Arial" font-size="12">
        Trade Balance Diff: {hoveredItem.parameters.tradeBalanceDiff[
          mostRecent
        ]?.toLocaleString() || "N/A"}
      </text>
      <text x="10" y="100" font-family="Arial" font-size="12">
        Trade Balance: {hoveredItem.parameters.tradeBalance[
          mostRecent
        ]?.toLocaleString() || "N/A"}
      </text>
      <text x="10" y="120" font-family="Arial" font-size="12">
        {xParam}: {hoveredItem.parameters[xParam][
          mostRecent
        ]?.toLocaleString() || "N/A"}
      </text>
    </g>
  {/if}
</svg>

<style>
  svg {
    cursor: crosshair;
  }
</style>

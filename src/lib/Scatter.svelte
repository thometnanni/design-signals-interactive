<script>
  import SmallMultiple from "./SmallMultiple.svelte";
  import { scaleLinear } from "d3-scale";
  let { data, xParam, allSections, groupParam, scaleType, scaleParam, filter } =
    $props();

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

  let axisHeight = $derived(chartHeight - paddingTop - paddingBottom);

  let innerChartHeight = $derived(
    chartHeight - paddingTop - paddingBottom - smallMultipleHeight
  );

  let axisWidth = $derived(chartWidth - paddingLeft - paddingRight);

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

  const yTicks = $derived(
    "-"
      .repeat(33)
      .split("")
      .map((_, i, { length }) => {
        const center = i === (length - 1) / 2;
        const outside = i === 0 || i === length - 1;
        const level = i % 16 === 0 ? 1 : i % 4 === 0 ? 2 : 3;

        const y = (axisHeight / (length - 1)) * i;
        return { center, y, outside, level };
      })
  );

  const xTicks = $derived(
    "-"
      .repeat(33)
      .split("")
      .map((_, i, { length }) => {
        const center = i === (length - 1) / 2;
        const outside = i === 0 || i === length - 1;
        const level = i % 16 === 0 ? 1 : i % 4 === 0 ? 2 : 3;

        const x = (axisWidth / (length - 1)) * i;
        return { center, x, outside, level };
      })
  );
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
              {filter}
              {scaleType}
              {scaleParam}
            ></SmallMultiple>
          </g>
        {/if}
      {/each}
    </g>
  </g>
  <g class="axes" transform="translate({paddingLeft}, {paddingTop})">
    <g class="y-ticks">
      {#each yTicks as { center, outside, y, level }}
        <g transform="translate(0, {y})">
          <line
            x2={axisWidth}
            class={[`level-${level}`, { center, outside }]}
          />
        </g>
      {/each}
    </g>
    <g class="x-ticks">
      {#each xTicks as { center, outside, x, level }}
        <g transform="translate({x}, 0)">
          <line
            y2={axisHeight}
            class={[`level-${level}`, { center, outside }]}
          />
        </g>
      {/each}
    </g>
    <g class="labels">
      {#each [0, 1] as index}
        <g
          transform="translate(0, {(axisHeight + paddingTop) * index -
            paddingTop / 2})"
        >
          <text x={axisWidth / 2} text-anchor="middle">
            product complexity
          </text>
          <text transform="translate({axisWidth * 0.125}, 0)"> low </text>
          <text transform="translate({axisWidth * 0.875}, 0)"> high </text>
          <text transform="translate({axisWidth * 0.75}, 0)"> → </text>
          <text transform="translate({axisWidth * 0.25}, 0)"> ← </text>
          <text transform="translate({axisWidth * 0.625}, 0)"> → </text>
          <text transform="translate({axisWidth * 0.375}, 0)"> ← </text>
          {#if !index}
            <text transform="translate({axisWidth + paddingLeft / 2}, 0)">
              +
            </text>
          {:else}
            <text transform="translate({-paddingLeft / 2}, 0)"> –</text>
          {/if}
        </g>
      {/each}

      {#each [0, 1] as index}
        <g
          transform="translate({(axisWidth + paddingLeft) * index -
            paddingLeft / 2}, 0)"
        >
          <text
            text-anchor="middle"
            transform="translate(0, {axisHeight / 2}) rotate(-90)"
          >
            trade balance
          </text>
          <text transform="translate(0, {axisHeight * 0.125}) rotate(-90)">
            largely exported
          </text>
          <text transform="translate(0, {axisHeight * 0.875}) rotate(-90)">
            largely imported
          </text>
          <text transform="translate(0, {axisHeight * 0.75}) rotate(-90)">
            ←
          </text>
          <text transform="translate(0, {axisHeight * 0.25}) rotate(-90)">
            →
          </text>
          <text transform="translate(0, {axisHeight * 0.625}) rotate(-90)">
            ←
          </text>
          <text transform="translate(0, {axisHeight * 0.375}) rotate(-90)">
            →
          </text>
        </g>
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

    .axes {
      line {
        stroke: var(--color-axis);
        opacity: 0.2;
      }

      .level-1 {
        opacity: 1;
      }

      .level-2 {
        opacity: 0.5;
      }

      .outside {
        opacity: 0;
      }

      .labels {
        dominant-baseline: central;
        fill: var(--color-axis-labels);
        text-anchor: middle;
      }
    }
  }
</style>

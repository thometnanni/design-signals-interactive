<script>
  import { zoom, zoomIdentity } from "d3-zoom";
  import { select } from "d3-selection";
  import { onDestroy, onMount, tick } from "svelte";
  import SmallMultiple from "./SmallMultiple.svelte";
  import { scaleLinear } from "d3-scale";
  import { easeQuadInOut } from "d3-ease";
  let {
    data,
    xParam,
    allSections,
    groupParam,
    scaleType,
    scaleParam,
    filter,
    products,
    config,
  } = $props();

  let container;
  let chartWidth = $state(0);
  let chartHeight = $state(0);
  let hoveredItem = $state(null);

  let selection;
  let zoomBehavior;

  const paddingTop = 50;
  const paddingBottom = 50;
  const paddingRight = 50;
  const paddingLeft = 50;

  const smallMultipleWidth = 150;
  const smallMultipleHeight = 300;

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
    const maxAsinh = Math.asinh(max / 3000000);
    const minAsinh = Math.asinh(min / 3000000);

    return (value) => {
      const asinhValue = Math.asinh(value / 3000000);
      const normalized = (asinhValue - minAsinh) / (maxAsinh - minAsinh);
      return innerChartHeight * (1 - normalized);
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

  let transform = $state();

  onMount(async () => {
    await tick();
    selection = select(container);

    zoomBehavior = zoom()
      .scaleExtent([1, 3])
      .on("zoom", (event) => {
        transform = event.transform;
      });

    selection.call(zoomBehavior);
  });

  onDestroy(() => {
    selection.on(".zoom", null);
  });

  const items = $derived(
    data.items.map((item) => {
      const x = xScale(item.parameters[xParam][mostRecent]);
      const y = yScale(item.parameters.tradeBalanceDiff[mostRecent]);
      return { x, y, ...item };
    })
  );

  function findProductConfig(code) {
    return products?.find?.((p) => p.code === code) ?? {};
  }
  function mergeConfigs(slideCfg, productCfg) {
    return {
      ...(slideCfg ?? {}),
      ...(productCfg ?? {}),
      label: productCfg?.label ?? slideCfg?.label ?? "top",
      annotations: {
        years:
          productCfg?.annotations?.years ??
          slideCfg?.annotations?.years ??
          true,
        label:
          productCfg?.annotations?.label ??
          slideCfg?.annotations?.label ??
          true,
      },
    };
  }

  const extent = $derived.by(() => {
    if (!filter || filter.key == null) return [0, 0, axisWidth, axisHeight];

    const active = items.filter((it) =>
      filter?.values?.includes(it[filter?.key])
    );

    const minX = Math.max(
      Math.min(axisWidth / 2, ...active.map(({ x }) => x)) - axisWidth / 16,
      0
    );
    const maxX = Math.min(
      Math.max(
        axisWidth / 2,
        ...active.map(({ x }) => x + smallMultipleWidth)
      ) +
        axisWidth / 16,
      axisWidth
    );

    const minY = Math.max(
      Math.min(axisHeight / 2, ...active.map(({ y }) => y)) - axisHeight / 16,
      0
    );
    const maxY = Math.min(
      Math.max(
        axisHeight / 2,
        ...active.map(({ y }) => y + smallMultipleHeight)
      ) +
        axisHeight / 16,
      axisHeight
    );

    return [minX, minY, maxX, maxY];
  });

  $effect(() => {
    if (!extent || !selection || !zoomBehavior) return;

    const [minX, minY, maxX, maxY] = extent;
    const extW = Math.max(1, maxX - minX);
    const extH = Math.max(1, maxY - minY);

    // compute scale to fit extent into available inner chart area, leave a small margin
    const margin = 1;
    let k = Math.min(axisWidth / extW, axisHeight / extH) * margin;

    // clamp to zoomBehavior scaleExtent
    const [minK, maxK] = zoomBehavior.scaleExtent();
    k = Math.max(minK, Math.min(maxK, k));
    // extent is positioned inside the axes group which is translated by paddingLeft/paddingTop
    const targetCenterX = paddingLeft + minX + extW / 2;
    const targetCenterY = paddingTop + minY + extH / 2;

    // compute translation so the target center is centered in the SVG viewport
    let tx = chartWidth / 2 - k * targetCenterX;
    let ty = chartHeight / 2 - k * targetCenterY;

    const x0 = 0,
      y0 = 0,
      x1 = chartWidth,
      y1 = chartHeight;
    const minTx = chartWidth - k * x1;
    const maxTx = -k * x0;
    const minTy = chartHeight - k * y1;
    const maxTy = -k * y0;
    tx = Math.max(minTx, Math.min(maxTx, tx));
    ty = Math.max(minTy, Math.min(maxTy, ty));

    const t = zoomIdentity.translate(tx, ty).scale(k);

    // apply a transition
    selection
      .transition()
      .duration(750)
      .ease(easeQuadInOut)
      .call(zoomBehavior.transform, zoomIdentity)
      .transition()
      .ease(easeQuadInOut)
      .duration(750)
      .call(zoomBehavior.transform, t);
  });

  $effect(() => console.log(products));

  const getAxisPosition = (axis, fraction) => {
    const k = transform?.k ?? 1;
    const tx = transform?.x ?? 0;
    const ty = transform?.y ?? 0;

    switch (axis) {
      case "x": {
        // content (data) coordinate along x (include left padding)
        const contentX = paddingLeft + axisWidth * fraction;
        // screen coordinate after zoom/pan: k * content + tx
        return k * contentX + tx - paddingLeft;
      }
      case "y": {
        const contentY = paddingTop + axisHeight * fraction;
        return k * contentY + ty - paddingTop;
      }
    }
  };
</script>

<svg
  width="100%"
  height="100%"
  bind:this={container}
  bind:clientWidth={chartWidth}
  bind:clientHeight={chartHeight}
>
  <g {transform}>
    <g
      transform="translate({paddingLeft + smallMultipleWidth / 2}, {paddingTop +
        smallMultipleHeight / 2})"
    >
      <g class="items">
        {#each items as item}
          {#if allSections || item["HS92 Section"] === "Chemicals"}
            <g transform="translate({item.x}, {item.y})">
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
                zoom={transform?.k ?? 1}
                config={mergeConfigs(config, findProductConfig(item["HS92-4"]))}
              ></SmallMultiple>
            </g>
          {/if}
        {/each}
      </g>
    </g>
    <g class="axes" transform="translate({paddingLeft}, {paddingTop})">
      <!-- {#if extent}
        <rect
          class="extent"
          x={extent[0]}
          y={extent[1]}
          width={extent[2] - extent[0]}
          height={extent[3] - extent[1]}
        />
      {/if} -->
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
    </g>
  </g>
  <g>
    <g class="backgrounds">
      <rect height={paddingTop} width={chartWidth} />
      <rect
        y={chartHeight - paddingTop}
        height={paddingTop}
        width={chartWidth}
      />
      <rect height={chartHeight} width={paddingLeft} />
      <rect
        x={chartWidth - paddingLeft}
        height={chartHeight}
        width={paddingLeft}
      />
    </g>

    <g class="axes" transform="translate({paddingLeft}, {paddingTop})">
      <g class="labels">
        {#each [0, 1] as index}
          <g
            transform="translate(0, {(axisHeight + paddingTop) * index -
              paddingTop / 2})"
          >
            <text transform="translate({getAxisPosition('x', 0.5)}, 0)">
              product complexity
            </text>
            <text transform="translate({getAxisPosition('x', 0.125)}, 0)">
              low
            </text>
            <text transform="translate({getAxisPosition('x', 0.875)}, 0)">
              high
            </text>
            <text transform="translate({getAxisPosition('x', 0.75)}, 0)">
              →
            </text>
            <text transform="translate({getAxisPosition('x', 0.25)}, 0)">
              ←
            </text>
            <text transform="translate({getAxisPosition('x', 0.625)}, 0)">
              →
            </text>
            <text transform="translate({getAxisPosition('x', 0.375)}, 0)">
              ←
            </text>
            <!-- {#if !index}
              <text
                transform="translate({getAxisPosition('x', 1) +
                  paddingLeft / 2}, 0)"
              >
                +
              </text>
            {:else}
              <text transform="translate({getAxisPosition('x', 0)}, 0">
                –
              </text>
            {/if} -->
          </g>
        {/each}

        {#each [0, 1] as index}
          <g
            transform="translate({(axisWidth + paddingLeft) * index -
              paddingLeft / 2}, 0)"
          >
            <text
              text-anchor="middle"
              transform="translate(0, {getAxisPosition(
                'y',
                1 / 2
              )}) rotate(-90)"
            >
              trade balance
            </text>
            <text
              transform="translate(0, {getAxisPosition(
                'y',
                0.125
              )}) rotate(-90)"
            >
              largely exported
            </text>
            <text
              transform="translate(0, {getAxisPosition(
                'y',
                0.875
              )}) rotate(-90)"
            >
              largely imported
            </text>
            <text
              transform="translate(0, {getAxisPosition('y', 0.75)}) rotate(-90)"
            >
              ←
            </text>
            <text
              transform="translate(0, {getAxisPosition('y', 0.25)}) rotate(-90)"
            >
              →
            </text>
            <text
              transform="translate(0, {getAxisPosition(
                'y',
                0.625
              )}) rotate(-90)"
            >
              ←
            </text>
            <text
              transform="translate(0, {getAxisPosition(
                'y',
                0.375
              )}) rotate(-90)"
            >
              →
            </text>
          </g>
        {/each}
      </g>
    </g>
  </g>

  {#if hoveredItem}
    <g class="metadata" transform="translate(20, 20)">
      <rect
        width="300"
        height="140"
        fill="white"
        stroke="black"
        rx="5"
        opacity="0.9"
      />
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

    * {
      vector-effect: non-scaling-stroke;
    }

    .backgrounds rect {
      fill: var(--background);
    }

    .axes {
      line {
        stroke: var(--color-axis);
        opacity: 0.15;
      }

      .level-1 {
        opacity: 1;
      }
      .level-2 {
        opacity: 0.3;
      }
      
      .level-3 {
        opacity: 0.1;
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

    .extent {
      fill: red;
      opacity: 0.1;
    }
  }
</style>

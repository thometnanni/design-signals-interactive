<script>
  import { scaleSymlog, scaleLinear, scalePow } from "d3-scale";
  let {
    values,
    years,
    yDomain,
    width,
    height,
    item,
    onHover,
    onMouseOut,
    groupParam,
    scaleType,
    scaleParam,
    filter,
    zoom,
    config,
  } = $props();

  const baseWidth = 200;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const s = $derived(clamp(width / baseWidth, 0.5, 2));

  let labelPref = $derived((config?.label ?? "auto").toLowerCase());
  let showYears = $derived(config?.annotations?.years ?? true);
  let showProductLabel = $derived(config?.annotations?.label ?? true);

  const labelPad = 4;
  const labelBaseSize = 15;
  const yearFontBase = 10;
  const strokeBase = 2;
  const selectedStrokeBase = 6;

  const labelPadScaled = $derived(labelPad * s);
  const labelSize = $derived(labelBaseSize * s);
  const yearFont = $derived(yearFontBase * s);
  const strokeWidth = $derived(strokeBase * s);
  const hitStroke = $derived(selectedStrokeBase * s);

  let yScale = $derived.by(() => {
    switch (scaleType) {
      case "symlog":
        return scaleSymlog()
          .domain(yDomain)
          .range([-height / 2, height / 2])
          .constant(scaleParam);
      case "linear":
        return scaleLinear()
          .domain(yDomain)
          .range([-height / 2, height / 2]);
      case "pow":
        return scalePow()
          .domain(yDomain)
          .range([-height / 2, height / 2])
          .exponent(scaleParam);
    }
  });

  let xScale = $derived(
    scaleLinear()
      .domain([0, years.length - 1])
      .range([-width / 2, width / 2])
  );

  function computeLabel(i, pref, text) {
    const pad = labelPadScaled / zoom;
    const font = labelSize / zoom;

    const xs = years.map((_, k) => xScale(k));
    const ys = values.map((v) => yScale(v));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;

    const topY = minY - pad * 2;
    const bottomY = maxY + pad * 2;
    const padX = pad * 5 + font * 0.4;
    const leftX = minX - padX;
    const rightX = maxX + padX;

    const placements = {
      top: { x: cx, y: topY, anchor: "middle", baseline: "alphabetic" },
      bottom: { x: cx, y: bottomY, anchor: "middle", baseline: "hanging" },
      left: { x: leftX, y: 0, anchor: "end", baseline: "middle" },
      right: { x: rightX, y: 0, anchor: "start", baseline: "middle" },
    };

    if (pref === "auto") return placements.right;
    return placements[pref] ?? placements.right;
  }

  let path = $derived.by(() => {
    const points = values.map((v, i) => `${xScale(i)}, ${yScale(v)}`);
    return `M${points.join(" ")}`;
  });

  let section = $derived(item["HS92 Section"].toLowerCase());
  let product = $derived(item["HS92-4 Short Label"]);
  let productLower = $derived(product.toLowerCase());
  let group = $derived(
    groupParam && groupParam === item["Chemical Vertical"] ? "group" : ""
  );

  let faded = $derived(
    filter?.key != null && !filter?.values?.includes(item[filter?.key])
  );

  function handleMouseEnter() {
    onHover?.(item);
  }
  function handleMouseLeave() {
    onMouseOut?.();
  }

  let firstYearY = $derived(yScale(values[0]));
  let lastYearY = $derived(yScale(values[years.length - 1]));

  const labelIndex = $derived(() => {
    if (labelPref === "left") return 0;
    if (labelPref === "right") return years.length - 1;
    return years.length - 1;
  });

  const labelPlacement = $derived.by(() => {
    if (!showProductLabel) return null;
    return computeLabel(labelIndex, labelPref, product);
  });
</script>

<g class={[section, productLower, group, { faded }]}>
  <g>
    {#if showYears}
      <text
        transform="translate({-width / 2 - 5 / zoom}, {firstYearY}) scale({1 /
          zoom})"
        class="first year"
        font-size={yearFont}>’{`${years[0]}`.replace(/^[0-9]{2}/, "")}</text
      >
      <text
        transform="translate({width / 2 + 5 / zoom}, {lastYearY}) scale({1 /
          zoom})"
        class="last year"
        font-size={yearFont}
        >’{`${years[years.length - 1]}`.replace(/^[0-9]{2}/, "")}</text
      >
    {/if}

    {#if showProductLabel && labelPlacement}
      <text
        text-anchor={labelPlacement.anchor}
        dominant-baseline={labelPlacement.baseline}
        font-size={(labelSize / zoom) * 1.4}
        transform="translate({labelPlacement.x}, {labelPlacement.y})"
        class="product-label">{product}</text
      >
    {/if}
  </g>

  <path class="visual" d={path} stroke-width={strokeWidth}></path>
  <path
    class="interaction"
    d={path}
    stroke-width={hitStroke}
    role="img"
    tabindex="-1"
    aria-label="{item['HS92-4 Short Label']} trade balance trend in {item[
      'HS92 Section'
    ]} sector"
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
  ></path>
</g>

<style>
  g {
    * {
      vector-effect: non-scaling-stroke;
    }

    &.group {
      path {
        stroke: rgb(237, 69, 27);
      }
    }

    &.faded {
      path {
        opacity: 0.2;
        stroke: rgb(182, 182, 182);
      }
      text,
      div {
        opacity: 0;
      }
    }

    path {
      fill: none;
      /* stroke-width: 1.5; */
      stroke: var(--color-line-chart);
    }

    path.interaction {
      stroke: rgb(0, 255, 145);
      stroke-width: 6;
      opacity: 0;
      pointer-events: stroke;
    }

    text.product-label {
      fill: var(--color-chart-label);
    }

    text.year {
      text-anchor: middle;
      /* font-size: 10px; */
      fill: var(--secondary);
    }

    .first.year {
      dominant-baseline: middle;
      text-anchor: end;
    }
    .last.year {
      dominant-baseline: middle;
      text-anchor: start;
    }
  }
</style>

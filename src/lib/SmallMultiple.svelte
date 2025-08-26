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

  let showYears = $derived(config?.annotations?.years ?? true);
  let showProductLabel = $derived(config?.annotations?.label ?? true);

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

  let path = $derived.by(() => {
    const points = values.map((value, i) => `${xScale(i)}, ${yScale(value)}`);
    return `M${points.join(" ")}`;
  });

  let section = $derived(item["HS92 Section"].toLowerCase());
  let product = $derived(item["HS92-4 Short Label"].toLowerCase());
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

  let labelY = $derived(
    (config?.label ?? "top") === "top"
      ? yScale(Math.max(...values)) - 20 / zoom
      : yScale(Math.min(...values)) + 20 / zoom
  );
</script>

<g class={[section, product, group, { faded }]}>
  <g>
    {#if showYears}
      <text
        transform="translate({-width / 2 - 5 / zoom}, {firstYearY}) scale({1 /
          zoom})"
        class="first year">’{`${years[0]}`.replace(/^[0-9]{2}/, "")}</text
      >
      <text
        transform="translate({width / 2 + 5 / zoom}, {lastYearY}) scale({1 /
          zoom})"
        class="last year"
        >’{`${years[years.length - 1]}`.replace(/^[0-9]{2}/, "")}</text
      >
    {/if}

    {#if showProductLabel}
      <g
        transform="translate({-width / 2}, {(config?.label ?? 'top') ===
        'bottom'
          ? 10
          : -100}) scale({1 / zoom})"
      >
        <foreignObject width={width * zoom} height="50">
          <div class={["label", config?.label ?? "top"]}>{product}</div>
        </foreignObject>
      </g>
    {/if}
  </g>

  <path class="visual" d={path}></path>
  <path
    class="interaction"
    d={path}
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
        transition: opacity 0.75s;
      }

      text,
      div {
        opacity: 0;
        transition: opacity 0s;
      }
    }

    path {
      fill: none;
      stroke-width: 1.5;
      stroke: var(--color-line-chart);
      transition: opacity 0.75s 0.75s;
    }

    path.interaction {
      stroke: rgb(0, 255, 145);
      stroke-width: 6;
      opacity: 0;
      pointer-events: stroke;
    }

    text {
      transition: opacity 0s 1.5s;
      text-anchor: middle;
      font-size: 16px;
      fill: var(--color-chart-label);

      &.label {
        text-anchor: start;
        dominant-baseline: text-bottom;
        &.bottom {
          dominant-baseline: text-top;
        }
      }

      &.year {
        dominant-baseline: middle;
        fill: var(--secondary);

        &.first {
          text-anchor: end;
        }

        &.last {
          text-anchor: start;
        }
      }
    }

    foreignObject {
      overflow: visible;
    }

    div {
      transition: opacity 0s 1.5s;
      text-anchor: middle;
      font-size: 16px;
      color: var(--color-chart-label);

      &.label {
        text-anchor: start;
        dominant-baseline: text-bottom;
        &.top {
          transform: translateY(-100%);
        }
      }
    }
  }
</style>

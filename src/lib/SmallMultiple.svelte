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
  } = $props();

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
</script>

<g class={[section, product, group, { faded }]}>
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
        transition: opacity 0.75s;
      }
    }

    path {
      /* opacity: 0.1; */
      fill: none;
      stroke-width: 1;
      stroke: var(--color-line-chart);

      transition: opacity 0.75s 0.75s;
    }

    path.interaction {
      stroke: rgb(0, 255, 145);
      stroke-width: 6;
      opacity: 0;
      pointer-events: stroke;

      &:hover {
        /* opacity: 1; */
      }
    }
  }

  .chemicals {
    path {
      /* opacity: 1; */
    }
  }
</style>

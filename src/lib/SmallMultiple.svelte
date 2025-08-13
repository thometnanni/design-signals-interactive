<script>
  import { scaleLinear } from "d3-scale";
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
  } = $props();

  let yScale = $derived(
    scaleLinear()
      .domain(yDomain)
      .range([-height / 2, height / 2])
  );

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

  function handleMouseEnter() {
    onHover?.(item);
  }

  function handleMouseLeave() {
    onMouseOut?.();
  }
</script>

<g class="{section} {product} {group}">
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
    &.group {
      path {
        stroke: rgb(237, 69, 27);
      }
    }

    path {
      opacity: 0.1;
      fill: none;
      stroke-width: 1;
      stroke: black;
    }

    path.interaction {
      stroke: rgb(0, 132, 75);
      stroke-width: 2;
      opacity: 0;
      pointer-events: stroke;

      &:hover {
        opacity: 1;
      }
    }
  }

  .chemicals {
    path {
      opacity: 1;
    }
  }
</style>

<script>
  let { onEnter } = $props();

  const images = [
    "images/installation-1.jpg",
    "images/installation-3.jpg",
    "images/installation-2.jpg",
  ];
</script>

<div class="home">
  <video class="video" src="videos/faber.mp4" autoplay muted loop playsinline
  ></video>
  <header>
    <h1>Chemical Trajectories</h1>
    <!-- <h2>Hidden Forces That Shape Our Industry</h2> -->
  </header>

  <section class="text">
    <p>
      <em>Chemical Trajectories</em> harnesses data to map the transformation of
      Romania's chemical industry from socialist-era specialization to post-2000
      fragmentation. Using international trade data from 1960 onward, each sector
      is represented on a scatter plot graph in terms of its product complexity and
      export-import balance. The resulting visualisations bring how industries shift
      across decades to life. While some advance toward greater complexity and strength,
      becoming a part of Romania's export landscape, others regress or remain dependent
      on imports.
    </p>
    <p>
      A second layer of visualisation presents individual chemical products in a
      series of boxes. Each column traces a sector and maps the destinations of
      its exports, situating specific trajectories within broader industrial
      patterns, from COMECON integration to the crises of the 1980s, the 1989
      revolution, and the accession of the European Union (EU) in 2007. The
      project makes visible the hidden logic and economic contingencies that
      continue to shape the chemical sector.
    </p>
    <p>
      Commissioned for <em>Chemical Bonds</em>, the third edition of FABER's
      Design Signals programme, exhibited in the former Azur chemical factory in
      Timișoara. In collaboration with Norbert Petrovici.
    </p>
  </section>
  <section class="gallery">
    {#each images as src, i}
      <figure>
        <img
          {src}
          alt={`Chemical Trajectories installation view ${i + 1}`}
          loading="lazy"
        />
      </figure>
    {/each}
  </section>

  <footer>
    <button onclick={onEnter}>Enter the visualisation</button>
  </footer>
</div>

<style>
  .home {
    max-width: 840px;
    margin: 0 auto;
    padding: 1em;
    color: var(--primary);
  }

  header {
    margin-bottom: 1em;
  }

  h1 {
    margin: 0;
    padding: 0;
    font-weight: normal;
  }

  h1 {
    /* max-width: 560px; */
    font-size: 4em;
    line-height: 0.8;
    /* margin-top: 1em; */
  }

  .video {
    display: block;
    width: 300px;
    height: auto;
    margin: 0 0 1em 0;
  }

  .gallery {
    display: flex;
    flex-direction: column;
    gap: 1em;
    margin-bottom: 1em;
  }

  .gallery figure {
    margin: 0;
  }

  .gallery img {
    width: 100%;
    max-height: 70vh;
    object-fit: cover;
    display: block;
  }

  .text {
    margin-bottom: 1em;
  }

  .text p {
    margin: 0 0 1em 0;
  }

  footer {
    margin-top: 1em;
  }

  button {
    font: inherit;
    background: var(--primary);
    color: var(--background);
    border: none;
    padding: 0.1em 0.3em;
    cursor: pointer;
  }
</style>

import { mount } from "svelte";
import "./app.css";
import Wrapper from "./Wrapper.svelte";

const app = mount(Wrapper, {
  target: document.getElementById("app"),
});

export default app;

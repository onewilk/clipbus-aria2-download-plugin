import { createApp } from "vue";
import { clipbus } from "@clipbus/plugin-sdk/ui";
import { autoFit, patchConsole, patchTextInputState } from "@clipbus/plugin-sdk/dom";
import App from "./app.vue";
import "../../ui/shared/base.css";

patchConsole();
patchTextInputState();

const app = createApp(App);
app.mount("#app");

void clipbus.window.autoFit().catch(() => {
  // Local browser previews do not provide the Pasty host bridge.
});

autoFit({ min: 140, max: 480, target: document.getElementById("app") });

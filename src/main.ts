import { rootServer } from "@rootsdk/server-bot";
import { initialize } from "./velceron";

(async () => {
  await rootServer.lifecycle.start(async () => {
    await initialize();
    console.log("Velceron Bot started.");
  });
})();

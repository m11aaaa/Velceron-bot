import { rootServer } from "@rootsdk/server-bot";
import { initialize } from "./velceron";

(async () => {
  await initialize();
  await rootServer.lifecycle.start();
  console.log("Velceron Bot started.");
})().catch((error: unknown) => {
  console.error("Velceron Bot failed to start:", error);
});

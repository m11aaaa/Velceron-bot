import { rootServer } from "@rootsdk/server-app";
import { initialize } from "./velceron";

(async () => {
  await initialize();
  await rootServer.lifecycle.start();
  console.log("Velceron app server started.");
})().catch((error: unknown) => {
  console.error("Velceron app server failed to start:", error);
});

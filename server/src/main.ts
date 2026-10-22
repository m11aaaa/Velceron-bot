import { rootServer } from "@rootsdk/server-app";
import { initialize } from "./velceron";
import { configService } from "./configService";

(async () => {
  await initialize();
  rootServer.lifecycle.addService(configService);
  await rootServer.lifecycle.start();
  console.log("Velceron app server started.");
})().catch((error: unknown) => {
  console.error("Velceron app server failed to start:", error);
});

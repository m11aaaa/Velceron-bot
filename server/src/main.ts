import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { initialize } from "./velceron";
import { configService } from "./configService";

async function onStarting(_state: RootAppStartState): Promise<void> {
  rootServer.lifecycle.addService(configService);
  await initialize();
}
(async () => {
  await rootServer.lifecycle.start(onStarting);
  console.log("Velceron app server started.");
})().catch((error: unknown) => {
  console.error("Velceron app server failed to start:", error);
});

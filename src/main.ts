import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeModeration } from "./moderation";

async function onStarting(_state: RootBotStartState): Promise<void> {
  initializeModeration();
  console.log("Velceron Bot started.");
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();

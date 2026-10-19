import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeSetup } from "./setup";

async function onStarting(_state: RootBotStartState): Promise<void> {
  initializeSetup();
  console.log("Hideouter Root Bot started.");
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();

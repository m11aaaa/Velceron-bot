import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelMessageCreateRequest,
  MessageType,
} from "@rootsdk/server-bot";

const COMMAND = "/velceron";
const PREFIX_COMMAND = "!velceron";

const HELP_TEXT = [
  "**🛫 Velceron Bot — Help**",
  "",
  "`/velceron help` — toont dit menu",
  "`/velceron ping` — controleert of de bot reageert",
  "`/velceron info` — informatie over Velceron",
  "`/velceron settings` — toont de huidige basisinstellingen",
  "`/velceron setup` — toont de checklist voor de eerste installatie",
  "",
  "Je kunt voorlopig ook `!velceron` gebruiken als de slash-achtige tekst niet wordt herkend.",
].join("\n");

async function reply(channelId: string, content: string): Promise<void> {
  const request: ChannelMessageCreateRequest = { channelId, content };
  await rootServer.community.channelMessages.create(request);
}

function parseCommand(content: string): string[] | null {
  const trimmed = content.trim();
  const lower = trimmed.toLowerCase();

  let remainder: string;
  if (lower === COMMAND || lower.startsWith(COMMAND + " ")) {
    remainder = trimmed.slice(COMMAND.length).trim();
  } else if (lower === PREFIX_COMMAND || lower.startsWith(PREFIX_COMMAND + " ")) {
    remainder = trimmed.slice(PREFIX_COMMAND.length).trim();
  } else {
    return null;
  }

  return remainder ? remainder.split(/\s+/) : ["help"];
}

async function handleMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType !== MessageType.UserMessage) return;

  const args = parseCommand(evt.messageContent);
  if (!args) return;

  const subcommand = (args[0] || "help").toLowerCase();

  try {
    switch (subcommand) {
      case "help":
      case "hulp":
        await reply(evt.channelId, HELP_TEXT);
        break;

      case "ping":
        await reply(evt.channelId, "🏓 Velceron is bereikbaar.");
        break;

      case "info":
        await reply(
          evt.channelId,
          "**Velceron Bot**\nEen Root-communitybot die wordt uitgebreid met beheercommando's.\nVersie: 1.0.0"
        );
        break;

      case "settings":
      case "instellingen":
        await reply(
          evt.channelId,
          "**Velceron — basisinstellingen**\n" +
            "• Hoofdcommando: `/velceron`\n" +
            "• Alternatief: `!velceron`\n" +
            "• Taal: Nederlands\n" +
            "• Automatische acties: uitgeschakeld totdat ze expliciet worden ingesteld"
        );
        break;

      case "setup":
        await reply(
          evt.channelId,
          "**Velceron — installatiechecklist**\n" +
            "1. Installeer de bot in de juiste Root-community.\n" +
            "2. Geef de bot toegang tot de kanalen waar hij moet reageren.\n" +
            "3. Controleer dat de bot berichten mag plaatsen.\n" +
            "4. Test met `/velceron ping`.\n\n" +
            "Let op: deze opdracht voert nog geen serverwijzigingen uit."
        );
        break;

      default:
        await reply(
          evt.channelId,
          `Onbekend onderdeel: **${subcommand}**. Gebruik `/velceron help` voor alle opties.`
        );
    }
  } catch (error) {
    console.error("Velceron command failed:", error);
  }
}

export async function initialize(): Promise<void> {
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    (evt: ChannelMessageCreatedEvent) => {
      void handleMessage(evt);
    }
  );
}

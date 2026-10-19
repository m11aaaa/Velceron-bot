import {
  rootServer,
  ChannelGroup,
  Channel,
  ChannelType,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  RootApiException,
} from "@rootsdk/server-bot";

const ALLOWED_USER_ID = process.env.SETUP_ALLOWED_USER_ID;

const structure = [
  { group: "INFO CENTER", channels: ["welcome", "rules", "announcements"] },
  { group: "THE LOUNGE", channels: ["main-chat", "memes", "media", "food-porn"] },
  { group: "BOT ZONE", channels: ["ai-art", "bot-commands"] },
];

export function initializeSetup(): void {
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    onMessage,
  );
}

async function onMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType === MessageType.System) return;
  if ((evt.messageContent ?? "").trim() !== "!setup") return;

  if (!ALLOWED_USER_ID) {
    console.error("Setup blocked: set SETUP_ALLOWED_USER_ID to your Root user ID.");
    await reply(evt.channelId, "⚠️ Setup is locked. The owner must configure SETUP_ALLOWED_USER_ID first.");
    return;
  }

  if (evt.userId !== ALLOWED_USER_ID) return;

  try {
    await reply(evt.channelId, "⏳ Ik begin met het controleren en aanmaken van de kanalen…");

    const existingGroups: ChannelGroup[] = await rootServer.community.channelGroups.list();
    let createdGroups = 0;
    let createdChannels = 0;

    for (const item of structure) {
      let group = existingGroups.find((candidate) => candidate.name === item.group);

      if (!group) {
        group = await rootServer.community.channelGroups.create({ name: item.group });
        existingGroups.push(group);
        createdGroups++;
      }

      const existingChannels: Channel[] = await rootServer.community.channels.list({
        channelGroupId: group.id,
      });

      for (const name of item.channels) {
        if (existingChannels.some((channel) => channel.name === name)) continue;

        const channel = await rootServer.community.channels.create({
          channelGroupId: group.id,
          name,
          channelType: ChannelType.Text,
          useChannelGroupPermission: true,
        });
        existingChannels.push(channel);
        createdChannels++;
      }
    }

    await reply(
      evt.channelId,
      `✅ Klaar! Nieuwe categorieën: ${createdGroups}. Nieuwe kanalen: ${createdChannels}. Bestaande onderdelen zijn behouden.`,
    );
  } catch (error: unknown) {
    if (error instanceof RootApiException) {
      console.error("Root API error:", error.errorCode, error.payload);
      await reply(evt.channelId, `❌ Root gaf een fout terug: ${error.errorCode}. Controleer de botrechten.`);
    } else if (error instanceof Error) {
      console.error("Setup failed:", error.message);
      await reply(evt.channelId, "❌ Setup is mislukt. Bekijk de botconsole voor de foutmelding.");
    } else {
      console.error("Setup failed with an unknown error.");
      await reply(evt.channelId, "❌ Setup is mislukt door een onbekende fout.");
    }
  }
}

async function reply(channelId: ChannelMessageCreatedEvent["channelId"], content: string): Promise<void> {
  await rootServer.community.channelMessages.create({ channelId, content });
}

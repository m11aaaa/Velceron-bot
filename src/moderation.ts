import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  MessageType,
  RootApiException,
  UserGuid,
} from "@rootsdk/server-bot";

type WarningRecord = {
  moderatorId: string;
  reason: string;
  createdAt: string;
};

export function initializeModeration(): void {
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    (event: ChannelMessageCreatedEvent) => {
      void handleMessage(event).catch((error: unknown) => {
        console.error("Velceron moderation handler failed:", error);
      });
    },
  );
  console.log("Velceron Bot moderation commands registered.");
}

async function handleMessage(event: ChannelMessageCreatedEvent): Promise<void> {
  if (event.messageType === MessageType.System) return;

  const content = (event.messageContent ?? "").trim();
  if (!content.startsWith("/")) return;

  const parts = content.split(/\s+/);
  const command = (parts[0] ?? "").toLowerCase();

  if (command === "/help") {
    await reply(
      event.channelId,
      [
        "🛡️ **Velceron Bot — Moderation**",
        "/help — Toon deze hulp.",
        "/ping — Controleer of de bot reageert.",
        "/warn @lid reden — Geef een waarschuwing.",
        "/warnings @lid — Bekijk waarschuwingen.",
        "/kick @lid reden — Verwijder een lid uit de community.",
        "/ban @lid reden — Verban een lid.",
        "/unban USER_ID — Hef een ban op met het Root-user-ID.",
        "",
        "Moderatiecommando's werken alleen voor leden die een beheerder heeft geselecteerd bij Botinstellingen → Moderators.",
      ].join("\n"),
    );
    return;
  }

  if (command === "/ping") {
    await reply(event.channelId, "🏓 Velceron Bot is online en reageert.");
    return;
  }

  const moderator = await isConfiguredModerator(event.userId);
  if (!moderator) {
    await reply(
      event.channelId,
      "⛔ Je mag dit moderatiecommando niet gebruiken. Een communitybeheerder moet je selecteren bij de Velceron Bot-instellingen.",
    );
    return;
  }

  if (command === "/warn" || command === "/warnings" || command === "/kick" || command === "/ban") {
    const target = event.referenceMaps?.users?.[0];
    if (!target) {
      await reply(event.channelId, "Gebruik een echte Root-vermelding van het doel-lid. Voorbeeld: /warn @lid spam.");
      return;
    }

    const reason = parts.slice(2).join(" ").trim();

    if ((command === "/kick" || command === "/ban") && await isConfiguredModerator(target.userId)) {
      await reply(event.channelId, "⛔ Ik kan geen moderator verwijderen of verbannen die is geselecteerd in de botinstellingen.");
      return;
    }

    if (command === "/warn") {
      if (!reason) {
        await reply(event.channelId, "Geef ook een reden op. Voorbeeld: /warn @lid spam.");
        return;
      }
      const key = "velceron:warnings:" + String(target.userId);
      const warnings = (await rootServer.dataStore.appData.get<WarningRecord[]>(key)) ?? [];
      warnings.push({
        moderatorId: String(event.userId),
        reason,
        createdAt: new Date().toISOString(),
      });
      await rootServer.dataStore.appData.set({ key, value: warnings });
      await reply(event.channelId, "⚠️ Waarschuwing opgeslagen voor @" + target.name + ". Totaal: " + warnings.length + ". Reden: " + reason);
      return;
    }

    if (command === "/warnings") {
      const key = "velceron:warnings:" + String(target.userId);
      const warnings = (await rootServer.dataStore.appData.get<WarningRecord[]>(key)) ?? [];
      if (warnings.length === 0) {
        await reply(event.channelId, "✅ @" + target.name + " heeft geen opgeslagen waarschuwingen.");
        return;
      }
      const lines = warnings.slice(-10).map((warning, index) =>
        (index + 1) + ". " + warning.reason + " — " + warning.createdAt.slice(0, 10),
      );
      await reply(event.channelId, "📋 Waarschuwingen voor @" + target.name + " (laatste " + lines.length + ")\n" + lines.join("\n"));
      return;
    }

    if (command === "/kick") {
      try {
        await rootServer.community.communityMemberBans.kick({ userId: target.userId });
        await reply(event.channelId, "👢 @" + target.name + " is uit de community verwijderd." + (reason ? " Reden: " + reason : ""));
      } catch (error: unknown) {
        await reportModerationError(event.channelId, error, "kick");
      }
      return;
    }

    if (command === "/ban") {
      try {
        await rootServer.community.communityMemberBans.create({
          userId: target.userId,
          reason: reason || "Geen reden opgegeven",
        });
        await reply(event.channelId, "🔨 @" + target.name + " is verbannen. Reden: " + (reason || "Geen reden opgegeven"));
      } catch (error: unknown) {
        await reportModerationError(event.channelId, error, "ban");
      }
      return;
    }
  }

  if (command === "/unban") {
    const rawUserId = parts[1] ?? "";
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(rawUserId)) {
      await reply(event.channelId, "Gebruik /unban USER_ID met het exacte Root-user-ID.");
      return;
    }
    try {
      await rootServer.community.communityMemberBans.delete({ userId: rawUserId as UserGuid });
      await reply(event.channelId, "✅ Ban opgeheven voor user-ID " + rawUserId + ".");
    } catch (error: unknown) {
      await reportModerationError(event.channelId, error, "unban");
    }
  }
}

async function isConfiguredModerator(userId: UserGuid): Promise<boolean> {
  try {
    const settings = rootServer.globalSettings;
    if (!settings) return false;

    const moderators = settings.general?.moderators as unknown as
      | { isMember?: (request: { userId: UserGuid }) => Promise<boolean> }
      | undefined;

    if (typeof moderators?.isMember !== "function") return false;
    return await moderators.isMember({ userId });
  } catch {
    // Fail closed if settings have not been configured or are unavailable.
    return false;
  }
}

async function reportModerationError(
  channelId: ChannelMessageCreatedEvent["channelId"],
  error: unknown,
  action: string,
): Promise<void> {
  if (error instanceof RootApiException) {
    console.error("Velceron " + action + " API error:", error.errorCode);
    await reply(channelId, "❌ " + action + " is mislukt: Root weigerde de actie (" + error.errorCode + "). Controleer de botrechten en het doel-lid.");
    return;
  }
  console.error("Velceron " + action + " failed:", error);
  await reply(channelId, "❌ " + action + " is mislukt door een onverwachte fout.");
}

async function reply(
  channelId: ChannelMessageCreatedEvent["channelId"],
  content: string,
): Promise<void> {
  await rootServer.community.channelMessages.create({ channelId, content });
}

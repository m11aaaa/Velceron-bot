import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelMessageCreateRequest,
  ChannelGuid,
  UserGuid,
  MessageType,
} from "@rootsdk/server-bot";

type TicketSettings = {
  title: string;
  description: string;
  buttonText: string;
  pingStaff: boolean;
  sendTranscriptToCreator: boolean;
  sendTranscriptToLogs: boolean;
  logChannelId: string;
};

type BotSettings = {
  modules: {
    tickets: boolean;
    moderation: boolean;
    welcome: boolean;
    logs: boolean;
  };
  ticket: TicketSettings;
};

const SETTINGS_KEY = "velceron.settings.v1";
const DRAFT_KEY = "velceron.ticket-draft.v1";
const SETTINGS_DRAFT_KEY = "velceron.settings-draft.v1";

const DEFAULT_SETTINGS: BotSettings = {
  modules: { tickets: true, moderation: true, welcome: false, logs: true },
  ticket: {
    title: "Need help?",
    description: "Click below to open a support ticket.",
    buttonText: "Open a ticket",
    pingStaff: true,
    sendTranscriptToCreator: true,
    sendTranscriptToLogs: false,
    logChannelId: "",
  },
};

const MODULE_NAMES: Record<string, keyof BotSettings["modules"]> = {
  tickets: "tickets",
  moderation: "moderation",
  welcome: "welcome",
  logs: "logs",
};

const HELP_TEXT = [
  "**Velceron Bot — Help**",
  "",
  "`/help` — show available commands",
  "`/ping` — check whether the bot is responding",
  "`/info` — information about Velceron",
  "`/settings` — view enabled modules",
  "`/settings enable <module>` — enable a module",
  "`/settings disable <module>` — disable a module",
  "`/settings save` — save module changes",
  "`/ticket` — view the ticket settings",
  "`/ticket title <text>` — edit the panel title",
  "`/ticket description <text>` — edit the panel description",
  "`/ticket button <text>` — edit the button text",
  "`/ticket ping on|off` — choose whether staff should be pinged",
  "`/ticket transcript-user on|off` — send the transcript to the ticket creator",
  "`/ticket transcript-logs on|off` — send the transcript to the selected log channel",
  "`/ticket log-channel <channel-id>` — choose the transcript log channel",
  "`/ticket save` — save the ticket settings",
  "",
  "Configuration changes are restricted to members with community-management permissions.",
].join("\n");

async function reply(channelId: ChannelGuid, content: string): Promise<void> {
  const request: ChannelMessageCreateRequest = { channelId, content };
  await rootServer.community.channelMessages.create(request);
}

async function loadSettings(): Promise<BotSettings> {
  const stored = await rootServer.dataStore.appData.get<BotSettings>(SETTINGS_KEY);
  if (!stored) {
    return {
      modules: { ...DEFAULT_SETTINGS.modules },
      ticket: { ...DEFAULT_SETTINGS.ticket },
    };
  }
  return {
    modules: { ...DEFAULT_SETTINGS.modules, ...stored.modules },
    ticket: { ...DEFAULT_SETTINGS.ticket, ...stored.ticket },
  };
}

async function loadSettingsDraft(settings: BotSettings): Promise<BotSettings> {
  const draft = await rootServer.dataStore.appData.get<BotSettings>(SETTINGS_DRAFT_KEY);
  return draft ?? { modules: { ...settings.modules }, ticket: { ...settings.ticket } };
}

async function loadDraft(settings: BotSettings): Promise<TicketSettings> {
  const draft = await rootServer.dataStore.appData.get<TicketSettings>(DRAFT_KEY);
  return draft ?? { ...settings.ticket };
}

async function isCommunityManager(userId: UserGuid): Promise<boolean> {
  try {
    const member = await rootServer.community.communityMembers.get({ userId });
    const roles = await rootServer.community.communityRoles.list();
    const memberRoleIds = new Set<string>(member.communityRoleIds);
    return roles.some((role) =>
      memberRoleIds.has(role.id) &&
      role.communityPermission?.communityManageCommunity === true
    );
  } catch (error) {
    console.error("Unable to verify configuration permissions:", error);
    return false;
  }
}

function formatSettings(settings: BotSettings): string {
  const modules = Object.entries(settings.modules)
    .map(([name, enabled]) => `• **${name}**: ${enabled ? "ON" : "OFF"}`)
    .join("\n");
  return "**Velceron Control Panel — current settings**\n\n" +
    modules +
    "\n\nUse `/settings enable <module>` or `/settings disable <module>` to change a module.";
}

function formatTicket(ticket: TicketSettings): string {
  return "**Ticket Template Preview**\n\n" +
    `**Title:** ${ticket.title}\n` +
    `**Description:** ${ticket.description}\n` +
    `**Button:** ${ticket.buttonText}\n` +
    `**Ping staff on ticket creation:** ${ticket.pingStaff ? "ON" : "OFF"}\n` +
    `**Send transcript to ticket creator:** ${ticket.sendTranscriptToCreator ? "ON" : "OFF"}\n` +
    `**Send transcript to log channel:** ${ticket.sendTranscriptToLogs ? "ON" : "OFF"}\n` +
    `**Transcript log channel ID:** ${ticket.logChannelId || "Not selected"}\n\n` +
    "Edit with `/ticket title`, `/ticket description`, `/ticket button`, `/ticket ping on|off`, " +
    "`/ticket transcript-user on|off`, `/ticket transcript-logs on|off`, or `/ticket log-channel <channel-id>`. " +
    "Use `/ticket save` to save the settings.";
}

function parseCommand(content: string): string[] | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("/")) return null;
  const parts = trimmed.slice(1).trim().split(/\s+/);
  if (!parts[0]) return null;
  return parts;
}

async function handleMessage(evt: ChannelMessageCreatedEvent): Promise<void> {
  if (evt.messageType !== MessageType.UserMessage) return;

  const args = parseCommand(evt.messageContent);
  if (!args) return;

  const command = args[0].toLowerCase();
  const subcommand = (args[1] ?? "").toLowerCase();

  try {
    switch (command) {
      case "help":
        await reply(evt.channelId, HELP_TEXT);
        return;

      case "ping":
        await reply(evt.channelId, "🏓 Velceron is online.");
        return;

      case "info":
        await reply(evt.channelId, "**Velceron Bot**\nA configurable Root community bot.\nPersistent settings are enabled.");
        return;

      case "settings": {
        const settings = await loadSettings();
        const draftSettings = await loadSettingsDraft(settings);

        if (!subcommand) {
          await reply(evt.channelId, formatSettings(draftSettings) + "\n\nChanges are drafts until you use `/settings save`.");
          return;
        }

        if (!await isCommunityManager(evt.userId)) {
          await reply(evt.channelId, "You need community-management permissions to change Velceron settings.");
          return;
        }

        if (subcommand === "save") {
          const currentSettings = await loadSettings();
          currentSettings.modules = { ...draftSettings.modules };
          await rootServer.dataStore.appData.set({ key: SETTINGS_KEY, value: currentSettings });
          await rootServer.dataStore.appData.delete(SETTINGS_DRAFT_KEY);
          await reply(evt.channelId, "✅ Settings saved. Your choices will persist after a bot restart.");
          return;
        }

        if (!["enable", "disable"].includes(subcommand)) {
          await reply(evt.channelId, "Usage: `/settings enable <module>`, `/settings disable <module>`, or `/settings save`.");
          return;
        }

        const moduleName = (args[2] ?? "").toLowerCase();
        const moduleKey = MODULE_NAMES[moduleName];
        if (!moduleKey) {
          await reply(evt.channelId, "Available modules: tickets, moderation, welcome, logs.");
          return;
        }

        draftSettings.modules[moduleKey] = subcommand === "enable";
        await rootServer.dataStore.appData.set({ key: SETTINGS_DRAFT_KEY, value: draftSettings });
        await reply(evt.channelId, "Draft updated: module **" + moduleName + "** is " + (draftSettings.modules[moduleKey] ? "ON" : "OFF") + ". Use /settings save to apply it.");
        return;
      }

      case "ticket":
      case "tickets": {
        const settings = await loadSettings();
        if (!settings.modules.tickets && subcommand !== "save") {
          await reply(evt.channelId, "The ticket module is currently disabled. A community manager can enable it with `/settings enable tickets`.");
          return;
        }

        if (!subcommand) {
          await reply(evt.channelId, formatTicket(await loadDraft(settings)));
          return;
        }

        if (!await isCommunityManager(evt.userId)) {
          await reply(evt.channelId, "You need community-management permissions to change ticket settings.");
          return;
        }

        const draft = await loadDraft(settings);
        const value = args.slice(2).join(" ").trim();

        if (subcommand === "title" || subcommand === "description" || subcommand === "button") {
          if (!value) {
            await reply(evt.channelId, "Please provide text. Example: /ticket " + subcommand + " Your text here");
            return;
          }
          if (value.length > 500) {
            await reply(evt.channelId, "Please keep each text field under 500 characters.");
            return;
          }
          if (subcommand === "title") draft.title = value;
          if (subcommand === "description") draft.description = value;
          if (subcommand === "button") draft.buttonText = value;
          await rootServer.dataStore.appData.set({ key: DRAFT_KEY, value: draft });
          await reply(evt.channelId, "Draft updated. Review it with `/ticket` and apply it with `/ticket save`.");
          return;
        }

        if (subcommand === "ping") {
          const mode = (args[2] ?? "").toLowerCase();
          if (mode !== "on" && mode !== "off") {
            await reply(evt.channelId, "Usage: `/ticket ping on` or `/ticket ping off`.");
            return;
          }
          draft.pingStaff = mode === "on";
          await rootServer.dataStore.appData.set({ key: DRAFT_KEY, value: draft });
          await reply(evt.channelId, "Draft updated: staff ping is " + (draft.pingStaff ? "ON" : "OFF") + ". Use /ticket save to apply it.");
          return;
        }

        if (subcommand === "transcript-user" || subcommand === "transcript-logs") {
          const mode = (args[2] ?? "").toLowerCase();
          if (mode !== "on" && mode !== "off") {
            await reply(evt.channelId, `Usage: /ticket ${subcommand} on|off`);
            return;
          }
          if (subcommand === "transcript-user") draft.sendTranscriptToCreator = mode === "on";
          else draft.sendTranscriptToLogs = mode === "on";
          await rootServer.dataStore.appData.set({ key: DRAFT_KEY, value: draft });
          await reply(evt.channelId, `Draft updated: ${subcommand} is ${mode.toUpperCase()}. Use /ticket save to apply it.`);
          return;
        }

        if (subcommand === "log-channel") {
          const channelId = (args[2] ?? "").trim();
          if (!channelId) {
            await reply(evt.channelId, "Usage: /ticket log-channel <channel-id>. Use the ID of a channel the bot can access.");
            return;
          }
          draft.logChannelId = channelId;
          await rootServer.dataStore.appData.set({ key: DRAFT_KEY, value: draft });
          await reply(evt.channelId, "Draft updated: transcript log channel selected. Review with /ticket and apply with /ticket save.");
          return;
        }

        if (subcommand === "save") {
          settings.ticket = draft;
          await rootServer.dataStore.appData.set({ key: SETTINGS_KEY, value: settings });
          await rootServer.dataStore.appData.delete(DRAFT_KEY);
          await reply(evt.channelId, "✅ Ticket template saved. These settings will persist after a bot restart.");
          return;
        }

        await reply(evt.channelId, "Unknown ticket option. Use `/ticket` to see the template and available options.");
        return;
      }

      case "setup":
        await reply(
          evt.channelId,
          "**Velceron Setup**\n\nThe next setup stage will create the private commands, help, and logs channels. Automatic private-channel creation is not enabled yet; it will be added after the owner/staff access rules are verified."
        );
        return;

      case "staff":
        await reply(evt.channelId, "**Staff settings**\nStaff-role selection will be added in the next setup stage. Role names will not be hard-coded.");
        return;

      case "logs":
        await reply(evt.channelId, "**Velceron Logs**\nTechnical errors are recorded in the bot runtime logs. A private in-community log channel will be connected in the next setup stage.");
        return;

      default:
        await reply(evt.channelId, "Unknown command. Use `/help` to see the available commands.");
    }
  } catch (error) {
    console.error("Velceron command failed:", error);
    try {
      await reply(evt.channelId, "Velceron encountered an error while processing that command. The technical details were recorded in the bot logs.");
    } catch (replyError) {
      console.error("Velceron error reply failed:", replyError);
    }
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

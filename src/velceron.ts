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

      case "setup": {
        if (!await isCommunityManager(evt.userId)) {
          await reply(evt.channelId, "Only a community manager can run the initial setup.");
          return;
        }
        const key = "velceron.setup.v1";
        let state = await rootServer.dataStore.appData.get<any>(key);
        if (state?.commandsChannelId && state?.helpChannelId && state?.logsChannelId) {
          await reply(evt.channelId, "Velceron channels already exist. Use /staff to configure staff access.");
          return;
        }
        state = state ?? { ownerId: evt.userId, staffRoleIds: [], allowedUserIds: [], groupId: "", commandsChannelId: "", helpChannelId: "", logsChannelId: "" };
        state.ownerId = evt.userId;
        await rootServer.dataStore.appData.set({ key, value: state });
        try {
          const group = state.groupId ? { id: state.groupId } : await rootServer.community.channelGroups.create({ name: "Velceron", accessRuleCreates: [] });
          state.groupId = group.id;
          await rootServer.dataStore.appData.set({ key, value: state });
          const accessRules = () => [
            ...[state.ownerId, ...state.allowedUserIds].map((id: string) => ({ roleOrMemberId: id, overlay: { channelView: true, channelCreateMessage: true, channelViewMessageHistory: true } })),
            ...state.staffRoleIds.map((id: string) => ({ roleOrMemberId: id, overlay: { channelView: true, channelCreateMessage: true, channelViewMessageHistory: true } }))
          ];
          const makeChannel = async (name: string, description: string) => (await rootServer.community.channels.create({
            channelGroupId: state.groupId, name, description, channelType: 1, useChannelGroupPermission: false, accessRuleCreates: accessRules()
          } as any)).id;
          if (!state.commandsChannelId) state.commandsChannelId = await makeChannel("velceron-commands", "Private Velceron commands and configuration.");
          await rootServer.dataStore.appData.set({ key, value: state });
          if (!state.helpChannelId) state.helpChannelId = await makeChannel("velceron-help", "Help and setup troubleshooting.");
          await rootServer.dataStore.appData.set({ key, value: state });
          if (!state.logsChannelId) state.logsChannelId = await makeChannel("velceron-logs", "Private technical errors and setup diagnostics.");
          await rootServer.dataStore.appData.set({ key, value: state });
          await reply(state.commandsChannelId, "**Velceron Control Room**\nUse /staff to choose which roles and individual members can see these private channels.\n\n" + HELP_TEXT);
          await reply(state.helpChannelId, "**Velceron Help**\nUse /help for commands. Technical failures are recorded in velceron-logs.");
          await reply(evt.channelId, "Setup complete: private commands, help, and logs channels have been created.");
        } catch (error) {
          console.error("Velceron setup failed:", error);
          await reply(evt.channelId, "Setup failed. Check bot permissions and runtime logs, then run /setup again. Partial progress was saved to avoid unnecessary duplicates.");
        }
        return;
      }

      case "staff": {
        const key = "velceron.setup.v1";
        const state = await rootServer.dataStore.appData.get<any>(key);
        if (!state) {
          await reply(evt.channelId, "Run /setup first. A community manager must initialize Velceron.");
          return;
        }
        const allowed = await isCommunityManager(evt.userId) || state.ownerId === evt.userId ||
          state.allowedUserIds.includes(evt.userId) ||
          (await rootServer.community.communityMembers.get({ userId: evt.userId }).catch(() => null))?.communityRoleIds?.some((id: string) => state.staffRoleIds.includes(id));
        if (!allowed) {
          await reply(evt.channelId, "Only the setup owner, community managers, or configured staff can change access.");
          return;
        }
        const kind = (args[1] ?? "").toLowerCase();
        const action = (args[2] ?? "").toLowerCase();
        const id = (args[3] ?? "").trim();
        if (!kind) {
          await reply(evt.channelId, "**Staff Access**\nRole IDs: " + (state.staffRoleIds.join(", ") || "none") +
            "\nIndividual member IDs: " + (state.allowedUserIds.join(", ") || "none") +
            "\n\n/staff role add <role-id>\n/staff role remove <role-id>\n/staff member add <user-id>\n/staff member remove <user-id>\n/staff save");
          return;
        }
        if (kind === "save") {
          await reply(evt.channelId, "Staff choices are saved. For channels already created, add the newly selected roles/members in Root's channel permissions; new channels use the saved list. Access-rule replacement for existing channels is not yet automatic.");
          return;
        }
        if (!["role", "member"].includes(kind) || !["add", "remove"].includes(action) || !id) {
          await reply(evt.channelId, "Usage: /staff role add <role-id>, /staff role remove <role-id>, /staff member add <user-id>, /staff member remove <user-id>, or /staff save.");
          return;
        }
        const list: string[] = kind === "role" ? state.staffRoleIds : state.allowedUserIds;
        if (action === "add" && !list.includes(id)) list.push(id);
        if (action === "remove") {
          const index = list.indexOf(id);
          if (index >= 0) list.splice(index, 1);
        }
        await rootServer.dataStore.appData.set({ key, value: state });
        await reply(evt.channelId, "Saved draft: " + kind + " " + action + " " + id + ". Use /staff save when finished.");
        return;
      }

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

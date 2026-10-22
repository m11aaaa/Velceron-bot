import {
  rootServer,
  ChannelMessageEvent,
  ChannelMessageCreatedEvent,
  ChannelMessageCreateRequest,
  ChannelGuid,
  UserGuid,
  MessageType,
  CommunityEvent,
  CommunityJoinedEvent,
  RootGuidUtils,
  RootGuidType,
  CommunityMemberBanEvent,
  CommunityMemberBanCreatedEvent,
  CommunityMemberBanDeletedEvent,
  UserGuid as ModerationUserGuid,
} from "@rootsdk/server-app";

type TicketSettings = {
  title: string;
  description: string;
  buttonText: string;
  pingStaff: boolean;
  sendTranscriptToCreator: boolean;
  sendTranscriptToLogs: boolean;
  logChannelId: string;
  welcomeMessage: string;
  welcomeChannelId: string;
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
    welcomeMessage: "Welcome {user} to {community}!",
    welcomeChannelId: "",
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
  "`/setup` — create private commands, help, and logs channels",
  "`/staff` — configure roles and individual members who can access private channels",
  "`/staff role add <role-id>` / `/staff role remove <role-id>`",
  "`/staff member add <user-id>` / `/staff member remove <user-id>`",
  "`/staff save` — apply access changes",
  "`/moderation ban <user-id> [reason]` — ban a member",
  "`/moderation kick <user-id>` — remove a member without banning",
  "`/moderation unban <user-id>` — remove an active ban (the user must rejoin)",
  "`/welcome` — show welcome message setup guidance",
  "`/ticket open` — create a private support ticket",
  "`/ticket close` — close a ticket and create a transcript",
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
    const community = await rootServer.community.communities.get();
    if (community.ownerUserId === userId) return true;
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


async function isStaffOrOwner(userId: UserGuid, setup: any): Promise<boolean> {
  if (!setup) return isCommunityManager(userId);
  if (setup.ownerId === userId || await isCommunityManager(userId)) return true;
  if ((setup.allowedUserIds ?? []).includes(userId)) return true;
  try {
    const member = await rootServer.community.communityMembers.get({ userId });
    return (member.communityRoleIds ?? []).some((id: string) => (setup.staffRoleIds ?? []).includes(id));
  } catch (error) {
    console.error("Unable to verify configured staff access:", error);
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


type StoredTicket = { channelId: string; creatorId: string; createdAt: string; status: "open" | "closed" };
const TICKETS_KEY = "velceron.tickets.v1";

async function createTicket(channelId: ChannelGuid, userId: UserGuid): Promise<void> {
  const settings = await loadSettings();
  const setup = await rootServer.dataStore.appData.get<any>("velceron.setup.v1");
  if (!settings.modules.tickets) { await reply(channelId, "The ticket module is disabled."); return; }
  if (!setup?.groupId) { await reply(channelId, "Run /setup first to create Velceron's private channels."); return; }
  const tickets = (await rootServer.dataStore.appData.get<StoredTicket[]>(TICKETS_KEY)) ?? [];
  const existing = tickets.find((ticket) => ticket.creatorId === userId && ticket.status === "open");
  if (existing) { await reply(channelId, "You already have an open ticket: [Open ticket](root://channel/" + existing.channelId + ")"); return; }
  const access = [
    ...new Set([setup.ownerId, userId, ...(setup.allowedUserIds ?? [])])
  ].map((id: string) => ({ roleOrMemberId: id, overlay: { channelView: true, channelCreateMessage: true, channelViewMessageHistory: true } }));
  for (const roleId of setup.staffRoleIds ?? []) access.push({ roleOrMemberId: roleId, overlay: { channelView: true, channelCreateMessage: true, channelViewMessageHistory: true } } as any);
  const ticketChannel = await rootServer.community.channels.create({
    channelGroupId: setup.groupId,
    name: "ticket-" + String(userId).slice(-8).toLowerCase(),
    description: "Private support ticket",
    channelType: 1,
    useChannelGroupPermission: false,
    accessRuleCreates: access,
  } as any);
  tickets.push({ channelId: ticketChannel.id, creatorId: userId, createdAt: new Date().toISOString(), status: "open" });
  await rootServer.dataStore.appData.set({ key: TICKETS_KEY, value: tickets });
  const staffMentions = settings.ticket.pingStaff ? (setup.staffRoleIds ?? []).map((id: string) => "[@Staff](root://role/" + id + ")").join(" ") : "";
  await reply(ticketChannel.id, "**" + settings.ticket.title + "**\n" + settings.ticket.description +
    "\n\nTicket owner: [Member](root://user/" + userId + ")\nUse `/ticket close` to close this ticket.\n" + staffMentions);
  await reply(channelId, "Your private ticket was created: [Open ticket](root://channel/" + ticketChannel.id + ")");
  await logAuditEvent("Ticket opened: channel " + ticketChannel.id + "; creator " + userId);
}

async function closeTicket(channelId: ChannelGuid, userId: UserGuid): Promise<void> {
  const tickets = (await rootServer.dataStore.appData.get<StoredTicket[]>(TICKETS_KEY)) ?? [];
  const ticket = tickets.find((item) => item.channelId === channelId && item.status === "open");
  if (!ticket) { await reply(channelId, "This is not an open Velceron ticket."); return; }
  const setup = await rootServer.dataStore.appData.get<any>("velceron.setup.v1");
  const isStaff = setup && (setup.ownerId === userId || await isCommunityManager(userId) ||
    (setup.allowedUserIds ?? []).includes(userId) ||
    (await rootServer.community.communityMembers.get({ userId }).catch(() => null))?.communityRoleIds?.some((id: string) => (setup.staffRoleIds ?? []).includes(id)));
  if (ticket.creatorId !== userId && !isStaff) { await reply(channelId, "Only the ticket owner or configured staff can close this ticket."); return; }
  const listed = await rootServer.community.channelMessages.list({
    channelId, dateAt: new Date(), messageDirectionTake: 2, limit: 100,
  } as any);
  const lines = (listed.messages ?? []).slice().reverse().map((message: any) =>
    "[" + (message.createdAt ? new Date(message.createdAt).toISOString() : "time unknown") + "] " +
    String(message.userId ?? "System") + ": " + String(message.messageContent ?? "").replace(/\r/g, ""));
  const transcript = ("Velceron ticket transcript\nChannel: " + channelId + "\nCreator: " + ticket.creatorId + "\n\n" + lines.join("\n")).slice(0, 12000);
  await rootServer.dataStore.appData.set({ key: TICKETS_KEY, value: tickets.map((item) => item.channelId === channelId ? { ...item, status: "closed" } : item) });
  await reply(channelId, "🔒 Ticket closed. Transcript has been prepared.");
  await logAuditEvent("Ticket closed: channel " + channelId + "; creator " + ticket.creatorId + "; closed by " + userId);
  const settings = await loadSettings();
  if (settings.ticket.sendTranscriptToLogs) {
    const logId = settings.ticket.logChannelId || setup?.logsChannelId;
    if (logId) {
      const safeTranscript = transcript.replace(/```/g, "[code fence]");
      for (let offset = 0; offset < safeTranscript.length; offset += 1600) {
        const part = safeTranscript.slice(offset, offset + 1600);
        await reply(logId as ChannelGuid, "```text\n" + part + "\\n```");
      }
    } else await logTechnicalError("Transcript-to-logs is enabled but no log channel is configured.");
  }
  if (settings.ticket.sendTranscriptToCreator) {
    try {
      await rootServer.community.notifications.send({
        title: "Your ticket is closed",
        description: "Your ticket is closed. You can still view the transcript in the ticket channel.",
        userIds: [ticket.creatorId as UserGuid],
      });
      await rootServer.community.accessRules.edit({
        channelOrChannelGroupId: channelId,
        roleOrMemberId: ticket.creatorId,
        overlay: { channelView: true, channelCreateMessage: false, channelViewMessageHistory: true },
      } as any);
    } catch (error) {
      console.error("Ticket transcript delivery or lock failed:", error);
      await logTechnicalError("Ticket transcript delivery or lock failed for " + channelId + ": " + String(error));
    }
  } else {
    try {
      await rootServer.community.accessRules.delete({ channelOrChannelGroupId: channelId, roleOrMemberId: ticket.creatorId } as any);
    } catch (error) {
      console.error("Could not remove creator from closed ticket:", error);
      await logTechnicalError("Could not remove creator from closed ticket " + channelId + ": " + String(error));
    }
  }
}

async function logTechnicalError(message: string): Promise<void> {
  const setup = await rootServer.dataStore.appData.get<any>("velceron.setup.v1");
  if (setup?.logsChannelId) {
    try { await reply(setup.logsChannelId as ChannelGuid, "⚠️ **Technical error**\n" + message.slice(0, 1500)); }
    catch (error) { console.error("Could not post technical log:", error); }
  }
}

async function logAuditEvent(message: string): Promise<void> {
  try {
    const settings = await loadSettings();
    if (!settings.modules.logs) return;
    const setup = await rootServer.dataStore.appData.get<any>("velceron.setup.v1");
    if (!setup?.logsChannelId) return;
    await reply(setup.logsChannelId as ChannelGuid, "📋 **Audit log**\n" + message.slice(0, 1500));
  } catch (error) { console.error("Could not write audit log:", error); }
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

        if (!await isStaffOrOwner(evt.userId, await rootServer.dataStore.appData.get<any>("velceron.setup.v1"))) {
          await reply(evt.channelId, "Only the setup owner or configured staff can change Velceron settings.");
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

      case "moderation": {
        const settings = await loadSettings();
        if (!settings.modules.moderation) {
          await reply(evt.channelId, "The moderation module is disabled. A community manager can enable it in the Velceron settings.");
          return;
        }
        if (!await isStaffOrOwner(evt.userId, await rootServer.dataStore.appData.get<any>("velceron.setup.v1"))) {
          await reply(evt.channelId, "Only the setup owner, community managers, or configured staff can use moderation commands.");
          return;
        }
        const action = (args[1] ?? "").toLowerCase();
        const targetId = (args[2] ?? "").trim();
        if (!["ban", "kick", "unban"].includes(action) || !targetId) {
          await reply(evt.channelId, "Usage: `/moderation ban <user-id> [reason]`, `/moderation kick <user-id>`, or `/moderation unban <user-id>`.");
          return;
        }
        try {
          if (action === "ban") {
            const reason = args.slice(3).join(" ").trim().slice(0, 256) || "No reason provided";
            await rootServer.community.communityMemberBans.create({ userId: targetId as ModerationUserGuid, reason });
            await reply(evt.channelId, "Member banned. Reason: " + reason);
            await logAuditEvent("Ban: user " + targetId + "; by " + evt.userId + "; reason: " + reason);
          } else if (action === "kick") {
            await rootServer.community.communityMemberBans.kick({ userId: targetId as ModerationUserGuid });
            await reply(evt.channelId, "Member kicked. They can rejoin with an invite.");
            await logAuditEvent("Kick: user " + targetId + "; by " + evt.userId);
          } else {
            await rootServer.community.communityMemberBans.delete({ userId: targetId as ModerationUserGuid });
            await reply(evt.channelId, "Ban removed. The member must rejoin using an invite.");
            await logAuditEvent("Unban: user " + targetId + "; by " + evt.userId);
          }
        } catch (error) {
          console.error("Moderation action failed:", error);
          await reply(evt.channelId, "That moderation action failed. Check the target ID and make sure Velceron has the required community permission.");
          await logTechnicalError("Moderation action failed for " + targetId + ": " + String(error));
        }
        return;
      }

      case "ticket":
      case "tickets": {
        if (subcommand === "open") { await createTicket(evt.channelId, evt.userId); return; }
        if (subcommand === "close") { await closeTicket(evt.channelId, evt.userId); return; }
        const settings = await loadSettings();
        if (!settings.modules.tickets && subcommand !== "save") {
          await reply(evt.channelId, "The ticket module is currently disabled. A community manager can enable it with `/settings enable tickets`.");
          return;
        }

        if (!subcommand) {
          await reply(evt.channelId, formatTicket(await loadDraft(settings)));
          return;
        }

        if (!await isStaffOrOwner(evt.userId, await rootServer.dataStore.appData.get<any>("velceron.setup.v1"))) {
          await reply(evt.channelId, "Only the setup owner or configured staff can change ticket settings.");
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
          const channelIds = [state.commandsChannelId, state.helpChannelId, state.logsChannelId].filter(Boolean);
          const previousRoles: string[] = state.appliedStaffRoleIds ?? [];
          const previousUsers: string[] = state.appliedAllowedUserIds ?? [];
          const nextRoles: string[] = state.staffRoleIds ?? [];
          const nextUsers: string[] = state.allowedUserIds ?? [];
          const adds = [
            ...nextRoles.filter((id) => !previousRoles.includes(id)),
            ...nextUsers.filter((id) => !previousUsers.includes(id))
          ];
          const removes = [
            ...previousRoles.filter((id) => !nextRoles.includes(id)),
            ...previousUsers.filter((id) => !nextUsers.includes(id))
          ];
          let failed = 0;
          for (const targetChannelId of channelIds) {
            for (const id of adds) {
              try {
                await rootServer.community.accessRules.create({
                  channelOrChannelGroupId: targetChannelId,
                  roleOrMemberId: id,
                  overlay: { channelView: true, channelCreateMessage: true, channelViewMessageHistory: true }
                } as any);
              } catch (error) {
                // Existing rules are fine; report other failures without stopping the remaining rules.
                if (!String(error).toLowerCase().includes("alreadyexists") && !String(error).toLowerCase().includes("already exists")) {
                  failed++;
                  console.error("Could not grant Velceron channel access:", error);
                }
              }
            }
            for (const id of removes) {
              try {
                await rootServer.community.accessRules.delete({ channelOrChannelGroupId: targetChannelId, roleOrMemberId: id } as any);
              } catch (error) {
                failed++;
                console.error("Could not remove Velceron channel access:", error);
              }
            }
          }
          state.appliedStaffRoleIds = [...nextRoles];
          state.appliedAllowedUserIds = [...nextUsers];
          await rootServer.dataStore.appData.set({ key, value: state });
          await reply(evt.channelId, failed
            ? "Staff choices were saved, but " + failed + " access change(s) failed. Check the technical logs and the channel permissions."
            : "✅ Staff access saved and applied to all three private Velceron channels. These choices persist after a restart.");
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

      case "welcome": {
        const settings = await loadSettings();
        if (!await isStaffOrOwner(evt.userId, await rootServer.dataStore.appData.get<any>("velceron.setup.v1"))) {
          await reply(evt.channelId, "Only the setup owner, community managers, or configured staff can view welcome settings.");
          return;
        }
        await reply(evt.channelId, "**Welcome messages**\nStatus: " + (settings.modules.welcome ? "ON" : "OFF") +
          "\nChannel ID: " + (settings.ticket.welcomeChannelId || "not set") +
          "\nMessage: " + settings.ticket.welcomeMessage +
          "\n\nEdit the message and channel in the Velceron app settings, then click Save.");
        return;
      }
      case "logs": {
        const setup = await rootServer.dataStore.appData.get<any>("velceron.setup.v1");
        await reply(evt.channelId, setup?.logsChannelId ? "Technical errors are posted in [velceron-logs](root://channel/" + setup.logsChannelId + ")." : "Run /setup to create the private technical logs channel.");
        return;
      }

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

async function handleCommunityJoined(evt: CommunityJoinedEvent): Promise<void> {
  try {
    const guidType = RootGuidUtils.toRootGuidType(evt.userId);
    if (guidType !== RootGuidType.Person) return;
    const settings = await loadSettings();
    if (!settings.modules.welcome) return;
    const channelId = settings.ticket.welcomeChannelId.trim();
    if (!channelId) {
      await logTechnicalError("Welcome messages are enabled, but no welcome channel is configured in the app settings.");
      return;
    }
    const community = await rootServer.community.communities.get();
    const message = settings.ticket.welcomeMessage
      .replace(/\{user\}/g, "[New member](root://user/" + evt.userId + ")")
      .replace(/\{community\}/g, community.name);
    await reply(channelId as ChannelGuid, message.slice(0, 1800));
  } catch (error) {
    console.error("Welcome message failed:", error);
    await logTechnicalError("Welcome message failed: " + String(error));
  }
}

export async function initialize(): Promise<void> {
  rootServer.community.communities.on(CommunityEvent.CommunityJoined, (evt: CommunityJoinedEvent) => {
    void handleCommunityJoined(evt);
  });
  rootServer.community.communityMemberBans.on(
    CommunityMemberBanEvent.CommunityMemberBanCreated,
    (evt: CommunityMemberBanCreatedEvent) => {
      void logTechnicalError("Ban created for " + evt.userId + "; reason: " + (evt.reason ?? "not provided"));
    }
  );
  rootServer.community.communityMemberBans.on(
    CommunityMemberBanEvent.CommunityMemberBanDeleted,
    (evt: CommunityMemberBanDeletedEvent) => {
      void logTechnicalError("Ban removed for " + evt.userId);
    }
  );
  rootServer.community.channelMessages.on(
    ChannelMessageEvent.ChannelMessageCreated,
    (evt: ChannelMessageCreatedEvent) => {
      void handleMessage(evt);
    }
  );
}

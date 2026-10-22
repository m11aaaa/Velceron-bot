import { Client } from "@rootsdk/server-app";
import { VelceronConfigServiceBase, GetSettingsRequest, GetSettingsResponse, SaveSettingsRequest, SaveSettingsResponse } from "@velceron/gen-server";
import { rootServer } from "@rootsdk/server-app";

type Settings = {
  modules: { tickets: boolean; moderation: boolean; welcome: boolean; logs: boolean };
  ticket: { title: string; description: string; buttonText: string; pingStaff: boolean; sendTranscriptToCreator: boolean; sendTranscriptToLogs: boolean; logChannelId: string };
};
const KEY = "velceron.settings.v1";
const defaults: Settings = {
  modules: { tickets: true, moderation: true, welcome: false, logs: true },
  ticket: { title: "Need help?", description: "Click below to open a support ticket.", buttonText: "Open a ticket", pingStaff: true, sendTranscriptToCreator: true, sendTranscriptToLogs: false, logChannelId: "" }
};

export class ConfigService extends VelceronConfigServiceBase {
  async getSettings(_request: GetSettingsRequest, _client: Client): Promise<GetSettingsResponse> {
    const stored = await rootServer.dataStore.appData.get<Settings>(KEY);
    const s = merge(stored);
    return {
      tickets: s.modules.tickets, moderation: s.modules.moderation, welcome: s.modules.welcome, logs: s.modules.logs,
      ticketTitle: s.ticket.title, ticketDescription: s.ticket.description, ticketButtonText: s.ticket.buttonText,
      pingStaff: s.ticket.pingStaff, transcriptToCreator: s.ticket.sendTranscriptToCreator,
      transcriptToLogs: s.ticket.sendTranscriptToLogs, logChannelId: s.ticket.logChannelId
    };
  }
  async saveSettings(request: SaveSettingsRequest, client: Client): Promise<SaveSettingsResponse> {
    const setup = await rootServer.dataStore.appData.get<any>("velceron.setup.v1");
    if (!setup) return { success: false, message: "Run /setup in your community before saving settings." };
    const callerId = (client as any).userId as string | undefined;
    if (!callerId) return { success: false, message: "Could not verify your Root account. Please use /settings commands in the community instead." };
    const isAllowed = callerId === setup.ownerId ||
      (setup.allowedUserIds ?? []).includes(callerId) ||
      (await rootServer.community.communityMembers.get({ userId: callerId } as any).catch(() => null))?.communityRoleIds?.some((id: string) => (setup.staffRoleIds ?? []).includes(id)) ||
      await isCommunityManager(callerId);
    if (!isAllowed) return { success: false, message: "Only the setup owner, community managers, or configured staff can save settings." };
    if (!setup.ownerId) return { success: false, message: "Setup owner is missing. Run /setup again." };
    const current = merge(await rootServer.dataStore.appData.get<Settings>(KEY));
    const title = (request.ticketTitle || "").trim();
    const description = (request.ticketDescription || "").trim();
    const buttonText = (request.ticketButtonText || "").trim();
    if (!title || !description || !buttonText) return { success: false, message: "Ticket title, description and button text are required." };
    if (title.length > 120 || description.length > 1000 || buttonText.length > 80) return { success: false, message: "Please shorten one or more ticket fields." };
    const updated: Settings = {
      modules: { tickets: request.tickets, moderation: request.moderation, welcome: request.welcome, logs: request.logs },
      ticket: { title, description, buttonText, pingStaff: request.pingStaff, sendTranscriptToCreator: request.transcriptToCreator, sendTranscriptToLogs: request.transcriptToLogs, logChannelId: (request.logChannelId || "").trim() }
    };
    await rootServer.dataStore.appData.set({ key: KEY, value: updated });
    return { success: true, message: "Settings saved successfully." };
  }
}
function merge(stored?: Partial<Settings> | null): Settings {
  return { modules: { ...defaults.modules, ...(stored?.modules ?? {}) }, ticket: { ...defaults.ticket, ...(stored?.ticket ?? {}) } };
}
export const configService = new ConfigService();

async function isCommunityManager(userId: string): Promise<boolean> {
  try {
    const member = await rootServer.community.communityMembers.get({ userId } as any);
    const roles = await rootServer.community.communityRoles.list();
    const memberRoleIds = new Set<string>(member.communityRoleIds ?? []);
    return roles.some((role: any) => memberRoleIds.has(role.id) && role.communityPermission?.communityManageCommunity === true);
  } catch {
    return false;
  }
}

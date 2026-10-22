import { Client, rootServer } from "@rootsdk/server-app";
import { VelceronConfigServiceBase } from "@velceron/gen-server";
import { GetSettingsRequest, GetSettingsResponse, SaveSettingsRequest, SaveSettingsResponse } from "@velceron/gen-shared";

type Settings = {
  modules: { tickets: boolean; moderation: boolean; welcome: boolean; logs: boolean };
  ticket: { title: string; description: string; buttonText: string; pingStaff: boolean; sendTranscriptToCreator: boolean; sendTranscriptToLogs: boolean; logChannelId: string; welcomeMessage: string; welcomeChannelId: string };
};
const KEY = "velceron.settings.v1";
const defaults: Settings = {
  modules: { tickets: true, moderation: true, welcome: false, logs: true },
  ticket: { title: "Need help?", description: "Click below to open a support ticket.", buttonText: "Open a ticket", pingStaff: true, sendTranscriptToCreator: true, sendTranscriptToLogs: false, logChannelId: "", welcomeMessage: "Welcome {user} to {community}!", welcomeChannelId: "" }
};
export class ConfigService extends VelceronConfigServiceBase {
  async getSettings(_request: GetSettingsRequest, _client: Client): Promise<GetSettingsResponse> {
    const s = merge(await rootServer.dataStore.appData.get<Settings>(KEY));
    return { tickets:s.modules.tickets, moderation:s.modules.moderation, welcome:s.modules.welcome, logs:s.modules.logs,
      ticketTitle:s.ticket.title, ticketDescription:s.ticket.description, ticketButtonText:s.ticket.buttonText,
      pingStaff:s.ticket.pingStaff, transcriptToCreator:s.ticket.sendTranscriptToCreator,
      transcriptToLogs:s.ticket.sendTranscriptToLogs, logChannelId:s.ticket.logChannelId, welcomeMessage:s.ticket.welcomeMessage, welcomeChannelId:s.ticket.welcomeChannelId };
  }
  async saveSettings(request: SaveSettingsRequest, client: Client): Promise<SaveSettingsResponse> {
    if (!await isAdmin(client)) return { success:false, message:"Only the community owner or a community manager can save settings." };
    const title=(request.ticketTitle||"").trim(), description=(request.ticketDescription||"").trim(), buttonText=(request.ticketButtonText||"").trim();
    if (!title || !description || !buttonText) return {success:false,message:"Ticket title, description and button text are required."};
    if (title.length>120 || description.length>1000 || buttonText.length>80) return {success:false,message:"Please shorten one or more ticket fields."};
    const updated:Settings={modules:{tickets:request.tickets,moderation:request.moderation,welcome:request.welcome,logs:request.logs},
      ticket:{title,description,buttonText,pingStaff:request.pingStaff,sendTranscriptToCreator:request.transcriptToCreator,sendTranscriptToLogs:request.transcriptToLogs,logChannelId:(request.logChannelId||"").trim(),welcomeMessage:(request.welcomeMessage||"").trim(),welcomeChannelId:(request.welcomeChannelId||"").trim()}};
    await rootServer.dataStore.appData.set({key:KEY,value:updated});
    return {success:true,message:"Settings saved successfully."};
  }
}
async function isAdmin(client: Client): Promise<boolean> {
  try {
    const community = await rootServer.community.communities.get();
    if (community.ownerUserId === client.userId) return true;
    const member = await rootServer.community.communityMembers.get({userId:client.userId});
    const roles = await rootServer.community.communityRoles.list();
    const ids = new Set<string>(member.communityRoleIds ?? []);
    return roles.some((role:any)=>ids.has(role.id) && role.communityPermission?.communityManageCommunity===true);
  } catch { return false; }
}
function merge(stored?: Partial<Settings> | null): Settings {
  return {modules:{...defaults.modules,...(stored?.modules??{})},ticket:{...defaults.ticket,...(stored?.ticket??{})}};
}
export const configService = new ConfigService();

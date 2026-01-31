import { fetchWithAuth, getApiUrl } from './client';

export type AutopilotMode = 'SUGGEST' | 'DRAFT' | 'AUTO';

export interface AgentSettings {
  id: string;
  tenantId: string;
  autopilotMode: AutopilotMode;
  maxDiscountPercent: number;
  revenueAgentEnabled: boolean;
  customerAgentEnabled: boolean;
  operationsAgentEnabled: boolean;
  marketingAgentEnabled: boolean;
  dashboardNotifications: boolean;
  pushNotifications: boolean;
  pushMinPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  emailDigestEnabled: boolean;
  emailDigestFrequency: string;
  emailDigestRecipients: string[];
}

export async function getAgentSettings(): Promise<AgentSettings> {
  return fetchWithAuth(getApiUrl('/agents/settings'));
}

export async function updateAgentSettings(
  updates: Partial<AgentSettings>,
): Promise<AgentSettings> {
  return fetchWithAuth(getApiUrl('/agents/settings'), {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

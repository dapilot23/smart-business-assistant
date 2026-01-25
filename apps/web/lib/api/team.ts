import {
  TeamMember,
  TeamInvitation,
  InviteTeamMemberData,
  UpdateTeamMemberData,
  InvitationDetails,
} from '@/lib/types/team';
import { fetchWithAuth, getApiUrl } from './client';

export async function getTeamMembers(): Promise<TeamMember[]> {
  return fetchWithAuth(getApiUrl('/team'));
}

export async function getTeamMember(id: string): Promise<TeamMember> {
  return fetchWithAuth(getApiUrl(`/team/${id}`));
}

export async function updateTeamMember(
  id: string,
  data: UpdateTeamMemberData
): Promise<TeamMember> {
  return fetchWithAuth(getApiUrl(`/team/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function removeTeamMember(id: string): Promise<void> {
  return fetchWithAuth(getApiUrl(`/team/${id}`), {
    method: 'DELETE',
  });
}

export async function inviteTeamMember(data: InviteTeamMemberData): Promise<TeamInvitation> {
  return fetchWithAuth(getApiUrl('/team/invite'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getInvitations(): Promise<TeamInvitation[]> {
  return fetchWithAuth(getApiUrl('/team/invitations'));
}

export async function cancelInvitation(id: string): Promise<void> {
  return fetchWithAuth(getApiUrl(`/team/invitations/${id}`), {
    method: 'DELETE',
  });
}

export async function resendInvitation(id: string): Promise<TeamInvitation> {
  return fetchWithAuth(getApiUrl(`/team/invitations/${id}/resend`), {
    method: 'POST',
  });
}

export async function getInvitationDetails(token: string): Promise<InvitationDetails> {
  return fetchWithAuth(getApiUrl(`/team/invitations/${token}/details`));
}

import {
  TeamMember,
  TeamInvitation,
  InviteTeamMemberData,
  UpdateTeamMemberData,
  InvitationDetails,
} from '@/lib/types/team';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchWithAuth(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  return fetchWithAuth(`${API_URL}/team`);
}

export async function getTeamMember(id: string): Promise<TeamMember> {
  return fetchWithAuth(`${API_URL}/team/${id}`);
}

export async function updateTeamMember(
  id: string,
  data: UpdateTeamMemberData
): Promise<TeamMember> {
  return fetchWithAuth(`${API_URL}/team/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function removeTeamMember(id: string): Promise<void> {
  return fetchWithAuth(`${API_URL}/team/${id}`, {
    method: 'DELETE',
  });
}

export async function inviteTeamMember(data: InviteTeamMemberData): Promise<TeamInvitation> {
  return fetchWithAuth(`${API_URL}/team/invite`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getInvitations(): Promise<TeamInvitation[]> {
  return fetchWithAuth(`${API_URL}/team/invitations`);
}

export async function cancelInvitation(id: string): Promise<void> {
  return fetchWithAuth(`${API_URL}/team/invitations/${id}`, {
    method: 'DELETE',
  });
}

export async function resendInvitation(id: string): Promise<TeamInvitation> {
  return fetchWithAuth(`${API_URL}/team/invitations/${id}/resend`, {
    method: 'POST',
  });
}

export async function getInvitationDetails(token: string): Promise<InvitationDetails> {
  return fetchWithAuth(`${API_URL}/team/invitations/${token}/details`);
}

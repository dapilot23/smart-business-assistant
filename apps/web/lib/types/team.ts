export type TeamMemberRole = 'owner' | 'admin' | 'dispatcher' | 'technician';
export type TeamMemberStatus = 'active' | 'pending' | 'deactivated';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  name?: string;
  role: TeamMemberRole;
  token: string;
  expires_at: string;
  created_at: string;
  invited_by: string;
}

export interface InviteTeamMemberData {
  email: string;
  name?: string;
  role: TeamMemberRole;
}

export interface UpdateTeamMemberData {
  role?: TeamMemberRole;
  status?: TeamMemberStatus;
}

export interface InvitationDetails {
  business_name: string;
  role: TeamMemberRole;
  invited_by: string;
  expires_at: string;
}

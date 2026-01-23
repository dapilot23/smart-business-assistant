"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TeamMemberList } from '@/components/team/team-member-list';
import { InviteMemberModal } from '@/components/team/invite-member-modal';
import { EditMemberModal } from '@/components/team/edit-member-modal';
import { PendingInvitations } from '@/components/team/pending-invitations';
import { TeamMember, TeamInvitation } from '@/lib/types/team';
import { getTeamMembers, getInvitations, removeTeamMember } from '@/lib/api/team';
import { UserPlus, Users, Loader2 } from 'lucide-react';

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [membersData, invitationsData] = await Promise.all([
        getTeamMembers(),
        getInvitations(),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setIsEditModalOpen(true);
  };

  const handleRemove = async (member: TeamMember) => {
    if (!confirm(`Are you sure you want to remove ${member.name} from the team?`)) return;

    try {
      await removeTeamMember(member.id);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove team member');
    }
  };

  const handleSuccess = () => {
    fetchData();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Team Management</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Manage your team members and their permissions
          </p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Team Members Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members
                  </CardTitle>
                  <CardDescription>
                    All active and inactive members of your organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TeamMemberList
                    members={members}
                    onEdit={handleEdit}
                    onRemove={handleRemove}
                  />
                </CardContent>
              </Card>

              {/* Pending Invitations */}
              <PendingInvitations invitations={invitations} onUpdate={fetchData} />

              {/* Role Descriptions Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Role Permissions</CardTitle>
                  <CardDescription>
                    Understanding team member roles and their capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-24 flex-shrink-0">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground">
                            Owner
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Full system access including billing, team management, and all features.
                          Cannot be removed or edited.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-24 flex-shrink-0">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-500 text-white">
                            Admin
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Full access to all features and settings, can manage team members, but cannot
                          access billing.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-24 flex-shrink-0">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                            Dispatcher
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Can create, view, and manage appointments, handle customer communications,
                          and view reports.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-24 flex-shrink-0">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-500 text-white">
                            Technician
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Can view and update their assigned appointments, update job status, and
                          communicate with customers.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <InviteMemberModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        onSuccess={handleSuccess}
      />
      <EditMemberModal
        member={selectedMember}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

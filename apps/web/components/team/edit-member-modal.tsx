"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeamMember, TeamMemberRole } from '@/lib/types/team';
import { updateTeamMember } from '@/lib/api/team';

interface EditMemberModalProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditMemberModal({ member, open, onOpenChange, onSuccess }: EditMemberModalProps) {
  const [role, setRole] = useState<TeamMemberRole>('technician');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member) {
      setRole(member.role);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setError('');
    setIsLoading(true);

    try {
      await updateTeamMember(member.id, { role });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!member) return;
    if (!confirm(`Are you sure you want to deactivate ${member.name}?`)) return;

    setError('');
    setIsLoading(true);

    try {
      await updateTeamMember(member.id, { status: 'deactivated' });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!member) return;

    setError('');
    setIsLoading(true);

    try {
      await updateTeamMember(member.id, { status: 'active' });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate member');
    } finally {
      setIsLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the role and status of {member.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as TeamMemberRole)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === 'admin' && 'Full access to all features and settings'}
                {role === 'dispatcher' && 'Manage appointments and customer communications'}
                {role === 'technician' && 'View and update assigned appointments'}
              </p>
            </div>

            <div className="grid gap-2 pt-4 border-t">
              <Label>Status Management</Label>
              {member.status === 'active' ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={isLoading}
                >
                  Deactivate Member
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  onClick={handleReactivate}
                  disabled={isLoading}
                >
                  Reactivate Member
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {member.status === 'active'
                  ? 'Deactivating will revoke access to the system'
                  : 'Reactivating will restore access to the system'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || role === member.role}>
              {isLoading ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { TeamMember, TeamMemberRole, TeamMemberStatus } from '@/lib/types/team';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

interface TeamMemberListProps {
  members: TeamMember[];
  onEdit: (member: TeamMember) => void;
  onRemove: (member: TeamMember) => void;
}

// Role badge styling based on role
function getRoleBadgeVariant(role: TeamMemberRole): "default" | "secondary" | "success" | "warning" | "info" {
  switch (role) {
    case 'owner':
      return 'default';
    case 'admin':
      return 'info';
    case 'dispatcher':
      return 'secondary';
    case 'technician':
      return 'success';
    default:
      return 'secondary';
  }
}

// Status badge styling based on status
function getStatusBadgeVariant(status: TeamMemberStatus): "default" | "secondary" | "success" | "warning" | "destructive" {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'deactivated':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function TeamMemberList({ members, onEdit, onRemove }: TeamMemberListProps) {
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">No team members found</p>
        <p className="text-muted-foreground text-xs mt-1">
          Invite your first team member to get started
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                  {member.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(member.status)} className="capitalize">
                  {member.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(member)}
                    disabled={member.role === 'owner'}
                    title="Edit member"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(member)}
                    disabled={member.role === 'owner'}
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

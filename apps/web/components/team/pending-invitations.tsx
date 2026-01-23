"use client";

import { TeamInvitation } from '@/lib/types/team';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, X } from 'lucide-react';
import { useState } from 'react';
import { cancelInvitation, resendInvitation } from '@/lib/api/team';

interface PendingInvitationsProps {
  invitations: TeamInvitation[];
  onUpdate: () => void;
}

export function PendingInvitations({ invitations, onUpdate }: PendingInvitationsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleResend = async (id: string) => {
    setLoadingId(id);
    try {
      await resendInvitation(id);
      onUpdate();
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      alert(error instanceof Error ? error.message : 'Failed to resend invitation');
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${email}?`)) return;

    setLoadingId(id);
    try {
      await cancelInvitation(id);
      onUpdate();
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      alert(error instanceof Error ? error.message : 'Failed to cancel invitation');
    } finally {
      setLoadingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          Invitations that have been sent but not yet accepted
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const expired = isExpired(invitation.expires_at);
                return (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{invitation.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {expired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {formatDate(invitation.expires_at)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResend(invitation.id)}
                          disabled={loadingId === invitation.id}
                          title="Resend invitation"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancel(invitation.id, invitation.email)}
                          disabled={loadingId === invitation.id}
                          title="Cancel invitation"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

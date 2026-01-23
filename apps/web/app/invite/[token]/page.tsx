"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvitationDetails } from '@/lib/types/team';
import { getInvitationDetails } from '@/lib/api/team';
import { Building2, Loader2, Mail, UserCheck, AlertCircle, Calendar } from 'lucide-react';

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getInvitationDetails(token);
        setDetails(data);

        // Check if invitation is expired
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          setError('This invitation has expired. Please contact your team administrator for a new invitation.');
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Invalid or expired invitation. Please check the link and try again.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [token]);

  const handleAccept = () => {
    // Redirect to Clerk signup with invitation token
    // The token will be used after signup to automatically add user to the team
    const signUpUrl = `/sign-up?redirect_url=${encodeURIComponent(`/invite/${token}/accept`)}`;
    router.push(signUpUrl);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>We couldn&apos;t load this invitation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => router.push('/')} className="w-full">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!details) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-6 w-6 text-primary" />
            <CardTitle>Team Invitation</CardTitle>
          </div>
          <CardDescription>You&apos;ve been invited to join a team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Invitation Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Organization</p>
                  <p className="text-sm text-muted-foreground mt-1">{details.business_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <UserCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Role</p>
                  <div className="mt-2">
                    <Badge variant="secondary" className="capitalize">
                      {details.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {details.role === 'admin' && 'Full access to all features and settings'}
                    {details.role === 'dispatcher' && 'Manage appointments and customer communications'}
                    {details.role === 'technician' && 'View and update assigned appointments'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Invited by</p>
                  <p className="text-sm text-muted-foreground mt-1">{details.invited_by}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires: {formatDate(details.expires_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button onClick={handleAccept} className="w-full" size="lg">
                Accept Invitation
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By accepting, you will be redirected to create an account or sign in
              </p>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                After signing up or signing in, you&apos;ll automatically be added to the team with the
                specified role.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

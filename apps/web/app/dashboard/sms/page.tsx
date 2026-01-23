'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MessageSquare, Send, Loader2, Users } from 'lucide-react';

interface Broadcast {
  id: string;
  message: string;
  recipients: string[];
  sent_count: number;
  created_at: string;
  created_by_name: string;
}

export default function SMSPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Broadcast form state
  const [message, setMessage] = useState('');
  const [sendToAdmin, setSendToAdmin] = useState(false);
  const [sendToDispatcher, setSendToDispatcher] = useState(false);
  const [sendToTechnician, setSendToTechnician] = useState(false);
  const [sendToAll, setSendToAll] = useState(false);

  const fetchBroadcasts = async () => {
    setIsLoading(true);
    setError('');
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sms/broadcasts`);
      if (!response.ok) throw new Error('Failed to fetch broadcasts');
      const data = await response.json();
      setBroadcasts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load broadcasts');
      setBroadcasts([]); // Set empty array on error for now
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    const roles: string[] = [];
    if (sendToAll) {
      roles.push('all');
    } else {
      if (sendToAdmin) roles.push('admin');
      if (sendToDispatcher) roles.push('dispatcher');
      if (sendToTechnician) roles.push('technician');
    }

    if (roles.length === 0) {
      alert('Please select at least one recipient group');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sms/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, roles }),
      });

      if (!response.ok) throw new Error('Failed to send broadcast');

      await fetchBroadcasts();
      setMessage('');
      setSendToAdmin(false);
      setSendToDispatcher(false);
      setSendToTechnician(false);
      setSendToAll(false);
      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send broadcast');
    } finally {
      setIsSending(false);
    }
  };

  const handleAllChange = (checked: boolean) => {
    setSendToAll(checked);
    if (checked) {
      setSendToAdmin(false);
      setSendToDispatcher(false);
      setSendToTechnician(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">SMS Management</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Send broadcast messages to your team
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Send className="h-4 w-4 mr-2" />
          Send Broadcast
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              {error}
            </div>
          )}

          {/* Recent Broadcasts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Broadcasts
              </CardTitle>
              <CardDescription>
                View history of broadcast messages sent to team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No broadcasts sent yet. Click &quot;Send Broadcast&quot; to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Message</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Sent Count</TableHead>
                      <TableHead>Sent By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {broadcasts.map((broadcast) => (
                      <TableRow key={broadcast.id}>
                        <TableCell className="max-w-md">
                          <p className="truncate">{broadcast.message}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {broadcast.recipients.map((role) => (
                              <Badge key={role} variant="secondary">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{broadcast.sent_count}</Badge>
                        </TableCell>
                        <TableCell>{broadcast.created_by_name}</TableCell>
                        <TableCell>
                          {new Date(broadcast.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Broadcast Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Send Broadcast Message</DialogTitle>
            <DialogDescription>
              Send an SMS message to selected team member groups
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                disabled={isSending}
              />
              <p className="text-xs text-muted-foreground">
                {message.length} characters
              </p>
            </div>

            <div className="space-y-3">
              <Label>
                Recipients <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendToAll}
                    onChange={(e) => handleAllChange(e.target.checked)}
                    disabled={isSending}
                    className="h-4 w-4"
                  />
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">All Team Members</span>
                </label>

                {!sendToAll && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer ml-6">
                      <input
                        type="checkbox"
                        checked={sendToAdmin}
                        onChange={(e) => setSendToAdmin(e.target.checked)}
                        disabled={isSending}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Admins</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer ml-6">
                      <input
                        type="checkbox"
                        checked={sendToDispatcher}
                        onChange={(e) => setSendToDispatcher(e.target.checked)}
                        disabled={isSending}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Dispatchers</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer ml-6">
                      <input
                        type="checkbox"
                        checked={sendToTechnician}
                        onChange={(e) => setSendToTechnician(e.target.checked)}
                        disabled={isSending}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Technicians</span>
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button onClick={handleSendBroadcast} disabled={isSending}>
              {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

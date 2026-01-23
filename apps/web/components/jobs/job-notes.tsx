'use client';

import { useState } from 'react';
import { JobNote } from '@/lib/types/jobs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface JobNotesProps {
  notes: JobNote[];
  onAddNote: (content: string) => Promise<void>;
  canEdit: boolean;
}

export function JobNotes({ notes, onAddNote, canEdit }: JobNotesProps) {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Notes</h3>

      {/* Add Note Form */}
      {canEdit && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="Add a note about this job..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={!newNote.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Note
          </Button>
        </form>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            No notes yet
          </div>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-sm">{note.created_by_name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {note.content}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

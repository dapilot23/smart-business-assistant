"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { SuggestedResponse } from '@/lib/types/ai-communication';

interface AiAssistantPanelProps {
  suggestions: SuggestedResponse[];
  loading?: boolean;
  onAccept: (id: string, editedText?: string) => void;
  onDismiss: (id: string) => void;
  onGenerate?: () => void;
}

export function AiAssistantPanel({
  suggestions,
  loading = false,
  onAccept,
  onDismiss,
  onGenerate,
}: AiAssistantPanelProps) {
  const [edits, setEdits] = useState<Record<string, string>>({});

  const hasSuggestions = suggestions.length > 0;
  const sorted = useMemo(
    () => [...suggestions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [suggestions],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">AI Suggested Replies</CardTitle>
        {onGenerate && (
          <Button size="sm" variant="outline" onClick={onGenerate} disabled={loading}>
            Generate
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Generating suggestions...</div>
        ) : !hasSuggestions ? (
          <div className="text-sm text-muted-foreground">No suggestions yet.</div>
        ) : (
          sorted.map((suggestion) => {
            const edited = edits[suggestion.id] ?? suggestion.suggestion;
            return (
              <div key={suggestion.id} className="rounded-lg border border-border p-3 space-y-2">
                <Textarea
                  value={edited}
                  onChange={(event) =>
                    setEdits((prev) => ({ ...prev, [suggestion.id]: event.target.value }))
                  }
                  className="min-h-[96px]"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{suggestion.tone ? `Tone: ${suggestion.tone}` : 'Tone: balanced'}</span>
                  {suggestion.confidence !== null && suggestion.confidence !== undefined && (
                    <span>Confidence: {Math.round(suggestion.confidence * 100)}%</span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDismiss(suggestion.id)}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onAccept(suggestion.id, edited)}
                  >
                    Send Reply
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

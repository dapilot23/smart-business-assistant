"use client";

import { Icon } from "@/app/components/Icon";

interface Recommendation {
  title: string;
  description: string;
  feature: string;
}

interface InterviewSummaryProps {
  summary: {
    aiSummary: string;
    brandVoice: string;
    recommendations: Recommendation[];
    profile: Record<string, unknown>;
  };
  onContinue: () => void;
}

export function InterviewSummary({ summary, onContinue }: InterviewSummaryProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Success header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="check" size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            All set! I know your business now.
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s what I learned and how I&apos;ll help you.
          </p>
        </div>

        {/* AI Summary */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="bot" size={16} className="text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Your Business Profile</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {summary.aiSummary || "No summary available yet."}
          </p>
        </div>

        {/* Brand Voice */}
        {summary.brandVoice && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="message-square" size={18} className="text-blue-600" />
              <h3 className="font-semibold text-blue-900">Your Communication Style</h3>
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">
              {summary.brandVoice}
            </p>
          </div>
        )}

        {/* Recommendations */}
        {summary.recommendations && summary.recommendations.length > 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Icon name="trending-up" size={18} className="text-primary" />
              Recommended for You
            </h3>
            <div className="space-y-3">
              {summary.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon name="check" size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground mb-1">
                        {rec.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {rec.description}
                      </p>
                      {rec.feature && (
                        <span className="inline-block mt-2 text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                          {rec.feature}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue button */}
        <div className="pt-4">
          <button
            onClick={onContinue}
            className="
              w-full py-3 px-6
              bg-primary text-primary-foreground rounded-xl
              font-medium text-sm
              hover:opacity-90 transition-opacity
              flex items-center justify-center gap-2
            "
          >
            Continue to Dashboard
            <Icon name="chevron-right" size={18} />
          </button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            You can update your business profile anytime in Settings
          </p>
        </div>
      </div>
    </div>
  );
}

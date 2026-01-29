"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/Icon";
import { useOnboardingInterview } from "@/lib/hooks/use-onboarding-interview";
import { InterviewProgress } from "./interview-progress";
import { InterviewChat } from "./interview-chat";
import { InterviewInput } from "./interview-input";
import { InterviewSummary } from "./interview-summary";

interface InterviewContainerProps {
  businessName?: string;
}

export function InterviewContainer({ businessName }: InterviewContainerProps) {
  const router = useRouter();
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  const {
    messages,
    progress,
    isLoading,
    isSending,
    error,
    isComplete,
    summary,
    canResume,
    status,
    checkStatus,
    start,
    sendMessage,
    skipQuestion,
  } = useOnboardingInterview();

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (status === 'IN_PROGRESS' && canResume) {
      setShowResumePrompt(true);
    }
  }, [status, canResume]);

  const handleStart = async (resume = false) => {
    setShowResumePrompt(false);
    await start(resume);
  };

  const handleContinue = () => {
    router.push('/dashboard');
  };

  // Loading state
  if (isLoading && status === null) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon name="loader-2" size={32} className="text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Resume prompt
  if (showResumePrompt) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="message-square" size={28} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Welcome back!
            </h2>
            <p className="text-muted-foreground mb-6">
              You have an interview in progress. Would you like to continue where you left off?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleStart(true)}
                className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Continue Interview
              </button>
              <button
                onClick={() => handleStart(false)}
                className="w-full py-3 px-6 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not started - show welcome screen
  if (status === 'NOT_STARTED' || (status !== 'IN_PROGRESS' && status !== 'COMPLETED' && messages.length === 0)) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="bot" size={36} className="text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              Let&apos;s get to know {businessName || 'your business'}
            </h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              I&apos;ll ask you a few questions so I can personalize everything for you.
              This takes about 5 minutes and you can skip any question.
            </p>
            <button
              onClick={() => handleStart(false)}
              disabled={isLoading}
              className="
                py-3 px-8
                bg-primary text-primary-foreground rounded-xl
                font-medium text-sm
                hover:opacity-90 transition-opacity
                disabled:opacity-50
                inline-flex items-center gap-2
              "
            >
              {isLoading ? (
                <>
                  <Icon name="loader-2" size={18} className="animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Start Interview
                  <Icon name="chevron-right" size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Completed - show summary
  if (isComplete && summary) {
    return (
      <div className="flex flex-col h-full bg-background">
        <InterviewSummary summary={summary} onContinue={handleContinue} />
      </div>
    );
  }

  // Active interview
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Progress bar */}
      <InterviewProgress progress={progress} />

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Chat area */}
      <InterviewChat messages={messages} isTyping={isSending} />

      {/* Input area */}
      <InterviewInput
        onSend={sendMessage}
        onSkip={skipQuestion}
        disabled={isSending || isLoading}
      />
    </div>
  );
}

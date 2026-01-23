"use client";

import { ReactNode } from "react";
import { Icon } from "@/app/components/Icon";
import { Button } from "@/components/ui/button";

interface Step {
  id: number;
  label: string;
  completed: boolean;
}

interface OnboardingWizardProps {
  currentStep: number;
  steps: Step[];
  onBack?: () => void;
  onNext?: () => void;
  onComplete?: () => void;
  children: ReactNode;
  nextDisabled?: boolean;
}

export function OnboardingWizard({
  currentStep,
  steps,
  onBack,
  onNext,
  onComplete,
  children,
  nextDisabled = false,
}: OnboardingWizardProps) {
  const isLastStep = currentStep === steps.length;
  const isFirstStep = currentStep === 1;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="px-8 py-6 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isPast = step.id < currentStep;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      isCurrent
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : isPast
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {isPast ? (
                      <Icon name="check" size={20} />
                    ) : (
                      <span className="font-semibold">{step.id}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      isCurrent || isPast
                        ? 'text-[var(--foreground)]'
                        : 'text-[var(--muted-foreground)]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 -mt-10 ${
                      isPast ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">{children}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-8 py-6 border-t border-[var(--border)]">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isFirstStep}
          className={isFirstStep ? 'invisible' : ''}
        >
          <Icon name="chevron-right" size={16} className="rotate-180" />
          Back
        </Button>

        {isLastStep ? (
          <Button onClick={onComplete}>
            Complete Setup
            <Icon name="check" size={16} />
          </Button>
        ) : (
          <Button onClick={onNext} disabled={nextDisabled}>
            Continue
            <Icon name="chevron-right" size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

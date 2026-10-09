import { useCallback, useState } from "react";

export interface UseLoanWizardOptions {
  totalSteps: number;
  validateStep: (stepIndex: number) => boolean;
  onExitFromFirstStep?: () => void;
  onStepChange?: () => void;
}

export function useLoanWizard({
  totalSteps,
  validateStep,
  onExitFromFirstStep,
  onStepChange,
}: UseLoanWizardOptions) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const lastStepIndex = Math.max(0, totalSteps - 1);
  const isLastStep = currentStepIndex >= lastStepIndex;

  const goToStep = useCallback(
    (stepIndex: number) => {
      if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex > lastStepIndex) {
        return;
      }
      if (currentStepIndex === stepIndex) return;
      setCurrentStepIndex(stepIndex);
      onStepChange?.();
    },
    [currentStepIndex, lastStepIndex, onStepChange]
  );

  const goToNextStep = useCallback(() => {
    if (currentStepIndex >= lastStepIndex || !validateStep(currentStepIndex)) return;
    goToStep(currentStepIndex + 1);
  }, [currentStepIndex, goToStep, lastStepIndex, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStepIndex === 0) {
      onExitFromFirstStep?.();
      return;
    }
    goToStep(currentStepIndex - 1);
  }, [currentStepIndex, goToStep, onExitFromFirstStep]);

  return {
    currentStepIndex,
    isLastStep,
    goToNextStep,
    goToStep,
    handleBack,
  };
}

export default useLoanWizard;

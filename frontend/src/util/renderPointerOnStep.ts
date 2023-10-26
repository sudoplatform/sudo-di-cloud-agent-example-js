/**
 * Helps guide the user through the flow of the example app.
 *
 * Returns a pointer character which can be displayed to attract the user's attention on a given step(s).
 *
 * @param currentStep A reference to the current/active step.
 * @param onStep On this step, place focus on the HTML element. Also accepts an array of steps.
 *               The pointer will be returned on any of the given steps.
 */
export function renderPointerOnStep<ExampleStepEnum>(
  currentStep: ExampleStepEnum,
  onStep: ExampleStepEnum | ExampleStepEnum[],
) {
  if (!Array.isArray(onStep)) {
    onStep = [onStep];
  }
  return onStep.includes(currentStep) ? '>' : '';
}

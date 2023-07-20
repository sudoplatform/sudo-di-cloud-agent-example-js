/**
 * This file contains helper functions to guide the user through the flow of the example app.
 */

/**
 * Returns the custom "focus" value for the HTML "class" attribute when the user flow is on a given step(s).
 * This allows CSS to stylize the associated HTML element to attract the user's attention on the given step(s).
 *
 * @param currentStep A reference to the current/active step.
 * @param onStep On this step, place focus on the HTML element. Also accepts an array of steps.
 *               The "focus" value will be returned on any of the given steps.
 */
export function focusOnStep<ExampleStepEnum>(
  currentStep: ExampleStepEnum,
  onStep: ExampleStepEnum | ExampleStepEnum[],
) {
  if (!Array.isArray(onStep)) {
    onStep = [onStep];
  }
  return onStep.includes(currentStep) ? 'focus' : '';
}

/**
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

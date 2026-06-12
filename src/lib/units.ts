/** "1" reads as "Unit 1"; named units ("Main", "Garden") stand alone. */
export function unitTitle(unitNumber: string): string {
  return /^\d/.test(unitNumber) ? `Unit ${unitNumber}` : unitNumber;
}

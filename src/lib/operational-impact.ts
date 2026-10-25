/** Illustrative capacity valuation, not measured savings or a forecast. */
export type ImpactInputs = {
  employees: number;
  minutes: number;
  hourlyCost: number;
  workingDays: number;
  recoveredMinutes: number;
};

const positive = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

export function calculateOperationalImpact(input: ImpactInputs) {
  const employees = positive(input.employees);
  const minutes = positive(input.minutes);
  const workingDays = positive(input.workingDays);
  const hourlyCost = positive(input.hourlyCost);
  const recoveredMinutes = Math.min(minutes, positive(input.recoveredMinutes));
  const searchHours = employees * minutes * workingDays / 60;
  const recoveredHours = employees * recoveredMinutes * workingDays / 60;
  return {
    searchHours,
    searchCost: searchHours * hourlyCost,
    recoveredHours,
    recoveredValue: recoveredHours * hourlyCost,
    remainingCost: (searchHours - recoveredHours) * hourlyCost,
  };
}
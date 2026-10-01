export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function friendlyError(error: unknown) {
  if (error instanceof DomainError) return { error: error.message, status: error.status };
  const message = error instanceof Error ? error.message : "";
  if (message.includes("OUTSIDE_WORKING_WINDOW") || message.includes("COACH_UNAVAILABLE"))
    return { error: "This time is outside working hours or overlaps a break.", status: 409 };
  if (message.includes("CAPACITY_REACHED"))
    return {
      error: "That last place has just been taken. Please choose another session.",
      status: 409,
    };
  if (message.includes("ALREADY_BOOKED"))
    return { error: "You already have a reservation for this session.", status: 409 };
  if (message.includes("SCHEDULE_OVERLAP"))
    return { error: "This session overlaps another session or its recovery buffer.", status: 409 };
  return { error: "We could not complete this request. Please try again.", status: 500 };
}

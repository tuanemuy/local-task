export function validateTaskId(id: string): number {
  if (!id || id.trim() === "" || !/^\d+$/.test(id)) {
    throw new Error("Invalid task ID");
  }

  const taskId = Number.parseInt(id, 10);
  if (Number.isNaN(taskId) || taskId <= 0) {
    throw new Error("Invalid task ID");
  }

  return taskId;
}

export function handleCommandError(action: string, error: unknown): never {
  if (error instanceof Error && error.message === "Invalid task ID") {
    console.error("Invalid task ID");
  } else {
    console.error(`Failed to ${action}:`, error);
  }
  throw error;
}

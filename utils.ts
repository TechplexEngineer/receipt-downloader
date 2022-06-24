
/**
 * Wrapper for setTimeout to create delays
 * @param ms number of miliseconds to delay
 * @returns Void
 */
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));


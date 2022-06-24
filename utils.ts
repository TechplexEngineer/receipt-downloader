import 'any-date-parser';
/**
 * Wrapper for setTimeout to create delays
 * @param ms number of miliseconds to delay
 * @returns Void
 */
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fix dates from human readable versions. Supports Mcmaster and WCP
 * @param input takes a string like "August 7" and returns the YYYY-MM-DD form where the year is assumed to be the current year.
 * @returns YYYY-MM-DD
 */
export function normalizeDate(input: string): string {

    const currentYear = new Date().getFullYear();

    // mcm date
    if (input.indexOf(",") == -1 && input.indexOf(currentYear.toString()) == -1) {
        input += `, ${currentYear}`;
    }

    // wcp date
    if (input.indexOf(":") !== -1) {
        input = input.substring(0, input.indexOf(":") - 2)
        input += `${currentYear}`;
    }
    
    // @ts-ignore
    const event = Date.fromString(input)
    if (event.invalid) {
        throw new Error(`Invalid Date Input: ${input} - error ${JSON.stringify(event)}`);
        
    }
    return event.toISOString().split("T")[0];
}
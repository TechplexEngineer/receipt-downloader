
/**
 * Fix dates that McMaster lists on order page
 * @param input takes a string like "August 7" and returns the YYYY-MM-DD form where the year is assumed to be the current year.
 * @returns YYYY-MM-DD
 */
function normalizeDate(input: string): string {
    if (input.indexOf(",") == -1) {
        input += `, ${new Date().getFullYear()}`;
    }

    const event = new Date(Date.parse(input));
    return event.toISOString().split("T")[0];
}
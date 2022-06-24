import { test, expect } from '@playwright/test';
import { normalizeDate } from '../utils.ts';

test.describe("test normalize date", () => {

    const table = [
        {
            name: "previous year",
            input: "August 7, 2021",
            output: "2021-08-07"
        }, {
            name: "current year",
            input: "August 7",
            output: "2022-08-07"
        }, {
            name: "wcp date",
            input: "13 Jun 08:37",
            output: "2022-06-13"
        }
    ];

    for (let row of table) {
        test(row.name, ({ page }) => {
            expect(normalizeDate(row.input)).toEqual(row.output);
        });
    }

    test("invalid", ({ page }) => {
        expect(() => { normalizeDate("garbage")}).toThrow();
    });

});
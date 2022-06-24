import 'dotenv/config';

import { chromium, Page } from 'playwright';
import { delay } from '../utils';
import camelCase from 'lodash.camelcase';
import { mkdir, writeFile } from 'fs/promises';
import { fstat } from 'fs';
import 'any-date-parser';

function normalizeDate(input: string): string {

    const currentYear = new Date().getFullYear();

    // @ts-ignore
    const event = Date.fromString(input)
    if (event.invalid) {
        throw new Error(`Invalid Date Input: ${input} - error ${JSON.stringify(event)}`);

    }
    return event.toISOString().split("T")[0];
}

async function amazonLogin(page: Page) {
    await page.goto('https://www.amazon.com/b2b/reports');

    const $userField = page.locator('input[name="email"]');
    await $userField.fill(process.env.AMAZON_USERNAME || "");

    await Promise.all([
        page.waitForNavigation(),
        await $userField.press('Enter')
    ]);

    const $pwField = page.locator('input[name="password"]').first();
    await $pwField.fill(process.env.AMAZON_PASSWORD || "");
    await Promise.all([
        page.waitForNavigation(),
        await $pwField.press('Enter')
    ]);
}

; (async () => {
    const browser = await chromium.launch({
        headless: !!!process.env.PWSHOW
    });

    // Creates a new browser context. It won't share cookies/cache with other browser contexts.
    const context = await browser.newContext();

    // const page = await browser.newPage();
    const page = await context.newPage();

    console.log("Starting Login")
    await amazonLogin(page);

    await page.pause();

})();

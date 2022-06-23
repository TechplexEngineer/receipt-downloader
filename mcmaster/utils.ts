import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import fs from 'node:fs';

import type { Page } from "playwright";

/**
 * Fix dates that McMaster lists on order page
 * @param input takes a string like "August 7" and returns the YYYY-MM-DD form where the year is assumed to be the current year.
 * @returns YYYY-MM-DD
 */
export function normalizeDate(input: string): string {
    if (input.indexOf(",") == -1) {
        input += `, ${new Date().getFullYear()}`;
    }

    const event = new Date(Date.parse(input));
    return event.toISOString().split("T")[0];
}

/**
 * Login to McMaster Carr with username and password from environment:
 * - MCMASTER_USERNAME
 * - MCMASTER_PASSWORD
 * @param page a playwright browser page
 */
export async function login(page: Page) {
    await page.goto('https://www.mcmaster.com/order-history');
    await page.locator('input#Email[type="text"]').waitFor()
    await page.locator('input#Email[type="text"]').fill(process.env.MCMASTER_USERNAME || "");
    await page.locator('input#Password[type="password"]').fill(process.env.MCMASTER_PASSWORD || "");
    await page.locator('input#Password[type="password"]').press('Enter');
}



const streamPipeline = promisify(pipeline);

export const downloadFile = (async (url:string, path: string, options = {}) => {
    //@ts-ignore 
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
    const fileStream = fs.createWriteStream(path);
    await streamPipeline(response.body as any, createWriteStream(path));
});
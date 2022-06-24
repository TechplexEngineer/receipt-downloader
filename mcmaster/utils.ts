import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import fs from 'node:fs';

import type { Page } from "playwright";

/**
 * Login to McMaster Carr with username and password from environment:
 * - MCMASTER_USERNAME
 * - MCMASTER_PASSWORD
 * @param page a playwright browser page
 */
export async function mcmLogin(page: Page) {
    const url = 'https://www.mcmaster.com/order-history';
    await page.goto(url);
    await page.locator('input#Email[type="text"]').waitFor()
    await page.locator('input#Email[type="text"]').fill(process.env.MCMASTER_USERNAME || "");
    const $pwField = page.locator('input#Password[type="password"]');
    await $pwField.fill(process.env.MCMASTER_PASSWORD || "");
    await Promise.all([
        page.waitForNavigation(/*{ url: url }*/),
        await $pwField.press('Enter')
    ]);
}



const streamPipeline = promisify(pipeline);

export const downloadFile = (async (url:string, path: string, options = {}) => {
    //@ts-ignore 
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
    const fileStream = fs.createWriteStream(path);
    await streamPipeline(response.body as any, createWriteStream(path));
});

export async function getOrderDate(page:Page): Promise<string> {
    return await page.locator(".order-dtl-date").first().innerText();
}

export function getPurchaseOrder(page: Page): Promise<string> {
    return page.locator("#po-check-for-value").inputValue()
}

export function extractPDFName(orderReceiptUrl: string): string {
	var u = new URL(orderReceiptUrl);
	u.hash = '';   // remove any hash #abc
	u.search = ''; // remove any search ?key=value...

	const parts = u.toString().split("/");
	const lastPart = parts[parts.length-1];
	const filenameWithSpaces = decodeURIComponent(lastPart);
	const filename = filenameWithSpaces.replace(/\s/g, "-");

	return filename;
}
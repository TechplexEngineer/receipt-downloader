const { chromium } = require('playwright');
require('dotenv').config();

async function login(page) {
	await page.goto('https://www.mcmaster.com/order-history');
	await page.locator('input#Email[type="text"]').waitFor()
	await page.locator('input#Email[type="text"]').fill(process.env.MCMASTER_USERNAME);
	await page.locator('input#Password[type="password"]').fill(process.env.MCMASTER_PASSWORD);
	await page.locator('input#Password[type="password"]').press('Enter');
}

function getOrderUrls(elements) {
	console.log(elements);
	// let nodes = document.querySelectorAll('.order-summary-tile .order-summary.order-summary-placed a');
	return Array.from(elements).map(e=>e.href)
}

;(async () => {
	const browser = await chromium.launch({ headless: false, slowMo: 50 });

	// Creates a new browser context. It won't share cookies/cache with other browser contexts.
	const context = await browser.newContext();

	// const page = await browser.newPage();
	const page = await context.newPage();

	await login(page);

	// await console.log(await page.$$('.order-summary-tile'));

	let orderLinkLoc = page.locator('.order-summary-tile .order-summary.order-summary-placed a.order-summary-hdr');


	await orderLinkLoc.nth(1).waitFor();
	console.log("Done waiting for first order");

	// src: https://github.com/microsoft/playwright/issues/4302
	await page.evaluate(async () => {
		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

		const activitySummary = document.querySelector('#ActivitySummary');
		while (activitySummary.scrollHeight > (activitySummary.scrollTop + activitySummary.clientHeight)) {
			activitySummary.scrollTo(0, activitySummary.scrollHeight);
			await delay(100);
		}
	}, {timeout: 30 * 1000});
	console.log("Done scrolling");

	// wait for at least 10 orders loaded
	await orderLinkLoc.nth(25).waitFor();
	console.log("Done waiting for 25 orders");

	let urls = await orderLinkLoc.evaluateAll(getOrderUrls);

	// let urls = await page.evaluate(getOrderUrls)
	console.log(urls, urls.length);

	await browser.close();
})();


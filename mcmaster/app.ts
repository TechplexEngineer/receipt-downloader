import 'dotenv/config';

import { chromium, Cookie, Page } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { delay, normalizeDate } from '../utils.js';
import { downloadFile, extractPDFName, getOrderDate, getPurchaseOrder, mcmLogin } from './utils.js';


async function getOrderUrls(page: Page) {
	let $orderLinkLoc = page.locator('.order-summary-tile .order-summary.order-summary-placed a.order-summary-hdr');

	await $orderLinkLoc.nth(1).waitFor();
	console.log("Done waiting for first order");

	// src: https://github.com/microsoft/playwright/issues/4302
	await page.evaluate(async () => {
		const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
		// @ts-ignore
		const activitySummary = document.querySelector('#ActivitySummary');
		// @ts-ignore
		while (activitySummary.scrollHeight > (activitySummary.scrollTop + activitySummary.clientHeight)) {
			// @ts-ignore
			activitySummary.scrollTo(0, activitySummary.scrollHeight);
			await delay(100);
		}
	}, {timeout: 30 * 1000});
	console.log("Done scrolling");

	// wait for at least 10 orders loaded
	await $orderLinkLoc.nth(25).waitFor();
	console.log("Done waiting for 25 orders");

	let orderUrls = await $orderLinkLoc.evaluateAll((elements)=>{
		// @ts-ignore
		return elements.map(e=>e.href)
	});
	return orderUrls;
}

async function processOrderList(page: Page, orderUrl: string) {
	await page.goto(orderUrl);

	const $tracking = page.locator('.tracking-nbrs-summary-link'); // may be multiple
	await $tracking.first().waitFor(); //what happens for pending order?
	let trackingNumbers = await $tracking.evaluateAll(elements => {
		// @ts-ignore
		return elements.map(el => ({href: el.href, text: el.innerText}));
	});

	const $costRows = page.locator('.activity-dtl-charges tr');
	const costText = await $costRows.allTextContents();
	// console.log("costText", costText);

	let costs: {[key: string]: string} = {};
	for (let rowTxt of costText) {
		const row = rowTxt.split("\n").map(t=>t.trim()).filter(el=>el != "")
		costs[row[0]] = row[1]
	}

	// not all the pages have the receipt link....
	// const $receiptLink = page.locator('.order-dtl-panel-link >> text=/Receipt(s)? emailed to/i');

	// // SRC: https://playwright.dev/docs/pages#handling-popups
	// // Note that Promise.all prevents a race condition
	// // between clicking and waiting for the popup.
	// const [popup] = await Promise.all([
	// 	// It is important to call waitForEvent before click to set up waiting.
	// 	page.waitForEvent('popup'),
	// 	// Opens popup.
	// 	$receiptLink.click(),
	// ]);
	// await popup.waitForLoadState();
	// console.log("done waiting for popup");
	// const orderReceiptUrl = await popup.url()
	// popup.close();

	const parts = orderUrl.split("/");
	const orderId = parts[parts.length-1];

	return {
		shipping: trackingNumbers,
		orderId:  orderId,
		costs:    costs,
		date:     normalizeDate(await getOrderDate(page)),
		po:       await getPurchaseOrder(page)
		// @todo lineItems
	}
}

function buildCookieHeader(cookiesList: Cookie[]) {
	const keyvalue = cookiesList.map(c=>`${c.name}=${c.value};`);
	const cookieStr = keyvalue.join(" ");
	return cookieStr.slice(0, -1); //remove last semicolon
}

;(async () => {
	const browser = await chromium.launch();

	// Creates a new browser context. It won't share cookies/cache with other browser contexts.
	const context = await browser.newContext();

	// const page = await browser.newPage();
	const page = await context.newPage();

	console.log("Starting Login");
	
	await mcmLogin(page);
	await delay(1000);

	const cookies = await context.cookies(["https://mcmaster.com"]);

	await mkdir("./receipts/mcmaster", { recursive: true })

	const orderList = [];
	const orderUrls = await getOrderUrls(page);
	for (let orderUrl of orderUrls) {
		console.log(`Navigating to ${orderUrl}`);
		const orderInfo = await processOrderList(page, orderUrl);

		const options = {
			headers: {
				"cookie": buildCookieHeader(cookies) //cookie needed for authentication
			}
		};


		const volver = cookies.filter(c => c.name == "volver")[0].value; // not really shure what this is
		const receiptURL = `https://www.mcmaster.com/${volver}/WebParts/Activity/PDFRetriever/${orderInfo.date}-mcmaster-${orderInfo.po}-${orderInfo.orderId}.pdf?orderId=${orderInfo.orderId}&docType=Invoice&action=1&loaded=1&retryCount=1`
		
		// @ts-ignore
		orderInfo.orderReceiptFile = extractPDFName(receiptURL);
		// @ts-ignore
		await downloadFile(receiptURL, `./receipts/mcmaster/${orderInfo.orderReceiptFile}`, options);

		orderList.push(orderInfo)

	}

	await writeFile("./receipts/mcmaster/orders.json", JSON.stringify(orderList, null, '\t'));

	console.log("Done");
	

	await browser.close();
})();


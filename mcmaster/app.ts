import 'dotenv/config';

import { chromium } from 'playwright';
// require('dotenv').config();
import fs from 'node:fs';

export async function login(page) {
	await page.goto('https://www.mcmaster.com/order-history');
	await page.locator('input#Email[type="text"]').waitFor()
	await page.locator('input#Email[type="text"]').fill(process.env.MCMASTER_USERNAME);
	await page.locator('input#Password[type="password"]').fill(process.env.MCMASTER_PASSWORD);
	await page.locator('input#Password[type="password"]').press('Enter');
}

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getOrderUrls(page) {
	let $orderLinkLoc = page.locator('.order-summary-tile .order-summary.order-summary-placed a.order-summary-hdr');

	await $orderLinkLoc.nth(1).waitFor();
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
	await $orderLinkLoc.nth(25).waitFor();
	console.log("Done waiting for 25 orders");

	let orderUrls = await $orderLinkLoc.evaluateAll((elements)=>{
		return elements.map(e=>e.href)
	});
	return orderUrls;
}

// https://stackoverflow.com/a/51302466
// const downloadFile = (async (url, path) => {
//   const res = await fetch(url);
//   const fileStream = fs.createWriteStream(path);
//   await new Promise((resolve, reject) => {
//       res.body.pipe(fileStream);
//       res.body.on("error", reject);
//       fileStream.on("finish", resolve);
//     });
// });


import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream';
import {promisify} from 'node:util';

const streamPipeline = promisify(pipeline);

const downloadFile = (async (url, path, options={}) => {
	const response = await fetch(url, options);
	if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
	const fileStream = fs.createWriteStream(path);
	await streamPipeline(response.body, createWriteStream(path));
});

async function processOrderList(page, orderUrl) {
	await page.goto(orderUrl);

	const $tracking = page.locator('.tracking-nbrs-summary-link'); // may be multiple
	await $tracking.first().waitFor(); //what happens for pending order?
	let trackingNumbers = await $tracking.evaluateAll(elements => {
		return elements.map(el => ({href: el.href, text: el.innerText}));
	});

	const $costRows = page.locator('.activity-dtl-charges tr');
	const costText = await $costRows.allTextContents();
	// console.log("costText", costText);

	let costs = {};
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
		orderId: 	orderId,
		costs:    costs,
		// @todo lineItems
	}
}

// function extractPDFName(orderReceiptUrl) {
// 	var u = new URL(orderReceiptUrl);
// 	u.hash = '';   // remove any hash #abc
// 	u.search = ''; // remove any search ?key=value...

// 	const parts = u.toString().split("/");
// 	const lastPart = parts[parts.length-1];
// 	const filenameWithSpaces = decodeURIComponent(lastPart);
// 	const filename = filenameWithSpaces.replace(/\s/g, "-");

// 	return filename;
// }

function buildCookieHeader(cookiesList) {
	const keyvalue = cookiesList.map(c=>`${c.name}=${c.value};`);
	const cookieStr = keyvalue.join(" ");
	return cookieStr.slice(0, -1); //remove last semicolon
}

;(async () => {
	const browser = await chromium.launch({ headless: false, slowMo: 50 });

	// Creates a new browser context. It won't share cookies/cache with other browser contexts.
	const context = await browser.newContext();

	// const page = await browser.newPage();
	const page = await context.newPage();


	await login(page);
	await delay(1000);

	const cookies = await context.cookies(["https://mcmaster.com"]);


	const orderUrl = "https://www.mcmaster.com/order-history/order/62195bdd6b8bf43f6c368068/";
	await page.goto(orderUrl);
	const orderDate = await page.locator(".order-dtl-date").first().innerText();
	console.log(orderDate);

	return;


	// const orderUrl = "https://www.mcmaster.com/order-history/order/62195bdd6b8bf43f6c368068/";
	// const orderInfo = await processOrderList(page, orderUrl);
 //  console.log(orderInfo);

	// await page.pause();
	// const options = {
	//   headers: {
	//     "cookie": buildCookieHeader(cookies) //cookie needed for authentication
	//   }
	// }
	// const orderReceiptUrl = "https://www.mcmaster.com/mv1655819346/WebParts/Activity/PDFRetriever/Receipts%20for%20PO%200226BBOURQUE.pdf?orderId=62195bdd6b8bf43f6c368068&docType=Invoice&action=1&loaded=1&retryCount=1"
	// await downloadFile(orderReceiptUrl, `./${extractPDFName(orderReceiptUrl)}`, options)

	const orderUrls = await getOrderUrls(page);
	for (let orderUrl of orderUrls) {
		console.log(`Navigating to ${orderUrl}`);
		const orderInfo = await processOrderList(page, orderUrl);

		const options = {
			headers: {
				"cookie": buildCookieHeader(cookies) //cookie needed for authentication
			}
		};
		// orderInfo.orderReceiptFile = extractPDFName(orderInfo.orderReceiptUrl);



		const receiptURL = `https://www.mcmaster.com/${cookies.filter(c=>c.name == "volver").value}/WebParts/Activity/PDFRetriever/Receipt%20for%20PO%200201BBOURQUE.pdf?orderId=${orderInfo.orderID}&docType=Invoice&action=1&loaded=1&retryCount=1`

		await downloadFile(orderInfo.orderReceiptUrl, `./${orderInfo.orderReceiptFile}`, options);
		console.log(orderInfo);
	}

	await browser.close();
})();


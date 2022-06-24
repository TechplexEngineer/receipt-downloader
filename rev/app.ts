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

async function revLogin(page: Page) {
    await page.goto('https://www.revrobotics.com/login.php?from=account.php%3Faction%3Dorder_status');

    await page.locator('input#login_email').fill(process.env.REV_USERNAME || "");

    const $pwField = page.locator('input#login_pass').first();
    await $pwField.fill(process.env.REV_PASSWORD || "");
    await Promise.all([
        page.waitForNavigation(),
        await $pwField.press('Enter')
    ]);
}

interface revOrder {
    date: string
    total: string
    status: string
    orderDetailsURL: string
    orderInvoiceURL: string
    orderId: string
    receipt?: string
}

async function extractOrders(page: Page): Promise<revOrder[]> {
    let orders = [];
    const $rows = page.locator(".account-listItem");
    for (let i = 0; i < await $rows.count(); i++) {
        const $row = $rows.nth(i);
        // ".account-product-detail.order-number div:first-child"
        let orderId = await $row.locator(':text("Order #")').innerText()
        orderId = orderId.split("#")[1];

        orders.push({
            // ".account-product-detail.order-placed span"
            date: await $row.locator(':text("Order Placed") + span').innerText(),
            // ".account-product-detail.order-total span"
            total: await $row.locator(':text("total") + span').innerText(),
            // ".account-product-detail.order-status .account-orderStatus-label"
            status: await $row.locator(':text("Status") + *').innerText(),
            //@ts-ignore
            orderDetailsURL: await $row.locator("a", { has: page.locator('text=Order Details') }).evaluate(e => e.href),
            //@ts-ignore
            orderInvoiceURL: await $row.locator("a", { has: page.locator('text=Invoice') }).evaluate(e => `${location.origin}${e.dataset.printInvoice}`) || "",
            orderId: orderId,
        });
    }
    return orders;
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
    await revLogin(page);

    console.log("Starting Order Extraction")

    let orders: revOrder[] = [];

    
    let m;
    while (true) {
        orders = orders.concat(await extractOrders(page))

        //Check for pagination
        const pageNofT = await page.locator('.pagination >> :text("Page")').innerText();
        m = pageNofT.match(/Page\s(?<current>\d+)\sof\s(?<total>\d+)/);

        if (!m || !m.groups) {
            throw new Error("Unable to determine pagination");
        }

        if (m.groups.current >= m.groups.total) {
            break
        }

        console.log(`Navigating to page ${parseInt(m.groups.current)+1}`);
        
        await Promise.all([
            page.waitForNavigation(),
            page.locator('.pagination >> :text("Next")').click()
        ]);
    }    

    await mkdir("./receipts/rev", { recursive: true });

    // need this b/c the invoice page has a window.print()
    const noJsContext = await browser.newContext({javaScriptEnabled: false});
    const noJsPage = await noJsContext.newPage()

    console.log("Starting Order Receipt Download")
    for (let order of orders) {
        order.date = normalizeDate(order.date);
        console.log(`Navigating to ${order.orderInvoiceURL}`);
        // await page
        
        await noJsPage.goto(order.orderInvoiceURL)
  
        await noJsPage.emulateMedia({ media: 'print' });
        await noJsPage.pause();
        // await noJsPage.addStyleTag({
        //     content: `
        //     @media print {
        //         footer, .ssw-reward-tab.ssw-reward-tab-left, #launcher-frame, .tt-mobile-parent-menu, .tt-mobile-parent-menu-icons {
        //             display: none;
        //             visibility: hidden;
        //         }  
        //     }`});
        order.receipt = `${order.date}-rev-${order.orderId}.pdf`;
        await noJsPage.pdf({
            path: `./receipts/rev/${order.receipt}`
        });
    }

    await writeFile("./receipts/rev/orders.json", JSON.stringify(orders, null, '\t'))
    console.log("Done");

    browser.close()

})();
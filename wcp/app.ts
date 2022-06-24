import 'dotenv/config';

import { chromium, Cookie, Page } from 'playwright';
import { delay } from '../utils';
import camelCase from 'lodash.camelcase';
import { normalizeDate } from '../utils.js';
import { mkdir, writeFile } from 'fs/promises';
import { fstat } from 'fs';

async function wcpLogin(page:Page) {
    await page.goto('https://wcproducts.com/account/login?return_url=%2Faccount');

    await page.locator('input[name="customer[email]"]').fill(process.env.WCP_USERNAME || "");

    const $pwField = page.locator('input[name="customer[password]"]').first();
    await $pwField.fill(process.env.WCP_PASSWORD || "");
    await Promise.all([
        page.waitForNavigation(),
        await $pwField.press('Enter')
    ]);
}

; (async () => {
    const browser = await chromium.launch();

    // Creates a new browser context. It won't share cookies/cache with other browser contexts.
    const context = await browser.newContext();

    // const page = await browser.newPage();
    const page = await context.newPage();

    console.log("Starting Login")
    await wcpLogin(page);

    console.log("Starting Order Extraction")
    let headers = await page.locator("table.tt-table-shop-01").evaluate((table) => {
        //@ts-ignore
        const headers = Array.from(table.querySelectorAll("thead tr th")).map(th => th.innerText);
        return headers;
    });

    headers = headers.map(camelCase)

    
    interface wcpOrder {
        orderLink: string
        order: string
        date: string
        paymentStatus: string
        fulfillmentStatus: string
        total: string
        receipt?: string
    }

    let orders = await page.locator("table.tt-table-shop-01").evaluate((table, {headers}) => {
        //@ts-ignore
        return Array.from(table.querySelectorAll("tbody tr")).map((tr) => {
            //@ts-ignore
            return Array.from(tr.querySelectorAll("td")).reduce((prevVal, td, colIdx) => {
                let link = td.querySelector("a")
                if (link) {
                    //@ts-ignore
                    prevVal[`${headers[colIdx].toLowerCase()}Link`] = link.href;
                }
                //@ts-ignore
                prevVal[headers[colIdx]] = td.innerText;
                return prevVal;
            }, {});
        });
    }, { headers }) as wcpOrder[];

    await mkdir("./receipts/wcp", { recursive: true});

    console.log("Starting Order Receipt Download")
    for (let order of orders) {
        order.date = normalizeDate(order.date);
        console.log(`Navigating to ${order.orderLink}`);
        await page.goto(order.orderLink);

        await page.emulateMedia({ media: 'print' });
        await page.addStyleTag({
            content: `
            @media print {
                footer, .ssw-reward-tab.ssw-reward-tab-left, #launcher-frame, .tt-mobile-parent-menu, .tt-mobile-parent-menu-icons {
                    display: none;
                    visibility: hidden;
                }  
            }`});
        order.receipt = `${order.date}-wcp-${order.order}.pdf`;
        await page.pdf({
            path: `./receipts/wcp/${order.receipt}`
        });
    }
    // console.log(orders);

    await writeFile("./receipts/wcp/orders.json", JSON.stringify(orders, null, '\t'))
    console.log("Done");
    
    browser.close()

})();
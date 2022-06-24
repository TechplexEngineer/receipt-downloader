import 'dotenv/config';

import { chromium, Cookie, Page } from 'playwright';
import { delay } from '../utils';
import camelCase from 'lodash.camelcase';

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

    await wcpLogin(page);

    let headers = await page.locator("table.tt-table-shop-01").evaluate((table) => {
        //@ts-ignore
        const headers = Array.from(table.querySelectorAll("thead tr th")).map(th => th.innerText);
        return headers;
    });

    headers = headers.map(camelCase)

    let data = await page.locator("table.tt-table-shop-01").evaluate((table, {headers}) => {
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
    }, {headers});


    console.log(data);

})();
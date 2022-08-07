import 'dotenv/config';

import { chromium, Page } from 'playwright';
import { delay } from '../utils';
import camelCase from 'lodash.camelcase';
import fs, {mkdir} from 'fs/promises';
import { fstat } from 'fs';
import path from "node:path";



; (async () => {
    const browser = await chromium.launch({
        headless: !!!process.env.PWSHOW
    });

    // Creates a new browser context. It won't share cookies/cache with other browser contexts.
    const context = await browser.newContext();

    // const page = await browser.newPage();
    const page = await context.newPage();

    await mkdir("./receipts/amazon", { recursive: true });

    const files = await fs.readdir("amazon-html")

    for (const file of files) {
        console.log(`Processing ${file}`);
        await page.goto(`file:///home/techplex/projects/pers/expenses/amazon-html/${file}`);
        await page.pdf({
            path: `./receipts/amazon/${path.parse(file).name}.pdf`
        })
    }
    await browser.close();

})();

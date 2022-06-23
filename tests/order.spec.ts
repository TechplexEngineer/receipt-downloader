import { test, expect } from '@playwright/test';
import 'dotenv/config';

// import { delay, login } from '../mcmaster/app';

export const delay = (ms:number) => new Promise(resolve => setTimeout(resolve, ms));

export async function login(page) {
  await page.goto('https://www.mcmaster.com/order-history');
  await page.locator('input#Email[type="text"]').waitFor()
  await page.locator('input#Email[type="text"]').fill(process.env.MCMASTER_USERNAME);
  await page.locator('input#Password[type="password"]').fill(process.env.MCMASTER_PASSWORD);
  await page.locator('input#Password[type="password"]').press('Enter');
}

test('Reterieve Order Date, current year', async ({ page }) => {
  await login(page);
  await delay(1000);

  const orderUrl = "https://www.mcmaster.com/order-history/order/62195bdd6b8bf43f6c368068/";
  await page.goto(orderUrl);
  const orderDate = await page.locator(".order-dtl-date").first().innerText();

  await expect(orderDate).toEqual('February 26');
});


test('Reterieve Order Date, previous year', async ({ page }) => {
  await login(page);
  await delay(1000);

  const orderUrl = "https://www.mcmaster.com/order-history/order/610eafecef39a527f028e3ab/";
  await page.goto(orderUrl);
  const orderDate = await page.locator(".order-dtl-date").first().innerText();

  await expect(orderDate).toEqual('August 7, 2021');
});






test.describe("test normalize date", () => {

  const table = [
    {
      name: "previous year",
      input: "August 7, 2021",
      output: "2021-08-07"
    },
    {
      name: "current year",
      input: "August 7",
      output: "2022-08-07"
    }
  ];

  for (let row of table) {
    test(row.name, ({page}) => {
      expect(normalizeDate(row.input)).toEqual(row.output);
    });
  }

});


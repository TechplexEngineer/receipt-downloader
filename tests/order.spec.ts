import { test, expect } from '@playwright/test';
import type { Page } from 'playwright';
import 'dotenv/config';

import { normalizeDate, login, getOrderDate } from "../mcmaster/utils.ts";
import { delay } from '../utils.ts';
import { getPurchaseOrder } from '../mcmaster/utils';





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
  const orderDate = await getOrderDate(page);

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



test('Reterieve Purchase Order Number', async ({ page }) => {
  await login(page);
  await delay(1000);

  const orderUrl = "https://www.mcmaster.com/order-history/order/610eafecef39a527f028e3ab/";
  await page.goto(orderUrl);
  const orderDate = await getPurchaseOrder(page);

  await expect(orderDate).toEqual('0807BBOURQUE');
});


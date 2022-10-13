import 'dotenv/config';

import { chromium, Page } from 'playwright';
import {writeFileSync} from 'node:fs';

/**
 * Login to FIRST Dashboard with username and password from environment:
 * - MCMASTER_USERNAME
 * - MCMASTER_PASSWORD
 * @param page a playwright browser page
 */
export async function login(page: Page) {
    const url = 'https://login2.firstinspires.org/Account/Login?ReturnUrl=%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3DMainWebsite%26response_type%3Dcode%26scope%3Dopenid%2520email%2520profile%26redirect_uri%3Dhttps%253A%252F%252Fwww.firstinspires.org%252Fopenid-connect%252Fgeneric%26state%3DLG1PI7PU1kmXlDOBzgn7pSsDggFJgVocU9opmJr_r6w';
    await page.goto(url);
    const $usernameField = page.locator('input#Username');
    await $usernameField.waitFor()
    await $usernameField.fill(process.env.FIRST_USERNAME || "");
    const $pwField = page.locator('input#Password');
    await $pwField.fill(process.env.FIRST_PASSWORD || "");
    await Promise.all([
        page.waitForNavigation(/*{ url: url }*/),
        await $pwField.press('Enter')
    ]);
    await page.goto("https://my.firstinspires.org/Dashboard/");
}
 

; (async () => {
    const browser = await chromium.launch({
        headless: !!!process.env.PWSHOW
    });

    // Creates a new browser context. It won't share cookies/cache with other browser contexts.
    const context = await browser.newContext({
        bypassCSP: true,
    });

    // const page = await browser.newPage();
    const page = await context.newPage();


    await login(page);
    await page.goto("https://my.firstinspires.org/Teams//Wizard/TeamContacts/?TeamProfileID=1433802");

    await page.waitForLoadState('networkidle');

    //@ts-ignore
    let data = await page.evaluate(() => {
        
        return {
            //@ts-ignore
            mentors: teamContactsWizardModel.TeamContacts.PeopleRoles.filter(e=>(e.role_key != "youth_member")),
            //@ts-ignore
            students: ContactRosterModel.TeamStudents
        }
    });

    //@ts-ignore
    writeFileSync("students.json", JSON.stringify(data.students, null, "\t"));
    //@ts-ignore
    writeFileSync("mentors.json", JSON.stringify(data.mentors, null, "\t"));
    
    // console.log(data);
    // let mentors = teamContactsWizardModel.TeamContacts.PeopleRoles.filter(e=>(e.role_key != "youth_member"));
    // let students = contactRosterModel.TeamStudents;
    // console.log("students", students);

    // console.log("mentors", mentors);


    await page.pause();

    browser.close()

})();
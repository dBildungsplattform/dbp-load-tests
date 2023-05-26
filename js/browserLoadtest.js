import { chromium } from 'k6/experimental/browser';
import { check } from 'k6'
import { SharedArray } from 'k6/data';

const data = new SharedArray('users', function() {
    const f = JSON.parse(open('../secrets/managerlogin.json'));
    return f;
});

let moodleEnvironment = __ENV.ENVIRONMENT;

export default async function() {
    const browser = chromium.launch({ headless: true, args: ["no-sandbox"]});
    const page = browser.newPage();

    let managerUser = data[Math.floor(Math.random() * data.length)];

    //Login
    await page.goto("https://"+ moodleEnvironment +"/login/index.php");

    page.locator('input[id="username"]').type(managerUser.username);
    page.locator('input[id="password"]').type(managerUser.password);

        await Promise.all([
            page.waitForNavigation(),
            page.locator('button[id="loginbtn"]').click(),
        ]);
    
        check(page, {
            'Login successful': page => page.content().indexOf("Willkommen zurück,") !== -1,
        });
    
        //Go to course overview
        await page.locator("//ul//li[3]//a").click();
        page.waitForNavigation();

        check(page, {
            'my courses overview loaded': page => page.content().indexOf("Kursübersicht") !== -1,
        });

        //Create new Course
        page.locator("//div[@class='btn-group']//a[@data-toggle='dropdown']").click();
        page.locator("//a[contains(text(), 'Neuer Kurs')]").click();
        page.waitForNavigation();

        page.locator('input[name="fullname"]').type('fullname-test');
        page.locator('input[name="shortname"]').type('shortname-test');

        await Promise.all([
            page.waitForNavigation(),
            page.locator('input[name="saveanddisplay"]').click(),
        ]);

        check(page, {
            'course creation successful': page => page.content().indexOf("fullname-test") !== -1,
        });

        //Extract Course ID for later course deletion
        const str = page.url();
        let courseId = str.match(/\d+$/);

        //Open announcements
        await Promise.all([
            page.waitForNavigation(),
            page.locator("//div[@class='activityname']//a").click(),
        ]);

        check(page, {
            'Announcements opened successfully': page => page.content().indexOf("Ankündigungen") !== -1,
        });

        page.locator("//div[@class='navitem']//a[@data-toggle='collapse']").click();
        page.waitForNavigation();

        //Announcement creation
        check(page, {
            'New Announcements form opened': page => page.content().indexOf("Beitrag absenden") !== -1,
        });

        await page.locator("input[name='subject']").type('Load announcement');
        await page.locator("div[id='id_messageeditable']").type('message-test');

        await Promise.all([
            page.locator("input[id='id_submitbutton']").click(), 
            page.waitForNavigation(),
        ]);

       check(page, {
            'announcement created': page => page.content().indexOf("Load announcement") !== -1,
        });

        //load created announcement
        page.locator("//tr//a[@title='Load announcement']").click(); 
        page.waitForNavigation(),

        //Delete anouncement
        page.locator("//a[contains(text(), 'Löschen')]").click();

        await Promise.all([
            page.waitForNavigation(),
            page.locator("//button[contains(text(), 'Weiter')]").click(),
        ]);

        check(page, {
            'announcement deleted': page => page.content().indexOf("gelöscht") !== -1,
        });

        //Delete course
        page.locator("//li/a[contains(text(), 'Meine Kurse')]").click();
        page.waitForNavigation();

        check(page, {
            'my courses overview loaded 2': page => page.content().indexOf("Kursübersicht") !== -1,
        });

        page.locator("//div[@class='btn-group']//a[@data-toggle='dropdown']").click();
        page.locator("//a[contains(text(), 'Kurse verwalten')]").click();
        page.waitForNavigation();

        check(page, {
            'Course deletion page reached': page => page.content().indexOf("Kursbereiche und Kurse bearbeiten") !== -1,
        });

        await Promise.all([
            page.waitForNavigation(),
            page.locator("//li[@data-id='"+ courseId +"']//span/a[@class='action-delete']").click()
        ]);
        
        await Promise.all([
            page.waitForNavigation(),
            page.locator("//form/button[contains(text(), 'Löschen')]").click(),
        ]);

        check(page, {
            'Course deleted successfully': page => page.content().indexOf("wurde gelöscht") !== -1,
        });

        page.close();
        browser.close();
}
import { group, sleep } from "k6";
import { SharedArray } from 'k6/data';
import LoginPage from "../helper/loginPage.js";
import CoursePage from "../helper/coursePage.js";
import MetricHelper from "../helper/metricHelper.js";
import AnnouncementPage from "../helper/announcementPage.js";
import * as helperFunctions from "../helper/userHelper.js";

const data = new SharedArray('users', function() {
    const f = JSON.parse(open('../secrets/managerlogin.json'));
    return f;
});
const announcementData = JSON.parse(open('../data/announcementtemplate.json'));
const courseData = JSON.parse(open('../data/coursetemplate.json'));
let optionsPath = '../options/'+ __ENV.OPTIONS_FILE_PATH;

export const options = JSON.parse(open(optionsPath));
let metricHelper = new MetricHelper();

export default function () {
    const loginPage = new LoginPage(metricHelper);
    const coursePage = new CoursePage(metricHelper);
    let announcementPage;
    let token;
    let sessKey;
    let cookie;
    let announceID;
    let courseID;

    // +++++++++ Front page +++++++++\\
    group("Front page", function () {
        loginPage.getFrontpage()
    });

    // +++++++++ Login process +++++++++\\
    group("Login process", function () {

        //Check if user is already logged in
        token = loginPage.checkAlreadyLoggedIn();  
        sleep((Math.random()*5)+3);
        //Choose random user from login credentials
        const randomUser = helperFunctions.getRandomUser(data);

        //make login request
        let loginResData = loginPage.login(randomUser);
        cookie = loginResData.cookie;   
        sessKey = loginResData.session;
    });

    // +++++++++ Create course +++++++++\\
    group("Course creation process", function () {
        let prefix = "Manager";
        courseID = coursePage.createNewCourse(sessKey, courseData, cookie, prefix);
    });

    // +++++++++ Create announcement +++++++++\\
    group("Create Announcement", function() {
        announcementPage = new AnnouncementPage(sessKey, metricHelper);
        announceID = announcementPage.createAnnouncement(announcementData, courseID, cookie, 1);
    });

    // +++++++++ Delete announcement +++++++++\\
    group("Announcement deletion", function() {
        announcementPage.deleteAnnouncement(announceID, cookie);
        sleep(3);
    });

    // +++++++++ Delete course +++++++++\\
    group('Course deletion', function() {
        coursePage.deleteCourse();
    });
        
}

import { group, sleep } from "k6";
import { SharedArray } from 'k6/data';
import * as helperFunctions from "../helper/userHelper.js";
import LoginPage from "../helper/loginPage.js";
import LogoutPage from "../helper/logoutPage.js";
import CoursePage from "../helper/coursePage.js";
import MetricHelper from "../helper/metricHelper.js";
import AnnouncementPage from "../helper/announcementPage.js";

//Access JSON data from files
const userLoginData = new SharedArray('users', function() {
    const f = JSON.parse(open('../secrets/userlogin.json'));
    return f;
});

const setupLoginData = JSON.parse(open('../secrets/managerlogin.json'));
const setupCourseData = JSON.parse(open('../data/coursetemplate.json'));
let setupAnnouncementData = JSON.parse(open('../data/announcementtemplate.json'));
let commentData = JSON.parse(open('../data/commenttemplate.json'));

let optionsPath = '../options/'+ __ENV.OPTIONS_FILE_PATH;

export const options = JSON.parse(open(optionsPath));

let metricHelper = new MetricHelper();

//Create loadtest setup environment
export function setup() {
    const loginPage = new LoginPage(metricHelper);
    const coursePage = new CoursePage(metricHelper);
    let token = loginPage.checkAlreadyLoggedIn();

    //User Login
    let setupLogin = loginPage.login(setupLoginData[0]);
    let setupSessKey = setupLogin.session;
    let cookie = setupLogin.cookie; 

    //Create new course and get course ID
    let prefix = "User setup";
    let courseID = coursePage.createNewCourse(setupSessKey, setupCourseData, cookie, prefix);
    const announcementPage = new AnnouncementPage(setupSessKey);
    sleep(1);
    //Create announcement for users to comment
    let announcementAmount = 4;
    let discussionIDs = announcementPage.createAnnouncement(setupAnnouncementData, courseID, cookie, announcementAmount);

    //Add users to course
    helperFunctions.setupUsers(courseID, setupSessKey, cookie, token);

    let returnData = {
        courseID: courseID,
        discussionID: discussionIDs
    }
    //TODO Check if everything in Setup was successful Threshold?
    return { idObject: returnData };
}


export default function (data) {
    const loginPage = new LoginPage(metricHelper);
    const coursePage = new CoursePage(metricHelper);
    let announcementPage;
    let token;
    let sessKey;
    let cookie;
    let parentPostID;
    //Choose one of the discussions inside the forum to spread the users over them
    let tempArray = data.idObject.discussionID
    const discussionID = tempArray[Math.floor(Math.random()*tempArray.length)]

    // +++++++++ Front page +++++++++\\
    group("Front page", function () {
        loginPage.getFrontpage();
    });


    // +++++++++ Login process +++++++++\\
    group("Login process", function () {

        //Check if User is already logged in
        token = loginPage.checkAlreadyLoggedIn();  

        sleep((Math.random()*5)+3);

        //Choose random user from login credentials
        const randomUser = helperFunctions.getRandomUser(userLoginData);

        //make login request
        let loginResData = loginPage.login(randomUser);
        cookie = loginResData.cookie;   
        sessKey = loginResData.session;
    });


    // +++++++++ Course page +++++++++\\
    group("Course page", function () {

        sleep((Math.random()*5)+3);

        //make course request
        coursePage.viewCourse(data.idObject.courseID, token);
 
    });


    // +++++++++ Announcement page +++++++++\\
    group("Announcement page", function () {
        sleep((Math.random()*10)+3);
        announcementPage = new AnnouncementPage(sessKey, metricHelper);

        //make forum announcement request to get the Parent Post ID
        parentPostID = announcementPage.getAnnouncementPage(discussionID, token);
    });

    // +++++++++ Write comment +++++++++\\
    group("Write comment", function() {

        announcementPage.createAnnouncementComment(commentData, cookie, parentPostID);   
    });

    // +++++++++ Sleep +++++++++\\
        sleep((Math.random()*10)+5);

    // +++++++++ Delete comment +++++++++\\
    group("Delete comment", function() {

        announcementPage.deleteComment(cookie);
        sleep(3);
    });


    // +++++++++ Logout process +++++++++\\
    group("Logout process", function () {
        const logoutPage = new LogoutPage(sessKey, token, metricHelper);
        logoutPage.logout();
        sleep((Math.random()*5)+3);
        logoutPage.verifyLogout(discussionID);
    });

}

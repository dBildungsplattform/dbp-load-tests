import { group, sleep } from "k6";
import { SharedArray } from "k6/data";
import LoginPage from "../pages/loginPage.js";
import CoursePage from "../pages/coursePage.js";
import AnnouncementPage from "../pages/announcementPage.js";
import * as helperFunctions from "../lib/userHelper.js";

const data = new SharedArray("users", function () {
	const f = JSON.parse(open("/secrets/managerlogin.json"));
	return f;
});
const announcementData = JSON.parse(open("../data/announcementParameters.json"));
const courseData = JSON.parse(open("../data/courseParameters.json"));
let optionsPath = "../config/options/" + __ENV.OPTIONS_FILE_PATH;

export const options = JSON.parse(open(optionsPath));

export default function () {
	const loginPage = new LoginPage();
	const coursePage = new CoursePage();
	let announcementPage;
	let token;
	let sessKey;
	let cookie;
	let announceID;
	let courseID;

	// +++++++++ Front page +++++++++\\
	group("Front page", function () {
		loginPage.getFrontpage();
	});

	// +++++++++ Login process +++++++++\\
	group("Login process", function () {
		//Check if user is already logged in
		token = loginPage.checkAlreadyLoggedIn();
		sleep(Math.random() * 5 + 3);
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
	group("Create Announcement", function () {
		announcementPage = new AnnouncementPage(sessKey);
		announceID = announcementPage.createAnnouncement(announcementData, courseID, cookie, 1);
	});

	// +++++++++ Delete announcement +++++++++\\
	group("Announcement deletion", function () {
		announcementPage.deleteAnnouncement(announceID, cookie);
		sleep(3);
	});

	// +++++++++ Delete course +++++++++\\
	group("Course deletion", function () {
		coursePage.deleteCourse();
	});
}

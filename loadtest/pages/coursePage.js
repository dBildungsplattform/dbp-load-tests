//The Course Page is a Object that offers all available functionalities surrounding the Course.
//The Object will be created once per virtual User
import http from "k6/http";
import MetricHelper from "../lib/metricHelper.js";

export default class CoursePage {
	constructor() {
		this.creationUrl = "https://" + __ENV.ENVIRONMENT + "/course/edit.php";
		this.courseID;
		this.session;
		this.cookie;
	}

	//Creates a new course and returns the corresponding course ID
	//Required:
	//----courseData: The json-template to create a course
	//----prefix: a Naming prefix to create a unique name in combination with the sessionKey
	//Returns:
	//----courseID: Id of the created course for later identification
	createNewCourse(sessionKey, courseData, cookie, prefix) {
		courseData.sesskey = sessionKey;
		courseData.fullname = prefix + " course: " + sessionKey;
		courseData.shortname = sessionKey;
		console.log("Data: " + JSON.stringify(courseData));
		console.log("CreationURL: " + this.creationUrl);

		let courseCreationRes = http.post(this.creationUrl, courseData, {
			cookies: {
				MoodleSession: cookie.MoodleSession[0],
				MOODLEID1_: cookie.MOODLEID1_[0],
			},
		});

		let urlString = courseCreationRes.url;
		console.log("Creation response:  " + JSON.stringify(courseCreationRes)); //ERROR: creation response is https://moodle.loadtest.dbildungscloud.dev/course/edit.php
		this.courseID = parseInt(urlString.match(/\d+$/));  //New error: 404 not found
		this.session = sessionKey;
		this.cookie = cookie;

		MetricHelper.getInstance().checkCourseCreation(courseCreationRes);
		return this.courseID;
	}

	//Get the Course Page with courseID
	//Users who view a course are unlikely to create the course => no access to this.courseID
	//Required:
	//----courseID: defines which course should be displayed
	//----prefix: Handed to the check to look for the correct prefix
	viewCourse(courseID, token, checkPrefix) {
		let payload = { logintoken: token };
		let viewUrl = "https://" + __ENV.ENVIRONMENT + "/course/view.php?id=" + courseID;
		let courseRes = http.get(viewUrl, payload);

		MetricHelper.getInstance().checkCoursePageOpened(courseRes, checkPrefix);
		return 0;
	}

	//Deletes a given course
	//The course will be deleted by the person who created it => access to this.courseID
	deleteCourse() {
		const courseUrl = "https://" + __ENV.ENVIRONMENT + "/course/delete.php?id=" + this.courseID;

		let courseGetRes = http.get(courseUrl);

		//Get the string identifier for course deletion
		const courseStringID = courseGetRes.html().find("input[name=delete]").attr("value");

		let courseDeleteSubmitUrl = "https://" + __ENV.ENVIRONMENT + "/course/delete.php";

		let payload = {
			id: this.courseID,
			delete: courseStringID,
			sesskey: this.session,
		};

		let courseDeletionRes = http.post(courseDeleteSubmitUrl, payload, {
			cookies: {
				MoodleSession: this.cookie.MoodleSession[0],
				MOODLEID1_: this.cookie.MOODLEID1_[0],
			},
		});
		MetricHelper.getInstance().checkCourseDeletion(courseDeletionRes);
		return 0;
	}
}

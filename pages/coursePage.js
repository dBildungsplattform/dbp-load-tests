import http from "k6/http";

export default class CoursePage {
    constructor(metricHelper){
        this.creationUrl = "https://"+ __ENV.ENVIRONMENT +"/course/edit.php";
        this.metricHelper = metricHelper;
    }

    //Creates a new course and returns the corresponding course ID
    createNewCourse(sessionKey, courseData, cookie){
        courseData.sesskey = sessionKey;
        courseData.fullname = "User course setup: " + sessionKey;
        courseData.shortname = sessionKey;

        let courseCreationRes = http.post(this.creationUrl, courseData, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        let urlString = courseCreationRes.url;
        let courseID = parseInt(urlString.match(/\d+$/));

        return courseID;
    }

    viewCourse(courseID, token){
        let payload = {logintoken: token};
        let viewUrl = "https://"+ __ENV.ENVIRONMENT +"/course/view.php?id="+courseID;
        let courseRes = http.get(viewUrl, payload);

        this.metricHelper.checkCoursePageOpened(courseRes);
        return 0;
    }
}
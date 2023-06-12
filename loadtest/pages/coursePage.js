import http from "k6/http";

export default class CoursePage {
    constructor(metricHelper){
        this.creationUrl = "https://"+ __ENV.ENVIRONMENT +"/course/edit.php";
        this.metricHelper = metricHelper;
        this.courseID;
        this.session;
        this.cookie;
    }

    //Creates a new course and returns the corresponding course ID
    createNewCourse(sessionKey, courseData, cookie, prefix){
        courseData.sesskey = sessionKey;
        courseData.fullname = prefix+ " course: " + sessionKey;
        courseData.shortname = prefix + sessionKey;

        let courseCreationRes = http.post(this.creationUrl, courseData, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        let urlString = courseCreationRes.url;
        this.courseID = parseInt(urlString.match(/\d+$/));
        this.session = sessionKey;
        this.cookie = cookie;

        this.metricHelper.checkCourseCreation(courseCreationRes);
        return this.courseID;
    }

    //User views the course, can't make use of 'this' Course Creation parameter
    viewCourse(courseID, token, checkPrefix){
        let payload = {logintoken: token};
        let viewUrl = "https://"+ __ENV.ENVIRONMENT +"/course/view.php?id="+courseID;
        let courseRes = http.get(viewUrl, payload);

        this.metricHelper.checkCoursePageOpened(courseRes, checkPrefix);
        return 0;
    }

    deleteCourse(){
        const courseUrl = "https://"+ __ENV.ENVIRONMENT +"/course/delete.php?id="+this.courseID;

        let courseGetRes = http.get(courseUrl);

        //Get the string identifier for course deletion
        const courseStringID = courseGetRes.html().find('input[name=delete]').attr('value');

        let courseDeleteSubmitUrl = "https://"+ __ENV.ENVIRONMENT +"/course/delete.php";

        let payload = {
            'id': this.courseID,
            'delete': courseStringID,
            'sesskey': this.session,
        };

        let courseDeletionRes = http.post(courseDeleteSubmitUrl, payload, {
            cookies: {
                MoodleSession: this.cookie.MoodleSession[0],
                MOODLEID1_: this.cookie.MOODLEID1_[0],
            },
        });
        this.metricHelper.checkCourseDeletion(courseDeletionRes);
        return 0;
    }
}
import { Counter } from "k6/metrics";
import { check, fail } from "k6";

export default class MetricHelper {
    constructor(){
        this.successfulLogins = new Counter("successful_logins");
        this.unsuccessfulLogins = new Counter("unsuccessful_logins");
        this.successfulCoursePage = new Counter("successful_course_displayed");
        this.failedCoursePage = new Counter("unsuccessful_course_displayed");
        this.successfulCourseCreated = new Counter("successful_course_created");
        this.successfulAnnounceCreated = new Counter("successful_announcement_created");
        this.successfulAnnouncePage = new Counter("successful_announcement_displayed");
        this.failedAnnouncePage = new Counter("unsuccessful_announcement_displayed");
        this.successfulLogouts = new Counter("successful_logouts");
        this.unsuccessfulLogouts = new Counter("unsuccessful_logouts");
        this.commentsCreated = new Counter("Comments written");
        this.commentsDeleted = new Counter("Comments deleted");
    }

    checkFrontpage(res){
        checkStatusCode(res);
        checkResponseDuration(res);
        return 0;
    }

    checkCurrentLoginStatus(res){
        check(res, {
            "User isn't logged in": (r) =>
                r.body.includes("Login bei 'Moodle'"),
            });
            return 0;
    }

    checkLogin(res){

        let checkLoginSuccess = check(res, {
            "is logged in welcome header present": (r) =>
              r.body.includes("Willkommen zurück, "),
        });
      
        let checkLoginFailure =  (res) => res.body.includes("Ungültige Anmeldedaten. Versuchen Sie es noch einmal!");

        if(checkLoginSuccess) {
            this.successfulLogins.add(1);
        }

        checkResponseDuration(res);
        if((checkStatusCode(res) !== true) || (checkLoginFailure === true)){
            this.unsuccessfulLogins.add(1);
            fail('Login Status code was not 200');
        }
        return 0;
    }

    checkCoursePageOpened(res, prefix){

        let courseDisplayed = check(res, {
            "successful entered course": (r) =>
              r.body.includes(prefix+" course:"),
        });

        if(courseDisplayed) {
            this.successfulCoursePage.add(1);
        }else{
            this.failedCoursePage.add(1);
        }

        checkStatusCode(res);
        checkResponseDuration(res);
        return 0;
    }

    checkAnnouncePageOpened(res){

        let announcementDisplayed = check(res, {
            "successful entered announcement page": (r) =>
              r.body.includes("Loadtest Announcement for"),
        });

        if(announcementDisplayed){
            this.successfulAnnouncePage.add(1);
        }else{
            this.failedAnnouncePage.add(1);
        }

        checkStatusCode(res);
        checkResponseDuration(res);
        return 0;
    }

    checkCommentCreation(res, session){
        let checkCommentWrittenSuccess = check(res, {
            "comment creation successful": (r) =>
              r.body.includes(session),
        });

        if(checkCommentWrittenSuccess){
            this.commentsCreated.add(1);
        }

        checkStatusCode(res);
        checkResponseDuration(res);
        return 0;
    }

    checkCommentDeletion(res, session){

        let commentDeleted = check(res, {
            "deletion success popup displayed": (r) =>
              r.body.includes("Beitrag gelöscht"),
        });

        if(commentDeleted){
            this.commentsDeleted.add(1);
        }
        
        check(res, {
            "comment not present in html after deletion popup": (r) => {
              (r.body.includes(session)!==true);
            }
        });

        checkStatusCode(res);
        checkResponseDuration(res);
        return 0;
    }

    checkLogout(res){
        checkStatusCode(res);
        checkResponseDuration(res);
        return 0;
    }

    verifyLogout(res){
        let checkSuccessfullLogout = check(res, {
            "Logout successfull": (r) =>
            r.body.includes("This is a loadtest announcement") !== true,//Should not have access to this page if logged out
        });

        if (checkSuccessfullLogout) {
            this.successfulLogouts.add(1);
        }else{
            this.unsuccessfulLogouts.add(1);
        }
        return 0;
    }

    checkAnnouncementCreation(res){
        checkResponseDuration(res);
        if(checkStatusCode(res) !== true) {
            fail("Announcement creation failed");
        }
        this.successfulAnnounceCreated.add(1);
        return 0;
    }

    checkAnnouncementDeletion(res){
        checkStatusCode(res);
        checkResponseDuration(res);
        return 0;
    }

    checkCourseCreation(res){
        checkResponseDuration(res);
        if(checkStatusCode(res) !== true) {
            fail("Course creation failed!");
        }
        this.successfulCourseCreated.add(1);
        return 0;
    }

    checkCourseDeletion(res){
        checkStatusCode(res);
        checkResponseDuration(res);
        return 0;
    }
}

//Any way on making the check identifier dynamic?
function checkStatusCode(res) {
    return check(res, {"Response status was 200": (r) => r.status == 200});
}

function checkResponseDuration(res) {
    check(res, {
        "Response time less than 5s": (r) =>
            r.timings.duration <= 5000,
    });
    return 0;
}
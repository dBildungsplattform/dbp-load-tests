import { Counter } from "k6/metrics";
import { check } from "k6";

export default class MetricHelper {
    constructor(){
        this.successfulLogins = new Counter("successful_logins");
        this.unsuccessfulLogins = new Counter("unsuccessful_logins");
        this.successfulCoursePage = new Counter("successful_course_displayed");
        this.failedCoursePage = new Counter("unsuccessful_course_displayed");
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
                r.body.indexOf("Login bei 'Moodle'") !== -1,
            });
            return 0;
    }

    checkLogin(res){

        let checkLoginSuccess = check(res, {
            "is logged in welcome header present": (r) =>
              r.body.indexOf("Willkommen zurück, ") !== -1,
        });
      
        let checkLoginFailure = check(res, {
            "unsuccessful Logins, header present": (r) =>
              r.body.indexOf("Ungültige Anmeldedaten. Versuchen Sie es noch einmal!") !== -1,
        });

        if(checkLoginSuccess) {
            this.successfulLogins.add(1);
        } else if(checkLoginFailure) this.unsuccessfulLogins.add(1);

        checkStatusCode(res);
        checkResponseDuration(res);
        return 0;
    }

    checkCoursePageOpened(res){

        let courseDisplayed = check(res, {
            "successful entered course": (r) =>
              r.body.indexOf("User course setup:") !== -1,
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
              r.body.indexOf("Loadtest Announcement for") !== -1,
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

        check(res, {
            "deletion success popup displayed": (r) =>
              r.body.includes("Beitrag gelöscht"),
        });
        
        check(res, {
            "comment present in html after deletion popup": (r) => {
              (r.body.includes(session));
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
            r.body.indexOf("This is a loadtest announcement") == -1,//Should not have access to this page if logged out
        });

        if (checkSuccessfullLogout) {
            this.successfulLogouts.add(1);
        }else{
            this.unsuccessfulLogouts.add(1);
        }
        return 0;
    }
}

//Any way on making the check identifier dynamic?
function checkStatusCode(res) {
    check (res, {"Response status was 200": (r) => r.status == 200});
    return 0;
}

function checkResponseDuration(res) {
    check(res, {
        "Response time less than 5s": (r) =>
            r.timings.duration <= 5000,
    });
    return 0;
}
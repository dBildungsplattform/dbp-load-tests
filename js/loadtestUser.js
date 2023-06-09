import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter } from "k6/metrics";
import { SharedArray } from 'k6/data';

//Access JSON data from files
const userLoginData = new SharedArray('users', function() {
    const f = JSON.parse(open('../secrets/userlogin.json'));
    return f;
});

const setupLoginData = JSON.parse(open('../secrets/managerlogin.json'));
const setupCourseData = JSON.parse(open('../data/coursetemplate.json'));
const setupAnnouncementData = JSON.parse(open('../data/announcementtemplate.json'));

//Declare metric variables for k6
let successfulLogins = new Counter("successful_logins");
let unsuccessfulLogins = new Counter("unsuccessful_logins");
let successfulCoursePage = new Counter("successful_course_displayed");
let failedCoursePage = new Counter("unsuccessful_course_displayed");
let successfulAnnouncePage = new Counter("successful_announcement_displayed");
let unsuccessfulAnnouncePage = new Counter("unsuccessful_announcement_displayed");
let successfulLogouts = new Counter("successful_logouts");
let unsuccessfulLogouts = new Counter("unsuccessful_logouts");
let commentsCreated = new Counter("Comments written");
let commentsDeleted = new Counter("Comments deleted");
let moodleEnvironment = __ENV.ENVIRONMENT;

//Create loadtest setup environment
export function setup() { 

    let jar = http.cookieJar();

    const urlLogin = "https://"+ moodleEnvironment +"/login/index.php?lang=de";

    let res = http.get(urlLogin);
    let token = res.html().find('input[name=logintoken]').attr('value');

    let payload = {
        username: setupLoginData[0].username,
        password: setupLoginData[0].password,
        redir: "1",
        logintoken: token
    }

    //make login request
    let setupLoginRes = http.post(urlLogin, payload);

    const doc =  setupLoginRes.html();
    let setupSessKey= doc
            .find('input[name="sesskey"]')
            .toArray()[0].attr('value');

    //get cookie
    let cookie = jar.cookiesForURL(setupLoginRes.url); 

    //Set course creation payload
    let newSetupCourseData = setupCourseData;
    newSetupCourseData.sesskey = setupSessKey;
    newSetupCourseData.fullname = "User course setup: " + setupSessKey;
    newSetupCourseData.shortname = "User loadtest course";

    const urlCourse = "https://"+ moodleEnvironment +"/course/edit.php";

    let setupCourseCreationRes = http.post(urlCourse, newSetupCourseData, {
        cookies: {
            MoodleSession: cookie.MoodleSession[0],
            MOODLEID1_: cookie.MOODLEID1_[0],
        },
    });

    sleep(1);
    //Extract created course ID from response
    let urlString = setupCourseCreationRes.url;
    let userCourseID = parseInt(urlString.match(/\d+$/));
    check (setupCourseCreationRes, {'Course creation status was 200': (r) => r.status == 200});

    //Create announcement for users to comment
    const urlAnnouncement = "https://"+ moodleEnvironment +"/mod/forum/post.php";

    let newSetupAnnouncementData = setupAnnouncementData;
    newSetupAnnouncementData.sesskey = setupSessKey;
    newSetupAnnouncementData.course = userCourseID;
    let setupForumID = userCourseID-1;
    newSetupAnnouncementData.forum = setupForumID;

    //Create multiple posts to avoid congestion
    const discussionIDs = [];

    for(let i = 0; i<4 ; i++){
        newSetupAnnouncementData.subject =  "Loadtest Announcement for " + setupSessKey + "-" + i;

        let setupAnnounceCreationRes = http.post(urlAnnouncement, newSetupAnnouncementData, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        //Get the created announcement ID
        let discussID = setupAnnounceCreationRes.html().find("tr[class~=discussion]").attr('data-discussionid');
        check (setupAnnounceCreationRes, {'Announcement creation status was 200': (r) => r.status == 200});
        discussionIDs[i] = discussID;
        sleep(0.5);//Sleep so there won't be race condition problems
    }
    console.log("DiscussionID Array: "+discussionIDs);
    

    //Add users to course
    let enrolPageUrl = "https://"+ moodleEnvironment +"/user/index.php?id="+userCourseID;
    payload = {logintoken: "${token}"};

    let getEnrolePageRes = http.get(enrolPageUrl, payload);
    let enrolID = getEnrolePageRes.html().find("input[name=enrolid]").attr('value');

    let courseEnrolUrl = "https://"+ moodleEnvironment +"/enrol/manual/ajax.php?mform_showmore_main=0&id="+ userCourseID +"&action=enrol&enrolid="+enrolID+"&sesskey="+ setupSessKey +"&_qf__enrol_manual_enrol_users_form=1&mform_showmore_id_main=0&userlist%5B%5D=3&userlist%5B%5D=4&roletoassign=5&startdate=4&duration=";

    http.get(courseEnrolUrl, {
        cookies: {
            MoodleSession: cookie.MoodleSession[0],
            MOODLEID1_: cookie.MOODLEID1_[0],
        },
    });

    let returnData = {
        courseID: userCourseID,
        discussionID: discussionIDs
    }

    return { idObject: returnData };
}


export default function (data) {
    let jar = http.cookieJar();
    let token;
    let sessKey;
    let cookie;
    let commID;
    let parentPostID;
    //Choose one of the discussions inside the forum to spread the users over them
    let tempArray = data.idObject.discussionID
    const discussionID = tempArray[Math.floor(Math.random()*tempArray.length)]

    // +++++++++ Front page +++++++++\\
    group("Front page", function () {
        let res =  http.get('https://'+ moodleEnvironment +'/');
        check (res, {'status was 200': (r) => r.status == 200});

        check(res, {
            "Front page loading time less than 5s": (r) =>
                r.timings.duration <= 5000,
            });
    });


    // +++++++++ Login process +++++++++\\
    group("Login process", function () {

        //Check if user is already logged in
        const urlLogin = "https://"+ moodleEnvironment +"/login/index.php?lang=de";

        let res = http.get(urlLogin);
        
        cookie = jar.cookiesForURL(res.url);    

        check(res, {
        "User isn't logged in": (r) =>
            r.body.indexOf("Login bei 'Moodle'") !== -1,
        });

        sleep((Math.random()*5)+3);

        //extracting the logintoken token from the response
        token = res.html().find('input[name=logintoken]').attr('value');

        //Choose random user from login credentials
        const randomUser = userLoginData[Math.floor(Math.random() * userLoginData.length)];

        let payload = {
            username: randomUser.username,
            password: randomUser.password,
            redir: "1",
            logintoken: token
        }

        //make login request
        let loginRes = http.post(urlLogin, payload);

        cookie = jar.cookiesForURL(loginRes.url);   

        const doc =  loginRes.html();

        sessKey= doc
            .find('input[name="sesskey"]')
            .toArray()[0].attr('value');

        //Check login results
        let checkLoginSuccess = check(loginRes, {
            "is logged in welcome header present": (r) =>
              r.body.indexOf("Willkommen zurück, ") !== -1,
        });
      
          let checkLoginFailure = check(loginRes, {
            "unsuccessful Logins, header present": (r) =>
              r.body.indexOf("Ungültige Anmeldedaten. Versuchen Sie es noch einmal!") !== -1,
        });

        //Count successful logins
        if (checkLoginSuccess) {
            successfulLogins.add(1);
        }

        //Count unsuccessful logins
        if (checkLoginFailure) {
            unsuccessfulLogins.add(1);
        }

        check(loginRes, {
            "Login process time less than 5s": (r) =>
                r.timings.duration <= 5000,
        });
    
        //Check status code of response
        check (loginRes, {'Login status was 200': (r) => r.status == 200});

    });


    // +++++++++ Course page +++++++++\\
    group("Course page", function () {
        const urlCourse = "https://"+ moodleEnvironment +"/course/view.php?id="+data.idObject.courseID;
        let payload = {logintoken: "${token}"}

        sleep((Math.random()*5)+3);

        //make course request
        let courseRes = http.get(urlCourse, payload);

        check (courseRes, {'Course status was 200': (r) => r.status == 200});

        let checkCoursePage = check(courseRes, {
            "successful entered course": (r) =>
              r.body.indexOf("User course setup:") !== -1,
        });

        //Count successful course requests
        if (checkCoursePage) {
            successfulCoursePage.add(1);
        }else{
            failedCoursePage.add(1);
        }

        check(courseRes, {
            "Course loading time less than 5s": (r) =>
                r.timings.duration <= 5000,
        });
    });


    // +++++++++ Announcement page +++++++++\\
    group("Announcement page", function () {
        const urlAnnouncement = "https://"+ moodleEnvironment +"/mod/forum/discuss.php?d="+discussionID;
        let payload = {logintoken: "${token}"};
        sleep((Math.random()*10)+3);

        //make forum announcement request
        let announceRes = http.get(urlAnnouncement, payload);

        parentPostID = announceRes.html().find("div[class~=firstpost]").attr('data-post-id');

        check (announceRes, {'Announcement status was 200': (r) => r.status == 200});

        let checkAnnouncePage = check(announceRes, {
            "successful entered announcement page": (r) =>
              r.body.indexOf("Loadtest Announcement for") !== -1,
        });

        //Count successful announcement requests
        if (checkAnnouncePage) {
            successfulAnnouncePage.add(1);
        }else{
            unsuccessfulAnnouncePage.add(1);
        }

        check(announceRes, {
            "Announcement page loading time less than 5s": (r) =>
                r.timings.duration <= 5000,
        });
    });

    // +++++++++ Write comment +++++++++\\
    group("Write comment", function() {

        let urlQuery = "sesskey="+sessKey+"&info=mod_forum_add_discussion_post";
        const urlComment = "https://"+ moodleEnvironment +"/lib/ajax/service.php?"+urlQuery;
        let payload = [{
            "index":0,
            "methodname":"mod_forum_add_discussion_post",
            "args":{
                "postid": parentPostID,
                "message":"test message "+ sessKey,
                "messageformat":0,
                "subject":"Re: Loadtest announcement "+ sessKey,
                "options":[
                    {"name":"private","value":false},
                    {"name":"topreferredformat","value":true}
                ]
            }
        }];

        let commentRes = http.post(urlComment, JSON.stringify(payload), {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },//MOre confirmation
        });        
        
        //Gets the comment answer ID for later deletion from creation response
        commID = JSON.parse(commentRes.body)[0].data.postid;

        check (commentRes, {'Comment status was 200': (r) => r.status == 200});

        //Check comment creation results
        let checkCommentWrittenSuccess = check(commentRes, {
            "comment creation successful": (r) =>
              r.body.includes(sessKey),
        });

        if(checkCommentWrittenSuccess){
            commentsCreated.add(1);
        }

        check(commentRes, {
            "Comment creation time less than 5s": (r) =>
                r.timings.duration <= 5000,
        });
    });

    // +++++++++ Sleep +++++++++\\
    sleep((Math.random()*10)+5);

    // +++++++++ Delete comment +++++++++\\
    group("Delete comment", function() {

        const formdata = {
            "delete": commID,
            "confirm": commID,
            "sesskey": sessKey,
        };

        const commentDelRes = http.post("https://"+ moodleEnvironment +"/mod/forum/post.php", formdata, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        sleep(3);
        check (commentDelRes, {'Comment Delete status was 200': (r) => r.status == 200});

        //Check comment deletion results
        let checkCommentDeletionSuccess = check(commentDelRes, {
            "deletion success popup displayed": (r) =>
              r.body.includes("Beitrag gelöscht"),
        });

        //Check comment deletion results, does not work properly right now
        let checkCommentExistenceAfterDeletion = check(commentDelRes, {
            "comment present in html after deletion popup": (r) => {
              (r.body.includes(sessKey));
            }
        });
        
        if(checkCommentDeletionSuccess && (checkCommentExistenceAfterDeletion==false)){
            commentsDeleted.add(1);
        }

        check(commentDelRes, {
            "Comment deletion time less than 5s": (r) =>
                r.timings.duration <= 5000,
        });
    });


    // +++++++++ Logout process +++++++++\\
    group("Logout process", function () {
        
        const urlLogout = "https://"+ moodleEnvironment +"/login/logout.php?sesskey="+sessKey;
        let payload = {logintoken: "${token}"};
        const urlAnnouncement = "https://"+ moodleEnvironment +"/mod/forum/discuss.php?d=1";

        //make logout reguest
        let logoutRes = http.get(urlLogout, payload);

        check (logoutRes, {'Logout status was 200': (r) => r.status == 200});

        sleep((Math.random()*5)+3);

        //verify logout success by accessing announcements
        let announceRes = http.get(urlAnnouncement, payload);

        let checkSuccessfullLogout = check(announceRes, {
            "Logout successfull": (r) =>
            r.body.indexOf("This is a loadtest announcement") == -1,//Should not have access to this page if logged out
        });

        //Count successful announcement requests
        if (checkSuccessfullLogout) {
            successfulLogouts.add(1);
        }else{
            unsuccessfulLogouts.add(1);
        }
    });

}

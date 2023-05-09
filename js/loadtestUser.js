import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter } from "k6/metrics";
import { SharedArray } from 'k6/data';

//Access secret JSON data array from File
const data = new SharedArray('users', function() {
    const f = JSON.parse(open('../secrets/userlogin.json'));
    return f;
});

let successfulLogins = new Counter("successful_logins");
let unsuccessfulLogins = new Counter("unsuccessful_logins");
let successfulCoursePage = new Counter("successful_course_displayed");
let failedCoursePage = new Counter("unsuccessful_course_displayed");
let successfulAnnouncePage = new Counter("successful_announcement_displayed");
let unsuccessfulAnnouncePage = new Counter("unsuccessful_announcement_displayed");
let successfulLogouts = new Counter("successful_logouts");
let unsuccessfulLogouts = new Counter("unsuccessful_logouts");

let commentDistinctionID = 1;

export default function () {

    let token;
    let sessKey;
    let cookie;
    let commID; 
    let jar = http.cookieJar();

    // +++++++++ Front page +++++++++\\
    group("Front page", function () {
        let res =  http.get('https://moodle.dev-scaling-test.dbildungsplattform.de/');
        check (res, {'status was 200': (r) => r.status == 200});
    });


    // +++++++++ Login process +++++++++\\
    group("Login process", function () {

        //Check if user is already logged in
        const urlLogin = "https://moodle.dev-scaling-test.dbildungsplattform.de/login/index.php?lang=de";

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
        const randomUser = data[Math.floor(Math.random() * data.length)];

        let payload = {
            username: randomUser.username,
            password: randomUser.password,
            redir: "1",
            logintoken: token
        }

        //make login request
        let loginRes = http.post(urlLogin, payload);

        const doc =  loginRes.html();

        sessKey= doc
            .find('input[name="sesskey"]')
            .toArray()[0].attr('value');

        check(loginRes, {
            "is logged in welcome header present": (r) =>
              r.body.indexOf("Willkommen zurück, loadtest user") !== -1,
        });

        //Check login results
        let checkLoginSuccess = check(loginRes, {
            "is logged in welcome header present": (r) =>
              r.body.indexOf("Willkommen zurück, loadtest user") !== -1,
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
    
        //Check status code of response
        check (loginRes, {'Login status is 5xx': (r) => r.status >= 500 && r.status <=599});
        check (loginRes, {'Login status was 200': (r) => r.status == 200});

    });


    // +++++++++ Course page +++++++++\\
    group("Course page", function () {
        const urlCourse = "https://moodle.dev-scaling-test.dbildungsplattform.de/course/view.php?id=2";
        let payload = {logintoken: "${token}"}

        sleep((Math.random()*5)+3);

        //make course request
        let courseRes = http.get(urlCourse, payload);

        check (courseRes, {'Course status was 200': (r) => r.status == 200});

        let checkCoursePage = check(courseRes, {
            "successful entered course": (r) =>
              r.body.indexOf("Loadtest-Course") !== -1,
        });

        //Count successful course requests
        if (checkCoursePage) {
            successfulCoursePage.add(1);
        }else{
            failedCoursePage.add(1);
        }
    });


    // +++++++++ Announcement page +++++++++\\
    group("Announcement page", function () {
        const urlAnnouncement = "https://moodle.dev-scaling-test.dbildungsplattform.de/mod/forum/discuss.php?d=1";
        let payload = {logintoken: "${token}"}

        sleep((Math.random()*10)+3);

        //make forum announcement request
        let announceRes = http.get(urlAnnouncement, payload);

        cookie = jar.cookiesForURL(announceRes.url);
        check (announceRes, {'Announcement status was 200': (r) => r.status == 200});

        let checkAnnouncePage = check(announceRes, {
            "successful entered announcement page": (r) =>
              r.body.indexOf("This is a loadtest announcement") !== -1,
        });

        //Count successful announcement requests
        if (checkAnnouncePage) {
            successfulAnnouncePage.add(1);
        }else{
            unsuccessfulAnnouncePage.add(1);
        }

    });

    // +++++++++ Write comment +++++++++\\
    group("Write comment", function() {
        let currentTextID = commentDistinctionID;
        commentDistinctionID+=1;

        let urlQuery = "sesskey="+sessKey+"&info=mod_forum_add_discussion_post";
        const urlComment = "https://moodle.dev-scaling-test.dbildungsplattform.de/lib/ajax/service.php?"+urlQuery;
        let payload = [{
            "index":0,
            "methodname":"mod_forum_add_discussion_post",
            "args":{
                "postid": "1",
                "message":"test message "+ currentTextID,
                "messageformat":0,
                "subject":"Re: Loadtest announcement "+ currentTextID,
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
            },
        });        
        sleep(1);
        //Get the ID of created announcement comment for deletion purpose
        commID = JSON.parse(commentRes.body)[0].data.postid;

        check (commentRes, {'Comment status was 200': (r) => r.status == 200});
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

        const commentDelRes = http.post('https://moodle.dev-scaling-test.dbildungsplattform.de/mod/forum/post.php', formdata, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        check (commentDelRes, {'Comment Delete status was 200': (r) => r.status == 200});

    });


    // +++++++++ Logout process +++++++++\\
    group("Logout process", function () {
        
        const urlLogout = "https://moodle.dev-scaling-test.dbildungsplattform.de/login/logout.php?sesskey="+sessKey;
        let payload = {logintoken: "${token}"};
        const urlAnnouncement = "https://moodle.dev-scaling-test.dbildungsplattform.de/mod/forum/discuss.php?d=1";

        sleep((Math.random()*10)+3);

        //make logout reguest
        let logoutRes = http.get(urlLogout, payload);

        check (logoutRes, {'Logout status was 200': (r) => r.status == 200});

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

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter } from "k6/metrics";
import { SharedArray } from 'k6/data';

const data = new SharedArray('users', function() {
    const f = JSON.parse(open('../secrets/managerlogin.json'));
    return f;
});
const announcementData = JSON.parse(open('../data/announcementtemplate.json'));
const courseData = JSON.parse(open('../data/coursetemplate.json'));

let successfulLogins = new Counter("successful_logins");
let unsuccessfulLogins = new Counter("unsuccessful_logins");
let moodleEnvironment = __ENV.ENVIRONMENT;
let optionsPath = '../options/'+ __ENV.OPTIONS_FILE_PATH;

export const options = JSON.parse(open(optionsPath));

export default function () {

    let token;
    let sessKey = "";
    let cookie = "";
    let announceID = 0;
    let courseID = 0;
    let jar = http.cookieJar();

    // +++++++++ Front page +++++++++\\
    group("Front page", function () {
        let res =  http.get("https://"+ moodleEnvironment +"/");
        check (res, {'status was 200': (r) => r.status == 200});
    });

    // +++++++++ Login process +++++++++\\
    group("Login process", function () {

        //Check if user is already logged in
        const urlLogin = "https://"+ moodleEnvironment +"/login/index.php?lang=de";

        let res = http.get(urlLogin); 

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
              r.body.indexOf("Willkommen zurück, ") !== -1,
        });

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

        //get cookie
        cookie = jar.cookiesForURL(loginRes.url); 
    
        //Check status code of response
        check (loginRes, {'Login status is 5xx': (r) => r.status >= 500 && r.status <=599});
        check (loginRes, {'Login status was 200': (r) => r.status == 200});

    });

    // +++++++++ Create course +++++++++\\
    group("Course creation process", function () {

        const urlCourse = "https://"+ moodleEnvironment +"/course/edit.php";

        let newCourseData = courseData;
        newCourseData.sesskey = sessKey;
        newCourseData.fullname = "Manager course: " + sessKey;
        newCourseData.shortname = "MAN"+sessKey;

        let courseCreationRes = http.post(urlCourse, newCourseData, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        check (courseCreationRes, {'Course creation status was 200': (r) => r.status == 200});

        //Get Course ID for deletion
        let urlString = courseCreationRes.url;
        courseID = parseInt(urlString.match(/\d+$/));
    });

    // +++++++++ Create announcement +++++++++\\
    group("Create Announcement", function() {
        const urlAnnouncement = "https://"+ moodleEnvironment +"/mod/forum/post.php";

        let newAnnouncementData = announcementData;
        newAnnouncementData.sesskey = sessKey;
        newAnnouncementData.course = courseID;
        newAnnouncementData.subject =  "Loadtest Announcement for " + sessKey;
        let forumID = courseID-1;
        newAnnouncementData.forum = forumID;

        let announceCreationRes = http.post(urlAnnouncement, newAnnouncementData, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        //Get the created announcement ID
        announceID = announceCreationRes.html().find("tr[class~=discussion]").attr('data-discussionid');
        check (announceCreationRes, {'Announcement creation status was 200': (r) => r.status == 200});

    });

    // +++++++++ Delete announcement +++++++++\\
    group("Announcement deletion", function() {

        //To get into the Post itself for required deletion ID
        const urlDiscussionPost = "https://"+ moodleEnvironment +"/mod/forum/discuss.php?d="+announceID;
        const urlAnnounceDelete = "https://"+ moodleEnvironment +"/mod/forum/post.php";

        let discussionGetRes = http.get(urlDiscussionPost);

        //Get the actual post ID for deletion
        const forumPostID = discussionGetRes.html().find('div[data-content=forum-post]').attr('data-post-id');
        const announceDelData = {
            'delete': forumPostID,
            'confirm': forumPostID,
            'sesskey': sessKey,
        };        

        let announceDeletionRes = http.post(urlAnnounceDelete, announceDelData, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        check (announceDeletionRes, {'Announcement deletion status was 200': (r) => r.status == 200});
        sleep(3);

    });

    // +++++++++ Delete course +++++++++\\
    group('Course deletion', function() {
        const courseUrl = "https://"+ moodleEnvironment +"/course/delete.php?id="+courseID;

        let courseGetRes = http.get(courseUrl);

        //Get the string identifier for course deletion
        const courseStringID = courseGetRes.html().find('input[name=delete]').attr('value');

        let courseDeleteSubmitUrl = "https://"+ moodleEnvironment +"/course/delete.php";

        let payload = {
            'id': courseID,
            'delete': courseStringID,
            'sesskey': sessKey,
        };

        let courseDeletionRes = http.post(courseDeleteSubmitUrl, payload, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        check (courseDeletionRes, {'Course deletion status was 200': (r) => r.status == 200});

    });
        
}

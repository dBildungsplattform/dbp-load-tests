import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter } from "k6/metrics";
import { SharedArray } from 'k6/data';

const data = new SharedArray('users', function() {
    const f = JSON.parse(open('./managerLogin.json'));//TODO Adjust to use secret in cluster
    return f;
});

let successfulLogins = new Counter("successful_logins");
let unsuccessfulLogins = new Counter("unsuccessful_logins");

export default function () {

    let token;
    let sessKey;
    let cookie;
    let announceID;
    let courseUrlID;
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

    // +++++++++ Create announcement +++++++++\\
    group("Create Announcement", function() {
        const urlAnnouncement = "https://moodle.dev-scaling-test.dbildungsplattform.de/mod/forum/post.php";

        const announceData = {
            "discussionsubscribe": 1,
            "course": 2,
            "forum": 1,
            "discussion": 0,
            "parent": 0,
            "groupid": 0,
            "edit": 0,
            "reply": 0,
            "sesskey": sessKey,
            "_qf__mod_forum_post_form": 1,
            "subject": 'Announcement Test for '+ sessKey,
            "message[text]": '<p dir="ltr" style="text-align: left;">Test announcement message</p>',
            "message[format]": 1,
            "message[itemid]": 286232499,
            "submitbutton": 'Beitrag absenden',
        };

        let announceCreationRes = http.post(urlAnnouncement, announceData, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        //Get the created announcement ID
        announceID = announceCreationRes.html().find("tr[class=discussion]").attr('data-discussionid');
        
        check (announceCreationRes, {'Announcement creation status was 200': (r) => r.status == 200});

    });

    // +++++++++ Delete announcement +++++++++\\
    group("Announcement deletion", function() {

        //To get into the Post itself for required deletion ID
        const urlDiscussionPost = 'https://moodle.dev-scaling-test.dbildungsplattform.de/mod/forum/discuss.php?d='+announceID;
        const urlAnnounceDelete = 'https://moodle.dev-scaling-test.dbildungsplattform.de/mod/forum/post.php';

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

    });

    // +++++++++ Create course +++++++++\\
    group("Course creation process", function () {

        const urlCourse = "https://moodle.dev-scaling-test.dbildungsplattform.de/course/edit.php";

        let payload = {
            'returnto': 0,
            'returnurl': "https://moodle.dev-scaling-test.dbildungsplattform.de/course/",
            'mform_isexpanded_id_descriptionhdr': 1,
            'addcourseformatoptionshere': "",
            'id': "",
            'sesskey': sessKey,
            '_qf__course_edit_form': 1,
            'mform_isexpanded_id_general': 1,
            'mform_isexpanded_id_courseformathdr': 0,
            'mform_isexpanded_id_appearancehdr': 0,
            'mform_isexpanded_id_filehdr': 0,
            'mform_isexpanded_id_completionhdr': 0,
            'mform_isexpanded_id_groups': 0,
            'mform_isexpanded_id_rolerenaming': 0,
            'mform_isexpanded_id_tagshdr': 0,
            'fullname': "testcourse"+sessKey,
            'shortname': "TEST"+sessKey,
            'category': 1,
            'visible': 1,
            'startdate[day]': 20,
            'startdate[month]': 4,
            'startdate[year]': 2023,
            'startdate[hour]': 0,
            'startdate[minute]': 0,
            'enddate[day]': 20,
            'enddate[month]': 4,
            'enddate[year]': 2030,
            'enddate[hour]': 0,
            'enddate[minute]': 0,
            'idnumber': "",
            'summary_editor[text]': "",
            'summary_editor[format]': 1,
            'summary_editor[itemid]': 568733800,
            'overviewfiles_filemanager': 932307209,
            'format': "topics",
            'numsections': 4,
            'hiddensections': 1,
            'coursedisplay': 0,
            'lang': "",
            'newsitems': 5,
            'showgrades': 1,
            'showreports': 0,
            'showactivitydates': 1,
            'maxbytes': 0,
            'enablecompletion': 1,
            'showcompletionconditions': 1,
            'groupmode': 0,
            'groupmodeforce': 0,
            'defaultgroupid': 0,
            'role1': "", 'role2': "", 'role3': "", 'role4': "", 'role5': "", 'role6': "", 'role7': "", 'role8':"",
            'tags': "_qf__force_multiselect_submission",
            'saveanddisplay': "Speichern und anzeigen",
        };

        let courseCreationRes = http.post(urlCourse, payload, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        check (courseCreationRes, {'Course creation status was 200': (r) => r.status == 200});

        //Get Course ID for deletion
        let urlString = courseCreationRes.url;
        courseUrlID = urlString.match(/\d+$/);

    });

    // +++++++++ Delete course +++++++++\\
    group('Course deletion', function() {
        const courseUrl = 'https://moodle.dev-scaling-test.dbildungsplattform.de/course/delete.php?id='+courseUrlID;

        let courseGetRes = http.get(courseUrl);

        //Get the string identifier for course deletion
        const courseStringID = courseGetRes.html().find('input[name=delete]').attr('value');

        let courseDeleteSubmitUrl = 'https://moodle.dev-scaling-test.dbildungsplattform.de/course/delete.php';

        let payload = {
            'id': courseUrlID,
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
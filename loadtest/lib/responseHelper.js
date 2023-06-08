import http from "k6/http";

export function getRandomUser(users) {
    return users[Math.floor(Math.random() * users.length)];
}

export function setupUsers(userCourseID, sessionKey, cookie, token) {
    let enrolPageUrl = "https://"+ __ENV.ENVIRONMENT +"/user/index.php?id="+userCourseID;
    let payload = {logintoken: token};
    let getEnrolePageRes = http.get(enrolPageUrl, payload);
    let enrolID = getEnrolePageRes.html().find("input[name=enrolid]").attr('value');

    let courseEnrolUrl = "https://"+ __ENV.ENVIRONMENT +"/enrol/manual/ajax.php?mform_showmore_main=0&id="+ userCourseID +"&action=enrol&enrolid="+enrolID+"&sesskey="+ sessionKey +"&_qf__enrol_manual_enrol_users_form=1&mform_showmore_id_main=0&userlist%5B%5D=3&userlist%5B%5D=4&roletoassign=5&startdate=4&duration=";
    http.get(courseEnrolUrl, {
        cookies: {
            MoodleSession: cookie.MoodleSession[0],
            MOODLEID1_: cookie.MOODLEID1_[0],
        },
    });
    return true;
}
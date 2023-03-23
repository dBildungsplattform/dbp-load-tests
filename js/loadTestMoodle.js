import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter } from "k6/metrics";
import { SharedArray } from 'k6/data';

let successfulLogins = new Counter("successful_logins");
let unsuccessfulLogins = new Counter("unsuccessful_logins");
let waitingtimeroundFront = new Counter("front_page_no_timeout_counter");
let waitingtimeroundLogin = new Counter("login_page_no_timeout_counter");

//Access secret JSON data array from File
const data = new SharedArray('users', function() {
  const f = JSON.parse(open('../secrets/login.json'));
  return f;
});

export default function () {

  // +++++++++ Front page +++++++++\\
  group("Front page", function () {
    sleep((Math.random()*10)+3);
    let res =  http.get('https://moodle.dev-scaling-test.dbildungsplattform.de/');
    check (res, {'status was 200': (r) => r.status == 200});

    //amount of timeouts
    let waitingtimeFront = check(res, {"no timeout at frontpage": (r) => r.timings.duration<60000});
    if(waitingtimeFront)waitingtimeroundFront.add(1);
  });
  
  // +++++++++ Login Page +++++++++\\
  sleep((Math.random()*10)+3);


  group("Login", function () {
    const urlLogin = "https://moodle.dev-scaling-test.dbildungsplattform.de/login/index.php?lang=de";

    let res = http.get(urlLogin);
    check(res, {
      "User isn't logged in": (r) =>
        r.body.indexOf("Login bei 'Moodle'") !== -1,
    });

    sleep((Math.random()*10)+3);

    //extracting the logintoken token from the response
    const token = res.html().find('input[name=logintoken]').attr('value');

    //Choose random user from login credentials
    const randomUser = data[Math.floor(Math.random() * data.length)];

    let payload = {
      username: randomUser.username,
      password: randomUser.password,
      redir: "1",
      logintoken: `${token}`,
    };

    //make login request
    res = http.post(urlLogin, payload);

    //amount of timeouts at login process
    let waitingtimeLogin = check(res, {"no timeout after Login": (r) => r.timings.duration<60000});
    if(waitingtimeLogin)waitingtimeroundLogin.add(1);

    let checkLoginSuccess = check(res, {
      "is logged in welcome header present": (r) =>
        r.body.indexOf("Willkommen zurück, loadtest user2!") !== -1,
    });

    let checkLoginFailure = check(res, {
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
    check (res, {'status is 5xx': (r) => r.status >= 500 && r.status <=599});
    check (res, {'status was 200': (r) => r.status == 200});
    
  });
}
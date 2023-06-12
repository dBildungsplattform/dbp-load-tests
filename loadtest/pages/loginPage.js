import http from "k6/http";

export default class LoginPage {
    constructor(metricHelper){
        this.url = "https://"+ __ENV.ENVIRONMENT +"/login/index.php?lang=de";
        this.jar = http.cookieJar();
        this.token = '';
        this.metricHelper = metricHelper;
    }

    getFrontpage(){
        let res = http.get('https://'+ __ENV.ENVIRONMENT +'/');

        this.metricHelper.checkFrontpage(res);
        return 0;
    }

    //Checks if the User is already logged in
    //Returns the logintoken
    checkAlreadyLoggedIn() {
        let res = http.get(this.url);
        this.token = res.html().find('input[name=logintoken]').attr('value');

        this.metricHelper.checkCurrentLoginStatus(res);

        return this.token;
    }

    //Login process, returns a object with cookie and session
    login(loginData) {
        let payload = {
            username: loginData.username,
            password: loginData.password,
            redir: "1",
            logintoken: this.token
        }

        let res = http.post(this.url, payload);

        let cookie = this.jar.cookiesForURL(res.url);  

        let sessKey = res.html().find('input[name="sesskey"]').toArray()[0].attr('value');

        this.metricHelper.checkLogin(res);

        return {cookie: cookie, session: sessKey};
    }

}
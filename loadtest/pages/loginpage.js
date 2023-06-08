import http from "k6/http";

export default class LoginPage {
    constructor(){
        this.url = "https://"+ __ENV.ENVIRONMENT +"/login/index.php?lang=de";
    }

    //Checks if the User is already logged in
    //Returns the logintoken
    checkAlreadyLoggedIn() {
        return http.get(this.url);
    }

    //Login process, returns the response
    login(payload) {
        return http.post(this.url, payload);
    }
}
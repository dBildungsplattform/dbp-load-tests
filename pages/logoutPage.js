import http from "k6/http";

export default class LogoutPage {
    constructor(sessKey, token, metricHelper){
        this.url = "https://"+ __ENV.ENVIRONMENT +"/login/logout.php?sesskey="+sessKey;
        this.token = token;
        this.metricHelper = metricHelper;
    }

    logout() {
        let payload = {logintoken: this.token};
        let logoutRes = http.get(this.url, payload);
        this.metricHelper.checkLogout(logoutRes);
        return 0;
    }

    verifyLogout(discussionID){
        let payload = {logintoken: this.token};
        const logoutVerifyUrl = "https://"+ __ENV.ENVIRONMENT +"/mod/forum/discuss.php?d="+discussionID;
        let verifyRes = http.get(logoutVerifyUrl, payload);
        this.metricHelper.verifyLogout(verifyRes);
        return 0;
    }
}
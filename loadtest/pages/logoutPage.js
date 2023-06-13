//The Logout Process is a Object that offers all available functionalities surrounding the Logout.
//The Object will be created once per virtual User
//Requires:
//----sessKey: The sessionKey to identify the user who gets logged out
import http from "k6/http";
import MetricHelper from "../lib/metricHelper.js";

export default class LogoutPage {
	constructor(sessKey, token) {
		this.url = "https://" + __ENV.ENVIRONMENT + "/login/logout.php?sesskey=" + sessKey;
		this.token = token;
	}

	//Logout of the specific User
	logout() {
		let payload = { logintoken: this.token };
		let logoutRes = http.get(this.url, payload);
		MetricHelper.getInstance().checkLogout(logoutRes);
		return 0;
	}

	//Verifies the successfull Logout by trying to access a restricted page
	//Requires:
	//----discussionID: Tries to access the specific discussion which is Login restricted
	verifyLogout(discussionID) {
		let payload = { logintoken: this.token };
		const logoutVerifyUrl = "https://" + __ENV.ENVIRONMENT + "/mod/forum/discuss.php?d=" + discussionID;
		let verifyRes = http.get(logoutVerifyUrl, payload);
		MetricHelper.getInstance().verifyLogout(verifyRes);
		return 0;
	}
}

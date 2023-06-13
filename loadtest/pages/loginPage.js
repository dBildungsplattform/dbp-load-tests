//The Login Page is a Object that offers all available functionalities surrounding the Login.
//The Object will be created once per virtual User
//Requires:
//----metricHelper Object to have a singular set of Counters during the whole Test
import http from "k6/http";

export default class LoginPage {
	constructor() {
		this.url = "https://" + __ENV.ENVIRONMENT + "/login/index.php?lang=de";
		this.jar = http.cookieJar();
		this.token = "";
	}

	//Simple check if the Frontpage is accessible
	getFrontpage() {
		let res = http.get("https://" + __ENV.ENVIRONMENT + "/");

		this.metricHelper.checkFrontpage(res);
		return 0;
	}

	//Checks if the User is already logged in
	//Returns:
	//----token: logintoken for identification
	checkAlreadyLoggedIn() {
		let res = http.get(this.url);
		this.token = res.html().find("input[name=logintoken]").attr("value");

		MetricHelper.getInstance().checkCurrentLoginStatus(res);

		return this.token;
	}

	//Login process, returns a object with cookie and session
	//Requires:
	//----loginData: Contains the secret username and password
	//Returns:
	//----Object consisting of cookie and session Key
	login(loginData) {
		let payload = {
			username: loginData.username,
			password: loginData.password,
			redir: "1",
			logintoken: this.token,
		};

		let res = http.post(this.url, payload);

		let cookie = this.jar.cookiesForURL(res.url);

		let sessKey = res.html().find('input[name="sesskey"]').toArray()[0].attr("value");

		MetricHelper.getInstance().checkLogin(res);

		return { cookie: cookie, session: sessKey };
	}
}

//The Announcement Page is a Object that offers all available functionalities surrounding the Announcements.
//The Object will be created once per virtual User
//Requires:
//----Users specific Session Key
import http from "k6/http";
import MetricHelper from "../lib/metricHelper.js";
import { sleep } from "k6";

export default class AnnouncementPage {
	constructor(session) {
		this.announcementUrl = "https://" + __ENV.ENVIRONMENT + "/mod/forum/post.php";
		this.session = session;
	}

	//Create desired amount of Setup Announcements and return an Array of Discussion ID's corresponding to the created Announcements
	//Requires:
	//----courseID: Identifies the course the announcement will be created in
	//----announcementData: The json template to create a announcement
	//----amount: Number of announcements to create
	//Returns: The ID or ID Array of the created Announcements, refered to as discussions
	createAnnouncement(announcementData, courseID, cookie, amount) {
		announcementData.sesskey = this.session;
		announcementData.course = courseID;
		let getForumIDResponse = http.get("https://moodle.loadtest.dbildungscloud.dev/course/view.php?id="+courseID);
		let forumID = getForumIDResponse.html().find("li[class~=forum]").attr("data-id");
		//DEBUG console.log("CourseID = "+ courseID + ", ForumID = " + forumID); 
		announcementData.forum = forumID-1;

		const discussionIDs = [];
		for (let i = 0; i < amount; i++) {
			announcementData.subject = "Loadtest Announcement for " + this.session + "-" + i;
			//DEBUG console.log(announcementData);
			let announceCreationRes = http.post(this.announcementUrl, announcementData, {
				cookies: {
					MoodleSession: cookie.MoodleSession[0],
					MOODLEID1_: cookie.MOODLEID1_[0],
				},
			});

			//Get the created discussion ID
			let discussID = announceCreationRes.html().find("tr[class~=discussion]").attr("data-discussionid");
			discussionIDs[i] = discussID;
			MetricHelper.getInstance().checkAnnouncementCreation(announceCreationRes);
			sleep(0.5); //Sleep so there won't be race condition problems
		}
		return discussionIDs;
	}

	//Makes a GET-request to view the Announcement Page and returns a parent Post ID to identify the Post for later commentary posts
	//Requires:
	//----Discussion ID: Identifies the Announcement in the Forum of a Course where User comments can be added
	//Returns:
	//----parentPostID: The Announcement ID inside the actual Announcement to refer to the parent post for future comments
	getAnnouncementPage(discussionID, token) {
		let payload = { logintoken: token };
		const urlAnnouncement = "https://" + __ENV.ENVIRONMENT + "/mod/forum/discuss.php?d=" + discussionID;
		let announceRes = http.get(urlAnnouncement, payload);
		let parentPostID = announceRes.html().find("div[class~=firstpost]").attr("data-post-id");

		MetricHelper.getInstance().checkAnnouncePageOpened(announceRes);
		return parentPostID;
	}

	//Creates the comment inside the announcements of the Forum.
	//Requires:
	//----parentPostID: Describes the Announcement where the comment should be linked to
	//----commentData: The Json-Template to create a comment
	createAnnouncementComment(commentData, cookie, parentPostID) {
		let commentTemplate = commentData;
		let urlQuery = "sesskey=" + this.session + "&info=mod_forum_add_discussion_post";
		const urlComment = "https://" + __ENV.ENVIRONMENT + "/lib/ajax/service.php?" + urlQuery;

		commentTemplate[0].args.postid = parentPostID;
		commentTemplate[0].args.message = "test message " + this.session;
		commentTemplate[0].args.subject = "Re: Loadtest announcement " + this.session;

		let commentRes = http.post(urlComment, JSON.stringify(commentTemplate), {
			cookies: {
				MoodleSession: cookie.MoodleSession[0],
				MOODLEID1_: cookie.MOODLEID1_[0],
			},
		});
		this.commentID = JSON.parse(commentRes.body)[0].data.postid;

		MetricHelper.getInstance().checkCommentCreation(commentRes, this.session);

		return 0;
	}

	//Deletes a created comment, uses Variables of the announcementPage Object.
	deleteComment(cookie) {
		const formdata = {
			delete: this.commentID,
			confirm: this.commentID,
			sesskey: this.session,
		};

		const commentDelRes = http.post("https://" + __ENV.ENVIRONMENT + "/mod/forum/post.php", formdata, {
			cookies: {
				MoodleSession: cookie.MoodleSession[0],
				MOODLEID1_: cookie.MOODLEID1_[0],
			},
		});

		MetricHelper.getInstance().checkCommentDeletion(commentDelRes, this.session);
		return 0;
	}

	//Deletes a created announcement, the announcement can be deleted with it's specific postID
	//Required:
	//----discussionID: Required to get the actual postID for deletion
	deleteAnnouncement(discussionID, cookie) {
		const urlDiscussionPost = "https://" + __ENV.ENVIRONMENT + "/mod/forum/discuss.php?d=" + discussionID;
		const urlAnnounceDelete = "https://" + __ENV.ENVIRONMENT + "/mod/forum/post.php";

		let discussionGetRes = http.get(urlDiscussionPost);

		//Get the actual post ID for deletion
		const forumPostID = discussionGetRes.html().find("div[data-content=forum-post]").attr("data-post-id");
		const announceDelData = {
			delete: forumPostID,
			confirm: forumPostID,
			sesskey: this.session,
		};

		let announceDeletionRes = http.post(urlAnnounceDelete, announceDelData, {
			cookies: {
				MoodleSession: cookie.MoodleSession[0],
				MOODLEID1_: cookie.MOODLEID1_[0],
			},
		});

		MetricHelper.getInstance().checkAnnouncementDeletion(announceDeletionRes);
		return 0;
	}
}

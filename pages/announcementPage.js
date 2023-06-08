import http from "k6/http";
import { sleep } from "k6";

export default class CoursePage {
    constructor(session, metricHelper){
        this.announcementUrl = "https://"+ __ENV.ENVIRONMENT +"/mod/forum/post.php";
        this.session = session;
        this.metricHelper = metricHelper;
    }

    //Create desired amount of Setup Announcements and return an Array of Discussion ID's corresponding to the created Announcements
    createAnnouncement(announcementData, courseID, cookie, amount){
        announcementData.sesskey = this.session;
        announcementData.course = courseID;
        let forumID = courseID-1;
        announcementData.forum = forumID;
        
        const discussionIDs = [];
        for(let i = 0; i<amount ; i++){
            announcementData.subject =  "Loadtest Announcement for " + this.session + "-" + i;

            let announceCreationRes = http.post(this.announcementUrl, announcementData, {
                cookies: {
                    MoodleSession: cookie.MoodleSession[0],
                    MOODLEID1_: cookie.MOODLEID1_[0],
                },
            });
    
            //Get the created discussion ID
            let discussID = announceCreationRes.html().find("tr[class~=discussion]").attr('data-discussionid');
            discussionIDs[i] = discussID;
            sleep(0.5);//Sleep so there won't be race condition problems
        }
        console.log("DiscussionID Array: "+discussionIDs);
        return discussionIDs;
    }

    getAnnouncementPage(discussionID, token) {
        let payload = {logintoken: token};
        const urlAnnouncement = "https://"+ __ENV.ENVIRONMENT +"/mod/forum/discuss.php?d="+discussionID;
        let announceRes = http.get(urlAnnouncement, payload);
        let parentPostID = announceRes.html().find("div[class~=firstpost]").attr('data-post-id');

        this.metricHelper.checkAnnouncePageOpened(announceRes);
        return parentPostID;
    }

    createAnnouncementComment(commentData, cookie, parentPostID){
        let commentTemplate = commentData;
        let urlQuery = "sesskey="+this.session+"&info=mod_forum_add_discussion_post";
        const urlComment = "https://"+ __ENV.ENVIRONMENT +"/lib/ajax/service.php?"+urlQuery;
        
        commentTemplate[0].args.postid = parentPostID;
        commentTemplate[0].args.message = "test message "+this.session;
        commentTemplate[0].args.subject = "Re: Loadtest announcement "+this.session;

        let commentRes = http.post(urlComment, JSON.stringify(commentTemplate), {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });
        this.commentID = JSON.parse(commentRes.body)[0].data.postid;

        this.metricHelper.checkCommentCreation(commentRes, this.session);

        return 0;
    }

    deleteComment(cookie) {
        const formdata = {
            "delete": this.commentID,
            "confirm": this.commentID,
            "sesskey": this.session,
        };

        const commentDelRes = http.post("https://"+ __ENV.ENVIRONMENT +"/mod/forum/post.php", formdata, {
            cookies: {
                MoodleSession: cookie.MoodleSession[0],
                MOODLEID1_: cookie.MOODLEID1_[0],
            },
        });

        this.metricHelper.checkCommentDeletion(commentDelRes, this.session);
        return 0;
    }
}
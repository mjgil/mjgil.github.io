$(document).ready(function(){
			$.ajax({
				url: "twitter/json.php",
				success: function(data) {
					var tweetArray = jQuery.parseJSON(data);
					if ( tweetArray ) {
						for (var i = 0; i < tweetArray.length; i++) {
							var jsonObj = tweetArray[i];
							var date = jsonObj.created_at;
							date = date.split(" ");
							(date.length > 5) ? date = date[1] + " " + date[2] + ", " + date[5] : date = "";
							if (date) {
								var tweet = $("<article><header style='color:rgba(224, 115, 115, .8)'>" + jsonObj.user.screen_name + ":</header><p style='font-style: italic'>" + jsonObj.text + "</p><footer style='font-variant: small-caps; font-size: 80%; text-align:right'>" + date + "</footer></article>").hide();
								tweet.appendTo($("section#twitterPane")).slideDown();
							}
							else {
								var tweet = $("<article>" + jsonObj.user.screen_name + ":<br />" + jsonObj.text + "</article>").hide();
								tweet.appendTo($("section#twitterPane")).slideDown();
							}
						};
					}
					var d = new Date();
					//if ($("body.updateTwitter").text() ) { // on this updateTwitter page updateTwitter.html
						pollTwitter();
					//}
				}//,
				//error: pollTwitter()
				});
				
			function pollTwitter() {
					$.ajax({
					url: "twitter/json.php"
					});
				}
});
		
		
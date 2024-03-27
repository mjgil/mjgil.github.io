$(document).ready(function(){
			$("#leftPanelImageColor").hide();
			$("#leftPanelImageWrapper").hover( 
				function() {
					$("#leftPanelImageColor").fadeIn('slow');
				},
				function () {
					$("#leftPanelImageColor").fadeOut('slow');
				}
			);
			
			$(function() {
				$(window).scroll(function() {
					var scrollTop = $(window).scrollTop();
					if (scrollTop !== 0) {
						$('nav#navigationBar').stop().animate({'opacity':'0.2'},400);
					}
					else {
						$('nav#navigationBar').stop().animate({'opacity':'1'},400);
					}
				});
				
				$('nav#navigationBar').hover(
					function (e) {
						var scrollTop = $(window).scrollTop();
						if(scrollTop !== 0) {
							$('nav#navigationBar').stop().animate({'opacity':'1'},400);
						}
					},
					function (e) {
						var scrollTop = $(window).scrollTop();
						if(scrollTop != 0) {
							$('nav#navigationBar').stop().animate({'opacity':'0.2'},400);
						}
					}
					);
			});
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
				}
			});
			$("#link2011").click(function() {
				$(".a2011").show();
				$(".a2010").hide();
				$(".a2009").hide();
				$("#link2011").removeAttr("class").attr("class","activeAlumni");
				$("#link2010").removeAttr("class");
				$("#link2009").removeAttr("class");
			});
			$("#link2010").click(function() {
				$(".a2011").hide();
				$(".a2010").show();
				$(".a2009").hide();
				$("#link2011").removeAttr("class");
				$("#link2010").removeAttr("class").attr("class","activeAlumni");
				$("#link2009").removeAttr("class");
			});
			$("#link2009").click(function() {
				$(".a2011").hide();
				$(".a2010").hide();
				$(".a2009").show();
				$("#link2011").removeAttr("class");
				$("#link2010").removeAttr("class");
				$("#link2009").removeAttr("class").attr("class","activeAlumni");
			});
			
});
		
		
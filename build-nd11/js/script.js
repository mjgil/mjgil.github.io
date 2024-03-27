$(document).ready(function(){
			//Examples of how to assign the ColorBox event to elements
			$("a[rel='2012']").colorbox({width:"900px", height:"100%", iframe:true, transition:"elastic", scalePhotos:"true"});
			$("a[rel='2013']").colorbox({width:"900px", height:"100%", iframe:true, transition:"elastic", scalePhotos:"true"});
			$("a[rel='2014']").colorbox({width:"900px", height:"100%", iframe:true, transition:"elastic", scalePhotos:"true"});
			//$("a[rel='2014']").colorbox({width:"80%", height:"80%", iframe:true, transition:"elastic", scalePhotos:"true", scrolling:false });
			$("a[rel='contact']").colorbox({width:"80%", height:"80%", iframe:true});
			$("a[rel='example2']").colorbox({transition:"fade"});
			$("a[rel='example3']").colorbox({transition:"none", width:"75%", height:"75%"});
			$("a[rel='example4']").colorbox({slideshow:true});
			$(".example5").colorbox();
			$(".example6").colorbox({iframe:true, innerWidth:425, innerHeight:344});
			$(".example7").colorbox({width:"80%", height:"80%", iframe:true});
			$(".example8").colorbox({width:"50%", inline:true, href:"#inline_example1"});
			$(".example9").colorbox({
				onOpen:function(){ alert('onOpen: colorbox is about to open'); },
				onLoad:function(){ alert('onLoad: colorbox has started to load the targeted content'); },
				onComplete:function(){ alert('onComplete: colorbox has displayed the loaded content'); },
				onCleanup:function(){ alert('onCleanup: colorbox has begun the close process'); },
				onClosed:function(){ alert('onClosed: colorbox has completely closed'); }
			});
			
			//Example of preserving a JavaScript event for inline calls.
			$("#click").click(function(){ 
				$('#click').css({"background-color":"#f00", "color":"#fff", "cursor":"inherit"}).text("Open this window again and this message will still be here.");
				return false;
			});
			
			$(function() {
				var slideshow2012 = {},
				slideshow2013 = {},
				slideshow2014 = {};
				
				initializeObjects( 2012 , slideshow2012 );
				initializeObjects( 2013 , slideshow2013 );
				initializeObjects( 2014 , slideshow2014 );
				defineClickEvents( slideshow2012 );
				defineClickEvents( slideshow2013 );
				defineClickEvents( slideshow2014 );
				
				
				function initializeObjects( year, obj ) {
					obj.currSlide = 0;
					obj.slideshow = $( ("#slideshow" + year) );
					obj.slideReel = $( ("#slideReel" + year) );
					obj.lastSlide = obj.slideReel.children().length;
					obj.leftNav = $( ("#leftNav" + year) );
					obj.rightNav = $( ("#rightNav" + year) );
					obj.activeNav = $( ("#activeNav" + year) );
				}
				
				function defineClickEvents( obj ) {
				
					obj.leftNav.click(function(ev) {
						ev.preventDefault();
						obj.currSlide -= 1;
						changeSlide( obj );
					});
					
					obj.rightNav.click(function(ev) {
						ev.preventDefault();
						obj.currSlide += 1;
						changeSlide( obj );
					});
					
					obj.slideshow.find('.slideshow-nav a.nav-item').click(function(ev) {
						ev.preventDefault();
						obj.currSlide = $(this).index();
						changeSlide( obj );
					});
				
				
				}
				
				function changeSlide( obj ) {
					
					// make sure the currSlide value is not too low or high
					if ( obj.currSlide >= obj.lastSlide ) obj.currSlide = 0;
					else if ( obj.currSlide < 0 ) obj.currSlide = obj.lastSlide-1;
					
					// animate the slide reel
					obj.slideReel.animate({
						left : obj.currSlide * -500
					}, 400, 'swing', function() {}
					);
					
					// animate the navigation indicator
					obj.activeNav.animate({
						left : obj.currSlide * 75
					}, 400, 'swing');
				}
				
			});
			
			
		});
		
/*
 * panorama360 - jQuery plugin made by Liviu Holhos
 * Copyright (c) 2011 Minimalistic Studio (http://minimalisticstudio.com/)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 */
(function($) {
	$.fn.panorama360 = function(options){
		this.each(function(){
			var settings = {
				start_position: 0, // initial start position for the view
				image_width: 0,
				image_height: 0,
				mouse_wheel_multiplier: 20,
				bind_resize: true, // determine if window resize affects panorama viewport
				is360: true, // glue left and right and make it scrollable
				debug: false
			};
			if(options) $.extend(settings, options);
			var viewport = $(this);
			var panoramaContainer = viewport.children('.panorama-container');
			var viewportImage = panoramaContainer.children('img:first');
				if(settings.image_width<=0 && settings.image_height<=0){
					settings.image_width = parseInt(viewportImage.data("width"));
					settings.image_height = parseInt(viewportImage.data("height"));
					if (!(settings.image_width) || !(settings.image_height)) return;
				}
				var image_ratio = settings.image_height/settings.image_width;
				var elem_height = parseInt(viewport.height());
				var elem_width = parseInt(elem_height/image_ratio);
				var image_map = viewportImage.attr('usemap');
				var image_areas;
				var isDragged = false;
				var mouseXprev = 0;
				var scrollDelta = 0;

				if (settings.is360) viewportImage.height(elem_height).removeAttr("usemap").css("left",0).clone().css("left",elem_width+"px").insertAfter(viewportImage);

				panoramaContainer.css({
					'margin-left': '-'+settings.start_position+'px',
					'width': (elem_width*2)+'px',
					'height': (elem_height)+'px'
				});
			setInterval( function() {
				if (isDragged) return false;
				scrollDelta = scrollDelta * 0.98;
				if (Math.abs(scrollDelta)<=2) scrollDelta = 0;
				scrollView(panoramaContainer, elem_width, scrollDelta,settings);
			}, 1);
			viewport.mousedown(function(e){
				if (isDragged) return false;
				$(this).addClass("grab");
				isDragged = true;
				mouseXprev = e.clientX;
				scrollOffset = 0;
				return false;
			}).mouseup(function(){
				$(this).removeClass("grab");
				isDragged = false;
				scrollDelta = scrollDelta * 0.45;
				return false;
			}).mousemove(function(e){
				if (!isDragged) return false;
				scrollDelta = parseInt((e.clientX - mouseXprev));
				mouseXprev = e.clientX;
				scrollView(panoramaContainer, elem_width, scrollDelta,settings);
				return false;
			}).bind("mousewheel",function(e,distance){
				var delta=Math.ceil(Math.sqrt(Math.abs(distance)));
				delta=distance<0 ? -delta : delta;
				scrollDelta = scrollDelta + delta * 5;
				scrollView(panoramaContainer,elem_width,delta*settings.mouse_wheel_multiplier,settings);
				return false;
			}).bind('contextmenu',stopEvent).bind('touchstart', function(e){
				if (isDragged) return false;
				isDragged = true;
				mouseXprev = e.originalEvent.touches[0].pageX;
				scrollOffset = 0;
			}).bind('touchmove', function(e){
				e.preventDefault();
				if (!isDragged) return false;
				var touch_x = e.originalEvent.touches[0].pageX;
				scrollDelta = parseInt((touch_x - mouseXprev));
				mouseXprev = touch_x;
				scrollView(panoramaContainer, elem_width, scrollDelta,settings);
			}).bind('touchend', function(e){
				isDragged = false;
				scrollDelta = scrollDelta * 0.45;
			});

			if (image_map) {
				$('map[name='+image_map+']').children('area').each(function(){
					switch ($(this).attr("shape").toLowerCase()){
						case 'rect':
							var area_coord = $(this).attr("coords").split(",");
							if ($(this).attr("image")) {
								$area1 = $("<img src='" + $(this).attr("image") + "' class='area " + $(this).attr("class") + "' href='"+$(this).attr("href")+"' title='"+$(this).attr("alt")+"'\/>");
							}
							else {
								$area1 = $("<a class='area " + $(this).attr("class") + "' href='"+$(this).attr("href")+"' title='"+$(this).attr("alt")+"'</a>");
							}
							panoramaContainer.append($area1.data("stitch",1).data("coords",area_coord));
							panoramaContainer.append($area1.clone().data("stitch",2).data("coords",area_coord));
							break;
					}
				});
				$('map[name='+image_map+']').remove();
				image_areas = panoramaContainer.children(".area");
				image_areas.mouseup(stopEvent).mousemove(stopEvent).mousedown(stopEvent);
				repositionHotspots(image_areas,settings.image_height,elem_height,elem_width);
			}

			if (settings.bind_resize){
				$(window).resize(function(){
					elem_height = parseInt(viewport.height());
					elem_width = parseInt(elem_height/image_ratio);
					panoramaContainer.css({
						'width': (elem_width*2)+'px',
						'height': (elem_height)+'px'
					});
					viewportImage.css("left",0).next().css("left",elem_width+"px");
					if (image_map) repositionHotspots(image_areas,settings.image_height,elem_height,elem_width);
				});
			}

			if (settings.callback && typeof settings.callback === 'function'){
				var img = 0;
				$('.panorama-container img').load(function(e){
					img += 1;
					if (img == 2) settings.callback();
				});
			}
		});

		function stopEvent(e){
			e.preventDefault();
			return false;
		}

		function scrollView(panoramaContainer,elem_width,delta,settings){
			var newMarginLeft = parseInt(panoramaContainer.css('marginLeft'))+delta;
			if(settings.is360){
				if (newMarginLeft > 0) newMarginLeft = -elem_width;
				if (newMarginLeft < -elem_width) newMarginLeft = 0;
			}
			else{
				var right = (-elem_width>>2);
				if (newMarginLeft > 0) newMarginLeft = 0;
				if (newMarginLeft < right) newMarginLeft = right;
			}
			panoramaContainer.css('marginLeft', newMarginLeft+'px');
		}
		
		$(".panorama-view:first").show();
		$(".area").click(function(e) {
			stopEvent(e);
			var thisRoom = $(this).attr("class").replace(/\area\s+/,"").replace(/\s+$/,"");
			var nextRoom = $(this).attr("href");
			$("." + nextRoom).fadeIn("slow");
			$("." + thisRoom).hide();
		});
			
			
		function repositionHotspots(areas,image_height,elem_height,elem_width){
			var percent = elem_height/image_height;
			areas.each(function(){
				area_coord = $(this).data("coords");
				stitch = $(this).data("stitch");
				switch (stitch){
					case 1:
						$(this).css({
							'left':		(area_coord[0]*percent)+"px",
							'top':		(area_coord[1]*percent)+"px",
							'width':	((area_coord[2]-area_coord[0])*percent)+"px",
							'height':	((area_coord[3]-area_coord[1])*percent)+"px",
						});
						break;
					case 2:
						$(this).css({
							'left':		(elem_width+parseInt(area_coord[0])*percent)+"px",
							'top':		(area_coord[1]*percent)+"px",
							'width':	((area_coord[2]-area_coord[0])*percent)+"px",
							'height':	((area_coord[3]-area_coord[1])*percent)+"px"
						});
						break;
				}
			});
		}
	}
})(jQuery);
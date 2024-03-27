$(document).ready(function(){
			
	var ndLatLong = new google.maps.LatLng(42.351474222525155, -71.08780793845654);
	var myOptions = {
		backgroundColor:"transparent",
		zoom:2,
		center: ndLatLong,
		rotateControl: false, //zooming in was weird
		mapTypeId:google.maps.MapTypeId.ROADMAP
//		minZoom:2
	};
	var map = new google.maps.Map(document.getElementById("directionMap"),myOptions);
	map.streetView.addressControl = false;
	var directionsService, directionsDisplay, destinationName = "Nu Delta Fraternity";

	directionsDisplay = new google.maps.DirectionsRenderer();
	directionsDisplay.setMap(map);
	directionsDisplay.setPanel(document.getElementById("directions"));
	
	if (navigator.geolocation) {
		var opts = {
			enableHighAccuracy: true,
			maximumAge: 60000, // time in milliseconds
			timeout: 15000
			};
		navigator.geolocation.getCurrentPosition( function( position )	{
			submitHTML5GeolocationData(position);
			navigator.geolocation.watchPosition( submitHTML5GeolocationData);
		}, function(err) {
			tryGoogleLocator();
		}, opts);
	}
	else {
		tryGoogleLocator();	
	}
	
	function submitHTML5GeolocationData(position) {
		if (position) {
			this.startingPoint = position.coords.latitude + ", " + position.coords.longitude;
			submitDirectionInfo( this.startingPoint );
		}
	}
	
	function tryGoogleLocator() {
			if (typeof google == 'object') {
				var geocoder = new google.maps.Geocoder();
				if (google.loader.ClientLocation) {
					this.startingPoint = google.loader.ClientLocation.latitude + ", " + google.loader.ClientLocation.longitude;
					submitDirectionInfo( this.startingPoint );
				} 
			}
	}
	function getStartingPoint() { return this.startingPoint; }
	function submitDirectionInfo( startingPoint ) {
		var mapType = $("#directionType option:selected").text();
		startingPoint ? displayDirections(startingPoint, mapType) : displayDirections(null, mapType);
	}
	$("#getDirections").click(function(ev) {
		ev.preventDefault();
		var newStartingPoint = $("#address").val();
		newStartingPoint.replace(/\s+/,"");
		var startingPoint = getStartingPoint();
		if (!startingPoint) var startingPoint = null;
		newStartingPoint ? submitDirectionInfo(newStartingPoint) : submitDirectionInfo( startingPoint );
	});
	
	function displayDirections( startingPoint, mapType ) {
		var massAve77 = "42.3590770731477726,-71.09343186020851";
		if ( !startingPoint ) {
			startingPoint = massAve77;
			var startAddress = "77 Massachusetts Ave, Massachusetts Institute of Technology, Cambridge, MA 02139, USA";
		}
		var modeOfTransit;
		if ( mapType === "Driving") {
			modeOfTransit = google.maps.DirectionsTravelMode.DRIVING;
		}
		else if ( mapType === "Bicycling" ) {
			modeOfTransit = google.maps.DirectionsTravelMode.BICYCLING;
		}
		else {
			modeOfTransit = google.maps.DirectionsTravelMode.WALKING;
		}
		var request = {
			origin: startingPoint,
			destination: ndLatLong,
			travelMode: modeOfTransit
		};
		directionsService = new google.maps.DirectionsService();
		directionsService.route(request, function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				if ( result && result.routes && result.routes[0] && result.routes[0].legs && result.routes[0].legs[0] ) {
					result.routes[0].legs[0].end_address = "460 Beacon St, Boston, MA 02115, USA";
					if (startAddress) {result.routes[0].legs[0].start_address = startAddress;}
				}
				//$('#text').append(Object.keys(result[routes]));
				directionsDisplay.setDirections(result);
				$('#invalidAddress').html("");
			}
			else {
				$('#invalidAddress').html("Please Enter a Valid Address");
			}
		});
	}
	if ( $("body.directions") ) $("html").css("overflow", "hidden");
	// to handle window resizes for elements and shadow
	changeHeight();
	$(window).resize(function() {
		var newHeight = $("body").height() - 260;
		newHeight = newHeight + "px";
		var newWidth = $("#contentDirections").width() - 470;
		newWidth = newWidth + "px";
		$("#directions").css("height", newHeight );
		$("#directionMap").css("height", newHeight).css("width", newWidth);
		$(".shadowLeft").css({"height":newHeight, "width": newWidth, "clip": "rect(0px,4px," + newHeight + ", 0px)"});
		$(".shadowTop").css({"height":newHeight, "width": newWidth, "clip": "rect(0px," + newWidth + ",4px, 0px)"});
	});
	function changeHeight() {
		var newHeight = $("body").height() - 260;
		newHeight = newHeight + "px";
		var newWidth = $("#contentDirections").width() - 470;
		newWidth = newWidth + "px";
		$("#directions").css("height", newHeight );
		$("#directionMap").css("height", newHeight).css("width", newWidth);
		$(".shadowLeft").css({"height":newHeight, "width": newWidth, "clip": "rect(0px,4px," + newHeight + ", 0px)"});
		$(".shadowTop").css({"height":newHeight, "width": newWidth, "clip": "rect(0px," + newWidth + ",4px, 0px)"});
	};
});
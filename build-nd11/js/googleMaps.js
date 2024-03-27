$(document).ready(function(){
			
	var malLatLong = new google.maps.LatLng(38.64392514695482,-121.16384625434875);
	var myOptions = {
		backgroundColor:"transparent",
		zoom:2,
		center: malLatLong,
		rotateControl: false, //zooming in was weird
		mapTypeId:google.maps.MapTypeId.ROADMAP
//		minZoom:2
	};
	map = new google.maps.Map(document.getElementById("map_canvas"),myOptions);

img2012 = new google.maps.MarkerImage('images/mapIcons/Summer2011/2012.png',
	  new google.maps.Size(20, 16),
      new google.maps.Point(0,0),
      new google.maps.Point(0, 16));

shadow2012 = new google.maps.MarkerImage('images/mapIcons/Summer2011/shadow-2012.png',
      new google.maps.Size(29, 16),
      new google.maps.Point(0,0),
      new google.maps.Point(0, 16)
);

img2013 = new google.maps.MarkerImage('images/mapIcons/Summer2011/2013.png',
	  new google.maps.Size(20, 16),
      new google.maps.Point(0,0),
      new google.maps.Point(0, 16));

shadow2013 = new google.maps.MarkerImage('images/mapIcons/Summer2011/shadow-2013.png',
      new google.maps.Size(29, 16),
      new google.maps.Point(0,0),
      new google.maps.Point(0, 16)
);

img2014 = new google.maps.MarkerImage('images/mapIcons/Summer2011/2014.png',
	  new google.maps.Size(20, 16),
      new google.maps.Point(0,0),
      new google.maps.Point(0, 16));

shadow2014 = new google.maps.MarkerImage('images/mapIcons/Summer2011/shadow-2014.png',
      new google.maps.Size(29, 16),
      new google.maps.Point(0,0),
      new google.maps.Point(0, 16)
);
	  
shape = {
      coord: [1, 1, 1, 20, 16, 20, 16 , 1],
      type: 'poly'
};	
counter = 0; // for windows to pop on top of each other
var dataElems = $(".mapDataElem");
dataElems.each(function() {
    var name = $(this).children(".mapName").text();
    var company = $(this).children(".mapCompany").text();
    var lat = $(this).children(".mapLat").text();
    var lng = $(this).children(".mapLng").text();
	if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
		 return true;
	}
	else {
		lat = parseFloat(lat);
		lng = parseFloat(lng);
	}
    var desc = $(this).children(".mapDesc").text();
    var location = $(this).children(".mapLocation").text();
    var className = $(this).children(".mapClass").text();
	createMarker( name, company, lat, lng, desc, location, className );
});

function createMarker( name, company, lat, lng, desc, location, className ) {
	var img, shadowIcon;
	if (className === "2012") {
		img = img2012;
		shadowIcon = shadow2012;
	}
	else if (className === "2013") {
		img = img2013;
		shadowIcon = shadow2013;
	}
	else if (className === "2014") {
		img = img2014;
		shadowIcon = shadow2014;
	}
    var myLatLng = new google.maps.LatLng(lat, lng);
	var text = "<div style='overflow: hidden;'><div style='font-variant: small-caps; font-weight: bold;'>" + company + "</div>";
	text = text + "<div style='font-style: italic;'>" + desc + "</div>";
	text = text + "<div style='float: right; clear: both;'>" + name + "</div>";
	text = text + "<div style='float: right; clear: both;'>" + location + "</div></div>";
	var infowindow = new google.maps.InfoWindow({
		content: text,
		maxWidth: 400
	});  
	var marker = new google.maps.Marker({
			position: myLatLng,
			map: map,
			shadow: shadowIcon,
			icon: img,
			shape: shape,
			title: name,
			infoWindow: infowindow
	});
	google.maps.event.addListener(marker, 'click', function () { counter++; this.infoWindow.zIndex = counter; this.infoWindow.open(map,this);});
}

function bindPopUpWindow(number) {
	infowindow.open(map,brotherMarkers["marker" + number]);	
}
//use so people can get their actual coordinates
google.maps.event.addListener(map, 'dblclick', function(event) {
    console.log(event.latLng);
});

});		
/* Lat,Long

Nu Delta - 42.351474222525155, -71.08780793845654

2011
	Manny Corral
	Chuky Mbagwu
	Juan D. Diaz
	Nana Essilfie-Conduah
	Jesus Guardado
	Jonathan Blackwood
	Coco Agbeyibor
	Ronndre Price
	Chiedozie Okafor
	Jason Douglas
	
2012
	Phil Mercer
	Kwami Williams - 32.8303600, 34.9743390
	Kwadwo Nyarko
	Dimitri Porcelli
	Bruno Piazzarolo - 49.4264200, 7.7504200
	Zachary Ybarra - 41.7823216, -72.6120346


2013
	Mobolaji Williams - 46.2305222, 6.0537457
	Prosper Nyovanie
	Malcom Gilbert - 38.64392514695482,-121.16384625434875
	Cody Coleman
	Peter Lee
	Nahom Workie - 47.6739881, -122.1215120
	Saul Lopez - 41.3879170, 2.1699187
	Patrick Gichuiri

2014
	Christian Londono - 40.0660683,-105.2095065
	Angel Batista - 19.4270499, -99.1275711
	Christopher Kelly - 52.3880000, 9.7104900
	Christopher Davis - 43.7133981, 10.4264311
	Edward Valle - 42.3569070,-71.0956350
	Kwesi Phillips
	Jonathan Thomas
	Tobe Okoro
	Kojo Welbeck
	Sebastian Leon - 42.3617530,-71.0914190

https://maps.google.com/maps/geo?q=Callinstra%C3%9Fe+38,+30167+Hannover,+Germany&output=csv&sensor=false


*/
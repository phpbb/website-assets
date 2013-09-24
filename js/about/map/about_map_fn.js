//<![CDATA[

function load() {
	if (GBrowserIsCompatible()) {
		// Create the map and set the default options. 
		var map = new GMap2(document.getElementById("map"));
		map.addControl(new GLargeMapControl());
		map.setCenter(new GLatLng(27.0, -115.0), 2);
		map.setMapType( G_SATELLITE_MAP );
		
		globalMap = map; // So we can reference the map outside of this load function
		
		// Function to create a pin and its popup.
		function createMarker(point, icon, pintext) {
			var marker = new GMarker(point, icon);
			GEvent.addListener(marker, "click", function() {
				marker.openInfoWindowHtml(pintext);
			});
			return marker;
		}		
		
		// Grab all the user information from the dynamic XML file and loop through it.
		GDownloadUrl("data.php", function(data, responseCode) {
			var xml = GXml.parse(data);
			var markers = xml.documentElement.getElementsByTagName("marker");
			for (var i = 0; i < markers.length; i++) {
				// Generate the pin image and its proper color.
				icon = new GIcon();
				icon.image = "./pin.php?hex=" + markers[i].getAttribute("color");
				icon.iconSize = new GSize(8, 8);
				icon.iconAnchor = new GPoint(4, 4);
				icon.infoWindowAnchor = new GPoint(4, 4)
			
				// Assign coordinates to the pin.
			    var point = new GLatLng(parseFloat(markers[i].getAttribute("lat")),
			                            parseFloat(markers[i].getAttribute("lon")));
				
				// Compile all the user's information and format it for the pin popup.					
				pintext = 	"<table width='350' cellpadding='0' cellspacing='0' border='0' id='pinTextTable'>";
				pintext += 	"<tr><td width='100' nowrap='nowrap' valign='top' rowspan='2' class='imgTD'><img src='" + markers[i].getAttribute("picture") + "' width='" + markers[i].getAttribute("pic_width") + "px' height='" + markers[i].getAttribute("pic_height") + "px' /></td>";
				
				pintext +=	"<td valign='top' class='contentTD'>"
				pintext +=	"<div class='name' style='white-space: nowrap;'>";
				// Does the user have a full name?
				if (markers[i].getAttribute("fullname"))
				{
					pintext +=	markers[i].getAttribute("fullname") + " (" + markers[i].getAttribute("username") + ")";
				}
				// If not, just display the plain 'ole username.
				else 
				{
					pintext +=	markers[i].getAttribute("username");
				}
				pintext +=	"</div>";
				
				pintext +=	"<span style='font-weight: bold; font-size: 1.1em; color: #" + markers[i].getAttribute("color") + "'>" + markers[i].getAttribute("title") + "</span><br />";

				// Does the user have a location?
				if (markers[i].getAttribute("location"))
				{
					pintext +=	"from " + markers[i].getAttribute("location") + "<br /><br />";
				}
				else
				{
					pintext += "<br />";
				}
				
				// Does the user have a blurb?
				if (markers[i].getAttribute("blurb"))
				{
					pintext +=	markers[i].getAttribute("blurb") + "<br /><br />";
				}
				else
				{
					pintext += "<br />";
				}
				
				pintext +=	"<a href='http://www.phpbb.com/community/memberlist.php?mode=viewprofile&u=" + markers[i].getAttribute("user_id") + "'>phpBB.com Profile</a>";
				
				// Does the user have a website?
				if (markers[i].getAttribute("website")) {
					pintext += "&nbsp;&middot;&nbsp;<a href='" + markers[i].getAttribute("website") + "'>Personal Website</a>";
				}
				
				pintext += 	"</td></tr></table>";
				
				// Plot the pin on the map.
				map.addOverlay(createMarker(point, icon, pintext));				
			}
		});					
	}
}

// Move map functions -- ((lat, lon), zoom)
function moveMapWorld() {
	globalMap.setCenter(new GLatLng(27.0, -100.0), 2);	
}	
function moveMapNorthAmerica() {
	globalMap.setCenter(new GLatLng(40.0, -98.0), 3);
}
function moveMapSouthAmerica() {
	globalMap.setCenter(new GLatLng(-23.0, -65.0), 3);
}
function moveMapEurope() {
	globalMap.setCenter(new GLatLng(55.0, 20.0), 3);
}
function moveMapOceania() {
	globalMap.setCenter(new GLatLng(-15.0, 135.0), 3);
}
function moveMapAsia() {
	globalMap.setCenter(new GLatLng(30.0, 100.0), 3);
}

// Adjust map display functions
function setMapSatellite() {
	globalMap.setMapType( G_SATELLITE_MAP );	
}
function setMapStandard() {
	globalMap.setMapType( G_NORMAL_MAP );	
}
function setMapHybrid() {
	globalMap.setMapType( G_HYBRID_MAP );	
}

//]]>
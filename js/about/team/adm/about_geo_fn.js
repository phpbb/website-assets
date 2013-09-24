//<![CDATA[

var map = null;
var geocoder = null;
var marker = null;

function load(startLat, startLon) { 
  if (GBrowserIsCompatible()) {
    map = new GMap2(document.getElementById("map"));
    map.setCenter(new GLatLng(25, 0), 2);
	map.addControl(new GSmallMapControl());
    geocoder = new GClientGeocoder();

	showLatLon(startLat, startLon, 2);
  }
}

function showLatLon(lat, lon, zoomLevel) {
	
	marker = new GMarker(new GLatLng(lat, lon), {draggable: true}); 
	map.setCenter(new GLatLng(lat, lon), zoomLevel);
	
	GEvent.addListener(marker, "dragstart", function() {
	  map.closeInfoWindow();
	  });

	GEvent.addListener(marker, "dragend", function() {
	  marker.openInfoWindowHtml("<span style='font-size: 12px;'>Latitude: " + marker.getPoint().lat() + "<br />Longitude: " + marker.getPoint().lng() + "</span>");
	  document.forms['editUser'].lat.value = marker.getPoint().lat();
	  document.forms['editUser'].lon.value = marker.getPoint().lng();
	  });

	  map.clearOverlays();
      map.addOverlay(marker);
      marker.openInfoWindowHtml("<span style='font-size: 12px;'>Latitude: " + marker.getPoint().lat() + "<br />Longitude: " + marker.getPoint().lng() + "</span>");
	  document.forms['editUser'].lat.value = marker.getPoint().lat();
	  document.forms['editUser'].lon.value = marker.getPoint().lng();
}

function showAddress(address, zoomLevel) {
  if (geocoder) {
    geocoder.getLatLng(
      address,
      function(point) {
        if (!point) 
		{
          alert(address + " not found on map.");
        } 
		else 
		{
		  showLatLon(point.lat(), point.lng(), zoomLevel);
      	}
	  }
    );
  }
}
//]]>
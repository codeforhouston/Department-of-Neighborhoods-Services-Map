var graphics = null;
var map = null;
var dir = null;

function init() {

	self.focus();

	// Settings for map
	var mapOptions = {

		center: new google.maps.LatLng(29.7631, -95.3631),
		zoom: 8,
		disableDefaultUI: true,
		draggable: false,
		keyboardShortcuts: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		scrollwheel: false,
		disableDoubleClickZoom: true

	} // myOptions
 

	// Create map
	display = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

	var dir = new google.maps.DirectionsService();
	var directions = window.opener.graphics.getDirections().routes[0].legs[0];

	// Initialize directions graphics renderer
	var render_options = { draggable: true };
	graphics = new google.maps.DirectionsRenderer(render_options);

	google.maps.event.addListenerOnce(display, 'idle', function(){

		// Set up renderer
		graphics.setMap(display);
		graphics.setPanel(document.getElementById("directions"));


		// Parameters for route
		var request = {

			// Entered by user in a text field.
			origin: window.opener.document.getElementById("originAddress").value,
 				
			// Requested destination address.
			destination: window.opener.document.getElementById("destinationAddress").value,
 
			// Default Driving
			travelMode: window.opener.currentDirectionsMode,

			transitOptions: window.opener.getPTOptions()
   		};

		// Send request.  See Google Maps API for details on function route.
		dir.route(request, function(result, status){
 
			// TODO HANDLE OTHER STATUSES
			if(status == google.maps.DirectionsStatus.OK) {
				graphics.setDirections(result);
			}

		});

	});

}
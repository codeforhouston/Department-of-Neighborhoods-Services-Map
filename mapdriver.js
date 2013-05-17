// ************* GLOBAL VARIABLES ************* //

// -- Google Services -- //

/**
  * The map canvas that will be displayed.  This is the Google Maps base layer.
  **/
var map = null;

/**
  * Directions service object.  This object will make queries to the Google Directions
  * server on behalf of the user.
  **/
var dir = null;

/**
  * DirectionsRenderer object.  This will display visual and textual directions on the Map.
  **/
var graphics = null;

/**
  * Places Information Service.  This object will make queries to the Google Places server
  * on behalf of the user.
  **/
var placeService = null;

/**
  * Geocoder Service Object.  This object can be used to convert from LatLng objects to String
  * addresses, and vice versa.
  **/
var geo = null;

/**
  * Google bike layer.  Lacks the query functionality that the rest of the layers have, but useful nonetheless.
  **/
var bikeLayer = null;

// -- End Google Services -- //

// -- BookKeeping -- //

/**
  * Array of MapOverlays (servers) that hold layers of information.  Each layer can be
  * accessed individually through the underlying MapService object within each MapOverlay.
  **/
var servers = [];

/**
  * The number of MapServices currently loaded.  When all of them have loaded, the map becomes usable.
  **/
var serversLoaded = 0;

/**
  * The number of MapServices total.
  **/
var serversExpected = 6;

/**
  * An object literal containing all the currently visible layers.
  **/
var activeLayers = {};

/**
  * Memoization of features that were found through clicks/searches.
  * By caching this information, we limit the number of requests we make to the google servers for information.
  **/
var featuresFound = {};

/**
  * Number of features found so far.  This is used as an index for the featuresFound object, as
  * javascript objects cannot be used as a key in another object.
  **/
var featuresCount = 0;

/**
  * A list of fields for the feature selected in the dropdown menu in the search section.  This is used
  * because a javascript object cannot be used as a value for a select option, so we use the index as the
  * value instead which maps to the actual field here.
  **/
var __FIELDS = [];

/**
  * LatLng object holding the most recently entered location.  Used in the searchByField method to determine
  * where we should calculate distance from.
  **/
var myLocation = null;

/**
  * The current mode of transportation that we should provide directions by.
  **/
var currentDirectionsMode = google.maps.TravelMode.DRIVING;

// -- End BookKeeping -- //

// -- Visuals -- //

/**
  * A marker that is used to show the users location, as well as the origin point for directions.
  **/
var myLocationMarker = null;

/**
  * A marker that is used to show the end point for directions.
  **/
var destinationMarker = null;

/**
  * Visual options for highlighted features.
  **/
var hStyle = {
  fillColor: '#883333',
  fillOpacity: 0.35,
  strokeColor: '#FF0000',
  strokeWeight: 3,
  zIndex: 100,
  strokeOpacity: 1
};

/**
  * Overlay options for identify
  **/
var ovOptions = {

	polylineOptions: {
		strokeColor: '#FF0000',
		strokeWeight: 4
	},

	polygonOptions: {
		fillColor: '#FFFF99',
		fillOpacity: 0.5,
		strokeWeight: 2,
		strokeColor: '#FF0000'
	}
};

// -- End Visuals -- //

// -- Useful tools -- //

/**
  * Class used to communicate with active features.
  **/
var dispatcher = new Dispatcher();

/**
  * Class used for concurrency safety with clicks.  Could probably be used for other stuff as well.
  **/
var sync = null;

// -- End Useful tools -- //

// ************* END GLOBAL VARIABLES ************* //

/**
  * This function is called upon the page's loading.  It will initialize the map and tab components, check
  * for browser compatibility, confirm that the user agrees to the terms of use, handle the URL list, and initialize the
  * different google services.
  **/
function initialize() {

	//select Services tab by default
	selectServices();

	// Display the loading screen.  This is to keep people from clicking while the checkbox setup is still underway.
	document.getElementById("load_image").style.display = "block";

	// JQuery Initialization
	initializeJQueryComponents();

	// Browser detection
	if (!detectBrowser()) {
		document.getElementsByTagName('html')[0].innerHTML = '';
		return;
	}

	// Terms of use
	var agreement = confirm("This product is for informational purposes and may not have been prepared for or be suitable for legal, engineering, or surveying purposes. It does not represent an on-the-ground survey and represents only the approximate relative location of property boundaries.  By clicking OK/Yes, you acknowledge these limitations and agree not to hold the City of Houston responsible for any losses incurred from the use of this data.  Click Cancel/No to leave the page.");
	if (!agreement) {
		document.getElementsByTagName('html')[0].innerHTML = '';
		return;
	}
 
	// Settings for map
	var myOptions = {

		center: new google.maps.LatLng(29.7631, -95.3631),
		zoom: 12,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		mapTypeControl: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position: google.maps.ControlPosition.TOP_RIGHT
		},
		scaleControl: true,
		scaleControlOptions: {
			position: google.maps.ControlPosition.RIGHT_BOTTOM
		},
		panControlOptions: {
			position: google.maps.ControlPosition.RIGHT_TOP
		},
		zoomControlOptions: {
			style: google.maps.ZoomControlStyle.DEFAULT,
			position: google.maps.ControlPosition.RIGHT_TOP
		}
	} // myOptions
 

	// Create map
	map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

	// Handle layers
	for (var t = 0; t < tabs.length; t++) {	
		for (var i = 0; i < tabs[t].length; i++) {
			handleURL(t, i);
		}
	}

	// Initialize place service
	placeService = new google.maps.places.PlacesService(map);


	// Initialize directions service
	dir = new google.maps.DirectionsService();


	// Initialize directions graphics renderer
	var render_options = {
		'draggable':true,
		'suppressMarkers': true
	};
	graphics = new google.maps.DirectionsRenderer(render_options);
	graphics.setMap(map);
	graphics.setPanel(document.getElementById("directions"));


	// Initialize geocoder
	geo = new google.maps.Geocoder();


	// Initialize map click listener
	google.maps.event.addListener(map, 'click', identify_click);
	
	// Handle Zoom Changes
	google.maps.event.addListener(map, 'zoom_changed', function(){
		for (var i = 0; i < servers.length; i++)
				servers[i].setMap(null);
		google.maps.event.addListenerOnce(map, 'idle', function(){
			//alert("HERY");
			for (var i = 0; i < servers.length; i++)
				servers[i].setMap(map);
		});
	});
	
	// Handle map drags
	google.maps.event.addListener(map, 'dragstart', function(){
		for (var i = 0; i < servers.length; i++)
			servers[i].setMap(null);
	});
	
	google.maps.event.addListener(map, 'dragend', function(){
		for (var i = 0; i < servers.length; i++)
			servers[i].setMap(map);
	});

	initializeBikeLayer();

	// If you end up having partner data, uncomment this line.
	//initializeKMLLayers();

} // initialize()


/**
  * This function will detect the browser version the user is running.
  * If the browser is incompatible, the user will be notified.  Similarly,
  * if the browser is less than optimal, the user will also be notified.
  **/
function detectBrowser() {

	var Browser = {
		type: function() {
			if (navigator.appVersion.indexOf("MSIE") != -1) {
				return "IE";
			}
			if (navigator.appVersion.indexOf("Chrome") != -1) {
				return "Chrome";
			}
			if (navigator.userAgent.indexOf("Firefox") != -1) {
				return "Firefox";
			}
		},

		IEVersion: function() {
			return parseFloat(navigator.appVersion.split("MSIE")[1]);
		}
	}

	var type = Browser.type();

	if (type == 'IE') {

		var version = Browser.IEVersion();

		if (version <= 7) {
			alert("Certain parts of this application will not work for users of internet explorer 7 and earlier.  Please upgrade your version of Internet Explorer.");
			return false;
		}
		else if (version = 8) {
			alert("Parts of this application will run slowly for users of internet explorer 8.  For best results, ugrade to the most recent release.");
			return true;
		}

	}

	//else if ((type != 'Chrome') && (type != 'Firefox')) alert("You are using an unfamiliar browser.  Parts of this application may not function as intended.  For full use, we recommend using either Google Chrome or Firefox.");

	return true;
}


/**
  * Function to handle the details for the google bikes layer.  Because this is google's information,
  * we can't put it in our own mapservices and have to handle it separately.
  **/
function initializeBikeLayer(){

	bikeLayer = new google.maps.BicyclingLayer();

	var img = document.createElement('img');
	img.src = './bikelegend.bmp';

	var lbl = document.createElement('label');
	lbl.appendChild(document.createTextNode('Bicycling Routes'));
	lbl.className = 'layer_label';

	var legend = document.createElement('div');
	legend.className = 'legend_box';
	legend.appendChild(lbl);
	legend.appendChild(document.createElement('br'));
	legend.appendChild(img);

	var cb = document.createElement('input');
	cb.type = 'checkbox';
	cb.onclick = function(){
		if (cb.checked) {
			_gaq.push(['_trackEvent', 'Bicycling Routes', 'View']);
			bikeLayer.setMap(map);
			document.getElementById("tabs-2").appendChild(legend);
		}
		else {
			bikeLayer.setMap(null);
			document.getElementById("tabs-2").removeChild(legend);
		}
	}

	var label = document.createElement('label');
	label.appendChild(cb);
	label.appendChild(document.createTextNode("Bicycling Routes"));
	label.className = 'checkbox_label';

	var metaInfo = document.createElement('div');
	metaInfo.innerHTML = "Sidewalks and paths designed specifically for the use of bicylcles.";
	metaInfo.appendChild(document.createElement('br'));
	metaInfo.style.display = 'none';
	metaInfo.className = 'meta_info';

	var btn = document.createElement('button');
	btn.innerHTML = '?';
	btn.onclick = function() {
		if (btn.innerHTML == '?') {
			metaInfo.style.display = 'block';
			btn.innerHTML = '-';
		}
		else {
			metaInfo.style.display = 'none';
			btn.innerHTML = '?';
		}
	}
	btn.className = "info_button";

	document.getElementById("Transportation").appendChild(btn);
	document.getElementById("Transportation").appendChild(label);
	document.getElementById("Transportation").appendChild(document.createElement('br'));
	document.getElementById("Transportation").appendChild(metaInfo);
}


/**
  * Initializes the tabbed interface of the page.  The body element of the html is
  * set to 'none' by default, the page will appear in disorder until this function
  * is complete.  As such, the end of this function sets the body display to 'block',
  * making the page visible.
  **/
function initializeJQueryComponents() {

	// Services/Locations/Legend tabs
	$( "#tabs" ).tabs();
	

	// Hide all Tabs that we don't want open at the beginning
	// Do not edit above here
	// BLOCK 1
	$("#Transportation").hide();
	$("#Government_Boundaries").hide();
	$("#Public_Safety").hide();
	$("#Public_Facilities").hide();
	$("#Health").hide();
	$("#Education_Arts_Recreation").hide();

	// Click function for tabs
	$(".msg_head").click(function(){

		// BLOCK 2
		$(this).next("#Transportation").slideToggle(150);
		$(this).next("#Government_Boundaries").slideToggle(150);
		$(this).next("#Public_Safety").slideToggle(150);
		$(this).next("#Public_Facilities").slideToggle(150);
		$(this).next("#Health").slideToggle(150);
		$(this).next("#Education_Arts_Recreation").slideToggle(150);
		$(this).next("#directionsMain").slideToggle(150);
		$(this).next("#query").slideToggle(150);


	});

	// Do not edit below here

	// Slide function for slider
	$("#slider").slider({
	slide: function(event, ui) {
		
		opacity_val = 100 - ui.value;
		opacity_val = opacity_val/100;
		for(var i = 0; i < servers.length; i++)
			servers[i].setOpacity(opacity_val);
		}
        });

	// Show page
	document.getElementsByTagName('body')[0].style.display = "block";

}



/**
  * Function to handle a url for a server that will be made into a MapOverlay.
  * @param tab_index - Index representing which tab the MapOverlay generated from the provided URL will be placed in.
  * @param url_index - Index for finding the specifie URL within the array of URLs of this category
  **/
function handleURL(tab_index, url_index){
 
	// Create the MapOverlay and bind it to the map canvas.  Store in the array.
	var url = tabs[tab_index][url_index];
	var dynamap = new gmaps.ags.MapOverlay(url);
	dynamap.setMap(map);
	servers[servers.length] = dynamap;
 
	// The following will trigger once the underlying service is finished loading.  Doing it before
	// results in unspecified behavior.  See google maps api for details on addListenerOnce.
	google.maps.event.addListenerOnce(dynamap.getMapService(), 'load', function(){

		var service = dynamap.getMapService();

		// Retrieve the legend information
		$.ajax({
  		url: tabs[tab_index][url_index] + '/legend?f=json&pretty=true.js',
  		async: false,
  		dataType: 'jsonp',
  		success: function (legend) {

				// Set up each layer
				for (var i = 0; i < service.layers.length; i++){

					// Default visibility set to false
					service.layers[i].visible = false;
					dynamap.refresh();
					handleLayer(i, dynamap, tab_index, url_index, legend);

				}

				// Remove loading screen if this is the last one
				serversLoaded++;
				if (serversLoaded == serversExpected) {
					document.getElementById("load_image").style.display = "none";
				}
			}
		});
	});
 
}  // handleURL


/**
  * Function to handle a specific layer within
  * a server.  Dynamically creates the checkbox
  * and functionality of clicking it.
  * @param index - The index of the layer being processed within the MapService's array of layers.
  * @param dynamap - The server associated with the layer being processed.
  * @param tab_index - Index representing which tab the underlying service belongs to.
  * @param url_index - Index of the url within the URL array that this is held in.
  * @param legend - JSON object representing information about the legend for this layer.
  **/
function handleLayer(index, dynamap, tab_index, url_index, legend){  
	
	// Get the MapService for this layer
	var service = dynamap.getMapService();
	var layer = service.layers[index];


	// Dynamically create a checkbox.  This checkbox will toggle the visibility of this layer.
	var checkbox = document.createElement('input');
	var legendItem = null;
	var opt = null;
	var closest = null;
	checkbox.type = 'checkbox';
	checkbox.id = 'cb ' + layer.name;
	checkbox.onclick = function(){

		// Turned on
		if (checkbox.checked === true) {

			// Visibility
			layer.visible = true;

			// Add to active layers
			activeLayers[layer.name] = layer;

			// Query Option
			opt = document.createElement('option');
			opt.innerHTML = layer.name;
			opt.value = layer.name;

			// Add option			
			document.getElementById("dropDownLayer").appendChild(opt);
			document.getElementById("dropDownLayer").selectedIndex = document.getElementById("dropDownLayer").options.length - 1;
			changeLayer();

			// Legend
			legendItem = getLegend(tab_index, url_index, index, legend, service);
			
			// Analytics on layer views
			_gaq.push(['_trackEvent', layer.name + ' views', 'Checkbox_checked']);

		}

		// Turned off
		else {

			// Visibility
			layer.visible = false;

			// Query options
			dropdown = document.getElementById("dropDownLayer");
			dropdown.remove(opt.index);
			delete activeLayers[layer.name];
			changeLayer();
			if (dropdown.options.length > 2) {
				dropdown.selectedIndex = dropdown.options.length - 1;
			}


			// Legend
			if(legendItem)
				document.getElementById("tabs-2").removeChild(legendItem);

			// Hide Lingering Features
			dispatcher.dispatch(function(feature) {
				feature.hide(layer.name);
			});
			dispatcher.clear(layer.name);
		}

		// Refresh layer so changes are rendered
		dynamap.refresh();

	}; // end of onclick function


	// Label for the checkbox.  It's just the name of the associated layer.  
	var label = document.createElement('label');
	label.className = 'checkbox_label';
	label.appendChild(checkbox);
	label.appendChild(document.createTextNode(layer.name));
	
	// Info Box
	var metaInfo = document.createElement('div');
	metaInfo.className = 'meta_info';
	metaInfo.style.display = 'none';
	metaInfo.innerHTML = metadata[layer.name];
	metaInfo.appendChild(document.createElement('br'));

	// Info button
	var btn = document.createElement('button');
	btn.innerHTML = "?";
	btn.onclick = function(){
		if (btn.innerHTML == '?') {
			metaInfo.style.display = 'block';
			btn.innerHTML = '-';
			//metaInfo.appendChild(document.createElement
		}
		else {
			metaInfo.style.display = 'none';
			btn.innerHTML = '?';
		}
	}
	btn.className = 'info_button';
	
	// Find which tab this layer belongs in.
	var ID = tabID(tab_index);

	// Place the checkbox and the label within the appropriate tab
	document.getElementById(ID).appendChild(btn);
	document.getElementById(ID).appendChild(label);
	document.getElementById(ID).appendChild(document.createElement('br'));
	document.getElementById(ID).appendChild(metaInfo);

} // handleLayer


/**
  * Function to get the string ID for a tab.
  * @param index - The index of this tab within the tabs array.
  **/
function tabID(index) {

	if (index == 0) return "Transportation";
	if (index == 1) return "Government_Boundaries";
	if (index == 2) return "Public_Safety";
	if (index == 3) return "Public_Facilities";
	if (index == 4) return "Health";
	if (index == 5) return "Education_Arts_Recreation";

}
 

/**
  * Function that takes a text value from either appropriate input box, and sets both boxes
  * To display the same text.  Also geocodes the address to a LatLng object and stores it.
  * @param text - The text entered by the user to be geocoded.
  **/
function inputAddress(text){

	// Store location value, update the other text box
	myLocation = text;
	document.getElementById("originAddress").value = myLocation;
	document.getElementById("address").value = myLocation;

	geo.geocode({
		'address':myLocation
		}, function(results, status){
			if (status == "OK"){
				if (!myLocationMarker){
					myLocationMarker = new StyledMarker({
								styleIcon:new StyledIcon(StyledIconTypes.MARKER,
								{text:"A"}),
								map:map});
				}
				myLocationMarker.setMap(map);
				myLocation = getFeatureCoordinates(results[0], 'address');
				myLocationMarker.setPosition(myLocation);
				map.panTo(myLocation);
			}
			else
				myLocationMarker = null;
		});
}


/**
  * Swaps the addresses in the A and B boxes in the directions tab.
  * If both boxes have text, automatically submits a directions request for the user.
  **/
function swapAddresses() {

	// Get old address values
	var fromAddress = document.getElementById('originAddress').value;
	var toAddress = document.getElementById('destinationAddress').value;

	// Swap them
	document.getElementById('originAddress').value = toAddress;
	document.getElementById('destinationAddress').value = fromAddress;

	// Get directions if appropriate
	if (fromAddress != '' && toAddress != '') {
		clearDirections();
		getDirections(currentDirectionsMode);
	}
}


/**
  * Function to find the euclidian distance between two LatLng points.
  * @param p1, p2 - LatLng points that we are calculating the distance between.
  **/
function distance(p1, p2){

	// Error safety
	if (!p2 || !p1) return null;

	x_dist = p1.lat() - p2.lat();
	y_dist = p1.lng() - p2.lng();

	return Math.sqrt(Math.pow(x_dist, 2) + Math.pow(y_dist, 2));
}


/**
  * Given a HoustonFeature, extracts the GIS information from the server and
  * formats this data into a divider which can then be shown/hidden by using
  * the methods of HoustonFeature.
  * @param feature_info - A HoustonFeature object
  **/
function extractGIS(feature_info){

	// Get the actual feature
	var feature = feature_info.feature;

	// Create the divider
	var toReturn = document.createElement('div');
	toReturn.className = "sidebar_box";

	// Title for the divider
	var div = document.createElement('div');
	div.className = 'gis_info_title';
	var layer_name = document.createTextNode(feature_info.layer.name);
	div.appendChild(layer_name);
	toReturn.appendChild(div);
	toReturn.appendChild(document.createElement('br'));	

	// Add the rest of the information
	for (key in feature.attributes){

		// Get the value
		value = feature.attributes[key];

		// Filter dataless entries
		if ((value) && (value != '?') && (value != '') && (value != ' ') && (value != 'null')) {

			// Format links, etc
			if (value == 'Y') value = 'Yes';
			if (value == 'N') value = 'No';
			if(key == 'Website' || key == 'link'){
				var lbl = document.createElement('label');
				lbl.appendChild(document.createTextNode(key + ": "));
				lbl.className = "gis_info_key";
				toReturn.appendChild(lbl);
				var link = document.createElement('a');
				link.href = value;
				link.innerHTML = 'Click Here';
				link.target="_blank";
				toReturn.appendChild(link);
			}
			else {
				var keyNode = document.createElement('label');
				keyNode.appendChild(document.createTextNode(key + ': '));
				var valueNode = document.createElement('label');
				valueNode.appendChild(document.createTextNode(value));
				keyNode.className = "gis_info_key";
				valueNode.className = "gis_info_value";
				toReturn.appendChild(keyNode);
				toReturn.appendChild(valueNode);
			}
			toReturn.appendChild(document.createElement('br'));
		}
	}

	return toReturn;
}


/**
  * Function to get the coordinates from an esri feature
  * @param feature - The feature we want coordinates from
  * @param type - The type of geometry of this feature (either 'esriGeometryPoint', 'esriGeometryPolygon', 'esriGeometryPolyLine', or 'address')
  **/
function getFeatureCoordinates (feature, type) {

	// If it is a point, we can just get the latlng values
	if (type == 'esriGeometryPoint') {

		var g = feature.geometry[0].position;

		return new google.maps.LatLng(g.lat(), g.lng());
	}

	// If it is a polygon, we have to calculate the center
	if (type == 'esriGeometryPolygon') {
		return getPolyCenter(feature.geometry[0]);
	}

	// Lines have undefined position
	if (type == 'esriGeometryPolyline') {
		return null;
	}

	// Things returned by address only have one geometry, not an array of geometry.  This case catches that.
	if (type == 'address') {

		var g = feature.geometry.location;

		return new google.maps.LatLng(g.lat(), g.lng());
	}

	// Debug information, this should never actually happen
	alert("Undefined shape type");
	return null;
}


/**
  * Formats the legend for a layer when its checkbox is clicked
  * @param tab_index - Index for the tab to which this layer belongs
  * @param url_index - Index for the url of this layer's MapService
  * @param layer_index - Index of the layer we use to get the image
  * @param response - The JSON object representing the legend information
  * @param service - The mapservice for this layer
  *
  *
  * Note that EVERYTHING will screw up if there are any layer groupings or sublayers within the mapservice.
  * It messes up the way the indices work because it will take up a space but not actually have an image
  * associated with it.  We have taken measures to make the program not crash if this happens, but the last
  * few layers in the service will not be able to display legend information.
  **/
function getLegend(tab_index, url_index, layer_index, response, service) {

	// Lame error handling
	if(layer_index >= response.layers.length){
		alert("Seriously, don't use sublayers :(");
		return null;
	}

	// Table that the legend will be added to
   	var t = document.createElement('table');

	// This will make it suck less if you use sublayers.  But seriously, don't.
	var new_layer_index = layer_index;
	while (layer_index < response.layers[new_layer_index]["layerId"] && layer_index > 0){
		new_layer_index -= 1;
	}
	if (layer_index != response.layers[new_layer_index]["layerId"])
		return null;

	// Set up the legend table
   	var legend = response.layers[new_layer_index]["legend"];
    	for (var i = 0; i < legend.length; i++){
         	var label = legend[i].label;
		if (label == '')
			label = response.layers[new_layer_index]["layerName"];
         	var imageurl = tabs[tab_index][url_index] + '/' + layer_index + '/images/' + legend[i].url;
    		var img = document.createElement('img');
    		img.src = imageurl;
    		t.appendChild(img);
    		t.appendChild(document.createTextNode(label));
    		t.appendChild(document.createElement('br'));
	}
	
	// Divider for this legend
	var divider = document.createElement('div');
	divider.className = "legend_box";

	// Label for this legend
	var label = document.createElement('label');
	label.className = "layer_label";
	label.appendChild(document.createTextNode(service.layers[layer_index].name));

	// Add elements to divider
	divider.appendChild(label);
	divider.appendChild(document.createElement('br'));
	divider.appendChild(t);

	// Add divider to Legend tab
	var legendBox = document.getElementById('tabs-2');
	legendBox.appendChild(divider);

	// Return an instance of the divider.  This is so it can be removed when the layer is turned off.
	return divider;
}


/**
  * Returns an array containing all MapServices with at least one active layer.
  * This is used within identify_click.  Only visible layers are clickable, so for
  * the sake of efficiency, we only run identify on the services that are active.
  **/
function getActiveServices(){

	var toReturn = new Array();

	// Loop through servers
	for(var i = 0; i < servers.length; i++){

		// Get MapService object for that server
		var svc = servers[i].getMapService();

		// If it has at least one active layer, add it to the return array.
		if(svc.getVisibleLayerIds()[0] != null)
			toReturn[toReturn.length] = svc;
	}

	return toReturn;
}


/**
  * Click event handler for the map.  It will run an identify operation on
  * each active MapService to look for the clicked feature (only visible features
  * can be clicked).
  * @param evt - The click event being handled.
  **/
function identify_click(evt) {

	// Reset the map.  Features with the persistClick field set to true will not be unhighlighted or have their
	// GIS information removed.
	dispatcher.dispatch(function(observer) {
		observer.hide('clicked');
	});
	dispatcher.clear('clicked');

	// Get the MapServices with at least one visible Layer.  These are the only Services we are interested in searching.
	var activeServices = getActiveServices();	

	// This will handle concurrency issues related to running several identify operations at once (one for each active service)
	// See the readme for more details on ClickSynchronizer
	sync = new ClickSynchronizer(activeServices.length);

	// Handle each service.
	for(var i = 0; i < activeServices.length; i++){
		handleService(activeServices[i], evt);
	}

} // identify_click


/**
  * This function will run an identify operation on the MapService provided.
  * This is used within identify_click.  It is assumed that this MapService has
  * at least one visible layer.  If the clicked feature was within this MapService,
  * that feature will be processed in a separate function.
  * @param svc - A MapService with at least one visible layer.
  * @param evt - The click event.
  **/
function handleService(svc, evt){

	// Get the list of ID's for visible layers within this MapService.
	var ids = svc.getVisibleLayerIds();
	
	// Run an identify operation to find what was clicked
	svc.identify({
	'returnGeometry': true,
	'geometry': evt.latLng,
	'tolerance': 10,
	'layerIds': ids,
	'layerOption': 'all',
	'bounds': map.getBounds(),
	'width': map.getDiv().offsetWidth,
	'height': map.getDiv().offsetHeight,
	'overlayOptions': ovOptions
	}, function(identifyResults, err) {

		if (err) {
			alert("Error in identify.  If you try again your request may work."); // TODO MAKE A MORE ELEGANT ERROR CASE
			return null;
		}

		var features = [];
		
		// Create ClickedFeatures and add to dispatcher
		for(var j = 0; j < identifyResults.results.length; j++) {

			// See if we have found this feature before
			var found = featureSearch(identifyResults.results[j].feature, svc.layers[identifyResults.results[j].layerId].geometryType);

			// If we have, just run the click behavior and add it to the process array.
			if (found) {
				found.click();
				features[features.length] = found;
			}

			// Otherwise make a new HoustonFeature
			else {

				// Replace field names with aliases
				fixFields(identifyResults.results[j].feature);

				// Create HoustonFeature
				var newFeature = new HoustonFeature(identifyResults.results[j].feature, svc.layers[identifyResults.results[j].layerId]);

				// Click Behavior
				newFeature.click();

				// Cache this feature
				featuresFound[featuresCount] = newFeature;
				featuresCount++;

				// Add to process array
				features[features.length] = newFeature;
			}
		}

		// Send the features found to the ClickSynchronizer to deal with concurrenc issues
		sync.alert(features);

	}); // identify
}


/**
  * Auxillary function to find the center point of a polygon shape.
  * @param poly - The polygon feature to find the center of.
  **/
function getPolyCenter(poly) {
	var paths, path, latlng;
	var lat = 0;
	var lng = 0;
	var c = 0;
	paths = poly.getPaths();

	for (var j = 0, jc = paths.getLength(); j < jc; j++) {
		path = paths.getAt(j);
		for (var k = 0, kc = path.getLength(); k < kc; k++) {
			latlng = path.getAt(k);
			lat += latlng.lat();
			lng += latlng.lng();
			c++;
		}
	}

	if (c > 0) {
		return new google.maps.LatLng(lat / c, lng / c);
	}

	return null;
}


/**
  * Function that formats the information received from a google information request into a divider for the map popup.
  * @param detailResults - Reults from the google information request
  * @param popupDiv - Divider to display in the popup.
  **/
function formatPopup(detailResults, popupDiv){

	// Name
	var placeName = detailResults["name"];

	// Phone Number
	var placeNumber = detailResults["formatted_phone_number"];

	// Website
	var placeWebsiteUrl = detailResults.website;
	var link = document.createElement('a');
	link.href = placeWebsiteUrl;
	link.innerHTML = 'Official Website';
	link.target="_blank";

	// Rating
	placeRating = detailResults.rating;

	// Google+
	placeGPlusUrl = detailResults.url;
	var glink = document.createElement('a');
	glink.href = placeGPlusUrl;
	glink.innerHTML = "More information";
	glink.target="_blank";


	// Add information to popup
	if (placeNumber) {
		popupDiv.appendChild(document.createTextNode('Phone Number: ' + placeNumber));
		popupDiv.appendChild(document.createElement('br'));	
	}
	if (placeWebsiteUrl) {
		popupDiv.appendChild(link);
		popupDiv.appendChild(document.createElement('br'));
	}
	if (placeRating) {
		popupDiv.appendChild(document.createTextNode("Rating: "));
		popupDiv.appendChild(document.createTextNode(placeRating));
		popupDiv.appendChild(document.createElement('br'));
	}
	if (placeGPlusUrl) {
		popupDiv.appendChild(glink);
		popupDiv.appendChild(document.createElement('br'));
	}
	

}


/**
  * Callback function for our use of GeoCode.
  * It will run a search on the returned address and attempt to query the places database
  * for details, an display them on the map.
  * @param geoResults - The results of the reverse-geocode operation.
  * @param status - Status for the reverse-geocode (OK, ERROR, etc).
  * @param address - Coordinates from which to search for places.
  **/
function getGoogleInfo(featureInfo) {

	// Options to filter the search.  It is still imperfect, but we have had the best results using the layer name
	// as a keyword and the feature name as a specific search option.
	var search_opts = {
		'location' : featureInfo.coordinates,
		'keyword' : featureInfo.layer.name,
		'name' : featureInfo.feature.attributes["Name"],
		'radius' : 1000,
		'rankby' : 'distance'
	};

	// Title for the popup content
	featureInfo.googleInfo.className = "info_window_box";
	featureInfo.googleInfo.appendChild(document.createTextNode('Name: ' + featureInfo.feature.attributes["Name"]));
	featureInfo.googleInfo.appendChild(document.createElement('br'));

	// Perform search operation
	placeService.search(search_opts, function(searchResults, searchStatus){

		if (searchStatus == "OK"){

			placeService.getDetails({ 'reference':searchResults[0].reference }, function(detailResults, detailStatus){

				if(detailStatus == 'OK') {

					// Add Google Info
					formatPopup(detailResults, featureInfo.googleInfo);

				}

				// Add directions button and set the popups position
				addDirectionsButton(featureInfo.coordinates, featureInfo.googleInfo);
				featureInfo.popup.setPosition(featureInfo.coordinates);
				featureInfo.popup.setContent(featureInfo.googleInfo);
			});
		}
		else{

			// Error case
			var oops = "No Information Found on Place";
			featureInfo.googleInfo.appendChild(document.createTextNode(oops));
			featureInfo.googleInfo.appendChild(document.createElement('br'));
			addDirectionsButton(featureInfo.coordinates, featureInfo.googleInfo);
			featureInfo.popup.setPosition(featureInfo.coordinates);
			featureInfo.popup.setContent(featureInfo.googleInfo);

		}
	});

}


/**
  * Function to add directions to a divider.
  * @param featureCoordinates - The Coordinates of the feature that the button generated will give directions to.
  * @param popupDiv - The divider that the button will be added to.
  **/
function addDirectionsButton(featureCoordinates, popupDiv){

	// Create the button to get directions and set the click handler.
	var getDirectionsButton = document.createElement('input');
	getDirectionsButton.type = 'button';
	getDirectionsButton.value = 'Get Directions To Here';
	getDirectionsButton.className = "button_new";
	getDirectionsButton.id = "smallButton";
	getDirectionsButton.onclick = function(){
		directionsSetup(featureCoordinates);
	};

	popupDiv.appendChild(getDirectionsButton);

}


/**
  * Function that is called when the 'Get Directions To Here!' button is clicked.
  * @param to - The coordinates to which directions should be provided.
  **/
function directionsSetup(to) {

	geo.geocode({'location':to}, function(results, status) {

		if (status == 'OK') {

			// Geocode the address and put this in the destination address box
			document.getElementById("destinationAddress").value = results[0].formatted_address;
			getDirections(currentDirectionsMode);

		}

	});	
}


/**
  * Function that is called when public transit is selected as the directions mode, or when
  * another mode is selected isntead of transit setup
  * @param flag - True if transit options are to be displayed, false if they are to be removed.
  **/
function transitSetup(flag) {

	if (flag) {

		// Show Transit Options Divider
		document.getElementById('transitOptions').style.display = 'block';

		// Get Current Date
		var todaysDate = new Date();
		var currentHour = todaysDate.getHours();
		var currentMinute = todaysDate.getMinutes();
		currentMinute = (Math.ceil(currentMinute/15)) * 15;

		// Construct a string for the current time
		var currentTimeString = '';
		if (currentHour > 12) {
			currentTimeString += (currentHour - 12) + ":" + currentMinute + ' ' + 'pm';
		}
		else {
			currentTimeString += currentHour + ":" + currentMinute + ' ' + 'am';
		}

		var currentTimeOption = null;
		
		// Change directions mode
		currentDirectionsMode = google.maps.TravelMode.TRANSIT;

		// Set up displays
		if (document.getElementById('transitTime').options.length == 0) {

			// Fill in the options for time using a loop
			for (var i = 0; i < 96; i++) {

				// Calculate minutes/hours/am/pm
				var minutes = (i % 4) * 15;
				var hours = Math.floor(i/4);
				var ampm = null;

				// Show standard time
				if (hours >= 12) {
					hours -= 12;
					ampm = 'pm';
				}
				else {
					ampm = 'am';
				}

				if (hours == 0) hours = 12;

				if (minutes == 0) minutes = '00';

				var timeString = '' + hours + ':' + minutes + ' ' + ampm;
				var toption = document.createElement('option');
				toption.value = timeString;
				toption.innerHTML = timeString;

				document.getElementById('transitTime').add(toption);

				// Set the selected time to be the time closest to now
				if (timeString == currentTimeString) document.getElementById('transitTime').selectedIndex = i;
			
			}
		}

		// Highlight PT button
		var btn = document.getElementById('PTDirections');
		btn.style.border = '2px solid black';

		// Unlight others
		document.getElementById('drivingDirections').style.border = 'none';
		document.getElementById('walkingDirections').style.border = 'none'; 
		
	}

	else {
		// Remove PT options otherwise
		document.getElementById('transitOptions').style.display = 'none';
	}
}


/**
  * Function called when a directions request is made using the public transit mode.
  * Returns the TransitOptions appropriate for what the user has selected.
  **/
function getPTOptions() {

	// Get the mode (Now, Depart, Arrive)
	var modedd = document.getElementById('transitMode');
	var selectedMode = modedd.options[modedd.selectedIndex].value;

	// Get the requested Date
	var dateField = document.getElementById('transitDate');
	var timedd = document.getElementById('transitTime');

	// If it's now, just return the current date as the departure time
	if (selectedMode == 'Leave Now') {
		return { departureTime: new Date() };
	}

	else {

		// Get the date string, and get Month/Day/Year
		var dateString = dateField.value;
		var dateArray = dateString.split('/');

		if (dateArray.length != 3) {
			alert("Please enter a date: MM/DD/YYYY.");
			return null;
		}

		// Parse them to numbers
		var y = parseInt(dateArray[2], 10);
		var m = parseInt(dateArray[0], 10) - 1;
		var d = parseInt(dateArray[1], 10);

		// Check if they even entered numbers
		if (isNaN(m) || isNaN(y) || isNaN(d)) {
			alert("Please enter a properly formatted date, only numbers, in the form of MM/DD/YY");
			return null;
		}

		// Check if it is a proper date
		if (m < 1 || m > 12 || d < 1 || d > 31) {
			alert("Make sure your date is properly formatted as MM/DD/YYYY");
			return null;
		}

		selectedTime = timedd.value;
		var timeArray = selectedTime.split(':');

		var minute = parseInt(timeArray[1].substring(0, 2), 10);
		var hr = parseInt(timeArray[0], 10);
		if (hr <= 12) hr += 12;

		var date = new Date(y, m, d, hr, minute);
		if (date == 'Invalid Date') {
			alert("Please enter a date: MM/DD/YYYY");
			return null;
		}

		if (selectedMode == 'Arrive At') return { arrivalTime: date };
		else return { departureTime: date };
	}
}


/**
  * Enables/disables appropriate dropdown lists when the 'Leave Now', 'Depart At', or 'Arrive At' is selected for the transit mode.
  **/
function changeTransitMode() {

	var modedd = document.getElementById('transitMode');
	var dateField = document.getElementById('transitDate');
	var timedd = document.getElementById('transitTime');

	if (modedd.options[modedd.selectedIndex].value == 'Leave Now') {
		dateField.disabled = true;
		timedd.disabled = true;		
	}

	else {
		dateField.disabled = false;
		timedd.disabled = false;
	}

}


/**
  * Function called when the mode of transportation is changed.
  * @param mode - The new mode of transportation.
  **/
function changeDirectionsMode(mode) {

	// Set current mode
	currentDirectionsMode = mode;

	// Get to/from addresses
	var from = document.getElementById("originAddress").value;
	var to = document.getElementById("destinationAddress").value;

	// Update button highlights
	if (mode == google.maps.TravelMode.DRIVING) {
		document.getElementById('drivingDirections').style.border = '2px solid black';	
		document.getElementById('walkingDirections').style.border = 'none';
		document.getElementById('PTDirections').style.border = 'none';
		document.getElementById('transitOptions').style.display = 'none';
	}
	else if (mode == google.maps.TravelMode.WALKING) {
		document.getElementById('drivingDirections').style.border = 'none';
		document.getElementById('walkingDirections').style.border = '2px solid black';
		document.getElementById('PTDirections').style.border = 'none';
		document.getElementById('transitOptions').style.display = 'none';
	}

	// Give directions if appropriate
	if (from != '' && to != '')
		getDirections(mode);
}


/**
  * Requests directions from the google maps server.
  * @param mode - The mode of transportation to be used.
  **/
function getDirections(mode) {

	// Get to/from addresses
	var from = document.getElementById("originAddress").value;
	var to = document.getElementById("destinationAddress").value;

	// Lame error checking
	if (from == '' || to == '')
		alert("Please type a location in the address bar on the left.");

	else{

		currentDirectionsMode = mode;
		inputAddress(from);

		// Get public transportation options
		var ptoptions = null;
		if (mode == google.maps.TravelMode.TRANSIT) {
			ptoptions = getPTOptions();
			if (!ptoptions) return null;
		}

		else {
			transitSetup(false);
		}

		// Format request
		var request = {

			// Entered by user in a text field.
			origin: from,
 		
		
			// Requested destination address.
			destination: to,
 
			// *** This will probably change *** //
			travelMode: mode,

			transitOptions: ptoptions
   		};

		// Send request.  See Google Maps API for details on function route.
		dir.route(request, function(result, status){
 
			if(status == google.maps.DirectionsStatus.OK){

				// Create destination marker if necessary
				if (!destinationMarker) {
					destinationMarker = new StyledMarker({
								styleIcon:new StyledIcon(StyledIconTypes.MARKER,
								{text:"B"}),
								map:map});
				}
				destinationMarker.setMap(map);
				destinationMarker.setPosition(result.routes[0].legs[0].end_location);

				// Render directions
				graphics.setDirections(result);
				graphics.setMap(map);
				graphics.setPanel(document.getElementById('directions'));

				// Display print/clear options
				document.getElementById('printAndClear').style.display = 'block';
			}

			// Alert if nothing was found
			else if (status == google.maps.DirectionsStatus.ZERO_RESULTS) {
				alert("No results were found for this request.  If you are trying to get directions by public transit, the date may be too far in advance, or the public transit might night be available at the time of day you are requesting.");
			}

		});

		// Open directions tab
		
		selectLocations();
		$("#directionsMain").show();

	}
}  // getDirections


/**
  * Clears the directions from the map and removes print/clear options
  **/
function clearDirections() {
	graphics.setMap(null);
	graphics.setPanel(null);
	myLocationMarker.setMap(null);
	destinationMarker.setMap(null);
	document.getElementById("printAndClear").style.display = 'none';
}


/**
  * Opens the directions in a print friendly window.
  **/
function printDirections(){

	// Error checking
	if(!graphics.getDirections()){
		alert("No directions specified.");
		return null;
	}

	// Format html for the new window
	var prepend = '<!DOCTYPE html>'
			+ '<html>'
				+ '<head>'
				+ '<meta name="viewport" content="initial-scale=1.0, user-scalable=no" />'
				+ '<style type="text/css">'
				+ 'html { height: 100% }'
				+ 'body { height: 100%; margin: 0; padding: 0 }'
				+ '</style>'
					+ '<title>Console</title>'
					+ '<script type="text/javascript" src="http://maps.googleapis.com/maps/api/js?key=AIzaSyBnJvw_2TGCbDoXCvs8rkXB45B6xeBx9Kc&sensor=true"></script'
					+ '><script type="text/javascript" src="./auxillary.js"></script'
				+ '></head>'
				+ '<body bgcolor="white" onload="init()">'
					+ '<div id="map_canvas" style="width: 500px; height:375px; margin: 0px auto"></div>'
					+ '<div id="directions" style="width: 600px; height:auto; margin: 0px auto"></div>'
				+ '</body>'
			+ '</html>';


	// Open window, write html, and close
	top.consoleRef=window.open('','myconsole', 'width=' + 816 + ', height=' + 1056 +',menubar=1' +',toolbar=1' +',status=0' +',scrollbars=1' +',resizable=1');
	top.consoleRef.document.write(prepend);
	top.consoleRef.document.close();

}


/**
  * Called when a new layer is selected in the search tab.  Puts new fields in the field selection.
  **/
function changeLayer() {

	var dropdownLayer = document.getElementById("dropDownLayer");

	var dropdownFields = document.getElementById("dropDownFields");
	var dropdownValue = document.getElementById("dropDownValue");

	// Clear old field options
	for (var i = dropdownFields.options.length - 1; i >= 2; i--) {
		dropdownFields.removeChild(dropdownFields.options[i]);
	}

	// Clear old value options
	for (var i = dropdownValue.options.length - 1; i >=2; i--) {
		dropdownValue.removeChild(dropdownValue.options[i]);
	}
	if (dropdownLayer.options[dropdownLayer.selectedIndex].value == "service"){
		return;
	}
	var newLayer = activeLayers[dropdownLayer.options[dropdownLayer.selectedIndex].value];
	
	__FIELDS = newLayer.fields;
	
	// Add new field options
	for (var i = 0; i < __FIELDS.length; i++){

		if (__FIELDS[i].alias == 'OBJECTID' || __FIELDS[i].alias == 'SHAPE' || __FIELDS[i].alias == 'Shape') continue;

		var option = document.createElement('option');
		option.innerHTML = __FIELDS[i].alias;
		option.value = i;
		dropdownFields.appendChild(option);
	}

}


/**
  * Called when the field dropdown menu is changed in the search tab.
  * Adds values to the value dropdown menu.
  **/
function changeField() {

	var dropdownFields = document.getElementById("dropDownFields");

	var valuedd = document.getElementById("dropDownValue");
	for (var i = valuedd.options.length - 1; i >= 2; i--){
		valuedd.removeChild(valuedd.options[i]);
	}

	if (dropdownFields.options[dropdownFields.selectedIndex].innerHTML == ''|| dropdownFields.options[dropdownFields.selectedIndex].innerHTML == '2. Select Field')
		return;
	
	var selectedField = __FIELDS[dropdownFields.options[dropdownFields.selectedIndex].value];
	
	var layerdd = document.getElementById("dropDownLayer");
	var layer = activeLayers[layerdd.options[layerdd.selectedIndex].value];

	findUniqueValues(layer, selectedField);
}


/**
  * Finds the unique options a user can select to search for.
  **/
function findUniqueValues(layer, field) {
	document.getElementById("load_image").style.display = "block";
	var qOptions = {
			outFields: [field.name],
			returnGeometry: false,
			where: "1=1"
	}

	layer.query(qOptions, function(results, err) {

		if (err){
			alert("Query error in FUV's");
			return null;
		}

		var set = {};
		var uvs = [];
		features = results.features;
		for (var i = 0; i < features.length; i++) {

			// For Numeric values 
			if(!isNaN(features[i].attributes[field.name])){
				set[features[i].attributes[field.name]] = true;
			}

			// Workaround for the goofy representation of bus routes covered by stops
			else if (features[i].attributes[field.name].charAt(0) == '-') {
				var list = splitList(features[i].attributes[field.name]);
				for (var j = 0; j < list.length; j++){
					set[" " + list[j] + " "] = true;
				}
			}

			// Everything else.  Hopefully there's no comma delimitation of things that aren't lists...
			else {
				var list = features[i].attributes[field.name].split(",");
				for (var j = 0; j < list.length; j++) {
					set[list[j]] = true;
				}
			}
		}

		for (var opt in set) uvs[uvs.length] = opt;

		uvs.sort();

		for (var x in uvs){
			if (uvs[x] == " ") continue;
			var option = document.createElement('option');
			option.innerHTML = uvs[x];
			option.value = uvs[x];
			document.getElementById("dropDownValue").appendChild(option);
			if (x == uvs.length-1)
				document.getElementById("load_image").style.display = "none";
		}

	});

}


/**
  * Submits a search request.  If no advanced options are specified, finds the closest 5 features to the specified location.
  * Else, filters by advanced options.
  * If applicable, sorts by distance.
  **/
function searchByField(){

	// Check if they have entered an origin yet
	var origin = myLocation;
	if (!origin) {
		alert("Please input your location");
		return;
	}

	// Check if they have selected a service
	var layerdd = document.getElementById("dropDownLayer");
	if (layerdd.options[layerdd.selectedIndex].value == "service"||layerdd.options[layerdd.selectedIndex].value == ''){
		alert("Please select a service from the dropdown box above.  Only services that are currently visible will be available to select.  For more detailed instructions, click the 'help' tab.");
		return;
	}
	var layer = activeLayers[layerdd.options[layerdd.selectedIndex].value];

	// Check if they have selected a Field (optional)
	var fielddd = document.getElementById("dropDownFields");
	if (!(fielddd.options[fielddd.selectedIndex].value == "field" || fielddd.options[fielddd.selectedIndex].value == '')){
		var field = __FIELDS[fielddd.options[fielddd.selectedIndex].value];
	}

	// Check if they have selected a Value for that field (optional)
	var valuedd = document.getElementById("dropDownValue");
	if (field && !(valuedd.options[valuedd.selectedIndex].value == "Value"||valuedd.options[valuedd.selectedIndex].value == '')){
		var value = valuedd.options[valuedd.selectedIndex].value;
	}

	var return5Only = false;

	// Create Query options
	var qOptions = null;

	// If they have selected a value, filter by that value.
	if (value) {
		qOptions = {
			outFields: ["*"],
			returnGeometry: true,
			where: field.name + " LIKE '%" + value + "%'"
		};
	}

	// If not, return the closest 5 only
	else {
		qOptions = {
			outFields: ["*"],
			returnGeometry: true,
			where: "1=1"
		};
		return5Only = true;
	}

	// Clear old results
	dispatcher.dispatch(function(observer) {
		observer.hide('queried');
	});
	dispatcher.clear('queried');

	// Loading screen
	document.getElementById("load_image").style.display = "block";

	layer.query(qOptions, function(results, err){

		// Remove loading screen
		document.getElementById("load_image").style.display = "none";

		if(err){
			alert(err);
			return null;
		}

		// Sort Results
		var toSort = [];

		for (var feat in results.features) {

			var feature = results.features[feat];
			var coordinates = getFeatureCoordinates(feature, layer.geometryType);
			toSort[toSort.length] = {
				feature: feature,
				distance: distance(origin, coordinates)
			};

		}

		if (layer.geometryType != 'esriGeometryPolyline') {

			toSort = mergeSort(toSort, function (left, right) {
				if (left.distance < right.distance) return -1;
				else return 1;
			});

		}

		if (return5Only) {
			if (layer.geometryType == 'esriGeometryPolyline') {
				alert("Distance is undefined for this service.  However, you can still search for specific things using the advanced options.");
				return;
			}
			toSort = toSort.slice(0, (Math.min(5, toSort.length)));
		}


		var topResult = null;

		for (var i = 0; i < toSort.length; i++) {

			var feature = toSort[i].feature;
			var found = featureSearch(feature, layer.geometryType);
			
			if (found) {
				found.qsearch();
				dispatcher.addObserver(found);
			}
			else {
				fixFields(feature, results.fieldAliases);
				var newFeature = new HoustonFeature(feature, layer);
				newFeature.qsearch();
				featuresFound[featuresCount] = newFeature;
				featuresCount++;
				dispatcher.addObserver(newFeature);
				found = newFeature;
			}

			if (i == 0) topResult = found;

		}

		if (toSort.length > 0) {
			if (layer.geometryType != 'esriGeometryPolyline') map.panTo(getFeatureCoordinates(toSort[0].feature, layer.geometryType));
			topResult.highlight();
			topResult.showPopup();
			topResult.gisInfo.id = 'selected';
		}

	});
}


/**
  * Splits the input list, after stripping the first two and last two characters.  Used to find unique values for bus routes.
  * @param str - the string to be split
  **/
function splitList(str) {
	str = str.substring(2, str.length - 2);
	elements = str.split(" ");
	return elements;
}


/**
  * Sorting function for search results
  **/
function mergeSort(list, compareTo) {
	if (list.length == 0)
		return [];

	if (list.length == 1)
		return list;

	var pivot = Math.floor(list.length/2);
	var left = list.slice(0, pivot);
	var right = list.slice(pivot, list.length);

	return merge(mergeSort(left, compareTo), mergeSort(right, compareTo), compareTo);
}


/**
  * Merges two lists using the compareTo function provided.  Typical mergesort.
  **/
function merge(left, right, compareTo) {
	
	var i = 0;
	var j = 0;
	var k = 0;

	var toreturn = [];

	while (i < left.length && j < right.length) {

		if (compareTo(left[i], right[j]) < 0) {
			toreturn[k] = left[i];
			i++;
		}
		else {
			toreturn[k] = right[j];
			j++;
		}
		k++;
	}

	if (i == left.length) {
		for (j = j; j < right.length; j++) {
			toreturn[k] = right[j];
			k++;
		}
	}

	else if (j == right.length) {
		for (i = i; i < left.length; i++) {
			toreturn[k] = left[i];
			k++;
		}
	}

	return toreturn;
}


/**
  * Changes the fields in a feature to be the aliases we have chosen for them.
  * @param feature - the feature to fix
  * @param aliases - The aliases to display in JSON format
  **/
function fixFields(feature, aliases) {

	if (aliases) {
		var newAttributes = {};

		for (var field in feature.attributes){
			newAttributes[aliases[field]] = feature.attributes[field];
			delete feature.attributes[field];
		}

		for (var field in newAttributes) {
			feature.attributes[field] = newAttributes[field];
		}
	}

	// Also filter useless fields
	if (feature.attributes["OBJECTID"]) delete feature.attributes["OBJECTID"];
	if (feature.attributes["RESTRM"]) delete feature.attributes["RESTRM"];
	if (feature.attributes["Shape"]) delete feature.attributes["Shape"];
	if (feature.attributes["SHAPE"]) delete feature.attributes["SHAPE"];
}


/**
  * Class to speak to all active features.  See readme for details.
  **/
function Dispatcher(){

	this.observers = {};
	this.count = 0;
	
	this.addObserver = function(observer) {

		this.observers[this.count] = observer;
		this.count++;
	}


	this.clear = function(callerType) {

		// Clear all that don't persist clicks
		if (callerType == 'clicked') {

			var obs = null;
			for (var index in this.observers) {
				obs = this.observers[index];
				if (!obs.persistClicks) {
					delete this.observers[index];
					this.count -= 1;
				}
			}
		}

		// Clear everything
		else if (callerType == 'queried') {
			this.observers = {};
			this.count = 0;
		}

		// Clear all that belong to the specified layer
		else {

			var obs = null;
			for (var index in this.observers) {
				obs = this.observers[index];
				if (obs.layer.name == callerType) {
					delete this.observers[index];
					this.count -= 1;
				}
			}
		}

	}

	this.dispatch = function(command){

		for (var index in this.observers) {
			command(this.observers[index]);
		}
	}

	this.dispatchOnce = function(command, recipient) {
		command(recipient);
	}

}


/**
  * Class to deal with concurrency issues with click handler.  See readme for details.
  **/
function ClickSynchronizer(numExpected) {

	this.features = {};
	this.featureCount = 0;
	this.servicesRegistered = 0;

	if (numExpected != 0) {

		// Show loading screen so dumb users don't crash the program by spam clicking
		document.getElementById("load_image").style.display = "block";

	}

	this.alert = function(featureset) {
		for (var index in featureset) {
			this.features[this.featureCount] = featureset[index];
			this.featureCount++;
		}

		this.servicesRegistered++;

		if (this.servicesRegistered == numExpected) {

			for (var index in this.features) {
				dispatcher.addObserver(this.features[index]);
			}

			if (this.features[0]) {

				dispatcher.dispatchOnce(function(feature) {
						
						selectLocations();
						
						feature.showPopup();
						feature.highlight();
						feature.gisInfo.className = "sidebar_box";
						feature.gisInfo.id = "selected";
					}, this.features[0]);
			}

			document.getElementById("load_image").style.display = "none";

		}		
	}
}


/**
  * Class to store useful information for a feature.  See readme for details.
  **/
function HoustonFeature(feature, layer) {

	var self = this;
	var featureName = feature.attributes["Name"];
	this.feature = feature;
	this.layer = layer;
	this.coordinates = getFeatureCoordinates(feature, layer.geometryType);
	this.persistClicks = false;

	// Popup Google information
	if (this.coordinates && featureName) {

		// Popup setup
		this.googleInfo = document.createElement('div');
		this.popup = new google.maps.InfoWindow({ maxWidth: 300 });

		getGoogleInfo(this);
	}

	// GIS information

	this.gisInfo = extractGIS(this);
	this.gisInfo.onclick = function(){
		
		var wasSelected = null
		var selected = document.getElementById("selected");

		if (this == selected) {
			wasSelected = true;
		}		

		if (selected) {
			selected.className = "sidebar_box";
			selected.id = "";
			selected.feature.hidePopup();
			if (selected.feature.state != 'queried' || layer.geometryType == 'esriGeometryPolyline') selected.feature.unlight();
		}

		if (!wasSelected) {

			if (self.coordinates)
				map.panTo(self.coordinates);
			this.className = "sidebar_box";
			this.id = "selected";
			self.highlight();
			self.showPopup();

		}

	}
	this.gisInfo.feature = this;

	// Functions
	this.highlight = function() {
		var g = this.feature.geometry;
		for (var i = 0; i < g.length; i++) {
			g[i].setMap(map);
			g[i].setOptions(hStyle);
		}
	}

	this.unlight = function() {
		var g = this.feature.geometry;
		for (var i = 0; i < g.length; i++){
			g[i].setMap(null);
		}
	}

	this.showPopup = function() {
		if(this.popup) this.popup.setMap(map);
	}

	this.hidePopup = function() {
		if(this.popup) this.popup.setMap(null);
	}

	this.showGIS = function() {
		if (this.gisInfo.parentNode != document.getElementById("scroll4"))
			document.getElementById("scroll4").appendChild(this.gisInfo);
	}

	this.removeGIS = function() {
		if (this.gisInfo.parentNode == document.getElementById("scroll4")) {
			document.getElementById("scroll4").removeChild(this.gisInfo);
			this.gisInfo.className = "sidebar_box";
			this.gisInfo.id = "";
		}
	}

	this.hide = function(callerType) {

		if (callerType == 'clicked') {
			if (!this.persistClicks) {
				this.unlight();
				this.removeGIS();
			}
			this.hidePopup();
			this.gisInfo.className = 'sidebar_box';
			this.gisInfo.id = '';
		}

		else if (callerType == 'queried' || callerType == layer.name) {
			this.unlight();
			this.hidePopup();
			this.removeGIS();
			this.persistClicks = false;
		}
	}

	// "Clicked" behavior
	this.click = function(evt) {
		//this.state = 'clicked';
		this.showGIS();
	}

	// "Queried" behavior
	this.qsearch = function() {
		//this.state = 'queried';
		if (layer.geometryType != 'esriGeometryPolyline') this.highlight();
		this.showGIS();
		this.persistClicks = true;
	}


}


/**
  * Finds the input feature in the list of features found, if it has been found already.
  **/
function featureSearch(feature, type) {

	var match = null;
	var comparee = null;
	var stableCoordinates = getFeatureCoordinates(feature, type);

	for (var index in featuresFound) {

		comparee = featuresFound[index];
		match = comparee;
		for (var attribute in feature.attributes) {

			if (attribute == 'RESTRM' || attribute == 'Shape' || attribute == 'SHAPE' || attribute == 'OBJECTID') continue;
			
			if (feature.attributes[attribute] != comparee.feature.attributes[attribute]) {
				match = null;
				break;
			}
		}

		if (match){
			if (match.feature.attributes["Name"] || match.coordinates == stableCoordinates) {
				return match;
			}
		}
	}
	return null;
}

function sidebarToggle() {

	if(document.getElementById('tabs').style.display == 'block'||document.getElementById('helpWindow').style.display == 'block'){
		document.getElementById('tabs').style.display='none';
		document.getElementById('helpWindow').style.display='none';
		document.getElementById('map_canvas').style.marginLeft = '0px';
		document.getElementById('hide_panel').id = 'show_panel';
		document.getElementById('help').style.display='none';
		google.maps.event.trigger(map, "resize");
	}

	else {
		document.getElementById('tabs').style.display='block';
		document.getElementById('help').style.backgroundImage='url(help.png)';
		document.getElementById('help').style.backgroundPosition='7px';
		document.getElementById('map_canvas').style.marginLeft = '308px';
		document.getElementById('show_panel').id = 'hide_panel';
		document.getElementById('help').style.display='block';
		google.maps.event.trigger(map, "resize");
	}
}


function clearAll() {

	dispatcher.dispatch(function(observer) {
		observer.hide('queried');
	});
	dispatcher.clear('queried');

}


function getLocation(){
// GET MY LOCATION
	if (navigator.geolocation){
		navigator.geolocation.getCurrentPosition(function(pos) {
			myLocation = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
			if (!myLocationMarker){
				myLocationMarker = new StyledMarker({
							styleIcon:new StyledIcon(StyledIconTypes.MARKER,
							{text:"A"}),
							map:map});
			}
			myLocationMarker.setPosition(myLocation);
			map.panTo(myLocation);

			geo.geocode({'location': myLocation }, function(results, status) {
				if (status == 'OK') {
					document.getElementById('address').value = results[0].formatted_address;
					document.getElementById('originAddress').value = results[0].formatted_address;
				}
			});


			}, function(error) {
				alert("Your location could not be determined.");
			},
			{timeout:10000}
		);
	}
	else
		alert("Browser does not support finding user location");
}

//toggles visibility of an HTML element
function visibilityToggle(ElementID) {
	if (document.getElementById(ElementID).style.display == 'none') {
		document.getElementById(ElementID).style.display='block';
	}
	else {
		document.getElementById(ElementID).style.display='none';
	}
}

//toggles visibility of an HTML element
function resultsNumber(){
	var resultsNumDropdown = document.getElementById("ResultsNumberDD");
	var selectedVal = resultsNumDropdown.options[resultsNumDropdown.selectedIndex].innerHTML;	
	if (selectedVal == 'Show 5 Closest') {
		findClosestFeatures();
	}
	else {
		searchByField2();
	}
}

//Function to toggle on Services tab
function selectServices(){
	$('#tabs-1').show(); 
	document.getElementById('servicesLink').className = 'ui-state-default ui-corner-top ui-tabs-selected ui-state-active'; 
	$('#tabs-2').hide();
	document.getElementById('legendLink').className = 'ui-state-default ui-corner-top';
	$('#tabs-3').hide();
	document.getElementById('locationsLink').className = 'ui-state-default ui-corner-top';
}

//Function to toggle on Locations tab
function selectLocations(){
	$('#tabs-3').show(); 
	document.getElementById('locationsLink').className = 'ui-state-default ui-corner-top ui-tabs-selected ui-state-active'; 
	$('#tabs-2').hide();
	document.getElementById('legendLink').className = 'ui-state-default ui-corner-top';
	$('#tabs-1').hide();
	document.getElementById('servicesLink').className = 'ui-state-default ui-corner-top';
}

//Function to toggle on Legend tab
function selectLegend(){
	$('#tabs-2').show(); 
	document.getElementById('legendLink').className = 'ui-state-default ui-corner-top ui-tabs-selected ui-state-active'; 
	$('#tabs-3').hide();
	document.getElementById('locationsLink').className = 'ui-state-default ui-corner-top';
	$('#tabs-1').hide();
	document.getElementById('servicesLink').className = 'ui-state-default ui-corner-top';
}
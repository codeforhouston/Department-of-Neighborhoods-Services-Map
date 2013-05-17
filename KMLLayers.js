/**
  * HI MARK!
  * EDIT HERE TO ADD NEW LAYERS:	
  * 1) decide on a name for your layer (ex: parks, farmers markets )
  * 2) get the URL of the .kml file
  * 3) choose a category for your layer from those listed in mapservices.js
  *		 (ex: Transportation, Public_Safety)
  * 4) add a new row to the following list
  *  ex: 
  *	{
  * 		"name": "Your category name",
  * 		"url": "The url for the kml file",
  * 		"tab": "The name of the tab that this should go in"
  *	},
  **/


// do not forget the comma after the closing bracket!

var KML_files = [
	{
		"name": "Spreadsheet",
		"url": "https://docs.google.com/spreadsheet/pub?key=0ArTcSDBxJURhdDVYQmE3OXR5U2VqVUE0UmFiWGRMOWc&single=true&gid=16&output=txt",
		"tab": "Public_Safety"
	},

	{
		"name": "Spreadsheet2",
		"url": "https://docs.google.com/spreadsheet/pub?key=0ArTcSDBxJURhdDVYQmE3OXR5U2VqVUE0UmFiWGRMOWc&single=true&gid=14&output=txt",
		"tab": "Public_Facilities"
	},

	];


	

	
	
	
	
	
//DO NOT EDIT ANYTHING BELOW HERE


// CREATE ARRAY TO STORE KML MAP LAYERS CREATED BY FUNCTION initializeKMLLayers()
var KML_storage = [];	
	
	
// GO THROUGH KML_files AND CREATE MAP LAYERS
// STORE EACH LAYER IN KML_storage
// initializeKMLLayers() IS RUN IN mapdriver.js FROM FUNCTION initialize() 

function initializeKMLLayers(){
	for (var i = 0; i < KML_files.length; i++) {

		// Get the object containing the KML info
		var info = KML_files[i];

		//retrieve the name and url of the layer
    		var url = info.url;
		var name = info.name;
	
		//create a layer
		var newlayer = new google.maps.KmlLayer(url);
	
		//store the new layer
		KML_storage[i] = newlayer;
	
		//make a checkbox for the layer
		make_KML_checkbox(i);
	}
}

// CREATE CHECKBOXES
// FOR EACH LAYER IN KML_storage 

function make_KML_checkbox(kml_index){

	var cb = document.createElement('input');
	cb.type = 'checkbox';
	cb.id = kml_index;
	cb.onclick = function(){
		if(cb.checked)
			KML_storage[kml_index].setMap(map);
		else
			KML_storage[kml_index].setMap(null);
	}
	
	// Find the layer name.
	var layer_name = KML_files[kml_index].name;
	
	// Create a label for the checkbox.  It's just the name of the associated layer.
	var label = document.createElement('label');
	label.appendChild(document.createTextNode(layer_name));
	
	// Find which tab this layer belongs in.
	var layer_category = KML_files[kml_index].tab;
	
	// Place the checkbox and the label within the appropriate tab.
	document.getElementById(layer_category).appendChild(cb);
	document.getElementById(layer_category).appendChild(label);
	document.getElementById(layer_category).appendChild(document.createElement('br'));
}



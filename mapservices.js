/**
  * Array containing each tab category.
  **/
var tabs = new Array();



// ################### BLOCK 1 ####################### //
// ################# CATEGORIES ###################### //


/**
  * Each of the following arrays will contain the URLs for all mapservices associated
  * with its category.
  **/
var Transportation = new Array();
Transportation[0] = "http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/DON_Transportation_wm/MapServer";

var Government_Boundaries = new Array();
Government_Boundaries[0] = "http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/DON_Boundaries_wm/MapServer";

var Public_Safety = new Array();
Public_Safety[0] = "http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/DON_Public_Safety_wm/MapServer";

var Public_Facilities = new Array();
Public_Facilities[0] = "http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/DON_City_Services_wm/MapServer";

var Health = new Array();
Health[0] = "http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/DON_Health_wm/MapServer";

var Education_Arts_Recreation = new Array();
Education_Arts_Recreation[0] = "http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/DON_Education_Arts_and_Recreation_wm/MapServer";




// ################### BLOCK 2 ####################### //


tabs[0] = Transportation;
tabs[1] = Government_Boundaries;
tabs[2] = Public_Safety;
tabs[3] = Public_Facilities;
tabs[4] = Health;
tabs[5] = Education_Arts_Recreation;
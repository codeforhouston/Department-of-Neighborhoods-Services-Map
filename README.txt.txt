@author Jack Reed and Abeer Javed, 2012

TABLE OF CONTENTS

1) Important files and their purpose
2) Updating the map
3) Useful information for developers
4) Issues we never really got the chance to fix

The first two sections are intended for people who are not necessarily
experienced with code to be able to add information to the map
(although if you do have experience you will be fine, it just might seem
a little slow).  The second is for developers meaning to make actual changes
to the way the data is handled.


====================== 1 - IMPORTANT FILES ===========================

DON_Map_Display.html:
	The actual hard HTML layout.  It is important to note that much
	of the DOM structure changes at runtime, but all major functions
	such as the tabbed interface, layer visibility toggles, directions,
	and search functions are already there.

mapdriver.js:
	The majority of the back-end code is in this file.

mapservices.js:
	The URL addresses of all hosted mapservices are stored here.

auxillary.js:
	This is code that is to be run whenever a user clicks 'Print
	Directions'.

definitions.js:
	The definitions of each layer are held in this file.





==================== 2 - UPDATING THE MAP ============================

Updating the layers that the map displays has been designed to be as
easy as possible.  There is no need to worry about keeping the information
current - as soon as changes are made within the host servers, these changes
will reflect on the map.  This includes the topographical/aerial imagery
provided by Google.

However, adding new layers or services does require a few things.

2-1) Adding a new layer:
	Just add the shape file for the layer to the mapservice that
	it best fits with.  The rest is done at runtime in the code.

2-2) Adding a new mapservice to an existing tab:
	Open the file called 'mapservices.js'.  Get the URL address
	of the mapservice you wish to add.  Find the category that this
	mapservice belongs in (eg. Transportation, Health).   If, for
	example, you wanted to add a service to the transportation
	category, you would find the block of text

		var Transportation = new Array();
		Transportation[0] = "http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/DON_Boundaries_wm/MapServer";
		...
		Transportation[n] = "URL ADDRESS HERE";

	Add the following line of code to this block

		Transportation[n + 1] = "URL ADDRESS HERE";

	filling in appropriate values for n + 1 and the url address.  Note
	that the quotation marks surrounding the URL address are important
	and the program will not function without them.

2-3) Adding a new category:
	Open the file called 'mapservices.js'.  Find the block of code
	labeled BLOCK 1.  At the bottom, add the following code

		var category_name = new Array();

	filling in the appropriate value for category_name.  Then follow
	the above steps to add all of the mapservices that you would like
	to be within this category.

	Finally, find the code labeled BLOCK 2.  It should read

		tabs[0] = Transportation;
		tabs[1] = Government_Boundaries;
		...
		tabs[n] = most_recently_added_category;

	Add the following line of code to the end of this block

		tabs[n + 1] = category_name;

	filling in the appropriate values for n + 1 and category_name.
	Note that here you will NOT add quotation marks around the category
	name.

	Now open up the file called DON_Map_Display.html (you will
	have to right-click open it with notepad or some other program,
	double clicking it will just open the whole webpage).  Find the
	block of code labeled <!-- Data/Layer Categories //-->.

	This block of code should contain the following

		<p class="msg_head" id="Trans">Transportation</p>
		<div class="msg_body" id="Transportation"></div>

		...

		<p class="msg_head" id="TAB ID HERE">Most Recent Category Name</p>
		<div class="msg_body" id="TAB BODY ID HERE"></div>

	Add the following code to the bottom of this section

		<p class="msg_head" id="TAB ID HERE">Category Name Here</p>
		<div class="msg_body" id="TAB BODY ID HERE"></div>

	Filling in appropriate values for TAB ID HERE, Category Name Here,
	and TAB BODY ID HERE.  Write down both of these IDs somewhere.

	Finally, open the file mapdriver.js and find the following code

		function tabID (index) {

			if (index == 0) return
			if (index == 1) return
			...
			if (index == n) return "Most recently added category name";

		}

	Under the last if ... line, add the following line of code

		if (index == n + 1) return "TAB BODY ID HERE";

	Filling in appropriate values for n + 1 and TAB BODY ID HERE.  Note
	that the quotation marks are again important here.  It is also
	extremely important that your entry for TAB BODY ID HERE in this file
	matches the entry that you made in the HTML file in the last step.

	Now find the code

		function initializeJQueryComponents() {

			...

			// Do not edit above here
			// BLOCK 1
			$("#Transportation").hide();
			...
			$("#Most recently added category name").hide();

			...
			// BLOCK 2
			$(this).next("#Transportation").slideToggle(150);
			...
			$(this).next("#Most recently added category name").slideToggle(150);

			// Do not edit below here

			...

		}

	At the bottom of block 1, add the following line of code

		$("#TAB BODY ID HERE").hide();

	and at the bottom of block 2, add the following line of code

		$("#TAB BODY ID HERE").slideToggle(150);

	filling in appropriate values for TAB BODY ID HERE.  Note that
	The $, quotes, and #, all must be in the line of code, and 
	TAB BODY ID HERE must match the value you entered in the previous
	two steps.




==================== 3 - Useful Information =========================



We've made a few classes of our own that you may find useful.  They are
documented in the code as well, but I will go into greater detail here.

function HoustonFeature() encapsulates all of the behaviour of any
feature on the map.  Whether it is found through a mouse click event
or from a search, an instance of this class is created.  Then, the feature
itself contains methods that describe the behaviour for whatever different
events it was found through (eg click() or qsearch()).  If you plan on
adding extra behaviour to the map, you should make a function for that
behaviour within this class and then follow the template that HoustonFeature
has set for you.  This will allow you to make additional behavior for a
feature much easier.  There are several other class methods as well,
including a hide() function, functions for showing/hiding the different
types of info that the feature itself holds.

Additionally, this feature is cached upon being made and stored in a
javascript object literal.  This is done because calls to the google
servers for information can be slow, so by caching it you can just show/hide
the information rather than having to ask the google server for it every
time the feature is found through any method.



function Dispatcher() is a class that we use to talk to all of the features
who currently have displayed information.  addObserver() takes a
HoustonFeature as an argument and adds this feature to a list of features
within the dispatcher.  dispatch() takes a function as an argument and applies
this function to every feature in its observer list, and dispatchOnce()
takes a function as an argument and applies this function to the first
feature in its list.  So far this is mainly used to tell the features to
hide themselves, but I'm sure you can think of plenty of creative uses for it.




function ClickSynchronizer() is a class that we used to deal with thread
safety issues when handling click events on the map.  Specifically,
a feature could be a member of any number of mapservices, and each
mapservice runs an identify() operation concurrently (because you have
to contact an esri server for this service).  As a result, there's no way to
tell a priori which service the clicked feature was a member of, or if the
user even clicked anything at all.  Additionally, callback functions cannot
have return values, so you can't just take the result set and store it
somewhere else without running into data race conditions.  As a result,
we use a ClickSynchronizer to gracefully handle both of these issues.  When
a click on the map is registered, we get the number of services that
currently have a visible layer.  The constructor for ClickSynchronizer
takes this number as an argument.  Then, when a service has completed
the callback for identify, it calls sync.alert(results).  This passes
the results of the identify to the synchronizer, which then adds it to a
list of its own.  When the synchronizer has recieved the appropriate number
of calls to alert(), it then runs some extra methods on the first feature
using dispatchOnce().  This includes displaying the popup information for
that feature, and highlighting the GIS information for it.  Again, it is
only being used to deal with concurrency issues with identify(), but
you may find it a useful tool elsewhere.



====================== 4 - Issues ===========================

1) The mobile version is imperfect and debugging is near impossible,
	given that it has to be uploaded to the internet every time we
	would make changes or add debug information to it.

2) Sometimes the Services will fail to complete their initialization, 
	causing the loading screen to display indefinitely.  Refreshing
	the page usually fixes the problem, but that's not really a good
	enough solution.  This issue is probably due to a failed response
	from the servers and adding a timeout/retry would probably be
	sufficient to fix it.

3) Browser compatibility is a big issue, especially for older versions of
	internet explorer.  Most of it is styling issues, but in versions 
	8 and older, they have a really hard time highlighting polylines.
	We've pinpointed the problem to be something that these versions of
	internet explorer do in the background while highlighting is happening
	that we don't actually have control over, so our solution has been
	to just not allow the map to load for versions of 7 and older and
	warn users of 8 that parts of the application will be slow.  We havent
	found any huge issues with Opera YET, and Safari seems to have a problem
	with the handling of clicks.

4) Certain things just don't make sense to give directions to (or get google
	information about), such as super neighborhoods.  For these things,
	we have removed the field called "Name" from them and are currently
	using the name field as a filter for whether or not to offer this
	information, but this can prove to be problematic when using data
	that you don't actually have access to change.

5) Printing has proved very problematic as well, as the DOM structure changes
	a lot during runtime and a lot of browsers print options don't accept
	some of the css formatting.  Z-indeces and transparency seem to cause
	the most problems, but platforms like chrome that don't have an option
	to print background colors don't even print the google base map.  Our
	solution so far has been to provide instructions on how to take a
	screenshot using prt scrn and paint, but again, this is kind of a
	weak solution.

6) Information we pull from google servers using DetailsRequests are imperfect.
	We have it such that it returns the correct information MOST of the time,
	but because you have to search for places to get the place code for
	details requests, if the search gives the wrong place, there's not
	really much of a way to tell.


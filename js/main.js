var map, fGroup, sGroup;

function getCrashes (geom) {
	var query = L.esri.Tasks.query({
	    url:'	http://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Crashes/FeatureServer/0'
	});	
	query.within(geom);
	query.run(function (error, featureCollection) {
		sGroup.clearLayers();
		$("#crashes").html('<h1>' + featureCollection.features.length + '</h1>');
		$("#projects").html('<h1>0/0</h1>');
		$("#reports").html('<h1>1</h1>');				
	});			
}

function getSensors (geom) {
	var query = L.esri.Tasks.query({
	    url:'http://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Speed_sensor/FeatureServer/0'
	});	
	query.within(geom);
	query.run(function (error, featureCollection) {
		sGroup.clearLayers();
		L.geoJson(featureCollection).addTo(sGroup);
		var f = featureCollection.features[0];
		$("#reading").html('<h1>Posted: ' + f.properties.PostedSpee + '</h1><h1>Max: ' + f.properties.MaxSpeed + '</h1><h1>Average: ' + f.properties.MeanSpeed + '</h1>')
	});		
}

function findAddress (address) {
	var query = L.esri.Tasks.query({
	    url:'http://maps.raleighnc.gov/arcgis/rest/services/Addresses/MapServer/0'
	});	
	query.where("address='" + address + "'");
	query.run(function (error, featureCollection) {
		fGroup.clearLayers();
		L.geoJson(featureCollection).addTo(fGroup);
		findNeighborhoodByLoc(featureCollection.features[0]);

	});
}

function findNeighborhood (name) {
	var query = L.esri.Tasks.query({
	    url:'http://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Raleigh_Neighborhoods/FeatureServer/0'
	});	
	query.where("name='" + name + "'");
	query.run(function (error, featureCollection) {
		fGroup.clearLayers();
		L.geoJson(featureCollection).addTo(fGroup);
		map.fitBounds(L.geoJson(featureCollection).getBounds());
		$("#nName").text(featureCollection.features[0].properties.name);		
	});	
}

function findNeighborhoodByLoc (loc) {
	var query = L.esri.Tasks.query({
	    url:'http://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Raleigh_Neighborhoods/FeatureServer/0'
	});	
	query.contains(loc);
	query.run(function (error, featureCollection) {
		fGroup.clearLayers();
		L.geoJson(featureCollection).addTo(fGroup);
		map.fitBounds(L.geoJson(featureCollection).getBounds());
		$("#nName").text(featureCollection.features[0].properties.name);	
		getSensors(featureCollection.features[0]);	
		getCrashes(featureCollection.features[0]);	
	});	
}


function typeaheadSelected (obj, data, dataset) {
	console.log(data.value);
	console.log(dataset);
	if (dataset === 'Addresses') {
		findAddress(data.value);
	}
	if (dataset === 'Neighborhoods') {
		findNeighborhood(data.value);
	}
}

function checkAbbreviations (value) {
	var abbreviations = [{full: "Saint ", abbr: "St "}, 
	{full: "North ", abbr:"N "}, 
	{full: "South ", abbr: "S "},
	{full: "West ", abbr:"W "},
	{full: "East ", abbr: "E "},
	{full: "Martin Luther King Jr", abbr: "MLK"}];
	value = value.replace("'", "");
	value = value.replace(".", "");
	$.each(abbreviations, function (i, a) {
		value = value.replace(new RegExp(a.abbr, 'gi'), a.full);
	});
	return value;
}
function addressFilter (resp) {
	var data = []
	if (resp.features.length > 0) {
		$(resp.features).each(function (i, f) {
			data.push({value:f.attributes['ADDRESS']});
		});
	}
	return data;
}
function neighborhoodFilter (resp) {
	var data = []
	if (resp.features.length > 0) {
		$(resp.features).each(function (i, f) {
			data.push({value:f.attributes['name']});
		});
	}
	return data;
}



function setTypeahead (gj) {
	var addresses = new Bloodhound({
		datumTokenizer: function (datum) {
	        return Bloodhound.tokenizers.whitespace(datum.value);
	    },
	    queryTokenizer: Bloodhound.tokenizers.whitespace,
		remote: {
			url: "http://maps.raleighnc.gov/arcgis/rest/services/Addresses/MapServer/0/query?orderByFields=ADDRESS&returnGeometry=false&outFields=ADDRESS&returnDistinctValues=false&f=json",
			filter: addressFilter,
			replace: function(url, uriEncodedQuery) {
				  uriEncodedQuery = uriEncodedQuery.replace(/\./g, "");
			      var newUrl = url + '&where=ADDRESSU like ' + "'" + checkAbbreviations(uriEncodedQuery).toUpperCase() +"%'";
			      return newUrl;
			}
		}
	});
	var neighborhoods = new Bloodhound({
		datumTokenizer: function (datum) {
	        return Bloodhound.tokenizers.whitespace(datum.value);
	    },
	    queryTokenizer: Bloodhound.tokenizers.whitespace,
		remote: {
			url: "http://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Raleigh_Neighborhoods/FeatureServer/0/query?orderByFields=nameu&returnGeometry=false&outFields=name&returnDistinctValues=false&f=json",
			filter: neighborhoodFilter,
			replace: function(url, uriEncodedQuery) {
				  uriEncodedQuery = uriEncodedQuery.replace(/\./g, "");
			      var newUrl = url + '&where=NAMEU like ' + "'" + uriEncodedQuery.toUpperCase() +"%'";
			      return newUrl;
			}
		}
	});

	addresses.initialize();
	neighborhoods.initialize();
	$("#search").typeahead({hint: true, highlight: true, minLength: 1}, 
		{name:'Addresses', 
		displayKey:'value', 
		source:addresses.ttAdapter(),
		templates: {
			header: "<h5>Addresses</h5>"
		}},
		{name:'Neighborhoods', 
		displayKey:'value', 
		source:neighborhoods.ttAdapter(),
		templates: {
			header: "<h5>Neighborhoods</h5>"
		}}).on("typeahead:selected", typeaheadSelected);
}

function getNeighborhoods () {
	var url = 'data/neighborhoods.geojson';

	$.getJSON(url, function(json, textStatus) {

		setTypeahead(json);

	});
}

function createMap() {
  map = L.map('map').setView([35.86, -78.63], 9);

  L.esri.basemapLayer('Topographic').addTo(map);	
  fGroup = new L.featureGroup().addTo(map);
  sGroup = new L.featureGroup().addTo(map);
}

createMap();
getNeighborhoods();

function getNeighborhoods () {
	var url = 'data/neighborhoods.topojson';
	if($('html').hasClass('geojson')) {
		url = 'data/neighborhoods.geojson'
	}
	$.getJSON(url, function(json, textStatus) {

		console.log(json);

	});
}


getNeighborhoods();
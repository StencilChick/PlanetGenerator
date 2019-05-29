// REALLY JUST A WHOLE BUNCH OF DEFINES
var planetTypes = [];

(function() {
	var Type = function(atmo, water, base, hitemp, lowtemp, lowmount, himount, offset=0) {

		return {
			atmo: atmo,
			water: water,

			// colours
			base: base,
			hitemp: hitemp,
			lowtemp: lowtemp,
			lowmount: lowmount,
			himount: himount,

			// info
			mountThreshold: water ? 3 : 2,
			heightOffset: offset
		}
	};

	console.log(planetTypes);


	// temperate
	planetTypes.push(Type(
		true, true,
		[0.39, 0.74, 0.42],
		[0.95, 0.93, 0.80], [0.66, 0.95, 0.97],
		[0.95, 0.9, 0.9], [1, 0.95, 0.95]
		));
	// desert
	planetTypes.push(Type(
		true, false,
		[0.95, 0.93, 0.80],
		[0.95, 0.93, 0.80], [0.66, 0.95, 0.97],
		[0.64, 0.56, 0.42], [1, 0.95, 0.95]
		));
	// tundra
	planetTypes.push(Type(
		true, true,
		[0.66, 0.95, 0.97],
		[0.39, 0.74, 0.42], [0.66, 0.95, 0.97],
		[0.95, 0.9, 0.9], [1, 0.95, 0.95]
		));
	// ocean
	planetTypes.push(Type(
		true, true,
		[0.39, 0.74, 0.42],
		[0.30, 0.68, 0.29], [0.66, 0.95, 0.97],
		[0.95, 0.9, 0.9], [1, 0.95, 0.95],
		-1
		));
	// weird
	planetTypes.push(Type(
		true, true,
		[1, 0.74, 0.42],
		[0.22, 0.36, 0.75], [0.66, 0.95, 0.97],
		[0.79, 0.30, 0.84], [1, 0.95, 0.95]
		));

	// barren
	planetTypes.push(Type(
		false, false,
		[0.8, 0.8, 0.8],
		[0.8, 0.8, 0.8], [0.8, 0.8, 0.8],
		[0.95, 0.9, 0.9], [1, 0.95, 0.95]
		));
	// snowball
	planetTypes.push(Type(
		false, false,
		[0.66, 0.95, 0.97],
		[0.66, 0.95, 0.97], [0.66, 0.95, 0.97],
		[0.95, 0.9, 0.9], [1, 0.95, 0.95]
		));
	// bronze
	planetTypes.push(Type(
		false, false,
		[0.76, 0.39, 0.29],
		[0.76, 0.39, 0.29], [0.76, 0.39, 0.29],
		[0.85, 0.46, 0.35], [0.85, 0.8, 0.8]
		));
})();
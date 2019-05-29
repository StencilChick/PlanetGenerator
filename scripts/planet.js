// SPHERE DATASTRUCTURES
var Hex = function(centre, tri) {
	
	return {
		centre: centre,
		tris: [tri],

		addTri: function(tri) {
			this.tris.push(tri);
		}
	}
}

var Triangle = function(a, b, c) {
	glMatrix.vec3.normalize(a, a);
	glMatrix.vec3.normalize(b, b);
	glMatrix.vec3.normalize(c, c);

	var centre = glMatrix.vec3.create();
	glMatrix.vec3.add(centre, a, b);
	glMatrix.vec3.add(centre, centre, c);
	glMatrix.vec3.div(centre, centre, [3, 3, 3]);
	glMatrix.vec3.normalize(centre, centre);
	
	return {
		a: a,
		b: b,
		c: c,

		centre: centre,

		subdivide: function() {
			var ab = glMatrix.vec3.create();
			glMatrix.vec3.add(ab, this.a, this.b);
			glMatrix.vec3.div(ab, ab, [2, 2, 2]);

			var bc = glMatrix.vec3.create();
			glMatrix.vec3.add(bc, this.b, this.c);
			glMatrix.vec3.div(bc, bc, [2, 2, 2]);

			var ca = glMatrix.vec3.create();
			glMatrix.vec3.add(ca, this.c, this.a);
			glMatrix.vec3.div(ca, ca, [2, 2, 2]);

			return [
				Triangle(this.a, ab, ca),
				Triangle(this.b, bc, ab),
				Triangle(this.c, ca, bc),
				Triangle(ab, bc, ca)
			];
		}
	}
}

var Sphere = function(tris) {
	var makeHexes = function(tris) {
		var hexes = [];

		tris.forEach(function(tri) {
			var points = [tri.a, tri.b, tri.c];

			points.forEach(function(point) {
				for (var i = 0; i < hexes.length; i++) {
					if (glMatrix.vec3.equals(hexes[i].centre, point)) {
						// add tri to hex
						hexes[i].addTri(tri);
						return;
					}
				}

				// else, make new hex
				hexes.push(Hex(point, tri));
			});
		});

		return hexes;
	}

	return {
		size: 1,
		tris: tris,
		hexes: makeHexes(tris),

		dual: function() {
			this.size++;

			var newTris = [];
			this.tris.forEach(function(tri) {
				newTris = newTris.concat(tri.subdivide());
			});

			this.tris = newTris;
			this.hexes = makeHexes(newTris);
		}
	}
}


// RANDOM GEN FUNCTIONS
var noiseAtPoint = function(x, y, z) {
	return noise.simplex3(x, y, z) +
		0.5 * noise.simplex3(x*2, y*2, z*2) +
		0.25 * noise.simplex3(x*4, y*4, z*4) +
		0.125 * noise.simplex3(x*8, y*8, z*8);
}

var heightNoise = function(x, y, z, offset=0) {
	var value = noiseAtPoint(x, y, z);
	value = Math.ceil(value * 4);

	value += offset;
	value = Math.min(Math.max(-4, value), 4);

	return value;
}

var tempNoise = function(x, y, z) {
	var value = 1 - Math.pow(y, 2);
	value += noiseAtPoint(x+10, y, z) * 0.25;

	return value;
}


var calcColour = function(type, height, temp) {
	// height colours
	if (type.water && height < 0) return [1, 1, 1];
	if (height < 0) {
		var colour = glMatrix.vec3.create;
		glMatrix.vec3.mul(colour, type.base, [0.8, 0.8, 0.8]);
		return colour;
	}

	if (height > type.mountThreshold) return type.himount;
	if (height == type.mountThreshold) return type.lowmount;

	// temperature colours
	if (temp > 0.9) return type.hitemp;

	if (temp < 0.2) return type.lowtemp;

	return type.base;
}


// MAKING THE MESHES
var makePlanetModel = function(type, seed, size) {
	noise.seed(seed);
	var sphere = spheres[size];

	var vertices = [];
	var colours = [];
	var normals = [];
	var indices = [];

	var indOffset = 0;

	const scale = sphere.size;

	sphere.hexes.forEach(function(hex) {
		// order points
		const length = hex.tris.length;

		var orderedPoints = [hex.tris[0].centre];
		while (orderedPoints.length < length) {
			var minDist = 10000;
			var point;

			for (var i = 1; i < length; i++) {
				if (orderedPoints.includes(hex.tris[i].centre)) continue;

				var directional = glMatrix.vec3.create();
				var dist = glMatrix.vec3.dist(hex.tris[i].centre, orderedPoints[orderedPoints.length-1]);

				if (dist < minDist) {
					minDist = dist;
					point = hex.tris[i].centre;
				}
			}

			orderedPoints.push(point);
		}

		// add points to the mesh
		var hexCentre = glMatrix.vec3.create();

		const height = heightNoise(hex.centre[0], hex.centre[1], hex.centre[2], type.heightOffset);
		const hexElevation = scale + 0.1 * height;
		const hexColour = calcColour(type, height, tempNoise(hex.centre[0], hex.centre[1], hex.centre[2]));

		for (var i = 0; i < length; i++) {
			var point = orderedPoints[i];
			
			glMatrix.vec3.add(hexCentre, hexCentre, point);

			vertices.push(point[0]*hexElevation, point[1]*hexElevation, point[2]*hexElevation);
			colours.push(hexColour[0], hexColour[1], hexColour[2]);
			normals.push(hex.centre[0], hex.centre[1], hex.centre[2]);

			indices.push(
				indOffset+i,
				i === length-1 ? indOffset : indOffset+i+1,
				indOffset+length
				);	
		}

		glMatrix.vec3.div(hexCentre, hexCentre, [length, length, length]);
		vertices.push(hexCentre[0]*hexElevation, hexCentre[1]*hexElevation, hexCentre[2]*hexElevation);
		colours.push(hexColour[0], hexColour[1], hexColour[2]);
		normals.push(hex.centre[0], hex.centre[1], hex.centre[2]);

		indOffset += length+1;

		// hex walls
		if (height > -4) {
			for (var i = 0; i < length; i++) {
				var point = orderedPoints[i];
				var nextPoint = i < length-1 ? orderedPoints[i+1] : orderedPoints[0];

				var wallNormal = glMatrix.vec3.create();
				glMatrix.vec3.add(wallNormal, point, nextPoint);
				glMatrix.vec3.div(wallNormal, wallNormal, [2, 2, 2]);
				glMatrix.vec3.sub(wallNormal, wallNormal, hexCentre);
				glMatrix.vec3.normalize(wallNormal, wallNormal);

				vertices.push(
					point[0]*hexElevation, point[1]*hexElevation, point[2]*hexElevation,
					point[0]*0.5, point[1]*0.5, point[2]*0.5,
					nextPoint[0]*hexElevation, nextPoint[1]*hexElevation, nextPoint[2]*hexElevation,
					nextPoint[0]*0.5, nextPoint[1]*0.5, nextPoint[2]*0.5
					);
				colours.push(
					hexColour[0], hexColour[1], hexColour[2],
					hexColour[0], hexColour[1], hexColour[2],
					hexColour[0], hexColour[1], hexColour[2],
					hexColour[0], hexColour[1], hexColour[2]
					);
				normals.push(
					wallNormal[0], wallNormal[1], wallNormal[2],
					wallNormal[0], wallNormal[1], wallNormal[2],
					wallNormal[0], wallNormal[1], wallNormal[2],
					wallNormal[0], wallNormal[1], wallNormal[2]
					);

				indices.push(
					indOffset,
					indOffset+1,
					indOffset+2,

					indOffset+1,
					indOffset+2,
					indOffset+3
					);

				indOffset += 4;
			}
		}
	});

	return defineModel(vertices, colours, normals, indices);
}

var makePlanetWater = function(type, seed, size) {
	noise.seed(seed);
	var sphere = spheres[size];

	var vertices = [];
	var colours = [];
	var normals = [];
	var indices = [];

	var indOffset = 0;

	const scale = sphere.size;

	sphere.hexes.forEach(function(hex) {
		const height = heightNoise(hex.centre[0], hex.centre[1], hex.centre[2], type.heightOffset);
		if (height >= 0) return;

		// order the points
		const length = hex.tris.length;

		var orderedPoints = [hex.tris[0].centre];
		while (orderedPoints.length < length) {
			var minDist = 10000;
			var point;

			for (var i = 1; i < length; i++) {
				if (orderedPoints.includes(hex.tris[i].centre)) continue;

				var directional = glMatrix.vec3.create();
				var dist = glMatrix.vec3.dist(hex.tris[i].centre, orderedPoints[orderedPoints.length-1]);

				if (dist < minDist) {
					minDist = dist;
					point = hex.tris[i].centre;
				}
			}

			orderedPoints.push(point);
		}
		
		// make the hex
		var hexCentre = glMatrix.vec3.create();

		for (var i = 0; i < length; i++) {
			var point = orderedPoints[i];

			glMatrix.vec3.add(hexCentre, hexCentre, point);

			vertices.push(point[0]*scale, point[1]*scale, point[2]*scale);
			colours.push(1, 0, 1);
			normals.push(hex.centre[0], hex.centre[1], hex.centre[2]);

			indices.push(
			indOffset+i,
			i === length-1 ? indOffset : indOffset+i+1,
			indOffset+length
			);
		}

		glMatrix.vec3.div(hexCentre, hexCentre, [length, length, length]);
		vertices.push(hexCentre[0]*scale, hexCentre[1]*scale, hexCentre[2]*scale);
		colours.push(1, 0, 1);
		normals.push(hex.centre[0], hex.centre[1], hex.centre[2]);

		indOffset += length+1;
	});

	return defineModel(vertices, colours, normals, indices);
}

var sphereTrisToMesh = function(sphere) {
	var vertices = [];
	var colours = [];
	var normals = [];
	var indices = [];

	var indOffset = 0;

	const scale = sphere.size;

	sphere.tris.forEach(function(tri) {
		var points = [tri.a, tri.b, tri.c];

		for (var i = 0; i < 3; i++) {
			var point = points[i];

			vertices.push(point[0], point[1], point[2]);
			colours.push(1.0, 1.0, 1.0);
			normals.push(tri.centre[0], tri.centre[1], tri.centre[2]);
		}

		indices.push(indOffset, indOffset+1, indOffset+2);
		indOffset = indOffset+3;
	});

	return defineModel(vertices, colours, normals, indices);
}


// MAKE ARCHETYPE SPHERES
var spheres = [];

// define primary sphere
(function() {
	var points = [
		[0, -1, 0],
		[0.723600, -0.447215, 0.525720],
		[-0.276385, -0.447215, 0.850640],
		[-0.894425, -0.447215, 0],
		[-0.276385, -0.447215, -0.850640],
		[0.723600, -0.447215, -0.525720],
		[0.276385, 0.447215, 0.850640],
		[-0.723600, 0.447215, 0.525720],
		[-0.723600, 0.447215, -0.525720],
		[0.276385, 0.447215, -0.850640],
		[0.894425, 0.447215, 0],
		[0, 1, 0]
	];

	var sphere = Sphere([
		Triangle(points[0], points[1], points[2]),
		Triangle(points[1], points[0], points[5]),
		Triangle(points[0], points[2], points[3]),
		Triangle(points[0], points[3], points[4]),
		Triangle(points[0], points[4], points[5]),
		Triangle(points[1], points[5], points[10]),
		Triangle(points[2], points[1], points[6]),
		Triangle(points[3], points[2], points[7]),
		Triangle(points[4], points[3], points[8]),
		Triangle(points[5], points[4], points[9]),
		Triangle(points[1], points[10], points[6]),
		Triangle(points[2], points[6], points[7]),
		Triangle(points[3], points[7], points[8]),
		Triangle(points[4], points[8], points[9]),
		Triangle(points[5], points[9], points[10]),
		Triangle(points[6], points[10], points[11]),
		Triangle(points[7], points[6], points[11]),
		Triangle(points[8], points[7], points[11]),
		Triangle(points[9], points[8], points[11]),
		Triangle(points[10], points[9], points[11])
		]);


	// populate the list
	sphere.dual();
	for (var i = 0; i < 3; i++) {
		sphere.dual();
		
		var copy = Object.assign({}, sphere);
		spheres.push(copy);
	}
})();
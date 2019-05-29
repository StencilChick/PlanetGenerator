var canvas;
var gl;

var model = null;
var water = null;

window.onload = function() {
	canvas = document.querySelector('canvas');
	gl = canvas.getContext('webgl', {premultipliedAlpha: false});

	var ext = gl.getExtension('OES_element_index_uint');


	// shader
	const programme = makeShaderProgramme(gl, vShader, fShader);
	gl.useProgram(programme.source);
	gl.uniformMatrix4fv(programme.uniformLocs.perspective, false, makePerspectiveMatrix(45*Math.PI/180, canvas.clientWidth/canvas.clientHeight, 0.1, 100.0));
	//gl.uniformMatrix4fv(programme.uniformLocs.view, false, makeViewMatrix(16.0, 0, 0));

	gl.uniform3fv(programme.uniformLocs.ambient, [0.3, 0.3, 0.3]);
	gl.uniform3fv(programme.uniformLocs.directionalColour, [0.95, 0.95, 0.95]);

	// set up yonder rendering
	gl.clearColor(0.09, 0.09, 0.09, 0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// loop
	generatePlanet();

	setupControls();

	var modelMatrix = glMatrix.mat4.create();

	var loop = function() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.uniformMatrix4fv(programme.uniformLocs.view, false, makeViewMatrix(16.0, cameraAngleX, cameraAngleY));

		// draw the thing
		glMatrix.mat4.rotate(modelMatrix, modelMatrix, 0.001, [0, 1, 0]);
		model.transform = modelMatrix;

		model.bindShaderAttribs(programme);
		gl.drawElements(gl.TRIANGLES, model.length, gl.UNSIGNED_INT, 0);

		if (water !== null) {
			gl.depthMask(false);
			water.transform = modelMatrix;
			water.bindShaderAttribs(programme);
			gl.drawElements(gl.TRIANGLES, water.length, gl.UNSIGNED_INT, 0);
			gl.depthMask(true);
		}

		requestAnimationFrame(loop);
	}
	requestAnimationFrame(loop);
}

// CONTROLS
var dragging = false;

var cameraZoom = 16;

var cameraAngleX = 0;
var cameraAngleY = 0;

var setupControls = function() {
	canvas.addEventListener('mousedown', function() {
		dragging = true;
	});
	document.body.addEventListener('mouseup', function() {
		dragging = false;
	});

	canvas.addEventListener('mousemove', function(event) {
		if (!dragging) return;

		cameraAngleX -= 0.025 * event.movementX;
		if (cameraAngleX >= 2*Math.PI) cameraAngleX -= 2*Math.PI;
		if (cameraAngleX < 0) cameraAngleX += 2*Math.PI;

		cameraAngleY += 0.0125 * event.movementY;
		if (cameraAngleY > 2*Math.PI/5) cameraAngleY = 2*Math.PI/5;
		if (cameraAngleY < -2*Math.PI/5) cameraAngleY = -2*Math.PI/5;
	});


	document.querySelector('#seed').addEventListener('change', generatePlanet);
	document.querySelector('#size').addEventListener('change', generatePlanet);
	document.querySelector('#type').addEventListener('change', generatePlanet);
	document.querySelector('#random').addEventListener('click', randomPlanet);
}


var generatePlanet = function() {
	if (model !== null) {
		model.delete();
	}
	if (water !== null) {
		water.delete();
		water = null;
	}

	var seed = document.querySelector('#seed').value;
	var size = document.querySelector('#size').value;
	var type = planetTypes[document.querySelector('#type').value];

	model = makePlanetModel(type, seed, size);

	// if should water
	if (type.water) {
		water = makePlanetWater(type, seed, size);
	}

	if (type.atmo) {
		var imgName;
		if (size == 2) {
			imgName = 'url("./images/atmo_large.png")';
		} else if (size == 1) {
			imgName = 'url("./images/atmo_small.png")';
		} else {
			imgName = 'url("./images/atmo_moon.png")';
		}
		canvas.style.background = imgName + ' no-repeat';
	} else {
		canvas.style.background = '';
	}
}

var randomPlanet = function() {
	document.querySelector('#seed').value = Math.floor(Math.random() * 65001);
	document.querySelector('#size').value = Math.floor(Math.random() * 3);
	document.querySelector('#type').value = Math.floor(Math.random() * planetTypes.length);

	generatePlanet();
}


// MODEL FUNCTIONS
var defineModel = function(
	vertices=[-1.0,-1.0,0.0,1.0,-1.0,0.0,1.0,1.0,0.0,-1.0,1.0,0.0],
	colours=[1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
	normals=[0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0],
	indices=[0,1,2,0,2,3]
	) {
	const vertexBuffer = gl.createBuffer();
	const colourBuffer = gl.createBuffer();
	const normalBuffer = gl.createBuffer();
	const indexBuffer = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colours), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

	return {
		vertex: vertexBuffer,
		colour: colourBuffer,
		normal: normalBuffer,
		index: indexBuffer,
		length: indices.length,

		transform: glMatrix.mat4.create(),

		bindShaderAttribs: function(programme) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex);
			gl.vertexAttribPointer(programme.attribLocs.position, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(programme.attribLocs.position);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.colour);
			gl.vertexAttribPointer(programme.attribLocs.colour, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(programme.attribLocs.colour);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.normal);
			gl.vertexAttribPointer(programme.attribLocs.normal, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(programme.attribLocs.normal);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index);
			gl.uniformMatrix4fv(programme.uniformLocs.model, false, this.transform);
		},

		delete: function() {
			gl.deleteBuffer(this.vertex);
			gl.deleteBuffer(this.colour);
			gl.deleteBuffer(this.normal);
			gl.deleteBuffer(this.index);
		}
	};
}

// SHADER FUNCTIONS
var makeShaderProgramme = function(gl, vSource, fSource) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fSource);

	const programme = gl.createProgram();
	gl.attachShader(programme, vertexShader);
	gl.attachShader(programme, fragmentShader);
	gl.linkProgram(programme);

	if (!gl.getProgramParameter(programme, gl.LINK_STATUS)) {
		alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(programme));
		return null;
	}

	const programmeInfo = {
		source: programme,
		attribLocs: {
			position: gl.getAttribLocation(programme, 'position'),
			colour: gl.getAttribLocation(programme, 'colour'),
			normal: gl.getAttribLocation(programme, 'normal')
		},
		uniformLocs: {
			perspective: gl.getUniformLocation(programme, 'perspective'),
			view: gl.getUniformLocation(programme, 'view'),
			model: gl.getUniformLocation(programme, 'model'),
			ambient: gl.getUniformLocation(programme, 'ambient'),
			directionalColour: gl.getUniformLocation(programme, 'directionalColour')
		}
	};

	return programmeInfo;
}

var loadShader = function(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

var makePerspectiveMatrix = function(fov, aspect, near, far) {
	const matrix = glMatrix.mat4.create();
	glMatrix.mat4.perspective(matrix, fov, aspect, near, far);
	return matrix;
}

var makeViewMatrix = function(zoom, angleX, height) {
	var position = [0, 0, 1];
	glMatrix.vec3.rotateY(position, position, [0, 0, 0], angleX);
	position[1] = height;
	glMatrix.vec3.normalize(position, position);
	glMatrix.vec3.mul(position, position, [zoom, zoom, zoom]);

	const matrix = glMatrix.mat4.create();
	glMatrix.mat4.lookAt(matrix, position, [0, 0, 0], [0, 1, 0]);

	return matrix;
}


// THE SHADERS
const vShader = `
	attribute vec3 position;
	attribute vec3 colour;
	attribute vec3 normal;

	uniform mat4 perspective;
	uniform mat4 view;
	uniform mat4 model;

	uniform vec3 ambient;
	uniform vec3 directionalColour;

	varying highp vec3 lighting;
	varying highp vec3 tone;

	void main() {
		gl_Position = perspective * view * model * vec4(position, 1);

		tone = colour;

		// calculate lighting
		highp vec3 directionalVector = normalize(vec3(0.55, 0, 0.75));
		highp vec4 transformedNormal = model * vec4(normal, 1);

		highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
		lighting = ambient + directionalColour*directional;
	}
`;
const fShader = `
	varying highp vec3 lighting;
	varying highp vec3 tone;

	void main() {
		if (tone == vec3(1, 0, 1)) {
			// transparent water
			gl_FragColor = vec4(vec3(0.36, 0.67, 0.95) * lighting, 0.9);
			return;
		}

		gl_FragColor = vec4(tone * lighting, 1.0);
	}
`;
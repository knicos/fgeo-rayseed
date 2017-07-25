const Ray = require('./ray.js');
const Viewport = require('./viewport.js');
const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;

let rays = [];
let swidth = 0;
let sheight = 0;

function initGL(canvas) {
	// WebGL INIT
	let gl = canvas.getContext("webgl");
	//gl.clearColor(0.0,0.0,0.0, 1.0);
	//gl.enable(gl.DEPTH_TEST);
	//gl.viewportWidth = canvas.width;
	//gl.viewportHeight = canvas.height;

	//canvas.shader = initShaders(gl);
	return gl;
}

function initShaders(gl) {
	let fragmentShader = getShader(gl, `
precision mediump float;

// our texture
uniform sampler2D u_image;
uniform highp vec2 u_resolution;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
	//vec2 offset = vec2(1.0 / 640.0, 1.0 / 480.0);
	vec2 offset = 1.0 / u_resolution;

	vec4 myColour = texture2D(u_image, v_texCoord);
	vec3 P0 = myColour.rgb;
	vec4 P1 = texture2D(u_image, vec2(v_texCoord.x - offset.x, v_texCoord.y));
	vec4 P2 = texture2D(u_image, vec2(v_texCoord.x + offset.x, v_texCoord.y));
	vec4 P3 = texture2D(u_image, vec2(v_texCoord.x, v_texCoord.y - offset.y));
	vec4 P4 = texture2D(u_image, vec2(v_texCoord.x, v_texCoord.y + offset.y));

	vec4 P5 = texture2D(u_image, vec2(v_texCoord.x - offset.x, v_texCoord.y - offset.y));
	vec4 P6 = texture2D(u_image, vec2(v_texCoord.x + offset.x, v_texCoord.y - offset.y));
	vec4 P7 = texture2D(u_image, vec2(v_texCoord.x + offset.x, v_texCoord.y + offset.y));
	vec4 P8 = texture2D(u_image, vec2(v_texCoord.x - offset.x, v_texCoord.y + offset.y));

	vec3 N1 = normalize(cross(P1.rgb-P0,P3.rgb-P0))*P1.a*P3.a;
	vec3 N2 = normalize(cross(P2.rgb-P0,P4.rgb-P0))*P2.a*P4.a;
	vec3 N3 = normalize(cross(P1.rgb-P0,P4.rgb-P0))*P1.a*P4.a;
	vec3 N4 = normalize(cross(P2.rgb-P0,P3.rgb-P0))*P2.a*P3.a;

	vec3 N5 = normalize(cross(P5.rgb-P0,P6.rgb-P0))*P5.a*P6.a;
	vec3 N6 = normalize(cross(P5.rgb-P0,P8.rgb-P0))*P5.a*P8.a;
	vec3 N7 = normalize(cross(P6.rgb-P0,P7.rgb-P0))*P6.a*P7.a;
	vec3 N8 = normalize(cross(P8.rgb-P0,P7.rgb-P0))*P8.a*P7.a;
	
	vec3 N = normalize(N1-N3+N2-N4+N5-N6+N7-N8);

	vec3 uAmbientColor = vec3(0.2,0.2,0.2);
	vec3 uPointLightingColor = vec3(1.0,0.8,0.8);

	vec3 lightWeighting;
      vec3 lightDirection = normalize(vec3(1.0,0.2,-0.2)); //normalize(uPointLightingLocation - vPosition.xyz);

      float directionalLightWeighting = max(dot(N, lightDirection), 0.0);
      lightWeighting = uAmbientColor + uPointLightingColor * directionalLightWeighting;

   //gl_FragColor = vec4(nx,ny,nz,1.0);
	if (myColour.a != 1.0) {
		gl_FragColor = vec4(44.0/255.0, 62.0/255.0, 80.0/255.0,1.0);
	} else {
		gl_FragColor = vec4(vec3(1.0,0.9,0.0) * lightWeighting, 1.0);
	}
}
`, "fragment");

	let vertexShader = getShader(gl, `
attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_resolution;

varying vec2 v_texCoord;

void main() {
   // convert the rectangle from pixels to 0.0 to 1.0
   vec2 zeroToOne = a_position / u_resolution;

   // convert from 0->1 to 0->2
   vec2 zeroToTwo = zeroToOne * 2.0;

   // convert from 0->2 to -1->+1 (clipspace)
   vec2 clipSpace = zeroToTwo - 1.0;

   gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

   // pass the texCoord to the fragment shader
   // The GPU will interpolate this value between points.
   v_texCoord = a_texCoord;
}
`, "vertex");
	
	let shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert("Could not initialise shaders");
    }

    //gl.useProgram(shaderProgram);
	return shaderProgram;
}

function getShader(gl, str, kind) {
      var shader;
      if (kind == "fragment") {
          shader = gl.createShader(gl.FRAGMENT_SHADER);
      } else if (kind == "vertex") {
          shader = gl.createShader(gl.VERTEX_SHADER);
      } else {
          return null;
      }

      gl.shaderSource(shader, str);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          alert(gl.getShaderInfoLog(shader));
          return null;
      }

      return shader;
  }

function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ]), gl.STATIC_DRAW);
}

function setupGL(canvas, gl, program) {
	var positionLocation = gl.getAttribLocation(program, "a_position");
  	var texcoordLocation = gl.getAttribLocation(program, "a_texCoord");

  // Create a buffer to put three 2d clip space points in
  var positionBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Set a rectangle the same size as the image.
  setRectangle(gl, 0, 0, canvas.width, canvas.height);

  // provide texture coordinates for the rectangle.
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0,  0.0,
      1.0,  0.0,
      0.0,  1.0,
      0.0,  1.0,
      1.0,  0.0,
      1.0,  1.0,
  ]), gl.STATIC_DRAW);

  // Create a texture.
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // lookup uniforms
  var resolutionLocation = gl.getUniformLocation(program, "u_resolution");

// Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Clear the canvas
  gl.clearColor(44/255, 62/255, 80/255, 1.0);
  //gl.clear(gl.COLOR_BUFFER_BIT);

  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);

  // Turn on the position attribute
  gl.enableVertexAttribArray(positionLocation);

  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      positionLocation, size, type, normalize, stride, offset)

  // Turn on the teccord attribute
  gl.enableVertexAttribArray(texcoordLocation);

  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

  // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      texcoordLocation, size, type, normalize, stride, offset)

  // set the resolution
  gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
}

function render(gl, image, canvas) {
  gl.clear(gl.COLOR_BUFFER_BIT);
  var ext = gl.getExtension('OES_texture_float');

	// Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.FLOAT, image);

  // Draw the rectangle.
  var primitiveType = gl.TRIANGLES;
  var offset = 0;
  var count = 6;
  gl.drawArrays(primitiveType, offset, count);
	//console.log("RENDER", image);
}

function make(vp) {
	var rays = [];

	for (var j=0; j<vp.height; j++) {
		var line = [];
		for (var i=0; i<vp.width; i++) {
			var n = new Ray(i, j);
			line.push(n);
		}
		rays.push(line);
	}

	for (var j=0; j<vp.height; j++) {
		var line = rays[j];
		for (var i=0; i<vp.width; i++) {
			var n = line[i];
			n.neighbours = neighbours(rays, n);
		}
	}

	return rays;
}

function reset(rays, vp, matrix) {
	var cam = vec3.create();
	var cam2 = vec3.create();
	var eye = vec3.create();

	vec3.set(eye, 0,0,0);
	if (matrix) vec3.transformMat4(eye, eye, matrix);

	var up = vec3.create();
	vec3.set(up, 0, 1, 0);
	//vec3.normalize(up,up);

	var view = vec3.create();
	var center = vec3.create();
	vec3.set(center, 0,0,0);
	vec3.set(view, eye[0], eye[1], eye[2]);
	vec3.subtract(view,view,center);
	vec3.normalize(view,view);
	var right = vec3.create();
	vec3.cross(right, view, up);
	vec3.normalize(right,right);
	vec3.cross(up, right, view);
	vec3.normalize(up,up);

	var range = vp.bound[1] - vp.bound[0];
	var dres = vp.dres;
	var dx = (range * (1 / vp.width));
	var dy = (range * (1 / vp.height));

	var tx = vp.bound[0];
	var ty = vp.bound[0];

	const eyeX = eye[0];
	const eyeY = eye[1];
	const eyeZ = eye[2];
	const rightX = right[0];
	const rightY = right[1];
	const rightZ = right[2];

	var clip = vp.count*vp.nearClip;

	for (var j=0; j<vp.height; j++) {
		var l = rays[j];
		var py = ty * vp.fovtan;
		tx = vp.bound[0];

		let dirXY = up[0]*py-view[0];
		let dirYY = up[1]*py-view[1];
		let dirZY = up[2]*py-view[2];

		for (var i=0; i<vp.width; i++) {
			var n = l[i];

			var px = tx * vp.fovtan * vp.aspect;
			tx += dx;

			let dirXX = (rightX*px+dirXY)*dres;
			let dirYX = (rightY*px+dirYY)*dres;
			let dirZX = (rightZ*px+dirZY)*dres;

			n.setPosition(eyeX+dirXX*clip,eyeY+dirYX*clip,eyeZ+dirZX*clip);
			n.setDeltas(dirXX,dirYX,dirZX);
		}

		ty += dy;
	}
}


/*function step(vp, func) {
	var results = [];
	var ncells = [];

	for (var i=0; i<cells.length; i++) {
		let cell = cells[i];
		cell.test(func, vp);

		if (cell.ray.lastres < 0) {
			ctx.fillStyle = "black";
			ctx.fillRect(cell.sx, cell.sy, cell.sizeX, cell.sizeY);
		}

		if (cell.doChildren) {
			if (cell.sizeX > 1) {
				results.push(cell);
				ncells.push.apply(ncells, cell.makeChildren(vp, func));
			}
			ncells.push.apply(ncells, cell.getSibblingChildren(vp, func));
		}
	}

	cells = ncells;
	//console.log("Results", results);
	//console.log("New Cells", cells);
	return results;
}*/

var odata;

function seed(rays, q, gap) {
	for (var y=0; y<rays.length; y+=gap) {
		let line = rays[y];
		for (var x=0; x<line.length; x+=gap) {
			q.push(line[x]);
		}
	}
}

function neighbours(rays, ray) {
	var x = ray.sx;
	var y = ray.sy;
	var n = [];
	if (x > 0) n.push(rays[y][x-1]);
	if (x < rays[y].length-1) n.push(rays[y][x+1]);
	if (y > 0) n.push(rays[y-1][x]);
	if (y < rays.length-1) n.push(rays[y+1][x]);
	return n;
}

function process(rays, q, vp, f, multiplier) {
	var maxq = 0;
	//var nq = [];
	//for (var i=0; i<q.length; i++) {
	while (q.length > 0) {
		if (q.length > maxq) maxq = q.length;
		var ray = q.pop();
		var r = ray.march(vp, f, multiplier);
		if (r) {
			// Add all unvisited neighbours
			var n = ray.neighbours; //neighbours(rays, q[i]);
			//console.log("Neighbours", n);
			for (var j=0; j<n.length; j++) {
				if (n[j].visited === false || n[j].count > ray.count) {
					q.push(n[j]);
					n[j].visited = true;
					// Make sure neighbours are moved to correct location	
					n[j].moveTo(ray.count);
					//n[j].reverseMarch(vp, f, 1);
				}
			}
		}
	}

	//return nq;
}

function processResults(vp, rays, odata) {
	if (rays.length == 0) return;

	//var odata = idata.data;

	var scale = 255 / vp.count;

	for (var i=0; i<rays.length; i++) {
		let ray = rays[i];
		if (ray.visited === false) continue;
		//if (ray.count < 0) ray.count = 0;

		//var ix = results[i][0];
		var ix = ray.sx + ray.sy * vp.width; //(results[i].cx+1)*(swidth/2) + (results[i].cy+1)*(sheight/2) * swidth;
		/*var bw = Math.floor((vp.count - ray.count) * scale);
		odata[ix*4] = bw;
		odata[ix*4+1] = bw;
		odata[ix*4+2] = bw;
		odata[ix*4+3] = 255;*/

		//odata[ix] = ray.count / vp.count; //(ray.z + 1.0) / 2.0;

		odata[ix*4] = ray.x;
		odata[ix*4+1] = ray.y;
		odata[ix*4+2] = ray.z;
		odata[ix*4+3] = 1.0;
	}

	//ctx.putImageData(idata, 0, 0);
}

function renderTexture(vp, rays, odata) {
	if (rays.length == 0) return;

	//var odata = idata.data;

	var scale = 255 / vp.count;

	for (var i=0; i<rays.length; i++) {
	let line = rays[i];
	for (var j=0; j<line.length; j++) {
		let ray = line[j];
		var ix = ray.sx + ray.sy * vp.width;

		if (ray.visited === false || ray.value < 0) {
			odata[ix*4+3] = 0.0;
			continue;
		}

		//var ix = results[i][0];
		 //(results[i].cx+1)*(swidth/2) + (results[i].cy+1)*(sheight/2) * swidth;
		/*var bw = Math.floor((vp.count - ray.count) * scale);
		odata[ix*4] = bw;
		odata[ix*4+1] = bw;
		odata[ix*4+2] = bw;
		odata[ix*4+3] = 255;*/

		//odata[ix] = ray.count / vp.count; //(ray.z + 1.0) / 2.0;

		odata[ix*4] = ray.x;
		odata[ix*4+1] = ray.y;
		odata[ix*4+2] = ray.z;
		odata[ix*4+3] = 1.0;
	}
	}

	//ctx.putImageData(idata, 0, 0);
}

function Tracer(output, options) {
	this.options = options;
	this.gl = output.getContext("webgl");
	this.program = initShaders(this.gl);

	var bound = (options.boundary) ? options.boundary : [-1,1];
	var fov = (options.fov) ? options.fov : 45;
	var dres = (options.depthResolution) ? options.depthResolution : 100;

	this.sample = (options.sample) ? options.sample : 8;
	this.progressive = (options.progressive) ? options.progressive : false;

	this.width = output.width;
	this.height = output.height;
	this.viewport = new Viewport(fov, this.width, this.height, dres, bound);

	setupGL(output, this.gl, this.program);

	this.rays = make(this.viewport);
	this.odata = new Float32Array(this.viewport.width*this.viewport.height*4);
	this.q = [];
}

global.samples = 0;

Tracer.prototype.render = function(f, matrix) {
	console.time("trace");

	//console.time("make");
	var rays = this.rays;
	reset(rays, this.viewport, matrix);
	var q = this.q;
	//console.timeEnd("make");

	//samples = 0;

	seed(rays, q, this.sample);

	/*q = q.sort(function(a,b) {
		return a.count - b.count;
	});*/

	//var oq = q;
	process(rays, q, this.viewport, f, 1); //this.sample);
	//processResults(this.viewport, oq, this.odata);
	renderTexture(this.viewport, rays, this.odata);
	console.timeEnd("trace");
	//console.log("Samples per pixel", samples / (this.viewport.width*this.viewport.height));
	render(this.gl, this.odata, this.viewport);

	/*if (!this.progressive) {
		while (q.length > 0) {
			var oq = q;
			q = process(rays, q, this.viewport, f, 1);
			//console.log("Res length",q.length);
			//processResults(this.viewport, oq, this.odata);
		}

		renderTexture(this.viewport, rays, this.odata);

		console.timeEnd("trace");
		//console.log("Samples per pixel", samples / (this.viewport.width*this.viewport.height));
		render(this.gl, this.odata, this.viewport);
	} else {
		var me = this;

		function processLoop() {
			var oq = q;
			q = process(rays, q, me.viewport, f, 1);
			//console.log("Res length",q.length);
			processResults(me.viewport, oq, me.odata);
			//ctx.putImageData(idata, 0, 0);
			render(me.gl, me.odata, output);

			if (q.length > 0) setTimeout(processLoop, 0);
			else console.timeEnd("trace");
		}
		setTimeout(processLoop,0);
	}*/
}



module.exports = Tracer;
Tracer.glmatrix = require("gl-matrix");


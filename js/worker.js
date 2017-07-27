const Ray = require('./ray.js');
const Viewport = require('./viewport.js');
const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;
const ClassicalNoise = require('./noise.js');
noise = new ClassicalNoise();

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

function CSGUnion(a,b) {
		return Math.max(a,b);
	}

	function CSGSubtract(a,b) {
		return Math.min(a,-b);
	}

	function CSGSphere(x, center, R) {
		var x0, x1, x2;
		x0 = x[0] - center[0];
		x1 = x[1] - center[1];
		x2 = x[2] - center[2];
		return (R*R) - (x0*x0) - (x1*x1) - (x2*x2);
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

		var dirXY = up[0]*py-view[0];
		var dirYY = up[1]*py-view[1];
		var dirZY = up[2]*py-view[2];

		for (var i=0; i<vp.width; i++) {
			var n = l[i];

			var px = tx * vp.fovtan * vp.aspect;
			tx += dx;

			var dirXX = (rightX*px+dirXY)*dres;
			var dirYX = (rightY*px+dirYY)*dres;
			var dirZX = (rightZ*px+dirZY)*dres;

			n.setPosition(eyeX+dirXX*clip,eyeY+dirYX*clip,eyeZ+dirZX*clip);
			n.setDeltas(dirXX,dirYX,dirZX);
		}

		ty += dy;
	}
}

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
	//var maxq = 0;
	//var nq = [];
	//for (var i=0; i<q.length; i++) {
	var i=0;

	while (i < q.length) {
		//if (q.length > maxq) maxq = q.length;
		var ray = q[i++];
		var r = ray.march(vp, f, multiplier);
		if (r) {
			// Calculate colours
			//if (tf) updateColour(ray);
			// Update depth texture
			//updateDepth(ray);

			// Add all unvisited neighbours
			var n = ray.neighbours; //neighbours(rays, q[i]);
			//console.log("Neighbours", n);
			for (var j=0; j<n.length; j++) {
				var ni = n[j];
				if (ni.visited === false || ni.count > ray.count) {
					q.push(ni);
					ni.visited = true;
					// Make sure neighbours are moved to correct location	
					ni.moveTo(ray.count);
					//n[j].reverseMarch(vp, f, 1);
				}
			}
		}

		/*q = q.sort(function(a,b) {
			return a.count - b.count;
		});*/
	}

	//console.log("MaxQ", maxq);

	q.length = 0;

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

function updateDepth(ray) {
	var ix = ray.sx + ray.sy * viewport.width;
	odata[ix*4] = ray.x;
	odata[ix*4+1] = ray.y;
	odata[ix*4+2] = ray.z;
	odata[ix*4+3] = 1.0;
}

function updateColour(ray) {
	var i = ray.sx + ray.sy * viewport.width;
	var [r,g,b] = tf(ray.x,ray.y,ray.z);
	tdata[i*3] = r;
	tdata[i*3+1] = g;
	tdata[i*3+2] = b;
}

function renderTextures(vp, rays, odata, tdata) {
	for (var i=0; i<rays.length; i++) {
	let line = rays[i];
	for (var j=0; j<line.length; j++) {
		let ray = line[j];

		if (ray.visited === false || ray.value < 0) {
			//odata[ix*4+3] = 0.0;
			continue;
		}

		var ix = ray.sx + ray.sy * vp.width;

		// Depth texture
		odata[ix*4] = ray.x;
		odata[ix*4+1] = ray.y;
		odata[ix*4+2] = ray.z;
		odata[ix*4+3] = 1.0;

		// Calculate shadows here...

		// Colour texture
		var [r,g,b] = tf(ray.x,ray.y,ray.z);
		tdata[ix*3] = r;
		tdata[ix*3+1] = g;
		tdata[ix*3+2] = b;
	}
	}
}

var rays = [];
var viewport = null;
var q = [];
var sample = 8;
var f = null;
var tf = null;
var p = null;
var odata = null;
var tdata = null;

function render(f, matrix) {
	odata = new Float32Array(viewport.width*viewport.height*4);
	tdata = new Uint8Array(viewport.width*viewport.height*3);

	reset(rays, viewport, matrix);
	seed(rays, q, sample);

	console.time("trace");
	process(rays, q, viewport, f, 1);
	console.timeEnd("trace");

	renderTextures(viewport, rays, odata, tdata);

	postMessage({cmd: "frame", depthTexture: odata, colourTexture: tdata});
}

onmessage = function(e) {
	var res;

	switch(e.data.cmd) {
	case "viewport"	:	viewport = new Viewport(e.data.fov, e.data.width, e.data.height,
							e.data.dres, e.data.bound);
						rays = make(viewport);
						break;
	case "register"	:	f = eval("("+e.data.source+")"); p = e.data.params; break;
	case "material"	:	tf = eval("("+e.data.source+")"); break;
	case "render"	:	render(f, e.data.matrix); break;
	}
}

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
	var [r,g,b] = tf.call(ray,ray.x,ray.y,ray.z);
	tdata[i*3] = r;
	tdata[i*3+1] = g;
	tdata[i*3+2] = b;
}

function calculateNormals(rays) {
	for (var y=0; y<rays.length; y++) {
		var l = rays[y];
		for (var x=0; x<l.length; x++) {
			var ray = l[x];

			for (var i=0; i<ray.neighbours.length; i++) {
				
			}
		}
	}
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
		odata[ix*4] = (ray.x - vp.bound[0]) / vp.range;
		odata[ix*4+1] = (ray.y - vp.bound[0]) / vp.range;
		odata[ix*4+2] = (ray.z - vp.bound[0]) / vp.range;
		odata[ix*4+3] = 1.0;

		// Calculate shadows here...

		// Colour texture
		var [r,g,b] = tf.call(ray, ray.x,ray.y,ray.z);
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

let jitter = [];

function poisson(mean) {
	var L = Math.exp(-mean);
	var p = 1.0;
	var k=0;
	do {
		k++;
		p*=Math.random();
	} while (p > L);
	return k-1;
}

for (var i=0; i<32; i++) {
	jitter.push([
		(poisson(5)-5) / 5,
		(poisson(5)-5) / 5,
		(poisson(5)-5) / 5
	]);
}

function sampleF(viewport, sample, x, y, z, w, h, d) {
	let sx = ((x - viewport.bound[0]) / viewport.range) * w;
	let sy = ((y - viewport.bound[0]) / viewport.range) * h;
	let sz = ((z - viewport.bound[0]) / viewport.range) * d;

	let ix = Math.round(sx) + Math.round(sy)*w + Math.round(sz)*w*h;
	return [sample[ix*2],sample[ix*2+1]];
}

function createSampleF(viewport, f, w, h, d) {
	const dx = viewport.range / w;
	const dy = viewport.range / h;
	const dz = viewport.range / d;

	const sx = viewport.bound[0];
	const sy = viewport.bound[0];
	const sz = viewport.bound[0];

	let x = sx;
	let y = sy;
	let z = sz;

	let result = new Float32Array(new ArrayBuffer(w*h*d*4*2));
	let ix = 0;
	let attrib = {};
	let r = 0;

	for (var i=0; i<d; i++) {
		y = sy;
		result[i] = [];
		for (var j=0; j<h; j++) {
			x = sx;
			result[i][j] = [];
			for (k=0; k<w; k++) {
				result[ix++] = f.call(attrib, x,y,z);
				result[ix++] = attrib.attribute;
				//result[ix++] = (r >= 0) ? attrib.attribute : -1;
				x += dx;
			}
			y += dy;
		}
		z += dz;
	}

	return result;
}

function render(f, matrix) {
	const doshadows = true;

	odata = new Float32Array(new ArrayBuffer(viewport.width*viewport.height*4*4));
	tdata = new Uint8Array(new ArrayBuffer(viewport.width*viewport.height*3));
	sdata = new Float32Array(new ArrayBuffer(viewport.width*viewport.height*4));

	reset(rays, viewport, matrix);
	seed(rays, q, sample);

	console.time("shape");
	process(rays, q, viewport, f, 1);
	console.timeEnd("shape");

	console.time("textures")
	renderTextures(viewport, rays, odata, tdata);
	console.timeEnd("textures");
	console.time("shadows");

	//var presample = createSampleF(viewport, f, 100, 100, 100);

	if (doshadows) {
		// For each pixel, do a low res resample towards light
		var l = viewport.width*viewport.height;
		var light = vec3.create();
		var lightSize = 0.3;
		vec3.set(light, 1, 0.1, 1);
		var i = 0;
		for (var y=0; y<viewport.height; y++) {
			var line = rays[y];
			for (var x=0; x<viewport.width; x++) {
				var ray = line[x];
				if (ray.value >= 0) {
					// Do a shadow ray to light+jitter
					var d = 0;
					for (var j=0; j<jitter.length; j++) {
						var r = Ray.createFromTo(viewport, [ray.x,ray.y,ray.z],
							[light[0]+jitter[j][0]*lightSize, light[1]+jitter[j][1]*lightSize, light[2]+jitter[j][2]*lightSize]);
						d += (r.distance(f, 2, viewport.count/2) > 0) ? 1 : 0;
					}
					d = d / jitter.length;
					if (d > 0) {
						var d2 = 0.8*d; // + (1.0 - 1.0 / (d*viewport.dres))*0.3;
						sdata[i] = d2;
						//tdata[i*3+1] *= d2;
						//tdata[i*3+2] *= d2;
					}
				}
				i++;
			}
		}
	}
	console.timeEnd("shadows");

	// Next calculate surface normals

	// Then generate reflection rays

	postMessage({cmd: "frame", depthTexture: odata, colourTexture: tdata, shadowTexture: sdata},[odata.buffer,tdata.buffer, sdata.buffer]);
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

const Ray = require('./ray.js');
const Viewport = require('./viewport.js');
const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;

let rays = [];
let swidth = 0;
let sheight = 0;


function make(vp) {
	var rays = [];
	var dres = vp.dres;
	var dx = ((vp.bound[1] - vp.bound[0]) / vp.width) * vp.aspect;
	var dy = (vp.bound[1] - vp.bound[0]) / vp.height;
	var ox = ((vp.bound[1] - vp.bound[0]) * vp.aspect - (vp.bound[1] - vp.bound[0])) / 2;

	var cam = vec3.create();


	for (var j=0; j<vp.height; j++) {
		var line = [];
		rays.push(line);
		for (var i=0; i<vp.width; i++) {
			var x = vp.bound[0] + i*dx - ox;
			var y = vp.bound[0] + j*dy;
			var n = new Ray(x, y, vp.nearClip, i, j);

			var px = ((vp.bound[1] - vp.bound[0]) * (i / vp.width) + vp.bound[0]) * vp.fovtan * vp.aspect;
			var py = ((vp.bound[1] - vp.bound[0]) * (j / vp.height) + vp.bound[0]) * vp.fovtan;

			vec3.set(cam, px,py,1);
			vec3.normalize(cam,cam);

			n.setDeltas(cam[0]*dres,cam[1]*dres,cam[2]*dres);

			line.push(n);
		}
	}
	//parent.children = cells;

	return rays;
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

var ctx;
var idata;

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
	var nq = [];
	for (var i=0; i<q.length; i++) {
		var r = q[i].march(vp, f, multiplier);
		if (r) {
			// Add all unvisited neighbours
			var n = neighbours(rays, q[i]);
			//console.log("Neighbours", n);
			for (var j=0; j<n.length; j++) {
				if (n[j].visited === false || n[j].count > q[i].count) {
					nq.push(n[j]);
					n[j].visited = true;
					// Make sure neighbours are moved to correct location	
					n[j].moveTo(q[i].count-multiplier);
				}
			}
		}
	}

	return nq;
}

function processResults(ctx, vp, rays) {
	if (rays.length == 0) return;

	var odata = idata.data;

	var scale = 256 / vp.count;

	for (var i=0; i<rays.length; i++) {
		let ray = rays[i];
		if (ray.visited === false) continue;

		//var ix = results[i][0];
		var ix = ray.sx + ray.sy * vp.width; //(results[i].cx+1)*(swidth/2) + (results[i].cy+1)*(sheight/2) * swidth;
		var bw = Math.floor((vp.count - ray.count) * scale);
		odata[ix*4] = bw;
		odata[ix*4+1] = bw;
		odata[ix*4+2] = bw;
		odata[ix*4+3] = 255;
	}

	//ctx.putImageData(idata, 0, 0);
}

function trace(output, f, options) {
	if (!options) options = {};
	var dres = (options.depthResolution) ? options.depthResolution : 100;
	ctx = output.getContext('2d');
	var odata = ctx.createImageData(output.width, output.height);
	var bound = (options.boundary) ? options.boundary : [-1,1];
	var fov = (options.fov) ? options.fov : 45;

	ctx.fillStyle = "black";
	ctx.fillRect(0,0,output.width,output.height);

	idata = ctx.getImageData(0,0,output.width, output.height);

	//resize(bound, fov, f, (bound[1] - bound[0]) / dres, output.width, output.height);

	swidth = output.width;
	sheight = output.height;
	var vp = new Viewport(fov, swidth, sheight, dres, bound);

	console.log("Resize", output.width, output.height);
	//console.log("Cells", cells);

	console.time("trace");

	var rays = make(vp);
	var q = [];

	seed(rays, q, 8);
	var oq = q;
	q = process(rays, q, vp, f, 8);
	processResults(ctx, vp, oq);

	// Sort the initial seed results?
	/*q = q.sort(function(a,b) {
		return b.count - a.count;
	});*/

	//console.log("Proc Seeds", q);

	while (q.length > 0) {
		var oq = q;
		q = process(rays, q, vp, f, 1);
		//console.log("Res length",q.length);
		processResults(ctx, vp, oq);
	}

	console.timeEnd("trace");
	ctx.putImageData(idata, 0, 0);

	/*function processLoop() {
		var oq = q;
		q = process(rays, q, vp, f, 1);
		//console.log("Res length",q.length);
		processResults(ctx, vp, oq);

		if (q.length > 0) setTimeout(processLoop, 0);
		else {
			console.timeEnd("trace");
			ctx.putImageData(idata, 0, 0);
		}
	}
	setTimeout(processLoop,0);*/
}

exports.trace = trace;
exports.glmatrix = require("gl-matrix");



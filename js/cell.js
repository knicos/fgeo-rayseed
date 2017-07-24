const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;
const Ray = require('./ray.js');

function Cell(vp, cx, cy, w, h) {
	this.children = [];
	this.parent = null;
	this.cx = cx;
	this.cy = cy;
	this.sizeX = w;
	this.sizeY = h;
	this.sx = 0;
	this.sy = 0;

	this.ray = new Ray(cx, cy, vp.nearClip);

	this.doChildren = false;
}

Cell.prototype.test = function (func, vp) {
	//var results = [];
	let ray = this.ray;

	var count = vp.count;
	while (count > 0) {
		//console.log("RAY");
		var res = func(ray.x, ray.y, ray.depth);
		ray.lastres = res;
		if (res >= 0) {
			this.doChildren = true;
			break;
		}

		ray.x += ray.dx;
		ray.y += ray.dy;
		ray.depth += ray.dz;
		//ray.checkClip(clip);
		count--;
	}

	//return results;
}

Cell.prototype.getSibblingChildren = function(vp, f) {
	var sibs = [];
	if (this.parent) {
		//console.log("Get Children");
		for (var i=0; i<this.parent.children.length; i++) {
			if (this.parent.children[i] !== this && this.parent.children[i].doChildren == false) {
				sibs.push.apply(sibs, this.parent.children[i].makeChildren(vp, f));
			}
		}
	}
	return sibs;
}

Cell.prototype.makeChildren = function(vp, f) {
	var cells = [];
	this.doChildren = true;
	var dres = vp.dres;
	var dx = ((vp.bound[1] - vp.bound[0]) / vp.width) * vp.aspect;
	var dy = (vp.bound[1] - vp.bound[0]) / vp.height;
	var ox = ((vp.bound[1] - vp.bound[0]) * vp.aspect - (vp.bound[1] - vp.bound[0])) / 2;

	var cam = vec3.create();

	var w = this.sizeX / 2;
	var h = this.sizeY / 2;

	var endX = (w == 1) ? this.sx+this.sizeX+1 : this.sx+this.sizeX;
	var endY = (h == 1) ? this.sy+this.sizeY+1 : this.sy+this.sizeY;

	for (var j=this.sy; j<endY; j+=h) {
	for (var i=this.sx; i<endX; i+=w) {
		var x = vp.bound[0] + i*dx - ox;
		var y = vp.bound[0] + j*dy;
		var n = new Cell(vp, x, y, w, h);
		n.parent = this;
		n.sx = i;
		n.sy = j;
		n.depth = this.depth - this.dz;

		var px = ((vp.bound[1] - vp.bound[0]) * (i / vp.width) + vp.bound[0]) * vp.fovtan * vp.aspect;
		var py = ((vp.bound[1] - vp.bound[0]) * (j / vp.height) + vp.bound[0]) * vp.fovtan;

		vec3.set(cam, px,py,1);
		vec3.normalize(cam,cam);

		n.ray.setDeltas(cam[0]*dres,cam[1]*dres,cam[2]*dres);
		//n.ray.init(f);
		cells.push(n);
	}
	}

	this.children = cells;
	return cells;
}

Cell.make = function(vp, w, h, f) {
	var cells = [];
	var dres = vp.dres;
	var dx = ((vp.bound[1] - vp.bound[0]) / vp.width) * vp.aspect;
	var dy = (vp.bound[1] - vp.bound[0]) / vp.height;
	var ox = ((vp.bound[1] - vp.bound[0]) * vp.aspect - (vp.bound[1] - vp.bound[0])) / 2;

	var cam = vec3.create();

	var cellsperline = vp.width / w;
	var parent = {};

	for (var j=h/2; j<vp.height; j+=h) {
	for (var i=w/2; i<vp.width; i+=w) {
		var x = vp.bound[0] + i*dx - ox;
		var y = vp.bound[0] + j*dy;
		var n = new Cell(vp, x, y, w, h);
		n.parent = parent;
		n.sx = i-w/2;
		n.sy = j-h/2;

		var px = ((vp.bound[1] - vp.bound[0]) * (i / vp.width) + vp.bound[0]) * vp.fovtan * vp.aspect;
		var py = ((vp.bound[1] - vp.bound[0]) * (j / vp.height) + vp.bound[0]) * vp.fovtan;

		vec3.set(cam, px,py,1);
		vec3.normalize(cam,cam);

		n.ray.setDeltas(cam[0]*dres,cam[1]*dres,cam[2]*dres);
		//n.ray.init(f);

		/*var ix = cells.length;
		var above = ix-cellsperline;
		var bellow = ix+cellsperline;
		var left = ix-1;
		var right = ix+1;

		if (above >= 0) n.neighbours.push(above);
		if (bellow < maxcells) n.neighbours.push(bellow);
		if (left >= 0) n.neighbours.push(left);
		if (right % cellsperline != 0) n.neighbours.push(right); */

		cells.push(n);
	}
	}
	parent.children = cells;

	return cells;
}

module.exports = Cell;


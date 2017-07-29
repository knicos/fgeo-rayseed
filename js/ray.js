const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;

function Ray(sx, sy) {
	this.x = 0;
	this.y = 0;
	this.z = 0;
	this.dx = 0;
	this.dy = 0;
	this.dz = 0.1;
	this.visited = false;
	this.value = -10000.0;
	this.count = 0;
	this.sx = sx;
	this.sy = sy;
	this.neighbours = null;
	this.doreset = true;
	this.attribute = 0;
	this.nx = 0.0;
	this.ny = 0.0;
	this.nz = 0.0;
}

Ray.distance = function(pos, dir, f, step, farclip) {
	var count = 0;

	//const lod = 0.1;
	const dxm = dir[0]*step;
	const dym = dir[1]*step;
	const dzm = dir[2]*step;

	let x = pos[0];
	let y = pos[1];
	let z = pos[2];

	while (count < farclip) {
		var res = f.call(null, x, y, z);

		if (res >= 0) {
			return count;
		}

		x += dxm; //*(1.0+lod*count);
		y += dym; //*(1.0+lod*count);
		z += dzm; //*(1.0+lod*count);
		count += step;
	}

	return -1;
}

Ray.intersection = function(out, oix, start, six, dir, dix, f, step, farclip) {
	var count = 0;

	//const lod = 0.1;
	const dxm = dir[dix]*step;
	const dym = dir[dix+1]*step;
	const dzm = dir[dix+2]*step;

	let x = start[six];
	let y = start[six+1];
	let z = start[six+2];

	while (count < farclip) {
		x += dxm;
		y += dym;
		z += dzm;
		count += step;

		var res = f.call(null, x, y, z);

		if (res >= 0) {
			out[oix] = x;
			out[oix+1] = y;
			out[oix+2] = z;
			return true;
		}
	}

	return false;
}

Ray.createFromTo = function(vp, from, to) {
	var dir = vec3.create();
	vec3.subtract(dir, from, to);
	vec3.normalize(dir,dir);
	var ray = new Ray(0,0);
	ray.dx = dir[0]*vp.dres;
	ray.dy = dir[1]*vp.dres;
	ray.dz = dir[2]*vp.dres;
	ray.x = from[0]+ray.dx;
	ray.y = from[1]+ray.dy;
	ray.z = from[2]+ray.dz;
	return ray;
}

/*Ray.prototype.checkClip = function(clip) {
	var res = this.x < clip[0] || this.x > clip[1] ||
		this.y < clip[0] || this.y > clip[1] ||
		this.depth > clip[1];
	if (res) this.active = false;
	return res;
}*/

Ray.prototype.setDeltas = function(dx,dy,dz) {
	this.dx = dx;
	this.dy = dy;
	this.dz = dz;
}

Ray.prototype.setPosition = function(x,y,z) {
	this.x = x;
	this.y = y;
	this.z = z;
	this.count = 0;
	this.value = -10000.0;
	this.visited = false;
}

Ray.prototype.moveTo = function(pos) {
	var multiplier = pos - this.count;
	this.x += this.dx*multiplier;
	this.y += this.dy*multiplier;
	this.z += this.dz*multiplier;
	this.count += multiplier;
}

Ray.prototype.distance = function(f, step, farclip) {
	var count = 0;

	//const lod = 0.1;
	const dxm = this.dx*step;
	const dym = this.dy*step;
	const dzm = this.dz*step;

	let x = this.x;
	let y = this.y;
	let z = this.z;

	while (count < farclip) {
		var res = f.call(this, x, y, z);

		if (res >= 0) {
			return count;
		}

		x += dxm; //*(1.0+lod*count);
		y += dym; //*(1.0+lod*count);
		z += dzm; //*(1.0+lod*count);
		count += step;
	}

	return -1;
}

/* March deeper from current point until intersection. */
Ray.prototype.march = function(vp, f, multiplier) {
	var count = 0;

	//const lod = 0.1;
	const dxm = this.dx*multiplier;
	const dym = this.dy*multiplier;
	const dzm = this.dz*multiplier;
	const maxcount = vp.count*1.0;

	let x = this.x;
	let y = this.y;
	let z = this.z;
	let a = [0];

	while (count < maxcount) {
		var res = f.call(this, x, y, z);

		if (res >= 0) {
			this.x = x;
			this.y = y;
			this.z = z;
			this.value = res;
			this.count += count;
			this.refine(f);
			return true;
		}

		x += dxm; //*(1.0+lod*count);
		y += dym; //*(1.0+lod*count);
		z += dzm; //*(1.0+lod*count);
		count += multiplier;
	}

	this.value = -1.0;
	this.x = x;
	this.y = y;
	this.z = z;
	this.count = maxcount+1;
	
	return false;
}

/* March towards camera at finer steps until surface found */
Ray.prototype.refine = function(f) {
	// LOD Experiment
	//let normcount = this.count / 100;
	let multiplier = 0.5; // + normcount*normcount*1.0;

	const dx = this.dx*multiplier;
	const dy = this.dy*multiplier;
	const dz = this.dz*multiplier;
	let tx = this.x;
	let ty = this.y;
	let tz = this.z;
	let dummy = {};

	let count = this.count;

	//this.visited = true;
	while (count > 0) {
		tx -= dx;
		ty -= dy;
		tz -= dz;
		var res = f.call(dummy, tx, ty, tz);
		//samples++;
		if (res < 0) {
			var total = this.value + Math.abs(res);
			var lerp = Math.abs(res) / total;
			multiplier = multiplier * lerp;
			this.x = tx+dx*lerp;
			this.y = ty+dy*lerp;
			this.z = tz+dz*lerp;
			this.count = count;
			return;
		}

		this.value = res;
		count -= multiplier;
	}
}

module.exports = Ray;


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

/* March deeper from current point until intersection. */
Ray.prototype.march = function(vp, f, multiplier) {
	//this.visited = true;
	var count = 0;

	while (count < vp.count*1.0) {
		//console.log("RAY");
		var res = f(this.x, this.y, this.z);
		this.value = res;
		if (res >= 0) {
			this.count += count;
			this.refine(f);
			return true;
		}

		this.x += this.dx*multiplier;
		this.y += this.dy*multiplier;
		this.z += this.dz*multiplier;
		//this.count += multiplier;
		count += multiplier;
	}
	
	return false;
}

Ray.prototype.reverseMarch = function(vp, f, multiplier) {
	//this.visited = true;
	while (this.count > 0) {
		//console.log("RAY");
		var res = f(this.x, this.y, this.z);
		this.value = res;
		if (res >= 0) {
			// TODO Refine...
			this.refine(f)
			return true;
		}

		this.x -= this.dx*multiplier;
		this.y -= this.dy*multiplier;
		this.z -= this.dz*multiplier;
		this.count -= multiplier;
	}
	
	return false;
}

/* March towards camera at finer steps until surface found */
Ray.prototype.refine = function(f) {
	let multiplier = 0.5;
	//this.visited = true;
	while (this.count > 0) {
		var tx = this.x - this.dx*multiplier;
		var ty = this.y - this.dy*multiplier;
		var tz = this.z - this.dz*multiplier;
		var res = f(tx, ty, tz);
		if (res < 0) {
			var total = this.value + Math.abs(res);
			var lerp = this.value / total;
			multiplier = multiplier * lerp;
			this.x -= this.dx*multiplier;
			this.y -= this.dy*multiplier;
			this.z -= this.dz*multiplier;
			return;
		}

		this.value = res;
		this.x = tx;
		this.y = ty;
		this.z = tz;
		this.count -= multiplier;
	}
}

module.exports = Ray;


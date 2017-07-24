function Ray(x,y,z, sx, sy) {
	this.x = x;
	this.y = y;
	this.z = z;
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
	while (this.count < vp.count) {
		//console.log("RAY");
		var res = f(this.x, this.y, this.z);
		this.value = res;
		if (res >= 0) {
			// TODO Refine...
			return true;
		}

		this.x += this.dx*multiplier;
		this.y += this.dy*multiplier;
		this.z += this.dz*multiplier;
		this.count += multiplier;
	}
	
	return false;
}

/* March towards camera at finer steps until surface found */
Ray.prototype.refine = function(func) {

}

module.exports = Ray;


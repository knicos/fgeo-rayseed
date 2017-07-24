function Viewport(fov, w, h, dres, bound) {
	this.width = w;
	this.height = h;
	this.fov = fov;

	this.fovtan = Math.tan(fov / 2 * Math.PI / 180);

	this.aspect = (w / h);
	this.aspect2 = (h / w);

	this.nearClip = bound[0];
	this.farClip = bound[1];

	this.dres = (bound[1] - bound[0]) / dres;
	this.count = dres;
	this.bound = bound;
}

module.exports = Viewport;


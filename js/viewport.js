const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;

function Viewport(fov, w, h, dres, bound) {
	this.width = w;
	this.height = h;
	this.fov = fov;

	this.fovtan = Math.tan(fov / 2 * Math.PI / 180);

	this.aspect = (w / h);
	this.aspect2 = (h / w);

	this.nearClip = 0.5;
	this.farClip = bound[1];

	this.dres = (bound[1] - bound[0]) / dres;
	this.count = dres;
	this.bound = bound;

	this.range = bound[1] - bound[0];
}

module.exports = Viewport;


const GL = require('./gl.js');

function initShaders(gl) {
	let fragmentShader = GL.getShader(gl, `
precision mediump float;

// our texture
uniform sampler2D u_image0;

uniform highp vec2 u_resolution;
uniform vec3 u_eye;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
	//vec2 offset = vec2(1.0 / 640.0, 1.0 / 480.0);
	vec2 offset = 1.0 / u_resolution;

	vec4 myColour = texture2D(u_image0, v_texCoord);
	vec3 P0 = myColour.rgb;

	//Left
	vec4 P1 = texture2D(u_image0, vec2(v_texCoord.x - offset.x, v_texCoord.y));
	//Right
	vec4 P2 = texture2D(u_image0, vec2(v_texCoord.x + offset.x, v_texCoord.y));
	//Top
	vec4 P3 = texture2D(u_image0, vec2(v_texCoord.x, v_texCoord.y - offset.y));
	//Bottom
	vec4 P4 = texture2D(u_image0, vec2(v_texCoord.x, v_texCoord.y + offset.y));

	vec4 P5 = texture2D(u_image0, vec2(v_texCoord.x - offset.x, v_texCoord.y - offset.y));
	vec4 P6 = texture2D(u_image0, vec2(v_texCoord.x + offset.x, v_texCoord.y - offset.y));
	vec4 P7 = texture2D(u_image0, vec2(v_texCoord.x + offset.x, v_texCoord.y + offset.y));
	vec4 P8 = texture2D(u_image0, vec2(v_texCoord.x - offset.x, v_texCoord.y + offset.y));

	vec3 N1 = (cross(P1.rgb-P0,P3.rgb-P0))*P1.a*P3.a;
	vec3 N2 = (cross(P2.rgb-P0,P4.rgb-P0))*P2.a*P4.a;
	vec3 N3 = (cross(P4.rgb-P0,P1.rgb-P0))*P1.a*P4.a;
	vec3 N4 = (cross(P3.rgb-P0,P2.rgb-P0))*P2.a*P3.a;

	vec3 N5 = (cross(P5.rgb-P0,P6.rgb-P0))*P5.a*P6.a;
	vec3 N6 = (cross(P8.rgb-P0,P5.rgb-P0))*P5.a*P8.a;
	vec3 N7 = (cross(P6.rgb-P0,P7.rgb-P0))*P6.a*P7.a;
	vec3 N8 = (cross(P7.rgb-P0,P8.rgb-P0))*P8.a*P7.a;
	
	//vec3 N = normalize(N1+N3+N2+N4+N5+N6+N7+N8);
	vec3 N = normalize(N1+N3+N2+N4+N5+N6+N7+N8);
	if (dot(N,normalize(u_eye)) < 0.0) N = -N;

	gl_FragColor = vec4((N+1.0) / 2.0, 1.0);
}
`, "fragment");

	let vertexShader = GL.getShader(gl, `
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

function Normals(gl, viewport) {
	this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    this.framebuffer.width = viewport.width;
    this.framebuffer.height = viewport.height;

	this.texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	GL.anyResolutionTexture(gl);
	gl.getExtension('OES_texture_float');
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.framebuffer.width, this.framebuffer.height, 0, gl.RGBA, gl.FLOAT, null);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

	gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	this.gl = gl;
	this.width = viewport.width;
	this.height = viewport.height;

	this.program = initShaders(gl);

	this.u_resolution = gl.getUniformLocation(this.program, "u_resolution");
	this.u_eye = gl.getUniformLocation(this.program, "u_eye");
	this.positionLocation = gl.getAttribLocation(this.program, "a_position");
  	this.texcoordLocation = gl.getAttribLocation(this.program, "a_texCoord");
}

Normals.prototype.preRender = function(positionBuffer, texcoordBuffer) {
	this.gl.useProgram(this.program);
	GL.activateBuffer(this.gl, this.positionLocation, positionBuffer);
	GL.activateBuffer(this.gl, this.texcoordLocation, texcoordBuffer);
}

Normals.prototype.render = function(eye) {
	this.gl.uniform2f(this.u_resolution, this.width, this.height);
	this.gl.uniform3f(this.u_eye, eye[0], eye[1], eye[2]);

	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
	//this.gl.clear(this.gl.COLOR_BUFFER_BIT);

	// Draw the rectangle.
	var primitiveType = this.gl.TRIANGLES;
	var offset = 0;
	var count = 6;
	this.gl.drawArrays(primitiveType, offset, count);

	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

	this.gl.activeTexture(this.gl.TEXTURE1);
	this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
}

module.exports = Normals;


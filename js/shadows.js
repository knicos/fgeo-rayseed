const GL = require('./gl.js');

function initShaders(gl) {
	let fragmentShader = GL.getShader(gl, `
precision mediump float;

// our texture
uniform sampler2D u_image0;
uniform sampler2D u_image1;
uniform sampler2D u_image2;

uniform vec3 u_eye;
uniform vec3 u_ambient;
uniform vec3 u_specular;
uniform vec3 u_diffuse;
uniform float u_shininess;
uniform vec3 u_lightlocation;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
	vec4 posSample = texture2D(u_image0, v_texCoord);
	vec3 position = posSample.rgb;
	float shadow = 1.0 - texture2D(u_image2, v_texCoord).r;	
	vec3 N = texture2D(u_image1, vec2(v_texCoord.x,1.0-v_texCoord.y)).rgb * 2.0 - 1.0;

	vec3 lightWeighting;

	vec3 lightDirection = -normalize(u_lightlocation - position);
	vec3 E = normalize(u_eye - position);
	vec3 R = normalize(-reflect(lightDirection,N));

	float diffuseWeight = max(dot(N, lightDirection), 0.0)*shadow;
	float specWeight = pow(max(dot(R,E),0.0),0.3*u_shininess)*shadow;

      lightWeighting = u_diffuse * diffuseWeight +
		clamp(specWeight * u_specular, 0.0,1.0);

	gl_FragColor = vec4(lightWeighting,1.0);
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

function Shadows(gl, viewport) {
	// Create a texture.
	this.shadowTexture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
	GL.anyResolutionTexture(gl);
	this.gl = gl;
	this.width = viewport.width;
	this.height = viewport.height;

	this.program = initShaders(gl);

	this.u_eye = gl.getUniformLocation(this.program, "u_eye");
	this.u_ambient = gl.getUniformLocation(this.program, "u_ambient");
	this.u_specular = gl.getUniformLocation(this.program, "u_specular");
	this.u_diffuse = gl.getUniformLocation(this.program, "u_diffuse");
	this.u_shininess = gl.getUniformLocation(this.program, "u_shininess");
	this.u_lightlocation = gl.getUniformLocation(this.program, "u_lightlocation");
	this.positionLocation = gl.getAttribLocation(this.program, "a_position");
  	this.texcoordLocation = gl.getAttribLocation(this.program, "a_texCoord");
	this.u_image0Location = gl.getUniformLocation(this.program, "u_image0");
	this.u_image1Location = gl.getUniformLocation(this.program, "u_image1");
	this.u_image2Location = gl.getUniformLocation(this.program, "u_image2");
	this.u_resolution = gl.getUniformLocation(this.program, "u_resolution");
} 

Shadows.prototype.preRender = function(positionBuffer, texcoordBuffer) {
	this.gl.useProgram(this.program);
	GL.activateBuffer(this.gl, this.positionLocation, positionBuffer);
	GL.activateBuffer(this.gl, this.texcoordLocation, texcoordBuffer);
}

Shadows.prototype.render = function(eye, light, sdata) {
	const gl = this.gl;
	this.gl.uniform2f(this.u_resolution, this.width, this.height);
	gl.uniform3f(this.u_eye, eye[0], eye[1], eye[2]);
	gl.uniform3f(this.u_ambient, light.ambient[0], light.ambient[1], light.ambient[2]);
	gl.uniform3f(this.u_specular, light.specular[0], light.specular[1], light.specular[2]);
	gl.uniform3f(this.u_diffuse, light.diffuse[0], light.diffuse[1], light.diffuse[2]);
	gl.uniform1f(this.u_shininess, 0.9);
	gl.uniform3f(this.u_lightlocation, light.location[0], light.location[1], light.location[2]);

	gl.uniform1i(this.u_image0Location, 0);  // texture unit 0
	gl.uniform1i(this.u_image1Location, 1);  // texture unit 1
	gl.uniform1i(this.u_image2Location, 2);  // texture unit 1

	this.gl.activeTexture(gl.TEXTURE2);
	this.gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
	this.gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, this.width, this.height, 0, gl.LUMINANCE, gl.FLOAT, sdata);

	// Draw the rectangle.
	var primitiveType = gl.TRIANGLES;
	var offset = 0;
	var count = 6;
	gl.drawArrays(primitiveType, offset, count);
}

module.exports = Shadows;


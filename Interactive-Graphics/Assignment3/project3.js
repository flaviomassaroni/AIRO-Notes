// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// [TO-DO] Modify the code below to form the transformation matrix.
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];


	var cosX = Math.cos(rotationX);
	var sinX = Math.sin(rotationX);
	var rotX = [
		1, 0, 0, 0,
		0, cosX, sinX, 0,
		0, -sinX, cosX, 0,
		0, 0, 0, 1
	];

	var cosY = Math.cos(rotationY);
	var sinY = Math.sin(rotationY);
	var rotY = [
		cosY, 0, -sinY, 0,
		0, 1, 0, 0,
		sinY, 0, cosY, 0,
		0, 0, 0, 1
	];


	var rotTot = MatrixMult(rotX, rotY);
	var mv = MatrixMult(trans, rotTot);
	return mv;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		const meshVS = `
			attribute vec3 aPos;
			attribute vec2 aTexCoord;
			attribute vec3 aNormal;

			uniform mat4 uMVP;
			uniform mat4 uMatrixMV;
			uniform mat3 uMatrixNormal;
			uniform bool uSwapYZ;

			varying vec2 vTexCoord;
			varying vec3 vNormal;
			varying vec3 vPos;

			void main() {
				vec3 pos = aPos;
				vec3 norm = aNormal;
				
				if (uSwapYZ) {
					pos = vec3(pos.x, pos.z, pos.y);
					norm = vec3(norm.x, norm.z, norm.y);
				}

				vec4 posCam = uMatrixMV * vec4(pos, 1.0);
				vPos = posCam.xyz;

				vNormal = normalize(uMatrixNormal * norm);

				gl_Position = uMVP * vec4(pos, 1.0);
				vTexCoord = aTexCoord;
			}
		`;

		const meshFS = `
			precision mediump float;
			
			uniform sampler2D uSampler;
			uniform bool uShowTexture;
			uniform vec3 uLightDir;
			uniform float uShininess;

			varying vec2 vTexCoord;
			varying vec3 vNormal;
			varying vec3 vPos;

			void main() {
				vec3 Kd = vec3(1.0, 1.0, 1.0);
				if (uShowTexture) {
					Kd = texture2D(uSampler, fract(vTexCoord)).rgb;
				}
				
				vec3 Ks = vec3(1.0, 1.0, 1.0); 
				vec3 I = vec3(1.0, 1.0, 1.0);  

				vec3 N = normalize(vNormal);
				vec3 L = normalize(uLightDir);
				vec3 V = normalize(-vPos);     
				vec3 H = normalize(L + V);     

				float diff = max(dot(N, L), 0.0);
				
				float spec = 0.0;
				if (diff > 0.0) {
					spec = pow(max(dot(N, H), 0.0), uShininess);
				}

				vec3 ambient = vec3(0.1) * Kd;
				vec3 finalColor = ambient + I * Kd * diff + I * Ks * spec;

				gl_FragColor = vec4(finalColor, 1.0);
			}
		`;

		this.prog = InitShaderProgram(meshVS, meshFS);
		
		this.mvpLoc = gl.getUniformLocation(this.prog, "uMVP");
		this.mvLoc = gl.getUniformLocation(this.prog, "uMatrixMV");
		this.normMatLoc = gl.getUniformLocation(this.prog, "uMatrixNormal");
		
		this.showTexLoc = gl.getUniformLocation(this.prog, "uShowTexture");
		this.swapYZLoc = gl.getUniformLocation(this.prog, "uSwapYZ");
		this.samplerLoc = gl.getUniformLocation(this.prog, "uSampler");
		
		this.lightDirLoc = gl.getUniformLocation(this.prog, "uLightDir");
		this.shininessLoc = gl.getUniformLocation(this.prog, "uShininess");
		
		this.posAttr = gl.getAttribLocation(this.prog, "aPos");
		this.texAttr = gl.getAttribLocation(this.prog, "aTexCoord");
		this.normAttr = gl.getAttribLocation(this.prog, "aNormal");

		this.numTriangles = 0; 
		this.hasTexCoords = false; 

		this.isTextureShown = true; 
		this.texture = null;
		this.vertexBuffer = null;
		this.texCoordsBuffer = null;
		this.normalBuffer = null;

		this.lightDir = [0, 0, 1];
		this.shininess = 100.0;
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords, normals )
	{
		this.numTriangles = vertPos.length / 3;
		this.hasTexCoords = texCoords.length > 0; 
		
		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		this.texCoordsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		if (normals && normals.length > 0) {
			this.normalBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
		}
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		gl.useProgram(this.prog);
		gl.uniform1i(this.swapYZLoc, swap ? 1 : 0);
	
	}
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw( matrixMVP, matrixMV, matrixNormal )
	{
		if (!this.vertexBuffer || !this.texCoordsBuffer || !this.normalBuffer) return;
		
		gl.useProgram(this.prog);

		gl.uniformMatrix4fv(this.mvpLoc, false, matrixMVP);
		gl.uniformMatrix4fv(this.mvLoc, false, matrixMV);
		gl.uniformMatrix3fv(this.normMatLoc, false, matrixNormal);
		
		gl.uniform3f(this.lightDirLoc, this.lightDir[0], this.lightDir[1], this.lightDir[2]);
		gl.uniform1f(this.shininessLoc, this.shininess);

		const showTexture = this.isTextureShown && !!this.texture && this.hasTexCoords;
		gl.uniform1i(this.showTexLoc, showTexture ? 1 : 0);

		if (showTexture) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.uniform1i(this.samplerLoc, 0);
		}

		if (this.posAttr >= 0) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
			gl.vertexAttribPointer(this.posAttr, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.posAttr); 
		}

		if (this.hasTexCoords && this.texAttr >= 0) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
			gl.vertexAttribPointer(this.texAttr, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.texAttr); 
		} else if (this.texAttr >= 0) {
			gl.disableVertexAttribArray(this.texAttr);
		}

		if (this.normAttr >= 0) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
			gl.vertexAttribPointer(this.normAttr, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.normAttr);
		}

		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		if (!img || !img.complete) return;

		this.texture = gl.createTexture();
		this.isTextureShown = true;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

		function isPowerOf2(value) {
			return (value & (value - 1)) == 0;
		}

		if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		}
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		this.isTextureShown = show;
		gl.useProgram(this.prog);
		gl.uniform1i(this.showTexLoc, show ? 1 : 0);
	}
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		this.lightDir = [x, y, z];
	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		this.shininess = shininess;
	}
}

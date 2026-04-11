// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{

	// Column major order
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
	var modelView = MatrixMult(trans, rotTot);
	var mvp = MatrixMult(projectionMatrix, modelView);
	
	return mvp;
}


class MeshDrawer
{
	constructor()
	{
		// attribute: dati che cambiano per ogni vertice
		// uniform: variabili globali che restano identiche per tutto il draw (es uMVP, uShowTexture)
		// verying: 


		// Vertex Shader
		const meshVS = `
			attribute vec3 aPos;
			attribute vec2 aTexCoord;
			uniform mat4 uMVP;
			uniform bool uSwapYZ;
			varying vec2 vTexCoord;
			void main() {
				vec3 pos = aPos;
				if (uSwapYZ) {
					pos = vec3(pos.x, pos.z, pos.y);
				}
				gl_Position = uMVP * vec4(pos, 1.0);
				vTexCoord = aTexCoord;
			}
		`;



		// Fragment Shader (applica la texture sull'oggetto)
		const meshFS = `
			precision mediump float;
			uniform sampler2D uSampler;
			uniform bool uShowTexture;
			varying vec2 vTexCoord;
			void main() {
				if (uShowTexture) {
					gl_FragColor = texture2D(uSampler, fract(vTexCoord));
				} else {
					gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
				}
			}
		`;

		this.prog = InitShaderProgram(meshVS, meshFS);

		this.mvpLoc = gl.getUniformLocation(this.prog, "uMVP");
		this.showTexLoc = gl.getUniformLocation(this.prog, "uShowTexture");
		this.swapYZLoc = gl.getUniformLocation(this.prog, "uSwapYZ");
		this.samplerLoc = gl.getUniformLocation(this.prog, "uSampler");
		
		this.posAttr = gl.getAttribLocation(this.prog, "aPos");
		this.texAttr = gl.getAttribLocation(this.prog, "aTexCoord");

		this.numTriangles = 0; 
		this.hasTexCoords = false; 

		this.isTextureShown = true; 
		this.texture = null;
		this.vertexBuffer = null;
		this.texCoordsBuffer = null;
	}
	
	// vertPos lista dei vertici 3D
	// texCoords coordinate 2d
	// setMesh crea dei Buffer (spazi di memoria) e ci carica dentro questi dati per renderli disponibili alla scheda video
	setMesh( vertPos, texCoords )
	{
		this.numTriangles = vertPos.length / 3;
		this.hasTexCoords = texCoords.length > 0; 
		
		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		this.texCoordsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}
	
	swapYZ( swap )
	{
		gl.useProgram(this.prog);
		gl.uniform1i(this.swapYZLoc, swap ? 1 : 0);
	}	
	

	// Passa agli shader nla matrice matematica aggiornata, e spiega come disegnare l'oggetto.
	draw( trans )
	{
		if (!this.vertexBuffer || !this.texCoordsBuffer) return;
		gl.useProgram(this.prog);

		gl.uniformMatrix4fv(this.mvpLoc, false, trans);
		
		const showTexture = this.isTextureShown && !!this.texture && this.hasTexCoords;
		gl.uniform1i(this.showTexLoc, showTexture ? 1 : 0);

		if (showTexture) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.uniform1i(this.samplerLoc, 0);
		}

		if (this.posAttr >= 0) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
			// Takes attribute this.posAttr, composto da 3 numeri (x,y,z), float 32 bits, non li normalizzare (false), 0 stride, 0 offset
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
		//istruisce la scheda video a prendere tutti i vertici e collegarli a tre a tre,
		// formando i triangoli che comporranno visivamente il tuo oggetto 3D
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	
	// riceve un immagine web e la converte in texture WebGL.
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

		// Mipmapping crea versioni rimpicciolite dell'immagine per quando l'oggetto e lontano, e permette la ripetizione dell'immagine.
		if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
	
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.generateMipmap(gl.TEXTURE_2D);

		// con clamp_to_edge stai forzando i bordi della texture a non ripetersi quando l'immagine non e power of 2 (widthxhight)
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		}
	}
	
	showTexture( show )
	{
		this.isTextureShown = show;
		
		gl.useProgram(this.prog);
		gl.uniform1i(this.showTexLoc, show ? 1 : 0);
	}
}
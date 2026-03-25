// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
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

	var modelViewMatrix = MatrixMult(trans, rotTot);

    var mvp = MatrixMult(projectionMatrix, modelViewMatrix);
	return mvp;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// [TO-DO] initializations
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

        const meshFS = `
            precision mediump float;
            uniform sampler2D uSampler;
            uniform bool uShowTexture;
            varying vec2 vTexCoord;
            void main() {
                if (uShowTexture) {
                    gl_FragColor = texture2D(uSampler, vTexCoord);
                } else {
                    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // Colore bianco se texture spenta
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
    
	
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords )
	{
		// [TO-DO] Update the contents of the vertex buffer objects.
		this.numTriangles = vertPos.length / 3;
		
		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		this.texCoordsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		// [TO-DO] Set the uniform parameter(s) of the vertex shader
        gl.useProgram(this.prog);
        gl.uniform1i(this.swapYZLoc, swap ? 1 : 0);
	}
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw( trans )
	{
		// [TO-DO] Complete the WebGL initializations before drawing
		gl.useProgram(this.prog);
        gl.uniformMatrix4fv(this.mvpLoc, false, trans);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(this.posAttr, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.posAttr);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
        gl.vertexAttribPointer(this.texAttr, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.texAttr);

        if (this.texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.uniform1i(this.samplerLoc, 0);
        }

        gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
    }
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		// [TO-DO] Bind the texture
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );

		// [TO-DO] Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		gl.useProgram(this.prog);
        gl.uniform1i(this.samplerLoc, 0);
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		gl.useProgram(this.prog);
		gl.uniform1i(this.showTexLoc, show ? 1 : 0);

	
}
}

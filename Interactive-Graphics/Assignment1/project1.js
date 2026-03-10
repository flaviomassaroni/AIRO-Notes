// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform( positionX, positionY, rotation, scale )
{

	const rad = rotation * (Math.PI/180);

	c = Math.cos(rad) * scale;
	s = Math.sin(rad) * scale;

	return [c,s,0,
			-s,c,0,
			positionX,positionY,1
	];

}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform( trans1, trans2 )
{

	let out = Array(9).fill(0);


	for (let c = 0; c < 3; c++) {
		for (let r = 0; r < 3; r++){
			sum = 0;

			for (let k = 0; k < 3; k++){
				let indexA = k*3+r;
				let indexB = c*3+k;

				sum += trans2[indexA] * trans1[indexB];
			}

			let indexOut = (c*3)+r;
			out[indexOut] = sum;

		}
} 

	return out;

}
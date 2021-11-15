/*
 * MetaballMaterial.js: terrain-like shader
 */

function MetaballMaterial(){
  return new THREE.ShaderMaterial({
    uniforms: {
      planeify_amt: {value: (3*Math.PI)/2}
    },
    vertexShader:`
varying vec3 fragcoord;
uniform float planeify_amt;

float dist3(in vec3 pos){
  return sqrt(
    (pos.x * pos.x) +
    (pos.y * pos.y) +
    (pos.z * pos.z)
  );
}

void main(){
  fragcoord = position;
  vec3 goalPosition = vec3( position.x / (1.0 - position.z), dist3(position)-0.5, position.y / (1.0 - position.z) );
  vec3 newPosition = mix( position, goalPosition, 0.5 * (1.0 + sin(planeify_amt)) );
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`,
  fragmentShader:`
varying vec3 fragcoord;

float dist3(in vec3 pos){
  return sqrt(
    (pos.x * pos.x) +
    (pos.y * pos.y) +
    (pos.z * pos.z)
  );
}

void main(){
  // Subtle shading
  float height = dist3(fragcoord);

  if(height <= 0.55){ // Light sand
    gl_FragColor = vec4(1.0, 0.88, 0.69, 1.0);
  } else if(height <= 0.565){ // Darker sand
    gl_FragColor = vec4(0.75, 0.66, 0.52, 1.0);
  } else if(height <= 0.580){ // Dark sand
    gl_FragColor = vec4(0.5, 0.44, 0.35, 1.0);
  } else if(height <= 0.595){ // Dirt
    gl_FragColor = vec4(0.28, 0.20, 0.20, 1.0);
  } else if(height <= 0.625){ // Dark grass
    gl_FragColor = vec4(0.23, 0.39, 0.32, 1.0);
  } else if(height <= 0.65){ // Light grass
    gl_FragColor = vec4(0.33, 0.49, 0.42, 1.0);
  } else if(height <= 0.665){ // Dark snow
    gl_FragColor = vec4(0.85, 0.85, 0.85, 1.0);
  } else {
    gl_FragColor = vec4(0.95, 0.95, 0.95, 1.0);
  }
}
`
  });
}

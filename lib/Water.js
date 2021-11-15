/*
 * Water.js: a simple water shader
 */

function WaterMaterial(w, h, deform){
  return new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        iTime: { value: 1.0 },
        iResolution: { value: new THREE.Vector2(w, h) },
        iDeform: { value: deform },
        planeify_amt: { value: (3*Math.PI)/2 }
      },
      vertexShader: `
//
// GLSL textureless classic 3D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-10-11
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/stegu/webgl-noise
//

vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+10.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise
float cnoise(vec3 P)
{
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

// Classic Perlin noise, periodic variant
float pnoise(vec3 P, vec3 rep)
{
  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

  uniform float iTime;
  uniform bool iDeform;
  uniform float planeify_amt;
  varying vec2 vUv;
  varying vec3 fragcoord;
  varying vec4 ss;

  float turbulence( vec3 p ) {
    float w = 100.0;
    float t = -.5;

    for (float f = 1.0 ; f <= 10.0 ; f++ ){
      float power = pow( 2.0, f );
      t += abs( pnoise( vec3( power * p ), vec3( 10.0, 10.0, 10.0 ) ) / power );
    }

    return t;
  }

  float dist3(in vec3 pos){
    return sqrt(
      (pos.x * pos.x) +
      (pos.y * pos.y) +
      (pos.z * pos.z)
    );
  }

  void main(){
    vUv = uv;
    fragcoord = position;

    vec3 goalPosition = 200.0 * vec3( -uv.y, (dist3(fragcoord)-30.0)/120.0, -uv.x ) + vec3(100.0, 0.0, 100.0);
    vec3 newPosition = mix( position, goalPosition, 0.5 * (1.0 + sin(planeify_amt)) );
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);

    ss = modelViewMatrix * vec4(position, 1.0);
  }
      `,
      fragmentShader: `
  varying vec2 vUv;
  varying vec3 fragcoord;
  varying vec4 ss;
  uniform float iTime;
  uniform vec2 iResolution;

  // By Morgan McGuire @morgan3d, http://graphicscodex.com
  // Reuse permitted under the BSD license.

  // All noise functions are designed for values on integer scale.
  // They are tuned to avoid visible periodicity for both positive and
  // negative coordinates within a few orders of magnitude.

  // For multiple octaves
  #define NOISE fbm
  #define NUM_NOISE_OCTAVES 2
  #define SPEED 1.0
  //#define SMOOTH 1


  float hash(float n) { return fract(sin(n) * 1e4); }
  float hash(vec2 p) { return  (sin(iTime*3.0*SPEED)*0.02) + fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

  float noise(float x) {
      float i = floor(x);
      float f = fract(x);
      float u = f * f * (3.0 - 2.0 * f);
      return mix(hash(i), hash(i + 1.0), u);
  }

  float dist3(in vec3 pos){
    return sqrt(
      (pos.x * pos.x) +
      (pos.y * pos.y) +
      (pos.z * pos.z)
    );
  }

  float noise(vec2 x) {
      vec2 i = floor(x);
      vec2 f = fract(x);

          // Four corners in 2D of a tile
          float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      // Simple 2D lerp using smoothstep envelope between the values.
          // return vec3(mix(mix(a, b, smoothstep(0.0, 1.0, f.x)),
          //			mix(c, d, smoothstep(0.0, 1.0, f.x)),
          //			smoothstep(0.0, 1.0, f.y)));

          // Same code, with the clamps in smoothstep and common subexpressions
          // optimized away.
      vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }


  float noise(vec3 x) {
      const vec3 step = vec3(110, 241, 171);

      vec3 i = floor(x);
      vec3 f = fract(x);
   
      // For performance, compute the base input to a 1D hash from the integer part of the argument and the 
      // incremental change to the 1D based on the 3D -> 1D wrapping
      float n = dot(i, step);

      vec3 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix( hash(n + dot(step, vec3(0, 0, 0))), hash(n + dot(step, vec3(1, 0, 0))), u.x),
                     mix( hash(n + dot(step, vec3(0, 1, 0))), hash(n + dot(step, vec3(1, 1, 0))), u.x), u.y),
                 mix(mix( hash(n + dot(step, vec3(0, 0, 1))), hash(n + dot(step, vec3(1, 0, 1))), u.x),
                     mix( hash(n + dot(step, vec3(0, 1, 1))), hash(n + dot(step, vec3(1, 1, 1))), u.x), u.y), u.z);
  }


  float fbm(float x) {
          float v = 0.0;
          float a = 0.5;
          float shift = float(100);
          for (int i = 0; i < NUM_NOISE_OCTAVES; ++i) {
                  v += a * noise(x);
                  x = x * 2.0 + shift;
                  a *= 0.5;
          }
          return v;
  }


  float fbm(vec2 x) {
          float v = 0.0;
          float a = 0.5;
          vec2 shift = vec2(100);
          // Rotate to reduce axial bias
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
          for (int i = 0; i < NUM_NOISE_OCTAVES; ++i) {
                  v += a * noise(x);
                  x = rot * x * 2.0 + shift;
                  a *= 0.5;
          }
          return v;
  }


  float fbm(vec3 x) {
          float v = 0.0;
          float a = 0.5;
          vec3 shift = vec3(100);
          for (int i = 0; i < NUM_NOISE_OCTAVES; ++i) {
                  v += a * noise(x);
                  x = x * 2.0 + shift;
                  a *= 0.5;
          }
          return v;
  }

  void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 coord = fragCoord.xy * 0.015 - vec2(iTime * 0.5, iResolution.y / 2.0);
    float speed = 0.3*SPEED;
    float limit = 0.1;
    float border = 0.025;
    float c = NOISE(coord - speed*iTime ) * NOISE(coord + speed*iTime );
    //vec3 color = vec3(c, c, c);
    vec3 color = vec3(step(limit-border,c), step(limit, c), 1);
    if (color.x == 1.0 && color.y != 1.0 && color.x == 1.0) { color = vec3(1.0, 1.0, 1.0); }
    else { color = vec3(0.06, 0.4, 1.0); }
#ifdef SMOOTH
    c = smoothstep(limit - border, limit, c) - smoothstep(limit, limit + border, c);
    fragColor = vec4(c * c * c, 0.25 + 0.75 * c * c, 0.5 + 0.5 * c, 1.0);
#else
    fragColor.rgb = clamp(color, 0.0, 1.0);
#endif
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

void main(){
  float height = dist3(fragcoord);

  if(height <= 30.0){ // Water
    mainImage(gl_FragColor, vUv * iResolution.xy);
  } else if(height <= 31.0) {
    gl_FragColor = vec4(0.95, 0.83, 0.64, 1.0);
  } else if(height <= 32.0){ // Light sand
    gl_FragColor = vec4(0.9, 0.78, 0.59, 1.0);
  } else if(height <= 34.0){ // Darker sand
    gl_FragColor = vec4(0.75, 0.66, 0.52, 1.0);
  } else if(height <= 36.0){ // Dark sand
    gl_FragColor = vec4(0.5, 0.44, 0.35, 1.0);
  } else if(height <= 38.0){ // Dirt
    gl_FragColor = vec4(0.28, 0.20, 0.20, 1.0);
  } else if(height <= 40.0){ // Dark grass
    gl_FragColor = vec4(0.23, 0.39, 0.32, 1.0);
  } else if(height <= 42.0){ // Light grass
    gl_FragColor = vec4(0.33, 0.49, 0.42, 1.0);
  } else if(height <= 44.0){ // Dark snow
    gl_FragColor = vec4(0.85, 0.85, 0.85, 1.0);
  } else {
    gl_FragColor = vec4(0.95, 0.95, 0.95, 1.0);
  }

  // float fade = dist3(vec3(ss.x, ss.y, ss.z));
  vec3 f = fade(normalize(ss.xyz));
  gl_FragColor += vec4(f.yyy, 1.0);
}
      `
    });
}

class Water {
  constructor(scene, w, h, deform){
    const water_geo = new THREE.PlaneGeometry(1000, 1000, 1000, 1000);
    this.water_mat = WaterMaterial(w, h, deform);
    const water = new THREE.Mesh(water_geo, this.water_mat);
    water.rotation.x = -Math.PI/2;
    scene.add(water);
  }
  update(){
    this.water_mat.uniforms.iTime.value += 0.01;
    if(this.water_mat.uniforms.iTime.value > 100) this.water_mat.uniforms.iTime.value = 0.0;
  }
}

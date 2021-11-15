/*
 * rlx.js: a relaxing scene
 */

/* 0 = build, 1 = explore */
let mode = -1,
  /* 0 = terrain, 1 = clouds */
  buildmode = 0;

let scene,
  camera,
  renderer,
  clock,
  controls = {},
  water,
  game,
  land,
  globe,
  globe_mat,
  effect,
  composer,
  renderPass,
  ssaoPass,
  sobelPass,
  keeb,
  keeb_to = {},
  clouds,
  clouds_origins,
  cloud_to,
  tut = {};

let raycaster = new THREE.Raycaster(),
  mouse = {down: false, shift: false, vec: new THREE.Vector2(), duration: 0},
  brush = {
    el: document.getElementById('circle'),
    size: 0.005,
    height: 1.0
  };

let sound = {
  ctx: null,
  gain: null,
  oscillators: null,
  n_oscillators: 1,
  ratios: [
    1,
    9/8,
    5/4,
    4/3,
    3/2,
    5/3,
    15/8,
    2/1
  ]
};

/*
 * MATH
 */
function avg(a, b, c){
  return (a + b + c) / 3;
}

function warble(v){
  return (1 + Math.sin((2 * Math.PI) * v)) / 2;
}

// n = no vector instantiation
function dist3n(x1, y1, z1, x2, y2, z2){
  return Math.sqrt(
    (x1 - x2) * (x1 - x2) +
    (y1 - y2) * (y1 - y2) +
    (z1 - z2) * (z1 - z2)
  );
}

function clamp(v, min, max){
  if(v > max) return max;
  if(v < min) return min;
  return v;
}

/*
 * INITIALIZATION
 */
function init(){
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.set(80, 40, 80);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setPixelRatio( window.devicePixelRatio );
  document.body.appendChild( renderer.domElement );

  CameraControls.install( { THREE: THREE } );
  clock = new THREE.Clock();
  controls.orbit = new CameraControls(camera, renderer.domElement);
  controls.fps = new THREE.PointerLockControls(camera, renderer.domElement);
  controls.fps.lookSpeed = 1;

  effect = new THREE.MarchingCubes(64, MetaballMaterial(), false, false, 100000);
  effect.position.set(0, 0, 0);
  effect.scale.set(60, 60, 60);
  effect.frustumCulled = false;
  scene.add(effect);

  /*clouds = new THREE.MarchingCubes(64, new THREE.MeshLambertMaterial({color:0xffffff,opacity:0.5,transparent:true}), false, false, 100000);
  clouds.position.set(0, 0, 0);
  clouds.scale.set(80, 80, 80);
  clouds.frustumCulled = false;
  scene.add(clouds);
  clouds_origins = [];*/

  window.onresize = () => {
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( window.devicePixelRatio );

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };

  /*
   * Postprocessing
   */
  renderPass = new THREE.RenderPass(scene, camera);
  ssaoPass = new THREE.SSAOPass(scene, camera, window.innerWidth/64, window.innerHeight/64);
  ssaoPass.kernelRadius = 4;
  effectSobel = new THREE.ShaderPass( THREE.SobelOperatorShader );
  effectSobel.uniforms[ 'resolution' ].value.x = window.innerWidth * window.devicePixelRatio;
  effectSobel.uniforms[ 'resolution' ].value.y = window.innerHeight * window.devicePixelRatio;

  /*composer = new THREE.EffectComposer(renderer);
  composer.addPass( effectSobel );
  composer.addPass(renderPass);
  // composer.addPass(ssaoPass);*/
  
  keeb = [];

  tut = {
    mouse: false,
    e: false,
    shift: false
  };
}

function lights(){
  const ambientLight = new THREE.AmbientLight( 0xcccccc, 0.9 );
  scene.add( ambientLight );

  const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
  directionalLight.position.set( 0, 1, 1 ).normalize();
  scene.add( directionalLight );

  const sky = new THREE.Sky();
  sky.scale.setScalar( 450000 );
  sky.material.uniforms.mieDirectionalG = 0.7;
  sky.material.uniforms.sunPosition.value.setFromSphericalCoords(1, 1.5, Math.PI);
  scene.add( sky );
}

function world(){
  max = 1000;
  // let max = Math.max(window.innerWidth*2, window.innerHeight*2);
  // water = new Water(scene, max, max, true);

  game = new THREE.Object3D();
  scene.add(game);

  land = new THREE.Object3D();
  scene.add(land);

  const atm_geo = new THREE.SphereGeometry(32, 100, 100),
    atm_mat = AtmosphereMaterial(),
    atm = new THREE.Mesh(atm_geo, atm_mat);
  scene.add(atm);

  const globe_geo = new THREE.SphereGeometry(30, 100, 100);
  globe_mat = WaterMaterial(max, max, false);
  // const mat = new THREE.MeshPhongMaterial({color:0x2F86A6,flatShading:true});
  globe = new THREE.Mesh(globe_geo, globe_mat);
  globe.frustumCulled = false;
  game.add(globe);
  pop_in(globe);
  pop_in(atm);
}

function update_clouds(t){
  clouds.reset();
  clouds_origins.forEach((vec, i) => {
    let axis = new THREE.Vector3(vec.x, vec.y, -vec.z);
    let v = new THREE.Vector3(vec.x, vec.y, vec.z);
    v.applyAxisAngle(axis, ((t * (i+1)))/100);
    clouds.addBall(
      v.x,
      v.y,
      v.z,
      30*vec.size, 0
    );
  });

  /*clouds.reset();
  clouds_origins.forEach(vec => {
    clouds.addBall(
      vec.x,
      vec.y,
      vec.z,
      vec.size, 0
    );
  });*/
}

/*
 * AUDIO
 */
function audio_doinit(){
  sound.ctx = new AudioContext();
  sound.gain = sound.ctx.createGain();
  sound.gain.connect(sound.ctx.destination);
  sound.gain.gain.value = 1/sound.n_oscillators;
  sound.oscillators = new Array(sound.n_oscillators);
  for(let i=0;i<sound.n_oscillators;i++){
    sound.oscillators[i] = sound.ctx.createOscillator();
    sound.oscillators[i].connect(sound.gain);
    sound.oscillators[i].start(0);
  }
}
function audio_dosound(freq){
  // Not in standard init because Chrome will throw an error
  //   if not initialized via user input
  if(!sound.ctx) audio_doinit();

  // sound.ctx.resume();
  /*sound.oscillators.forEach((osc, i) => {
    osc.frequency.value = (freq)*sound.ratios[i];
  });*/
  sound.gain.gain.value = 1/sound.n_oscillators;

  sound.oscillators[0].frequency.value = freq/* + 261.63*/;
  //sound.oscillators[1].frequency.value = freq/* + 329.63*/;
  //sound.oscillators[2].frequency.value = freq/* + 392.00*/;
  //sound.oscillators[3].frequency.value = freq/* + 523.25*/;

  /*
  sound.oscillators[0].frequency.value = freq;
  sound.oscillators[1].frequency.value = freq * 2;
  sound.oscillators[2].frequency.value = freq * 2 * (3/2);
  sound.oscillators[3].frequency.value = freq * 2 * (3/2) * (4/3);
  sound.oscillators[4].frequency.value = freq * 2 * (3/2) * (4/3) * (5/4);
  */
}
function audio_stopsound(){
  if(sound.ctx){
    // sound.ctx.suspend();
    sound.gain.gain.value = 0.0;
  }
}

/*
 * ANIMATIONS
 */
function pop_in(mesh, speed){
  const max = (speed||10)/2,
    amp = 1.25,
    freq = 1,
    decay = 1;

  let t = 0;
  mesh.scale.set(0, 0, 0);
  let int = setInterval(() => {
    let quad = (0.064*amp*amp) - (0.585*amp) + 1.532;
    let val = 1 + (amp * Math.sin((t * freq * Math.PI/2) - quad)/Math.exp(t * decay));
    mesh.scale.set(val, val, val);

    if(t >= max) clearInterval(int);

    t += (speed || 10)/500;
  }, speed || 10);
}

function grow(mesh, scale){
  const max = 5;

  let t = 0;
  let int = setInterval(() => {
    mesh.scale.setScalar(scale*(t/5));

    if(t >= max) clearInterval(int);

    t += 1/50;
  });
  mesh.scale.setScalar(scale);
}

function wrap_unwrap(mat, sound, flip){
  let t = mat.uniforms.planeify_amt.value;
  const max = t + Math.PI;

  let int = setInterval(() => {
    mat.uniforms.planeify_amt.value = t;

    if(sound){
      if(flip) audio_dosound(400 * warble(t/10));
      else audio_dosound(400 * (1 - warble(t/10)));
    }

    if(t >= max){
      if(sound) audio_stopsound();
      clearInterval(int);
    }

    t += 0.01;
  });
}

/*
 * MOUSE
 */
function mouse_init(){
  window.addEventListener('keydown', key_down, false);
  window.addEventListener('keyup',   key_up,   false);

  window.addEventListener('mousedown', mouse_down,   false);
  window.addEventListener('mousemove', mouse_move,   false);
  window.addEventListener('mouseup',   mouse_up,     false);
  window.addEventListener('wheel',     mouse_scroll, false);
}
function key_down(e){
  if(e.keyCode === 16 && mode === 0){
    mouse.shift = true;
    brush.el.style.display = 'block';
  }
}
function key_up(e){
  if(e.keyCode === 16 && mode === 0){
    mouse.shift = false;
    brush.el.style.display = 'none';
  }
}
function mouse_down(e){
  mouse.down = true;
  mouse_move(e);
}
function mouse_move(e){
  if(mode === 0){
    mouse.vec.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.vec.y = 1 - (e.clientY / window.innerHeight) * 2;

    brush.el.style.left = e.clientX-((brush.size*10000)/2)-(brush.height) + 'px';
    brush.el.style.top  = e.clientY-((brush.size*10000)/2)-(brush.height) + 'px';
    brush.el.style.border = brush.height + 'px solid black';
  }
}
function mouse_up(){
  mouse.down = false;
  mouse.duration = 0;
  audio_stopsound();
}
function mouse_scroll(e){
  if(mouse.shift && mode === 0){
    if(e.deltaY < 0 && brush.size - Math.abs(e.deltaY/3000) >= 0){
      brush.size -= Math.abs(e.deltaY / 3000);
    } else if(e.deltaY > 0 && brush.size + (e.deltaY / 3000) < 0.04){
      brush.size += e.deltaY / 3000;
    }
    brush.el.style.width = brush.el.style.height = brush.el.style.borderRadius = (brush.size * 10000) + 'px';
    brush.el.style.left = e.clientX-((brush.size*10000)/2)-(brush.height) + 'px';
    brush.el.style.top  = e.clientY-((brush.size*10000)/2)-(brush.height) + 'px';
    brush.el.style.border = brush.height + 'px solid black';
  }
}
function mouse_update(){
  if(mouse.down && mouse.shift && mode === 0){
    raycaster.setFromCamera(mouse.vec, camera);
    const intersects = raycaster.intersectObjects(game.children);

    if(intersects && intersects[0]){
      if(intersects[0].object === game.children[0]){
        let face = intersects[0].face,
          geo = intersects[0].object.geometry,
          pos = geo.attributes.position,
          norm = geo.attributes.normal;

        let ind_a = face.a * pos.itemSize,
          ind_b = face.b * pos.itemSize,
          ind_c = face.c * pos.itemSize;

        function raise(ind, lower, amt){
          if(!lower && dist3n(pos.array[ind+0], pos.array[ind+1], pos.array[ind+2], 0, 0, 0) > 30.0 + brush.height) return;
          if(lower && dist3n(pos.array[ind+0], pos.array[ind+1], pos.array[ind+2], 0, 0, 0) <= 30.01) return;

          pos.array[ind+0] += norm.array[ind+0] * (lower ? -1 : 0.2) * (amt || 1.0);
          pos.array[ind+1] += norm.array[ind+1] * (lower ? -1 : 0.2) * (amt || 1.0);
          pos.array[ind+2] += norm.array[ind+2] * (lower ? -1 : 0.2) * (amt || 1.0);
        }

        let v1 = new THREE.Vector3(norm.array[ind_a+0], norm.array[ind_a+1], norm.array[ind_a+2]),
          v2 = new THREE.Vector3();
        for(let i=0;i<pos.count;i++){
          v2.set(norm.array[3*i], norm.array[3*i+1], norm.array[3*i+2]);
          if(v1.distanceToSquared(v2) < Math.sqrt(brush.size/100.0)){
            raise(3*i, keeb[32], brush.height); //2.0 * clamp(Math.sqrt(brush.size/100.0) / v1.distanceTo(v2), 0.0, 1.0));
          }
        }
        pos.needsUpdate = true;

        /*
        let x = 0.5+avg(pos.array[ind_a+0], pos.array[ind_b+0], pos.array[ind_c+0])/120,
          y = 0.5+avg(pos.array[ind_a+1], pos.array[ind_b+1], pos.array[ind_c+1])/120,
          z = 0.5+avg(pos.array[ind_a+2], pos.array[ind_b+2], pos.array[ind_c+2])/120;

        let amp_x = (0.0005/brush.size) * avg(norm.array[ind_a+0], norm.array[ind_b+0], norm.array[ind_c+0]),
          amp_y = (0.0005/brush.size) * avg(norm.array[ind_a+1], norm.array[ind_b+1], norm.array[ind_c+1]),
          amp_z = (0.0005/brush.size) * avg(norm.array[ind_a+2], norm.array[ind_b+2], norm.array[ind_c+2]);

        if(buildmode === 0){
          effect.addBall(
            x,
            y,
            z,
            brush.size, 0
          );
        } else {
          clouds.addBall(
            x,
            y,
            z,
            brush.size, 0
          );
          if(cloud_to) clearTimeout(cloud_to);
          cloud_to = setTimeout(() => {
            clouds_origins.push({x, y, z, size: brush.size});
          }, 50);
      }
        */

        // audio_dosound(avg(pos.array[ind_a+0], pos.array[ind_a+1], pos.array[ind_a+2]));
        audio_dosound(pos.array[ind_a]*32*warble(mouse.duration+=0.025));
      }
    }
  }
}

/*
 * KEYBOARD
 */
function keeb_init(){
  window.addEventListener('keydown', keeb_press,   false);
  window.addEventListener('keyup',   keeb_release, false);
}
function keeb_press(e){
  keeb[e.keyCode] = true;
}
function keeb_release(e){
  keeb[e.keyCode] = false;
}
function keeb_update(){
  if(keeb['E'.charCodeAt(0)]){
    if(keeb_to['E']) clearTimeout(keeb_to['E']);
    keeb_to['E'] = setTimeout(() => {
      set_mode(mode === 0 ? 1 : 0);
    }, 100);
  }
  if(keeb['M'.charCodeAt(0)]){
    if(keeb_to['M']) clearTimeout(keeb_to['M']);
    keeb_to['M'] = setTimeout(() => {
      // buildmode = (buildmode === 0 ? 1 : 0);
    }, 100);
  }
  if(keeb[187]){
    /*if(keeb_to[187]) clearTimeout(keeb_to[187]);
    keeb_to[187] = setTimeout(() => {*/
      brush.height += 0.1;
      brush.el.style.border = brush.height + 'px solid black';
    //});
  }
  if(keeb[189]){
    /*if(keeb_to[189]) clearTimeout(keeb_to[189]);
    keeb_to[189] = setTimeout(() => {*/
      if(brush.height > 0) brush.height -= 0.1;
      brush.el.style.border = brush.height + 'px solid black';
    //});
  }

  if(keeb['W'.charCodeAt(0)]){
    camera.translateZ(-0.1);
  }
  if(keeb['S'.charCodeAt(0)]){
    camera.translateZ(0.1);
  }
  if(keeb['A'.charCodeAt(0)]){
    camera.translateX(-0.1);
  }
  if(keeb['D'.charCodeAt(0)]){
    camera.translateX(0.1);
  }
}

/*
 * TUTORIAL
 */
function tutorial(){
  window.addEventListener('mousedown', tut_mousedown);
  window.addEventListener('keydown', tut_keydown);
}
function tut_mousedown(){
  tut.mouse = true;
}
function tut_keydown(e){
  if(e.keyCode === 'E'.charCodeAt(0)) tut.e = true;
  if(e.keyCode === 16) tut.shift = true;
}

/*
 * MODES
 */
function set_mode(newmode){
  if(newmode === 1){
    wrap_unwrap(globe_mat, true);
    wrap_unwrap(effect.material);
    setTimeout(() => {
      controls.orbit.setLookAt(0, 2, 0, 2, 2, 0, true).then(() => {
        controls.fps.connect();
        controls.fps.lock();
        mode = newmode;
      });
    }, 1000);
  } else {
    controls.fps.disconnect();
    controls.fps.unlock();
    controls.orbit.setLookAt(80, 40, 80, 0, 0, 0, true);
    wrap_unwrap(globe_mat, true, false);
    wrap_unwrap(effect.material);
    mode = newmode;
  }
}
function walk_camera(){
  camera.position.x = 35 * Math.sin(walk.theta) * Math.cos(walk.phi);
  camera.position.y = 35 * Math.sin(walk.theta) * Math.sin(walk.phi);
  camera.position.z = 35 * Math.cos(walk.theta);

  // camera.up.set(camera.position.clone().negate().normalize());
}

/*
 * MAINLOOP
 */
function animate() {
  const delta = clock.getDelta();
  if(mode === 0){
    controls.orbit.update(delta);
    mouse_update();
  }
  keeb_update();

  requestAnimationFrame( animate );

  globe_mat.uniforms.iTime.value += 0.01;

  //if(globe_mat.uniforms.iTime.value % 0.05 <= 0.01) update_clouds(globe_mat.uniforms.iTime.value);
  // update_clouds(globe_mat.uniforms.iTime.value);

  /*clouds.rotation.x += 0.005;
  clouds.rotation.z -= 0.003;*/

  renderer.render(scene, camera);
  // composer.render(0.1);
}

init();
mouse_init();
keeb_init();
lights();
renderer.render(scene, camera);

document.getElementById('start').onclick = () => {
  const el = document.getElementById('start').parentNode.parentNode;
  el.style.opacity = 0;

  document.getElementById('pop').currentTime = 0.5;
  document.getElementById('pop').play();

  mode = 0;
  setTimeout(() => {
    document.body.removeChild(el);
  }, 500);
  tutorial();
  world();
  animate();
};

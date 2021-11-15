/*
 * rlx.js: a relaxing game
 */

/*
 * HELPERS
 */
class array2d {
  constructor(w, h, initial){
    this.w = w;
    this.h = h;
    this.arr = new Array(w*h).fill(initial);
  }
  get(x, y){
    return this.arr[(y*this.w)+x];
  }
  set(x, y, v){
    this.arr[(y*this.w)+x] = v;
  }
  i_to_xy(i){
    return {
      y: Math.floor(i / this.w),
      x: i % this.w
    };
  }
  forEach(func){
    this.arr.forEach((v, i) => {
      func(v, this.i_to_xy(i));
    });
  }
}

/*
 * GLOBALS
 */
const config = {
  render: {
    sky_precision: 50,
    slow_update_speed: 100,
    fast_update_speed: 10
  },
  day_length: 1000,
  world_size: 50,

  tiles: [
    '#3A6351', // dark grass
    '#C6D57E', // light grass
    '#E5B299', // light dirt
    '#B4846C', // dirt
    '#7D5A50', // dark dirt
    '#687980', // bedrock
    '#5F939A', // water
  ]
};

const _ = {
  last_render: Date.now(),
  canv: document.getElementById('canv'),
  ctx: null,
  update_speed: config.render.slow_update_speed,
  game: {
    time: 0
  },
  world: new array2d(config.world_size, config.world_size, 0)
};

/*
 * FUNCTIONS
 */
function setup(){
  _.ctx = _.canv.getContext('2d');
  function set_size(){
    _.canv.width = _.canv.height = Math.min(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', set_size);
  set_size();
}

function click(){
  let click = false;

  function do_draw(e){
    const screen_pos = {
      x: e.pageX - _.canv.offsetLeft - ((_.canv.width / config.world_size)/2),
      y: e.pageY - _.canv.offsetTop  - ((_.canv.height / config.world_size)/2)
    }, world_pos = {
      x: Math.round((screen_pos.x / _.canv.width) * config.world_size),
      y: Math.round((screen_pos.y / _.canv.height) * config.world_size)
    };

    _.world.set(world_pos.x, world_pos.y, Math.min(config.tiles.length-2, _.world.get(world_pos.x, world_pos.y)+1));
  }

  _.canv.addEventListener('mousedown', e => {
    click = true;
    _.update_speed = config.render.fast_update_speed;
    do_draw(e);
  });
  _.canv.addEventListener('mousemove', e => {
    if(click){
      do_draw(e);
    }
  });
  _.canv.addEventListener('mouseup', () => {
    click = false;
    _.update_speed = config.render.slow_update_speed;
  });
}

function upd(){
  _.game.time++;
  if(_.game.time > config.day_length) _.game.time = 0;
}

function sky(){
  let r = 128*((Math.sin((2*Math.PI/config.day_length) * _.game.time)/2)+0.5),
    g = 255*((Math.sin(((2*Math.PI/config.day_length) * _.game.time) + (config.day_length/4))/2)+0.5),
    b = 128*((Math.sin(((2*Math.PI/config.day_length) * _.game.time) + (config.day_length/2))/2)+0.5);
  _.ctx.fillStyle = `rgb(${r}, ${32}, ${b})`;
  _.ctx.fillRect(0, 0, _.canv.width, _.canv.height);
}

function world(){
  _.world.forEach((v, pos) => {
    _.ctx.fillStyle = config.tiles[v];
    _.ctx.fillRect(
      Math.round(pos.x * (_.canv.width / config.world_size)),
      Math.round(pos.y * (_.canv.height / config.world_size)),
      Math.ceil(_.canv.width / config.world_size),
      Math.ceil(_.canv.height / config.world_size)
    );
  });
}

function draw(){
  // sky();
  world();
}

/*
 * MAINLOOP
 */
function loop(){
  if(Date.now() - _.last_render >= _.update_speed){
    _.last_render = Date.now();

    upd();
    draw();
  }

  requestAnimationFrame(loop);
}

/*
 * MAIN
 */
function main(){
  setup();
  click();

  draw();
  loop();
}

main();

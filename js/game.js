import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

//COLORS
var Colors = {
  red: 0xf25346,
  white: 0xd8d0d1,
  brown: 0x59332e,
  brownDark: 0x23190f,
  pink: 0xf5986e,
  yellow: 0xf4ce93,
  blue: 0x68c3c0,
};

///////////////

// GAME VARIABLES
var game;
var deltaTime = 0;
var newTime = new Date().getTime();
var oldTime = new Date().getTime();
var ennemiesPool = [];
var particlesPool = [];
var particlesInUse = [];

function resetGame() {
  game = {
    speed: 0,
    initSpeed: 0.00035,
    baseSpeed: 0.00035,
    targetBaseSpeed: 0.00035,
    incrementSpeedByTime: 0.0000025,
    incrementSpeedByLevel: 0.000005,
    distanceForSpeedUpdate: 100,
    speedLastUpdate: 0,

    distance: 0,
    ratioSpeedDistance: 50,
    energy: 100,
    ratioSpeedEnergy: 3,

    level: 1,
    levelLastUpdate: 0,
    distanceForLevelUpdate: 1000,

    planeDefaultHeight: 100,
    planeAmpHeight: 80,
    planeAmpWidth: 75,
    planeMoveSensivity: 0.005,
    planeRotXSensivity: 0.0008,
    planeRotZSensivity: 0.0004,
    planeFallSpeed: 0.001,
    planeMinSpeed: 1.2,
    planeMaxSpeed: 1.6,
    planeSpeed: 0,
    planeCollisionDisplacementX: 0,
    planeCollisionSpeedX: 0,

    planeCollisionDisplacementY: 0,
    planeCollisionSpeedY: 0,

    seaRadius: 600,
    seaLength: 800,
    //seaRotationSpeed:0.006,
    wavesMinAmp: 5,
    wavesMaxAmp: 20,
    wavesMinSpeed: 0.001,
    wavesMaxSpeed: 0.003,

    cameraFarPos: 500,
    cameraNearPos: 150,
    cameraSensivity: 0.002,

    coinDistanceTolerance: 15,
    coinValue: 3,
    coinsSpeed: 0.5,
    coinLastSpawn: 0,
    distanceForCoinsSpawn: 100,

    ennemyDistanceTolerance: 10,
    ennemyValue: 10,
    ennemiesSpeed: 0.6,
    ennemyLastSpawn: 0,
    distanceForEnnemiesSpawn: 50,

    status: "playing",
  };
  // fieldLevel.innerHTML = Math.floor(game.level);
}

//THREEJS RELATED VARIABLES

var scene,
  camera,
  fieldOfView,
  aspectRatio,
  nearPlane,
  farPlane,
  HEIGHT,
  WIDTH,
  renderer,
  container;

//SCREEN & MOUSE VARIABLES

var HEIGHT,
  WIDTH,
  mousePos = { x: 0, y: 0 };

//INIT THREE JS, SCREEN AND MOUSE EVENTS

function createScene() {
  // Get the width and the height of the screen,
  // use them to set up the aspect ratio of the camera
  // and the size of the renderer.
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;

  // Create the scene
  scene = new THREE.Scene();

  // Add a fog effect to the scene; same color as the
  // background color used in the style sheet
  scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

  // Create the camera
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 60;
  nearPlane = 1;
  farPlane = 10000;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane
  );

  // Set the position of the camera
  camera.position.x = 0;
  camera.position.z = 200;
  camera.position.y = 100;

  // Create the renderer
  renderer = new THREE.WebGLRenderer({
    // Allow transparency to show the gradient background
    // we defined in the CSS
    alpha: true,

    // Activate the anti-aliasing; this is less performant,
    // but, as our project is low-poly based, it should be fine :)
    antialias: true,
  });

  // Define the size of the renderer; in this case,
  // it will fill the entire screen
  renderer.setSize(WIDTH, HEIGHT);

  // Enable shadow rendering
  renderer.shadowMap.enabled = true;

  // Add the DOM element of the renderer to the
  // container we created in the HTML
  container = document.getElementById("world");
  container.appendChild(renderer.domElement);

  // Listen to the screen: if the user resizes it
  // we have to update the camera and the renderer size
  window.addEventListener("resize", handleWindowResize, false);
}

// MOUSE AND SCREEN EVENTS

function handleWindowResize() {
  // update height and width of the renderer and the camera
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

function handleMouseMove(event) {
  var tx = -1 + (event.clientX / WIDTH) * 2;
  var ty = 1 - (event.clientY / HEIGHT) * 2;
  mousePos = { x: tx, y: ty };
}

// LIGHTS

var ambientLight, hemisphereLight, shadowLight;

function createLights() {
  // A hemisphere light is a gradient colored light;
  // the first parameter is the sky color, the second parameter is the ground color,
  // the third parameter is the intensity of the light
  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 5.0);

  // A directional light shines from a specific direction.
  // It acts like the sun, that means that all the rays produced are parallel.
  shadowLight = new THREE.DirectionalLight(0xffffff, 3.5);

  // Set the direction of the light
  shadowLight.position.set(150, 350, 350);

  // Allow shadow casting
  shadowLight.castShadow = true;

  // define the visible area of the projected shadow
  shadowLight.shadow.camera.left = -400;
  shadowLight.shadow.camera.right = 400;
  shadowLight.shadow.camera.top = 400;
  shadowLight.shadow.camera.bottom = -400;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 1000;

  // define the resolution of the shadow; the higher the better,
  // but also the more expensive and less performant
  shadowLight.shadow.mapSize.width = 2048;
  shadowLight.shadow.mapSize.height = 2048;

  ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Added ambient light
  // to activate the lights, just add them to the scene
  scene.add(hemisphereLight);
  scene.add(shadowLight);
  scene.add(ambientLight); // Added ambient light to the scene
}

/**
 * Models
 */
const gltfLoader = new GLTFLoader();

var AirPlane = function () {
  this.mesh = new THREE.Object3D();

  // Create the cabin
  var geomCockpit = new THREE.BoxGeometry(60, 50, 50, 1, 1, 1);
  var matCockpit = new THREE.MeshPhongMaterial({
    color: Colors.red,
    flatShading: true,
  });
  var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
  cockpit.castShadow = true;
  cockpit.receiveShadow = true;
  this.mesh.add(cockpit);

  // Create the engine
  var geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
  var matEngine = new THREE.MeshPhongMaterial({
    color: Colors.white,
    flatShading: true,
  });
  var engine = new THREE.Mesh(geomEngine, matEngine);
  engine.position.x = 40;
  engine.castShadow = true;
  engine.receiveShadow = true;
  this.mesh.add(engine);

  // Create the tail
  var geomTailPlane = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
  var matTailPlane = new THREE.MeshPhongMaterial({
    color: Colors.red,
    flatShading: true,
  });
  var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
  tailPlane.position.set(-35, 25, 0);
  tailPlane.castShadow = true;
  tailPlane.receiveShadow = true;
  this.mesh.add(tailPlane);

  // Create the wing
  var geomSideWing = new THREE.BoxGeometry(40, 8, 150, 1, 1, 1);
  var matSideWing = new THREE.MeshPhongMaterial({
    color: Colors.red,
    flatShading: true,
  });
  var sideWing = new THREE.Mesh(geomSideWing, matSideWing);
  sideWing.castShadow = true;
  sideWing.receiveShadow = true;
  this.mesh.add(sideWing);

  // propeller
  var geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
  var matPropeller = new THREE.MeshPhongMaterial({
    color: Colors.brown,
    flatShading: true,
  });
  this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
  this.propeller.castShadow = true;
  this.propeller.receiveShadow = true;

  // blades
  var geomBlade = new THREE.BoxGeometry(1, 100, 20, 1, 1, 1);
  var matBlade = new THREE.MeshPhongMaterial({
    color: Colors.brownDark,
    flatShading: true,
  });

  var blade = new THREE.Mesh(geomBlade, matBlade);
  blade.position.set(8, 0, 0);
  blade.castShadow = true;
  blade.receiveShadow = true;
  this.propeller.add(blade);
  this.propeller.position.set(50, 0, 0);
  this.mesh.add(this.propeller);
};

let airplaneGroup, helix, pilot;

function createPlane() {
  // airplane = new AirPlane();
  // airplane.mesh.scale.set(0.25, 0.25, 0.25);
  // airplane.mesh.position.y = 100;
  // scene.add(airplane.mesh);

  gltfLoader.load("/models/airplane/model.glb", (glb) => {
    airplaneGroup = new THREE.Group();

    // 获取模型
    const airplane = glb.scene.children[0];
    helix = glb.scene.children[1];

    // 缩放模型，例如放大20倍
    const scale = 20;
    airplane.scale.set(scale, scale, scale);
    helix.scale.set(scale, scale, scale);

    // 调整helix相对于airplane的位置
    helix.position.set(1.09 * scale, 0.23 * scale, 0);

    // 将airplane和helix添加到组中
    airplaneGroup.add(airplane);
    airplaneGroup.add(helix);

    pilot = new Pilot();
    pilot.mesh.position.set(-5, 5, 0); // 调整Pilot的位置
    pilot.mesh.scale.set(0.35, 0.35, 0.35);
    pilot.mesh.rotation.set(0, 0, 0.35);
    airplaneGroup.add(pilot.mesh);

    // 将组添加到场景中
    scene.add(airplaneGroup);
    airplaneGroup.scale.set(2, 2, 2);
  });
}

var Cloud = function () {
  // Create an empty container that will hold the different parts of the cloud
  this.mesh = new THREE.Object3D();

  // create a cube geometry;
  // this shape will be duplicated to create the cloud
  var geom = new THREE.BoxGeometry(20, 20, 20);

  // create a material; a simple white material will do the trick
  var mat = new THREE.MeshPhongMaterial({
    color: Colors.white,
  });

  // duplicate the geometry a random number of times
  var nBlocs = 3 + Math.floor(Math.random() * 3);
  for (var i = 0; i < nBlocs; i++) {
    // create the mesh by cloning the geometry
    var m = new THREE.Mesh(geom, mat);

    // set the position and the rotation of each cube randomly
    m.position.x = i * 15;
    m.position.y = Math.random() * 10;
    m.position.z = Math.random() * 10;
    m.rotation.z = Math.random() * Math.PI * 2;
    m.rotation.y = Math.random() * Math.PI * 2;

    // set the size of the cube randomly
    var s = 0.1 + Math.random() * 0.9;
    m.scale.set(s, s, s);

    // allow each cube to cast and to receive shadows
    m.castShadow = true;
    m.receiveShadow = true;

    // add the cube to the container we first created
    this.mesh.add(m);
  }
};
Cloud.prototype.rotate = function () {
  var l = this.mesh.children.length;
  for (var i = 0; i < l; i++) {
    var m = this.mesh.children[i];
    m.rotation.z += Math.random() * 0.005 * (i + 1);
    m.rotation.y += Math.random() * 0.002 * (i + 1);
  }
};
var Sky = function () {
  this.mesh = new THREE.Object3D();
  this.nClouds = 20;
  this.clouds = [];
  // To distribute the clouds consistently,
  // we need to place them according to a uniform angle
  var stepAngle = (Math.PI * 2) / this.nClouds;

  // create the clouds
  for (var i = 0; i < this.nClouds; i++) {
    var c = new Cloud();
    this.clouds.push(c);
    // set the rotation and the position of each cloud;
    // for that we use a bit of trigonometry
    var a = stepAngle * i; // this is the final angle of the cloud
    var h = game.seaRadius + 150 + Math.random() * 200; // this is the distance between the center of the axis and the cloud itself

    // Trigonometry!!! I hope you remember what you've learned in Math :)
    // in case you don't:
    // we are simply converting polar coordinates (angle, distance) into Cartesian coordinates (x, y)
    c.mesh.position.y = Math.sin(a) * h;
    c.mesh.position.x = Math.cos(a) * h;

    // rotate the cloud according to its position
    c.mesh.rotation.z = a + Math.PI / 2;

    // for a better result, we position the clouds
    // at random depths inside of the scene
    c.mesh.position.z = -400 - Math.random() * 400;

    // we also set a random scale for each cloud
    var s = 1 + Math.random() * 2;
    c.mesh.scale.set(s, s, s);

    // do not forget to add the mesh of each cloud in the scene
    this.mesh.add(c.mesh);
  }
};
Sky.prototype.moveClouds = function () {
  for (var i = 0; i < this.nClouds; i++) {
    var c = this.clouds[i];
    c.rotate();
  }
  this.mesh.rotation.z += game.speed * deltaTime;
};
var sky;

function createSky() {
  sky = new Sky();
  sky.mesh.position.y = -game.seaRadius;
  scene.add(sky.mesh);
}

var Sea = function () {
  // create the geometry (shape) of the cylinder;
  // the parameters are:
  // radius top, radius bottom, height, number of segments on the radius, number of segments vertically
  var geom = new THREE.CylinderGeometry(600, 600, 800, 40, 10);

  // rotate the geometry on the x axis
  geom.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  // 将几何体转换为 BufferGeometry 并合并顶点
  let bufferGeom = geom;

  // get the vertices
  // var l = geom.attributes.position.array.length;
  // 获取顶点数组
  var positions = bufferGeom.attributes.position.array;
  var l = positions.length / 3; // 每个顶点有3个值 (x, y, z)

  // create an array to store new data associated to each vertex
  this.waves = [];

  for (var i = 0; i < l; i++) {
    // get each vertex
    var x = positions[i * 3];
    var y = positions[i * 3 + 1];
    var z = positions[i * 3 + 2];

    // store some data associated to it
    this.waves.push({
      y: y,
      x: x,
      z: z,
      // a random angle
      ang: Math.random() * Math.PI * 2,
      // a random distance
      amp: 5 + Math.random() * 15,
      // a random speed between 0.016 and 0.048 radians / frame
      speed: 0.016 + Math.random() * 0.032,
    });
  }
  // create the material
  var mat = new THREE.MeshPhongMaterial({
    color: Colors.blue,
    transparent: true,
    opacity: 0.6,
    flatShading: true,
  });

  // To create an object in Three.js, we have to create a mesh
  // which is a combination of a geometry and some material
  this.mesh = new THREE.Mesh(bufferGeom, mat);

  // Allow the sea to receive shadows
  this.mesh.receiveShadow = true;
};
Sea.prototype.moveWaves = function () {
  // get the vertices
  var positions = this.mesh.geometry.attributes.position.array;
  var l = positions.length / 3;

  for (var i = 0; i < l; i++) {
    // get the data associated to it
    var vprops = this.waves[i];

    // update the position of the vertex
    positions[i * 3] = vprops.x + Math.cos(vprops.ang) * vprops.amp;
    positions[i * 3 + 1] = vprops.y + Math.sin(vprops.ang) * vprops.amp;
    // z remains the same

    // increment the angle for the next frame
    vprops.ang += vprops.speed;
  }

  this.mesh.geometry.attributes.position.needsUpdate = true;

  sea.mesh.rotation.z += 0.005;
};

var sea;

function createSea() {
  sea = new Sea();

  // push it a little bit at the bottom of the scene
  sea.mesh.position.y = -600;

  // add the mesh of the sea to the scene
  scene.add(sea.mesh);
}

var Pilot = function () {
  this.mesh = new THREE.Object3D();
  this.mesh.name = "pilot";

  // angleHairs is a property used to animate the hair later
  this.angleHairs = 0;

  // Body of the pilot
  var bodyGeom = new THREE.BoxGeometry(15, 15, 15);
  var bodyMat = new THREE.MeshPhongMaterial({
    color: Colors.brown,
    flatShading: true,
  });
  var body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.set(2, -12, 0);
  this.mesh.add(body);

  // Face of the pilot
  var faceGeom = new THREE.BoxGeometry(10, 10, 10);
  var faceMat = new THREE.MeshLambertMaterial({ color: Colors.pink });
  var face = new THREE.Mesh(faceGeom, faceMat);
  this.mesh.add(face);

  // Hair element
  var hairGeom = new THREE.BoxGeometry(4, 4, 4);
  var hairMat = new THREE.MeshLambertMaterial({ color: Colors.brown });
  var hair = new THREE.Mesh(hairGeom, hairMat);
  // Align the shape of the hair to its bottom boundary, that will make it easier to scale.
  hair.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 2, 0));

  // create a container for the hair
  var hairs = new THREE.Object3D();

  // create a container for the hairs at the top
  // of the head (the ones that will be animated)
  this.hairsTop = new THREE.Object3D();

  // create the hairs at the top of the head
  // and position them on a 3 x 4 grid
  for (var i = 0; i < 12; i++) {
    var h = hair.clone();
    var col = i % 3;
    var row = Math.floor(i / 3);
    var startPosZ = -4;
    var startPosX = -4;
    h.position.set(startPosX + row * 4, 0, startPosZ + col * 4);
    this.hairsTop.add(h);
  }
  hairs.add(this.hairsTop);

  // create the hairs at the side of the face
  var hairSideGeom = new THREE.BoxGeometry(12, 4, 2);
  hairSideGeom.applyMatrix4(new THREE.Matrix4().makeTranslation(-6, 0, 0));
  var hairSideR = new THREE.Mesh(hairSideGeom, hairMat);
  var hairSideL = hairSideR.clone();
  hairSideR.position.set(8, -2, 6);
  hairSideL.position.set(8, -2, -6);
  hairs.add(hairSideR);
  hairs.add(hairSideL);

  // create the hairs at the back of the head
  var hairBackGeom = new THREE.BoxGeometry(2, 8, 10);
  var hairBack = new THREE.Mesh(hairBackGeom, hairMat);
  hairBack.position.set(-1, -4, 0);
  hairs.add(hairBack);
  hairs.position.set(-5, 5, 0);

  this.mesh.add(hairs);

  var glassGeom = new THREE.BoxGeometry(5, 5, 5);
  var glassMat = new THREE.MeshLambertMaterial({ color: Colors.brown });
  var glassR = new THREE.Mesh(glassGeom, glassMat);
  glassR.position.set(6, 0, 3);
  var glassL = glassR.clone();
  glassL.position.z = -glassR.position.z;

  var glassAGeom = new THREE.BoxGeometry(11, 1, 11);
  var glassA = new THREE.Mesh(glassAGeom, glassMat);
  this.mesh.add(glassR);
  this.mesh.add(glassL);
  this.mesh.add(glassA);

  var earGeom = new THREE.BoxGeometry(2, 3, 2);
  var earL = new THREE.Mesh(earGeom, faceMat);
  earL.position.set(0, 0, -6);
  var earR = earL.clone();
  earR.position.set(0, 0, 6);
  this.mesh.add(earL);
  this.mesh.add(earR);
};

Pilot.prototype.updateHairs = function () {
  // get the hair
  var hairs = this.hairsTop.children;

  // update them according to the angle angleHairs
  var l = hairs.length;
  for (var i = 0; i < l; i++) {
    var h = hairs[i];
    // each hair element will scale on cyclical basis between 75% and 100% of its original size
    h.scale.y = 0.75 + Math.cos(this.angleHairs + i / 3) * 0.25;
  }
  // increment the angle for the next frame
  this.angleHairs += 0.16;
};

function updatePlane() {
  // let's move the airplane between -100 and 100 on the horizontal axis,
  // and between 25 and 175 on the vertical axis,
  // depending on the mouse position which ranges between -1 and 1 on both axes;
  // to achieve that we use a normalize function (see below)

  var targetX = normalize(mousePos.x, -1, 1, -100, 100);
  var targetY = normalize(mousePos.y, -1, 1, 25, 175);

  // update the airplane's position
  if (airplaneGroup) {
    airplaneGroup.position.x = targetX;
    airplaneGroup.position.y = targetY;
    helix.rotation.x += 0.3;
    pilot.updateHairs();
  }
}

function normalize(v, vmin, vmax, tmin, tmax) {
  var nv = Math.max(Math.min(v, vmax), vmin);
  var dv = vmax - vmin;
  var pc = (nv - vmin) / dv;
  var dt = tmax - tmin;
  var tv = tmin + pc * dt;
  return tv;
}

function loop() {
  sea.mesh.rotation.z += 0.005;
  sky.mesh.rotation.z += 0.01;
  updatePlane();

  sky.moveClouds();
  sea.moveWaves();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

window.addEventListener("load", init, false);

function init() {
  // set up the scene, the camera and the renderer
  resetGame();
  createScene();

  createLights();
  createPlane();
  createSea();
  createSky();
  // start a loop that will update the objects' positions
  // and render the scene on each frame

  document.addEventListener("mousemove", handleMouseMove, false);

  loop();
}

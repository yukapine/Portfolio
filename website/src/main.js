//import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
//import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
//import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
//import { OutlinePass } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/OutlinePass.js';
//import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
//import { GammaCorrectionShader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/shaders/GammaCorrectionShader.js';
//import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/ShaderPass.js';

//import { PortfolioCarousel } from './portfolio-carousel.js';

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('three-canvas'),
    antialias: true,
    alpha: true

});

let aspect = window.innerWidth / window.innerHeight;

renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );

//document.body.appendChild( renderer.domElement );

var scene = new THREE.Scene();
renderer.setClearColor( 0xFFFFFF );

const frustumSize = 600; 
const camera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2, 
    (frustumSize * aspect) / 2,  
    frustumSize / 2,             
    -frustumSize / 2,           
    1,                           
    10000                       
);
camera.position.z = 600;
camera.position.y = -0;
camera.position.x = 0;

var height = 100;
var width = height;
var dim = 200;

var restDistance = dim/height;
var diagonalDist = Math.sqrt(restDistance * restDistance * 2);
var bigDist = Math.sqrt( restDistance * restDistance * 4 );

var click = false;
var mouse = new THREE.Vector2( 0.5, 0.5 );
var tmpmouse = new THREE.Vector3();
var mouse3d = new THREE.Vector3( 0, 0, 0 );
var raycaster = new THREE.Raycaster();

var hoveredObjects = [];

// LIGHTING

var directionalLight = new THREE.DirectionalLight( 0xba8bb8, 2.5 );
directionalLight.position.set( 1, 1, 1 );
scene.add( directionalLight );

var directionalLight2 = new THREE.DirectionalLight( 0x8bbab4, 2.5 );
directionalLight2.position.set( 1, 1, -1 );
scene.add( directionalLight2 )

var light = new THREE.AmbientLight( 0x999999 ); // soft white light
scene.add( light );
var plight = new THREE.PointLight( 0xffffff, 1.0, 700 );
plight.position.set( 0, 350, 0 );
scene.add( plight );

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outlinePass = new OutlinePass( new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera );

outlinePass.edgeStrength = 80; // Adjust outline strength
outlinePass.edgeGlow = 10; // Glow effect
outlinePass.edgeThickness = 5; // Thickness of the outline
outlinePass.pulsePeriod = 0; // Pulsing effect
outlinePass.visibleEdgeColor.set('#ffffff'); // Outline color
outlinePass.hiddenEdgeColor.set('#0000ff'); // Hidden edges color
outlinePass.selectedObjects;
composer.addPass(outlinePass);

const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);  
composer.addPass(gammaCorrectionPass);

// TEXTURES AND MATERIALS

var textureLoader = new THREE.TextureLoader();
var planeGeometry = new THREE.PlaneGeometry(1000, 1000);
var planeTexture = textureLoader.load("./Tile.png");
var planeMaterial = new THREE.MeshBasicMaterial({ map: planeTexture });

var voidPlane = new THREE.Mesh(planeGeometry, planeMaterial);
voidPlane.rotation.x = -Math.PI / 2.8;
voidPlane.position.y = -200;
scene.add(voidPlane);

var maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
var texture1 = textureLoader.load( "./bubble_temp.png" );

texture1.anisotropy = maxAnisotropy;
texture1.repeat.x = 0.8;
texture1.offset.x = 0.1;
texture1.updateMatrix();

// PHYSICS

const amplitude = 2;
let step = 0;
const totalSteps = 480; // Complete cycle takes 120 steps
const stepSize = (Math.PI * 2) / totalSteps; // Size of each step in radians

var DRAG = 0.97;
var PULL = 4.5;

const defaultInnerOrbMaterial = new THREE.MeshPhongMaterial({
    color: 0x000000,
    shininess: 80,
});
const highlightInnerOrbMaterial = new THREE.MeshPhongMaterial({
    color: 0x00f000,
    shininess: 80,
});

function Particle( x, y, z, mass ) {

    this.position = new THREE.Vector3();
    this.previous = new THREE.Vector3();
    this.original = new THREE.Vector3();
    this.a = new THREE.Vector3( 0, 0, 0 ); 
    this.mass = mass;
    this.invMass = 1 / mass;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.distance = 0;
    this.adj = [];

    this.position.set( x, y, z);
    this.previous.set( x, y, z);
    this.original.set( x, y, z);

}

Particle.prototype.addForce = function ( force ) {
    this.a.add( this.tmp2.copy( force ).multiplyScalar( this.invMass ) );
};

Particle.prototype.integrate = function ( timesq ) {

    var newPos = this.tmp.subVectors( this.position, this.previous );
    newPos.multiplyScalar( DRAG ).add( this.position );
    newPos.add( this.a.multiplyScalar( timesq ) );

    this.tmp = this.previous;
    this.previous = this.position;
    this.position = newPos;

    this.a.set( 0, 0, 0 );

};

function getIntersects(object) {
    raycaster.setFromCamera( mouse, camera );
    var intersects = raycaster.intersectObjects( [object] );
    return intersects;
}


export class ContentManager {
    constructor() {
      this.carousel = new window.PortfolioCarousel();
      this.threeScene = scene;
      this.currentSection = 'main';
      
      this.setupNavigation();
    }

    setupNavigation() {
      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          const section = link.dataset.section;
          this.switchToSection(section);
        });
      });
    }

    switchToSection(section) {
      if (section === this.currentSection) return;

      // Update navigation
      this.currentSection = section;
      this.updateNavigation();

      // Handle content visibility
      const mainContent = document.getElementById('main-content');
      const portfolioContent = document.getElementById('portfolio-content');

      if (section === 'portfolio') {
        mainContent.classList.add('hidden');
        portfolioContent.classList.remove('hidden');
        this.carousel.activate();
        //this.threeScene.deactivate();
      } else {
        portfolioContent.classList.add('hidden');
        mainContent.classList.remove('hidden');
        this.carousel.deactivate();
        //this.threeScene.activate();
      }
    }

    updateNavigation() {
      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        if (link.dataset.section === this.currentSection) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
}

  
new ContentManager();


class Bubble {
    constructor(id, scene, position, link, itemMeshPath, radius = 75, segments = 50, color = 0xaa2949) {
        this.radius = radius;
        this.particles = [];
        this.constraints = [];
        this.mesh = null;
        this.id = id;
        this.orbItemMesh = null;
        this.orbItemSelected = false;
        this.orbLink = link;
        this.itemMeshPath = itemMeshPath;
        
        this.selectedParticle = undefined;
        this.position = position.clone();
        this.scene = scene;
        
        
        // Create marker for selected particle
        const markerGeometry = new THREE.SphereGeometry(5, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.8 
        });
        
        this.selectionMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        this.selectionMarker.visible = false;

        this.scene.add(this.selectionMarker);
        this.createGeometry(scene, position, segments, color);
        this.createInnerOrbs(scene, this.position, this.itemMeshPath);
        this.createParticles(segments);
    }

    createGeometry(scene, position, segments, color) {
        // Create Sphere
        const geometry = new THREE.SphereGeometry(this.radius, segments, segments);
        // Create Material
        var MeshMaterial = new THREE.MeshPhongMaterial( {
            color: 0xe6e6ff,
            specular: 0xe6e6ff,
            shininess: 100, 
            map: texture1,
            side: THREE.DoubleSide,
            alphaTest: 0.1,
            opacity: 0.1,           
            transparent: true 
        } );

        // Create Mesh with Material
        this.mesh = new THREE.Mesh(geometry, MeshMaterial);
        this.mesh.position.copy(position);
        
        scene.add(this.mesh);

        requestAnimationFrame(update);
    }

    createInnerOrbs(scene, innerOrbPosition, glbPath) {
        const loader = new GLTFLoader();

        loader.load(
            glbPath,
            (gltf) => {
                const item = gltf.scene;
                const scale = this.radius;
                item.scale.set(scale, scale, scale);
                item.position.copy(this.position.clone().add(innerOrbPosition));
                this.orbItemMesh = item;
                scene.add(item);
            },
            undefined, // Optional progress callback
            (error) => {
                console.error('An error occurred while loading the GLB file:', error);
            }
        );

        //requestAnimationFrame(update);
        
        //const innerOrbGeometry = new THREE.SphereGeometry(innerOrbRadius, 32, 32);
        //const innerOrb = new THREE.Mesh(innerOrbGeometry, orbMaterial);
            
        //innerOrb.position.copy(this.position.clone().add(innerOrbPosition));
        //this.orbItemMesh = innerOrb;
        //scene.add(innerOrb);
    }

    updateItemPosition() {
        step = (step + 0.25) % totalSteps;
        const progress = step / totalSteps;
        const position = Math.abs(Math.sin(progress * Math.PI * 2));
        const easedPos = position * position * (3 - 2 * position);
        const finalPos = amplitude * (1 - 2 * easedPos);
        this.orbItemMesh.position.y = finalPos;
    }

    handleInnerOrbHover() {
        var itemMesh = this.orbItemMesh;
        var intersects = getIntersects(itemMesh);
        //outlinePass.selectedObjects = intersects.length > 0 ? [intersects[0].object] : [];
        if (intersects.length > 0) {
            outlinePass.selectedObjects = [intersects[0].object];
            //console.log(outlinePass.selectedObjects[0].name);
        } else {
            outlinePass.selectedObjects = [];
            //console.log(outlinePass.selectedObjects);
        }
    }

    createParticles(segments) {
        const geometry = this.mesh.geometry;
        const positionAttribute = geometry.attributes.position;
        const numVerts = positionAttribute.count;
        

        // Create a particle for each vertex
        for (let i = 0; i < numVerts; i++) {
            const localX = positionAttribute.getX(i);
            const localY = positionAttribute.getY(i);
            const localZ = positionAttribute.getZ(i);

            // Convert to world position by adding sphere's position
            const worldX = localX + this.position.x;
            const worldY = localY + this.position.y;
            const worldZ = localZ + this.position.z;

            // Create particle with world position
            const particle = new Particle(worldX, worldY, worldZ, 0.1);
            this.particles.push(particle);
            
            //this.particles.push( new Particle(x, y, z, 0.1) );
        }

        // Create constraints between particles
        const index = geometry.index;
        
        if (index !== null) {
            for (let i = 0; i < index.count; i += 3) {
                const a = index.getX(i);
                const b = index.getX(i + 1);
                const c = index.getX(i + 2);

                this.addConstraint(a, b);
                this.addConstraint(a, c);
                //this.addConstraint(c, a);
            }
        }
        
        //requestAnimationFrame(update);
    }
    

    addConstraint(a, b) {
        if (!this.particles[b].adj.includes(a)) this.particles[a].adj.push(b);
        if (!this.particles[a].adj.includes(b)) this.particles[b].adj.push(a);

        this.constraints.push([
            this.particles[a],
            this.particles[b],
            this.particles[a].original.distanceTo(this.particles[b].original),
        ]);
    }

    updateParticlePosition() {
        const position = this.mesh.geometry.attributes.position;
        const vector = new THREE.Vector3();
        for (let i = 0; i < this.particles.length; i++) {
            vector.copy(this.particles[i].position); // Get the current particle position
            position.setXYZ(i, vector.x, vector.y, vector.z); 
            }
        position.needsUpdate = true;
    }

    updateMouse() {

        //raycaster.setFromCamera( mouse, camera );
        //var intersects = raycaster.intersectObjects( [this.mesh] );
        var intersects = getIntersects(this.mesh);
    
        if ( intersects.length > 0 ) {
            //mouse3d.copy( intersects[0].point );
            const worldIntersectPoint = intersects[0].point.clone();
            if (click && this.selectedParticle === undefined && !mouse3d.equals( new THREE.Vector3(0,0,0))) {
                var minDist = 9999;
                let selectedIndex = -1;
                
                for (let i = 0; i < this.particles.length; i++) {
                    const worldParticlePos = this.particles[i].position.clone().add(this.position);
                    const dist = worldIntersectPoint.distanceTo(worldParticlePos);
                    if (dist < minDist) {
                        minDist = dist;
                        selectedIndex = i;
                    }
                }
                if (selectedIndex !== -1 ) {
                    this.selectedParticle = selectedIndex;
                    
                    const selectedPos = this.particles[selectedIndex].position.clone().sub(this.position);

                    this.selectionMarker.position.copy(selectedPos);
                    this.selectionMarker.visible = true;

                    for (let i = 0; i < this.particles.length; i++ ) {
                        this.particles[i].distance = this.particles[selectedIndex].original.distanceTo( this.particles[i].original );            
                        
                    }
                }
            }
            mouse3d.copy(tmpmouse);
        } 
    
        const newPlane = new THREE.Plane( camera.position.clone().normalize(), -100 );
        raycaster.ray.intersectPlane( newPlane, tmpmouse );
        if ( tmpmouse != null ) {
            mouse3d.copy(tmpmouse);
        }
        
    }

    cleanup() {
        this.selectionMarker.visible = false;
        this.selectedParticle = undefined;
    }


    simulate() {
        const timestepSq = 18 / 1000 * 18 / 1000;

        if (this.selectedParticle !== undefined) {
            const selectedPos = this.particles[this.selectedParticle].position.clone().add(this.position);
            this.selectionMarker.position.copy(selectedPos);
        }

        // Apply forces and integrate
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];

            //const worldOriginal = particle.original.clone().add(this.position);
            //const worldCurrent = particle.position.clone().add(this.position);
            //const force = worldOriginal.sub(worldCurrent).multiplyScalar(PULL);

            const force = new THREE.Vector3().copy(particle.original);
            //const force = new THREE.Vector3().copy(worldOriginal).sub(worldCurrent);
            particle.addForce( force.sub(particle.position).multiplyScalar( PULL ) );
            //particle.addForce(force);
            particle.integrate(timestepSq);
        }
        // handle Mouse Interactions
        if (click && this.selectedParticle !== undefined) {
            const worldParticlePos = this.particles[this.selectedParticle].position.clone().add(this.position);
            const offset = mouse3d.clone().sub(worldParticlePos);
            //const offset = mouse3d.clone().sub(this.particles[ this.selectedParticle ].position);
            //const offset = mouse3d.clone().sub(this.particles[this.selectedParticle].position);
            for (let i = 0; i < this.particles.length; i++) {
                if (this.particles[i].distance < 10) {
                    const influence = 1.0 - 0.1 * (this.particles[i].distance / 10);
                    this.particles[i].position.add(offset.clone().multiplyScalar(influence));
                }
            }
        }

        // Satisfy constraints
        for (let j = 0; j < 5; j++) {
            for (const [p1, p2, restDistance] of this.constraints) {
                const diff = new THREE.Vector3().subVectors(p2.position, p1.position);
                const currentDist = diff.length();
                if (currentDist === 0) continue;
                const correction = diff.multiplyScalar(1 - restDistance / currentDist);
                const correctionHalf = correction.multiplyScalar(0.5);
                p1.position.add(correctionHalf);
                p2.position.sub(correctionHalf);
            }
        }
        // Update mesh geometry through particle position
        this.updateParticlePosition();
        this.mesh.geometry.computeVertexNormals();
    }
}

let spheres = [];
const positions = [
    //new THREE.Vector3(-400, 0, 0),
    new THREE.Vector3(-125, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(125, 0, 0)
    //new THREE.Vector3(400, 0, 0),
];

const links = [
    "https://www.fabriohub.com/",
    "https://www.fabriohub.com/",
    "https://www.fabriohub.com/"
];

const itemMeshPaths = [
    'loafers.glb',
    'pencil.glb',
    'computer.glb'
];

for (let i = 0; i < positions.length; i++) {
    const sphere = new Bubble(i, scene, positions[i], links[i], itemMeshPaths[i]);
    spheres.push(sphere);
}

var debug = document.getElementById('debug');

window.onresize = function () {
    var w = window.innerWidth;
    var h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize( w, h );
};

window.onmousemove = function (evt) { 
    const ray = raycaster.setFromCamera( mouse, camera );
    spheres.forEach((sphere) => {
        sphere.handleInnerOrbHover();
    });
    
    mouse.x = (evt.pageX / window.innerWidth) * 2 - 1;
    mouse.y = -(evt.pageY / window.innerHeight) * 2 + 1;
}

window.onmousedown = function (evt) { 
    if (evt.button == 0)
        click = true;

}

window.onmouseup = function(evt) {
    if (evt.button === 0) {
        click = false;
        // Reset selected particles for all spheres
        spheres.forEach(sphere => {
            sphere.selectedParticle = undefined;
        });
    }
    spheres.forEach(sphere => {
        sphere.cleanup();
    });
};

window.onmouseout = function(evt) {
    click = false;
    spheres.forEach(sphere => {
        sphere.selectedParticle = undefined;
        sphere.cleanup();
        
    });
};

function update() {
    requestAnimationFrame(update);

    for (const sphere of spheres) {
        if (click) {
            sphere.updateMouse();
            
        }
        sphere.updateItemPosition();
        sphere.simulate();
        if (sphere.orbItemSelected) window.open(sphere.orbLink);
    }
    composer.render();
}

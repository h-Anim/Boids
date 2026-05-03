import * as THREE from 'three';
import { GUI } from './lib/lil-gui.module.min.js';

let camera, scene, renderer, stats, material, timer;
let mouseX = 0, mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

var keyboard;

var radius = 200.0;
var center = new THREE.Vector3(0, 0, 0);

var angle = 0.0;

var particles;
const geometry = new THREE.BufferGeometry();

//===================

var MAX_PART = 300;
var PREFFERED_DISTANCE = 5;
var BOID_MAX_VELOCITY = 20;
var BOID_MIN_VELOCITY = 5;
var CLOSE_DISTANCE = 50;

var COHESION_FACTOR = 1;
var SEPARATION_FACTOR = 1;
var ALIGNMENT_FACTOR = 1;

//===================

var boids = [];

//===================

var TARGET_SPEED = 30;
var TARGET_ATTRACTION = 1;

var current_target = new THREE.Vector3(0, 0, 0);
var new_target = new THREE.Vector3(0, 0, 0);

var sphere;

//===================

const gui = new GUI( { width: 310 } );

init();

function init() {

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 2, 3000);
    //camera.position.z = 100;


    timer = new THREE.Timer();
    timer.connect(document);

    scene = new THREE.Scene();

    sphere = createSphere();

    const vertices = [];

    const sprite = new THREE.TextureLoader().load('sprites/disc.png');
    sprite.colorSpace = THREE.SRGBColorSpace;

    //===================

    for (let i = 0; i < MAX_PART; i++) 
    {
        var x = (Math.random()*radius)-radius/2.0;
        var y = (Math.random()*radius)-radius/2.0;
        var z = (Math.random()*radius)-radius/2.0;

        var boid = {};
        boid.position = new THREE.Vector3(x, y, z);
        boid.velocity = new THREE.Vector3(0, 0, 0);
        boid.acceleration = new THREE.Vector3(0, 0, 0);

        boid.velocity.subVectors(new THREE.Vector3(0, 0, 0), boid.position);
        boid.velocity.normalize();
        boid.velocity.multiplyScalar(BOID_MAX_VELOCITY);
        velocityLimitation(boid.velocity);

        boids.push(boid);

        vertices.push(x, y, z);
    }

    //===================

    center.x = 0;
    center.z = 0;
    center.y = 0;

    var x = center.x + radius * Math.cos(angle);
    var z = center.z + radius * Math.sin(angle);

    camera.position.set(x, center.y, z);
    camera.lookAt(center);


    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    material = new THREE.PointsMaterial({ size: 3, sizeAttenuation: true, map: sprite, alphaTest: 0.5, transparent: true });
    material.color.setHSL(1.0, 0.3, 0.7, THREE.SRGBColorSpace);

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    renderer = new THREE.WebGLRenderer();

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);
    keyboard = new THREEx.KeyboardState();
    //

    //


    //

    document.body.style.touchAction = 'none';
    document.body.addEventListener('pointermove', onPointerMove);

    //

    window.addEventListener('resize', onWindowResize);

    createPanel();
}

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function onPointerMove(event) {

    if (event.isPrimary === false) return;

    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;

}

//

function animate() {

    timer.update();

    moveBoids(timer.getDelta());

    updateTarget(timer.getDelta());

    if (keyboard.pressed('left')) {

        angle += Math.PI / 4 * timer.getDelta();
        var x = center.x + radius * Math.cos(angle);
        var z = center.z + radius * Math.sin(angle);
        camera.position.set(x, camera.position.y, z);
    }
    if (keyboard.pressed('right')) {
        angle -= Math.PI / 4 * timer.getDelta();
        var x = center.x + radius * Math.cos(angle);
        var z = center.z + radius * Math.sin(angle);
        camera.position.set(x, camera.position.y, z);
    }

    render();
}

function render() {

    const time = Date.now() * 0.00005;

    //camera.position.x += (mouseX - camera.position.x) * 0.05;
    //camera.position.y += (- mouseY - camera.position.y) * 0.05;

    camera.lookAt(scene.position);

    const h = (360 * (1.0 + time) % 360) / 360;
    material.color.setHSL(h, 0.5, 0.5);


    renderer.render(scene, camera);

}


function rule1(boid)    //Cohesion - fly toward center of mass
{
    var com = new THREE.Vector3(0, 0, 0);   //center of mass
    var v1 = new THREE.Vector3(0, 0, 0);

    var k = 0;

    for (var i = 0; i < boids.length; i++)
    {
        
        if (boids[i] != boid)
            if (boid.position.distanceTo( boids[i].position ) < CLOSE_DISTANCE)
            {
                com.add(boids[i].position);
                k++;        
            }
    }

    if (k > 0)
    {
        com.divideScalar(k);
        v1.subVectors(com, boid.position);
        v1.normalize();
        v1.multiplyScalar(BOID_MAX_VELOCITY);
    //    v1.sub(boid.velocity);
        v1.multiplyScalar(timer.getDelta());
        v1.multiplyScalar(COHESION_FACTOR);
    }

    return v1;
}

function rule2(boid)    //Separation - keep away from others
{
    var v2 = new THREE.Vector3(0, 0, 0);    

    var k = 0;

    for (var i = 0; i < boids.length; i++)
    {
        if (boids[i] != boid)
        {
            var d = boid.position.distanceTo( boids[i].position );
            if (d < PREFFERED_DISTANCE)
            {
                var temp = new THREE.Vector3(0, 0, 0);

                temp.subVectors(boid.position, boids[i].position);
                temp.normalize();
                temp.divideScalar(d);
                v2.add(temp);
                k++;
            }
            /*
            if (d < PREFFERED_DISTANCE)
            {
                var temp = new THREE.Vector3(0, 0, 0);

                temp.subVectors(boids[i].position, boid.position);
                temp.normalize();
                v2.sub(temp);
                k++;
            }
            //*/
        }
    }

    if (k > 0)
    {
        v2.divideScalar(k);
        v2.normalize();
        v2.multiplyScalar(BOID_MAX_VELOCITY);
    //    v2.sub(boid.velocity);
        v2.multiplyScalar(timer.getDelta());
        v2.multiplyScalar(SEPARATION_FACTOR);
    }

    return v2;
}

function rule3(boid)    //Alignment - match velocity with neighbours
{
    var av = new THREE.Vector3(0, 0, 0);    //average velocity
    var v3 = new THREE.Vector3(0, 0, 0);    
    var k = 0;

    for (var i = 0; i < boids.length; i++)
        if (boids[i] != boid)
        {
            if (boid.position.distanceTo( boids[i].position ) < CLOSE_DISTANCE)
            {
                av.add(boids[i].velocity);
                k++;
            }
        }

        if (k > 0)
        {
            av.divideScalar(k);
            v3.normalize();
            v3.multiplyScalar(BOID_MAX_VELOCITY);

          //  v3.subVectors(av, boid.velocity);
            
            v3.multiplyScalar(timer.getDelta());
            v3.multiplyScalar(ALIGNMENT_FACTOR);
        }

    return v3;
}



function rule4(boid)    //move toward target
{
    var v4 = new THREE.Vector3(0, 0, 0);    

    v4.subVectors(current_target, boid.position);
    v4.normalize();    
    v4.multiplyScalar(BOID_MAX_VELOCITY);
   // v4.sub(boid.velocity);
    v4.multiplyScalar(timer.getDelta());
    v4.multiplyScalar(TARGET_ATTRACTION);
    
    return v4;
}

function returnToScene(boid)
{
    var center = new THREE.Vector3(0, 0, 0);

    if (boid.position.distanceTo( center ) > radius*2)
    {
        boid.velocity.subVectors(center, boid.position);
        boid.velocity.normalize();
        boid.velocity.multiplyScalar(BOID_MAX_VELOCITY);
        velocityLimitation(boid.velocity);
    }
}

function velocityLimitation(velocity)
{
    //*
    if (velocity.length() > BOID_MAX_VELOCITY)
    {
        velocity.normalize();
        //velocity.multiplyScalar(timer.getDelta());
        velocity.multiplyScalar(BOID_MAX_VELOCITY);
    }

    if (velocity.length() < BOID_MIN_VELOCITY)
    {
        velocity.normalize();
        velocity.multiplyScalar(BOID_MIN_VELOCITY);
        //velocity.multiplyScalar(timer.getDelta());
    }
    //*/
}



function moveBoids(delta)
{

    for (var i = 0; i < boids.length; i++)
    {
        var v1 = rule1(boids[i]);
        var v2 = rule2(boids[i]);
        var v3 = rule3(boids[i]);                

        boids[i].acceleration.add(v1);
        boids[i].acceleration.add(v2);
        boids[i].acceleration.add(v3); 

        if (i % 3 == 0)
        {
            var v4 = rule4(boids[i]);
            boids[i].acceleration.add(v4); 
        }

    }
    

    for (var i = 0; i < boids.length; i++)
    {
        
        boids[i].velocity.add(boids[i].acceleration);

        velocityLimitation(boids[i].velocity);

        boids[i].acceleration.multiplyScalar(0);

       // boids[i].newVelocity.copy(boids[i].velocity);

        var v = new THREE.Vector3(0, 0, 0);
        v.copy(boids[i].velocity);
        
        v.multiplyScalar(delta);

        boids[i].position.add(v);        

        returnToScene(boids[i]);
    }

    var vertices = geometry.getAttribute("position");

    var ind = 0;

    for (var i = 0; i < vertices.array.length; i+=3) 
    {
        vertices.array[i] = boids[ind].position.x;
        vertices.array[i + 1] = boids[ind].position.y;
        vertices.array[i + 2] = boids[ind].position.z;

        ind++;
    }

    geometry.setAttribute('position', vertices);
    geometry.attributes.position.needsUpdate = true;
}


function updateTarget(delta)
{
    if (current_target.distanceTo( new_target ) < 1)
    {
        var x = (Math.random()*2)-1;
        var y = (Math.random()*2)-1;
        var z = (Math.random()*2)-1;

        new_target.set(x, y, z);

        new_target.normalize();
        new_target.multiplyScalar(radius/2);
    }

    var v = new THREE.Vector3(0, 0, 0);    
    v.subVectors(new_target, current_target);
    v.normalize();
    v.multiplyScalar(delta*TARGET_SPEED);

    current_target.add(v);

    sphere.position.copy(current_target);
}

function createSphere()
{
    const geometry = new THREE.SphereGeometry( 1, 32, 16 );
    const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
    var sphere = new THREE.Mesh( geometry, material );
    scene.add( sphere );

    return sphere;
}


function createPanel() 
{

    const folder1 = gui.addFolder( 'Boids Settings' );
    const folder2 = gui.addFolder( 'Rules Settings' );
    const folder3 = gui.addFolder( 'Target Settings' );

    //================================================================================
    var boidS = { Comfort_Distance: 5, Detection_Radius: 50 , Max_Velocity: 20}

    folder1.add( boidS, 'Comfort_Distance', 3, 30, 1 ).onChange( value => {
        PREFFERED_DISTANCE = value;
    } ); // min, max

    folder1.add( boidS, 'Detection_Radius', 10, 100, 5 ).onChange( value => {
        CLOSE_DISTANCE = value;
    } ); // min, max, step

    folder1.add( boidS, 'Max_Velocity', 10, 100, 1 ).onChange( value => {
        BOID_MAX_VELOCITY = value;
    } ); // min, max, step

    //================================================================================
    var ruleS = { Cohesion: 1, Separation: 1, Alignment: 1 }

    folder2.add( ruleS, 'Cohesion', 0.01, 2 ).onChange( value => {
        COHESION_FACTOR =  value ;
    } ); // min, max

    folder2.add( ruleS, 'Separation', 0.01, 2 ).onChange( value => {
        SEPARATION_FACTOR = value ;
    } ); // min, max, step

    folder2.add( ruleS, 'Alignment', 0.01, 2 ).onChange( value => {
        ALIGNMENT_FACTOR = value ;
    } ); // min, max, step

    //================================================================================
    var targetS = { Target_Speed: 30, Target_Attraction: 1 }

    folder3.add( targetS, 'Target_Speed', 1, 100, 5 ).onChange( value => {
        TARGET_SPEED =  value ;
    } ); // min, max

    folder3.add( targetS, 'Target_Attraction', 0, 2 ).onChange( value => {
        TARGET_ATTRACTION = value ;
    } ); // min, max

    const button = {
        Reset: function() { reset() }

    };
    
    gui.add( button, 'Reset' ); // Button
}

function reset()
{
    for (let i = 0; i < boids.length; i++) 
    {
        var x = (Math.random()*radius)-radius/2.0;
        var y = (Math.random()*radius)-radius/2.0;
        var z = (Math.random()*radius)-radius/2.0;

        boids[i].position = new THREE.Vector3(x, y, z);
        boids[i].velocity = new THREE.Vector3(0, 0, 0);
        boids[i].acceleration = new THREE.Vector3(0, 0, 0);

        boids[i].velocity.subVectors(new THREE.Vector3(0, 0, 0), boids[i].position);
        boids[i].velocity.normalize();
        boids[i].velocity.multiplyScalar(BOID_MAX_VELOCITY);
        velocityLimitation(boids[i].velocity);            
    }
}
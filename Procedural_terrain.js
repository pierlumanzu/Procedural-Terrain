//Rendering variables
var camera, scene, renderer;

//Variables for procedural terrain
var groundMesh, floor = [], bufferGeometry = [], xPosition = [], zPosition = [], water;

//Variables for camera control
var controlsEnabled = false;
var controls;
var objects = [];
var moveUp = false;
var moveDown = false;
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();
var vertex = new THREE.Vector3();
var color = new THREE.Color();
var player = {
    speed: 2.2
};

//Parameters

var params = {

    //Camera
    fov: 45,
    near: 1,
    far: 10000,

    //Geometry of terrain
    tileLength: 2000,
    tileSegments: 550,
    amplitudeNoise: 160.0,

    //Texture
    repetitionOfTexture: 50,
    heightFactor: 4.4,

    //Water
    waterHeight: 35
};

THREE.ImageUtils.crossOrigin = '';

//Uniform variables for shaders
var uniforms = {

    //Vertex Shader
    screenWidth: { type: "f", value: window.innerWidth},
    u_Eye: {type: "v4", value: null},

    amplitudeNoise: { type: "f", value: params.amplitudeNoise},

    repetitionOfTexture: {type: "i", value: params.repetitionOfTexture},

    //Fragment Shader
    texture_dirt: { type: "t", value: THREE.ImageUtils.loadTexture( "texture/dirt2.png" ) },
    texture_grass: { type: "t", value: THREE.ImageUtils.loadTexture( "texture/grass.png" ) },
    texture_rock: { type: "t", value: THREE.ImageUtils.loadTexture( "texture/rock.jpg" ) },
    heightFactor: {type: "f", value: params.heightFactor},

    u_FogDist: {type: "v2", value: new THREE.Vector2(2.0, 2000.0)},
    u_FogColor: {type: "v3", value: new THREE.Vector3(0.45, 0.68, 0.93)},

};

//Initialization of water geometry
var waterGeometry = new THREE.PlaneBufferGeometry( params.tileLength*3, params.tileLength*3 );
var flowMap = THREE.ImageUtils.loadTexture( 'texture/water/Water_1_M_Flow.jpg' );


function main(){

    (function(){var script=document.createElement('script');script.onload=function(){var stats=new Stats();document.body.appendChild(stats.dom);requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop)});};script.src='//rawgit.com/mrdoob/stats.js/master/build/stats.min.js';document.head.appendChild(script);})()

    //For camera controls
    var blocker = document.getElementById( 'blocker' );
    var instructions = document.getElementById( 'instructions' );
    // http://www.html5rocks.com/en/tutorials/pointerlock/intro/
    var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
    if ( havePointerLock ) {
        var element = document.body;
        var pointerlockchange = function ( event ) {
            if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {
                controlsEnabled = true;
                controls.enabled = true;
                blocker.style.display = 'none';
            } else {
                controls.enabled = false;
                blocker.style.display = 'block';
                instructions.style.display = '';
            }
        };
        var pointerlockerror = function ( event ) {
            instructions.style.display = '';
        };
        // Hook pointer lock state change events
        document.addEventListener( 'pointerlockchange', pointerlockchange, false );
        document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
        document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );
        document.addEventListener( 'pointerlockerror', pointerlockerror, false );
        document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
        document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );
        instructions.addEventListener( 'click', function ( event ) {
            instructions.style.display = 'none';
            // Ask the browser to lock the pointer
            element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
            element.requestPointerLock();
        }, false );
    } else {
        instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
    }

    window.addEventListener( 'keydown', keyDown);
    window.addEventListener( 'keyup', keyUp);

    //Camera
    camera = new THREE.PerspectiveCamera( params.fov, window.innerWidth/window.innerHeight, params.near, params.far);
    camera.position.set(0,60,0);
    camera.lookAt(0,60,0);

    //Scene
    scene = new THREE.Scene();

    //Ground - call to the function
    uniforms.texture_dirt.value.wrapS = uniforms.texture_dirt.value.wrapT = THREE.RepeatWrapping;
    uniforms.texture_grass.value.wrapS = uniforms.texture_grass.value.wrapT = THREE.RepeatWrapping;
    uniforms.texture_rock.value.wrapS = uniforms.texture_rock.value.wrapT = THREE.RepeatWrapping;
    addGround();

    //Water
    water = new THREE.Water( waterGeometry, {
        scale: 1,
        textureWidth: 1024,
        textureHeight: 1024,
        flowMap: flowMap,
        color: 0xbfd1e5
    } );

    water.position.y = params.waterHeight;
    water.rotation.x = Math.PI * - 0.5;
    water.position.z = 0;
    water.position.x = 0;
    scene.add(water);

    //Camera Controls
    controls = new THREE.PointerLockControls(camera);
    scene.add(controls.getObject());

    //Background Scene
    scene.background = new THREE.Color( 0x74aded );

    //Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );

    onWindowResize();

    //Action of rendering
    render();
}

function onWindowResize() {
    controls.getObject().aspect = window.innerWidth / window.innerHeight;
    controls.getObject().children[0].children[0].updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    uniforms.screenWidth.value = window.innerWidth;
}

function addGround() {
    var count = 0;
    var xPos=0;
    //we want a 3 by 3 matrix
    for(var row = 0; row<3; row+=1) {
        if (row == 0) {
            xPos = -params.tileLength;
        }
        else if (row == 1) {
            xPos = 0;
        }
        else if (row == 2) {
            xPos = params.tileLength;
        }

        for (var zPos = -params.tileLength; zPos < (params.tileLength * 2); zPos += params.tileLength){
            groundMesh = addingGroundMesh(count, xPos, zPos);
            count++;
            floor.push(groundMesh);
        }
    }
}

function addingGroundMesh(index, xPos, zPos) {

    var groundGeometry = new THREE.PlaneGeometry(params.tileLength, params.tileLength, params.tileSegments, params.tileSegments);
    bufferGeometry.push(new THREE.BufferGeometry().fromGeometry(groundGeometry));
    xPosition.push(new Float32Array( bufferGeometry[index].attributes.position.count ));
    zPosition.push(new Float32Array( bufferGeometry[index].attributes.position.count ));
    for( var i = 0; i < xPosition[index].length; i++){
        xPosition[index][i] = xPos;
        zPosition[index][i] = zPos;
    }
    bufferGeometry[index].addAttribute( 'xPos', new THREE.BufferAttribute( xPosition[index], 1 ) );
    bufferGeometry[index].addAttribute( 'zPos', new THREE.BufferAttribute( zPosition[index], 1 ) );

    var groundMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent
    });

    groundMesh = new THREE.Mesh( bufferGeometry[index], groundMaterial );

    groundMesh.position.y = -1.9;
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.z = zPos;
    groundMesh.position.x = xPos;
    groundMesh.doubleSided = true;

    scene.add(groundMesh);

    return groundMesh;
}

function modifyingGroundMesh(index, xPos, zPos) {
    for( var i = 0; i < xPosition[index].length; i++){
        xPosition[index][i] = xPos;
        zPosition[index][i] = zPos;
    }
    bufferGeometry[index].attributes.xPos.needsUpdate = true;
    bufferGeometry[index].attributes.zPos.needsUpdate = true;

    var groundMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent
    });

    groundMesh = new THREE.Mesh( bufferGeometry[index], groundMaterial );

    groundMesh.position.y = -1.9;
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.z = zPos;
    groundMesh.position.x = xPos;
    groundMesh.doubleSided = true;

    scene.add(groundMesh);

    return groundMesh;
}

function render() {

    setTimeout( function() {

        requestAnimationFrame( render );

    }, 1000 / 60 );

    if ( controlsEnabled === true ) {
        var time = performance.now();
        var delta = ( time - prevTime ) / 1000;
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= velocity.y * 10.0 * delta; // 100.0 = mass
        direction.z = Number( moveForward ) - Number( moveBackward );
        direction.x = Number( moveLeft ) - Number( moveRight );
        direction.y = Number( moveDown ) - Number( moveUp );
        direction.normalize(); // this ensures consistent movements in all directions
        if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
        if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;
        if ( moveUp || moveDown ) velocity.y -= direction.y * 400.0 * delta;
        controls.getObject().translateX( velocity.x * delta );
        if(controls.getObject().position.y + velocity.y * delta >= 5){
            controls.getObject().translateY( velocity.y * delta );
        }
        controls.getObject().translateZ( velocity.z * delta );
        prevTime = time;
    }

    uniforms.u_Eye.value = new THREE.Vector4(controls.getObject().position.x, controls.getObject().position.y, controls.getObject().position.z, 1.0);

    renderer.render( scene, camera );

    moveWithCamera();
}

//Modification of the tiles based on the camera position
function moveWithCamera() {
    for( var i = 0; i < floor.length; i++){

        if( (floor[i].position.z - params.tileLength*3/2) > controls.getObject().position.z){
            groundMesh = modifyingGroundMesh(i, floor[i].position.x, floor[i].position.z - params.tileLength * 3);

            var posX = water.position.x;
            scene.remove(water);

            water = new THREE.Water( waterGeometry, {
                scale: 1,
                textureWidth: 1024,
                textureHeight: 1024,
                flowMap: flowMap,
                color: 0xbfd1e5
            } );

            water.position.y = params.waterHeight;
            water.rotation.x = Math.PI * - 0.5;
            water.position.z = floor[i].position.z - params.tileLength * 2;
            water.position.x = posX;

            scene.add(water);

            scene.remove(floor[i]);
            floor[i] = groundMesh;
        }

        else if( (floor[i].position.z + params.tileLength*3/2) < controls.getObject().position.z){
            groundMesh = modifyingGroundMesh(i, floor[i].position.x, floor[i].position.z + params.tileLength * 3);

            var posX = water.position.x;
            scene.remove(water);

            water = new THREE.Water( waterGeometry, {
                scale: 1,
                textureWidth: 1024,
                textureHeight: 1024,
                flowMap: flowMap,
                color: 0xbfd1e5
            } );

            water.position.y = params.waterHeight;
            water.rotation.x = Math.PI * - 0.5;
            water.position.z = floor[i].position.z + params.tileLength * 2;
            water.position.x = posX;

            scene.add(water);

            scene.remove(floor[i]);
            floor[i] = groundMesh;
        }

        if( (floor[i].position.x - params.tileLength*3/2) > controls.getObject().position.x ){
            groundMesh = modifyingGroundMesh(i, floor[i].position.x - params.tileLength * 3, floor[i].position.z);

            var posZ = water.position.z;
            scene.remove(water);

            water = new THREE.Water( waterGeometry, {
                scale: 1,
                textureWidth: 1024,
                textureHeight: 1024,
                flowMap: flowMap,
                color: 0xbfd1e5
            } );

            water.position.y = params.waterHeight;
            water.rotation.x = Math.PI * - 0.5;
            water.position.z = posZ;
            water.position.x = floor[i].position.x - params.tileLength * 2;

            scene.add(water);

            scene.remove(floor[i]);
            floor[i] = groundMesh;
        }

        else if( (floor[i].position.x + params.tileLength*3/2) < controls.getObject().position.x ){
            groundMesh = modifyingGroundMesh(i, floor[i].position.x + params.tileLength * 3, floor[i].position.z);

            var posZ = water.position.z;
            scene.remove(water);

            water = new THREE.Water( waterGeometry, {
                scale: 1,
                textureWidth: 1024,
                textureHeight: 1024,
                flowMap: flowMap,
                color: 0xbfd1e5
            } );

            water.position.y = params.waterHeight;
            water.rotation.x = Math.PI * - 0.5;
            water.position.z = posZ;
            water.position.x = floor[i].position.x + params.tileLength * 2;

            scene.add(water);

            scene.remove(floor[i]);
            floor[i] = groundMesh;
        }
    }
}

function keyDown(event){
    switch ( event.keyCode ) {
        case 38:
            moveUp = true;
            break;// up
        case 87: // w
            moveForward = true;
            break;
        case 37: // left
        case 65: // a
            moveLeft = true; break;
        case 40:
            moveDown = true;
            break;// down
        case 83: // s
            moveBackward = true;
            break;
        case 39: // right
        case 68: // d
            moveRight = true;
            break;
    }
}

function keyUp(event){
    switch( event.keyCode ) {
        case 38:
            moveUp = false;
            break;// up
        case 87: // w
            moveForward = false;
            break;
        case 37: // left
        case 65: // a
            moveLeft = false;
            break;
        case 40:
            moveDown = false;
            break;// down
        case 83: // s
            moveBackward = false;
            break;
        case 39: // right
        case 68: // d
            moveRight = false;
            break;
    }
}

/* ==========================================================================
   Drivee — orbiting particle planet
   Technique from the builder.io "3D planet" write-up (Three.js PointsMaterial
   + onBeforeCompile shader injection), recoloured to the Drivee palette and
   tuned so it never costs the page its interactivity:
     · particle budget scales with device
     · pauses when the tab is hidden or the hero scrolls away
     · skipped entirely for prefers-reduced-motion / no WebGL (CSS fallback)
   ========================================================================== */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const host = document.getElementById('planet');
if (host) boot(host);

function boot(host) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { host.classList.add('planet-static'); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    host.classList.add('planet-static');
    return;
  }

  // ── budget ───────────────────────────────────────────────────────
  // 150k points is the reference figure; phones get a third of it.
  const narrow  = innerWidth < 760;
  const CORE    = narrow ? 18000 : 50000;   // the sphere / "planet"
  const DISC    = narrow ? 34000 : 100000;  // the surrounding ring
  const dpr     = Math.min(devicePixelRatio || 1, narrow ? 1.5 : 2);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, host.clientWidth / host.clientHeight, 1, 1000);
  camera.position.set(0, 4, 21);

  renderer.setPixelRatio(dpr);
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.setClearColor(0x000000, 0); // CSS paints the void behind us
  host.appendChild(renderer.domElement);

  // ── geometry ─────────────────────────────────────────────────────
  const uniforms = { time: { value: 0 } };
  const sizes = [];
  const shift = [];

  const pushShift = () => {
    shift.push(
      Math.random() * Math.PI,              // phase T
      Math.random() * Math.PI * 2,          // phase S
      (Math.random() * 0.9 + 0.1) * Math.PI * 0.1, // speed
      Math.random() * 0.9 + 0.1             // orbit radius
    );
  };

  const pts = [];

  // spherical shell — the planet body
  for (let i = 0; i < CORE; i++) {
    sizes.push(Math.random() * 1.5 + 0.5);
    pushShift();
    pts.push(new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5 + 9.5));
  }

  // flat disc — denser toward the inner edge
  for (let i = 0; i < DISC; i++) {
    const r = 10, R = 40;
    const rand = Math.pow(Math.random(), 1.5);
    const radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
    sizes.push(Math.random() * 1.5 + 0.5);
    pushShift();
    pts.push(new THREE.Vector3().setFromCylindricalCoords(
      radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 2
    ));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  geo.setAttribute('sizes', new THREE.Float32BufferAttribute(sizes, 1));
  geo.setAttribute('shift', new THREE.Float32BufferAttribute(shift, 4));

  // ── material: inject orbit motion + distance-based colour ────────
  const mat = new THREE.PointsMaterial({
    size: 0.112,
    transparent: true,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    onBeforeCompile: (shader) => {
      shader.uniforms.time = uniforms.time;

      shader.vertexShader = `
        uniform float time;
        attribute float sizes;
        attribute vec4 shift;
        varying vec3 vColor;
        ${shader.vertexShader}
      `
      .replace('gl_PointSize = size;', 'gl_PointSize = size * sizes;')
      .replace('#include <color_vertex>', `
        #include <color_vertex>
        float d = clamp(length(abs(position) / vec3(40., 10., 40.)), 0., 1.);
        // Warm amber core → Drivee blue at the rim. Pushed toward the rim
        // colour and dimmed, because additive blending piles overlapping
        // points up to white and eats the hue otherwise.
        vColor = mix(vec3(255., 150., 26.), vec3(44., 104., 255.), smoothstep(0.08, 0.62, d)) / 255.;
        vColor *= 0.82;
      `)
      .replace('#include <begin_vertex>', `
        #include <begin_vertex>
        float t = time;
        float moveT = mod(shift.x + shift.z * t, PI2);
        float moveS = mod(shift.y + shift.z * t, PI2);
        transformed += vec3(
          cos(moveS) * sin(moveT),
          cos(moveT),
          sin(moveS) * sin(moveT)
        ) * shift.w;
      `);

      shader.fragmentShader = `
        varying vec3 vColor;
        ${shader.fragmentShader}
      `
      .replace('#include <clipping_planes_fragment>', `
        #include <clipping_planes_fragment>
        float d = length(gl_PointCoord.xy - 0.5);
      `)
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d) );'
      );
    }
  });

  const points = new THREE.Points(geo, mat);
  points.rotation.order = 'ZYX';
  points.rotation.z = 0.2;
  // On the two-column layout the copy owns the left half, so push the planet
  // over to sit behind the upload panel instead of behind the headline.
  points.position.x = narrow ? 0 : 7.5;
  scene.add(points);

  // ── gentle parallax instead of full OrbitControls ────────────────
  // The hero is a working form; dragging must not be hijacked by a camera.
  let px = 0, py = 0, tx = 0, ty = 0;
  if (!narrow) {
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // ── run loop, paused when not visible ────────────────────────────
  const clock = new THREE.Clock();
  let onscreen = true, active = true;

  new IntersectionObserver(([e]) => { onscreen = e.isIntersecting; }, { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', () => { active = !document.hidden; });

  renderer.setAnimationLoop(() => {
    if (!onscreen || !active) return;

    const t = clock.getElapsedTime() * 0.5;
    uniforms.time.value = t * Math.PI;
    points.rotation.y = t * 0.05;

    px += (tx - px) * 0.04;
    py += (ty - py) * 0.04;
    camera.position.x = px * 2.2;
    camera.position.y = 4 - py * 1.4;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  });

  // ── resize ───────────────────────────────────────────────────────
  let rAF;
  addEventListener('resize', () => {
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(() => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }, { passive: true });

  host.classList.add('planet-live');
}

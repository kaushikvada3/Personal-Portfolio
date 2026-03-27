import GUI from 'lil-gui';

/**
 * Debug GUI for tuning 3D scene parameters in real-time.
 * Press 'H' to toggle visibility.
 *
 * When you're happy with values, click "Copy Config" to copy
 * the current state as a JS object to the clipboard.
 */
export function createDebugGUI({ camera, cameraTarget, assembly, deviceFrame }) {
  const gui = new GUI({ title: 'Scene Tuner', width: 320 });
  const layers = assembly.getLayers();

  // ── Model Position ──
  const modelPos = gui.addFolder('Model Position');
  modelPos.add(assembly.group.position, 'x', -10, 10, 0.05).name('X').listen();
  modelPos.add(assembly.group.position, 'y', -10, 10, 0.05).name('Y').listen();
  modelPos.add(assembly.group.position, 'z', -10, 10, 0.05).name('Z').listen();

  // ── Model Rotation ──
  const modelRot = gui.addFolder('Model Rotation');
  modelRot.add(assembly.group.rotation, 'x', -Math.PI, Math.PI, 0.01).name('Rot X').listen();
  modelRot.add(assembly.group.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Rot Y').listen();
  modelRot.add(assembly.group.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Rot Z').listen();

  // ── Camera Position ──
  if (deviceFrame) {
    const devPos = gui.addFolder('GLB Device Position');
    devPos.add(deviceFrame.group.position, 'x', -10, 10, 0.05).name('X').listen();
    devPos.add(deviceFrame.group.position, 'y', -10, 10, 0.05).name('Y').listen();
    devPos.add(deviceFrame.group.position, 'z', -10, 10, 0.05).name('Z').listen();

    const devRot = gui.addFolder('GLB Device Rotation');
    devRot.add(deviceFrame.group.rotation, 'x', -Math.PI, Math.PI, 0.01).name('Rot X').listen();
    devRot.add(deviceFrame.group.rotation, 'y', -Math.PI, Math.PI, 0.01).name('Rot Y').listen();
    devRot.add(deviceFrame.group.rotation, 'z', -Math.PI, Math.PI, 0.01).name('Rot Z').listen();
    
    devPos.close();
    devRot.close();

    // ── Aura Position (world-space glow) ──
    const auraPos = gui.addFolder('Aura Position');
    auraPos.add(deviceFrame.glowMesh.position, 'x', -10, 10, 0.05).name('X').listen();
    auraPos.add(deviceFrame.glowMesh.position, 'y', -10, 10, 0.05).name('Y').listen();
    auraPos.add(deviceFrame.glowMesh.position, 'z', -10, 10, 0.05).name('Z').listen();
    auraPos.add(deviceFrame.glowMat.uniforms.uIntensity, 'value', 0, 2, 0.05).name('Intensity').listen();
    
    // Force glow visible so user can see it while tuning
    auraPos.add({ showAura: false }, 'showAura').name('Show Aura').onChange((v) => {
      deviceFrame.glowMesh.visible = v;
      if (v) deviceFrame.glowMat.uniforms.uIntensity.value = 1.0;
    });
    auraPos.close();
  }

  // ── Camera Position ──
  const camPos = gui.addFolder('Camera Position');
  camPos.add(camera.position, 'x', -20, 20, 0.05).name('X').listen();
  camPos.add(camera.position, 'y', -20, 20, 0.05).name('Y').listen();
  camPos.add(camera.position, 'z', -20, 20, 0.05).name('Z').listen();

  // ── Camera Target ──
  const camTarget = gui.addFolder('Camera Target');
  camTarget.add(cameraTarget, 'x', -10, 10, 0.05).name('X').listen();
  camTarget.add(cameraTarget, 'y', -10, 10, 0.05).name('Y').listen();
  camTarget.add(cameraTarget, 'z', -10, 10, 0.05).name('Z').listen();

  // ── FOV ──
  gui.add(camera, 'fov', 15, 90, 1).name('FOV').listen().onChange(() => {
    camera.updateProjectionMatrix();
  });

  // ── Layer Explosion ──
  const explosion = gui.addFolder('Layer Offsets (Y)');
  const layerNames = ['BGA', 'Substrate', 'Die', 'TIM', 'IHS'];
  layers.forEach((layer, i) => {
    if (i < layerNames.length) {
      explosion.add(layer.position, 'y', -10, 10, 0.1).name(layerNames[i]).listen();
    }
  });

  // ── Snapshot / Reset ──
  let snapshot = null;

  gui.add({
    saveSnapshot() {
      snapshot = {
        modelPos: { x: assembly.group.position.x, y: assembly.group.position.y, z: assembly.group.position.z },
        modelRot: { x: assembly.group.rotation.x, y: assembly.group.rotation.y, z: assembly.group.rotation.z },
        devicePos: deviceFrame ? { x: deviceFrame.group.position.x, y: deviceFrame.group.position.y, z: deviceFrame.group.position.z } : null,
        deviceRot: deviceFrame ? { x: deviceFrame.group.rotation.x, y: deviceFrame.group.rotation.y, z: deviceFrame.group.rotation.z } : null,
        camPos:   { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target:   { x: cameraTarget.x, y: cameraTarget.y, z: cameraTarget.z },
        fov:      camera.fov,
        layers:   layers.map(l => l.position.y),
      };
      console.log('Snapshot saved');
    }
  }, 'saveSnapshot').name('💾 Save Snapshot');

  gui.add({
    resetToSnapshot() {
      if (!snapshot) { alert('No snapshot saved yet!'); return; }
      assembly.group.position.set(snapshot.modelPos.x, snapshot.modelPos.y, snapshot.modelPos.z);
      assembly.group.rotation.set(snapshot.modelRot.x, snapshot.modelRot.y, snapshot.modelRot.z);
      if (deviceFrame && snapshot.devicePos) {
        deviceFrame.group.position.set(snapshot.devicePos.x, snapshot.devicePos.y, snapshot.devicePos.z);
        deviceFrame.group.rotation.set(snapshot.deviceRot.x, snapshot.deviceRot.y, snapshot.deviceRot.z);
      }
      camera.position.set(snapshot.camPos.x, snapshot.camPos.y, snapshot.camPos.z);
      cameraTarget.set(snapshot.target.x, snapshot.target.y, snapshot.target.z);
      camera.fov = snapshot.fov;
      camera.updateProjectionMatrix();
      layers.forEach((l, i) => { l.position.y = snapshot.layers[i]; });
      console.log('Reset to snapshot');
    }
  }, 'resetToSnapshot').name('↩️ Reset to Snapshot');

  // ── Copy Config Button ──
  gui.add({
    copyConfig() {
      const config = {
        model: {
          posX: +assembly.group.position.x.toFixed(4),
          posZ: +assembly.group.position.z.toFixed(4),
          rotX: +assembly.group.rotation.x.toFixed(4),
          rotY: +assembly.group.rotation.y.toFixed(4),
          rotZ: +assembly.group.rotation.z.toFixed(4),
        },
        glbDevice: deviceFrame ? {
          posX: +deviceFrame.group.position.x.toFixed(4),
          posY: +deviceFrame.group.position.y.toFixed(4),
          posZ: +deviceFrame.group.position.z.toFixed(4),
          rotX: +deviceFrame.group.rotation.x.toFixed(4),
          rotY: +deviceFrame.group.rotation.y.toFixed(4),
          rotZ: +deviceFrame.group.rotation.z.toFixed(4)
        } : null,
        camera: {
          posX: +camera.position.x.toFixed(2),
          posY: +camera.position.y.toFixed(2),
          posZ: +camera.position.z.toFixed(2),
          fov: Math.round(camera.fov),
        },
        target: {
          x: +cameraTarget.x.toFixed(2),
          y: +cameraTarget.y.toFixed(2),
          z: +cameraTarget.z.toFixed(2),
        },
        layerOffsets: layers.map((l, i) => +l.position.y.toFixed(2)),
      };
      const text = JSON.stringify(config, null, 2);
      navigator.clipboard.writeText(text).then(() => {
        console.log('Config copied to clipboard:\n', text);
        alert('Config copied to clipboard! Check console for details.');
      });
    }
  }, 'copyConfig').name('📋 Copy Config');

  // Toggle with H key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
      gui.domElement.style.display =
        gui.domElement.style.display === 'none' ? '' : 'none';
    }
  });

  // Start with all folders open
  modelPos.open();
  modelRot.close();
  camPos.close();
  camTarget.close();
  explosion.close();

  return gui;
}

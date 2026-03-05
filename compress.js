const fs = require('fs');
const { NodeIO } = require('@gltf-transform/core');
const { KHRDracoMeshCompression } = require('@gltf-transform/extensions');
const draco3d = require('draco3dgltf');

async function compress() {
    console.log('Initializing...');

    // Create an IO instance. Notice we wait for draco3d to initialize.
    const io = new NodeIO()
        .registerExtensions([KHRDracoMeshCompression])
        .registerDependencies({
            'draco3d.encoder': await draco3d.createEncoderModule(),
            'draco3d.decoder': await draco3d.createDecoderModule(),
        });

    console.log('Reading GLB (this might take a minute for 881MB)...');
    const document = await io.read('Two_Level_Cache.glb');

    const extension = document.createExtension(KHRDracoMeshCompression)
        .setRequired(true);

    console.log('Writing full-fidelity Draco GLB...');
    extension.setEncoderOptions({
        method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
        encodeSpeed: 5,
        decodeSpeed: 5,
        quantizationBits: {
            'POSITION': 14,
            'NORMAL': 10,
            'COLOR': 8,
            'TEX_COORD': 12,
            'GENERIC': 12
        }
    });
    await io.write('Two_Level_Cache_Draco.glb', document);

    console.log('Writing lite Draco GLB...');
    extension.setEncoderOptions({
        method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
        encodeSpeed: 1,
        decodeSpeed: 10,
        quantizationBits: {
            'POSITION': 5,
            'NORMAL': 4,
            'COLOR': 4,
            'TEX_COORD': 4,
            'GENERIC': 4
        }
    });
    await io.write('Two_Level_Cache_Draco_Lite.glb', document);

    const fullSize = fs.statSync('Two_Level_Cache_Draco.glb').size;
    const liteSize = fs.statSync('Two_Level_Cache_Draco_Lite.glb').size;
    console.log(`Done! Full: ${(fullSize / (1024 * 1024)).toFixed(2)} MB, Lite: ${(liteSize / (1024 * 1024)).toFixed(2)} MB`);
}

compress().catch(console.error);

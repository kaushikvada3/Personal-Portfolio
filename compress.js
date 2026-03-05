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

    console.log('Applying Draco compression...');
    document.createExtension(KHRDracoMeshCompression)
        .setRequired(true)
        .setEncoderOptions({
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

    console.log('Writing compressed GLB...');
    await io.write('Two_Level_Cache_Draco.glb', document);
    console.log('Done!');
}

compress().catch(console.error);

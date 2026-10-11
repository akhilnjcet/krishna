const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_LOGO = path.join(ROOT_DIR, 'public', 'logo.png');

async function generate() {
    console.log('Reading source logo from:', SOURCE_LOGO);
    
    // Trim source logo so there is no excess whitespace around the graphics
    const trimmedBuffer = await sharp(SOURCE_LOGO)
        .trim()
        .toBuffer();
    
    const trimmedMeta = await sharp(trimmedBuffer).metadata();
    console.log(`Trimmed logo dimensions: ${trimmedMeta.width}x${trimmedMeta.height}`);

    // Helper to create transparent sticker on square canvas
    async function makeSticker(size, fillPercent = 0.88) {
        const targetInner = Math.round(size * fillPercent);
        const resizedLogo = await sharp(trimmedBuffer)
            .resize({
                width: targetInner,
                height: targetInner,
                fit: 'inside',
                kernel: 'lanczos3'
            })
            .toBuffer();

        const resizedMeta = await sharp(resizedLogo).metadata();
        const left = Math.round((size - resizedMeta.width) / 2);
        const top = Math.round((size - resizedMeta.height) / 2);

        return sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
        .composite([{ input: resizedLogo, left, top }])
        .png();
    }

    // Helper to create maskable / solid background icon
    async function makeMaskable(size, fillPercent = 0.72, bgColor = '#FFFFFF') {
        const targetInner = Math.round(size * fillPercent);
        const resizedLogo = await sharp(trimmedBuffer)
            .resize({
                width: targetInner,
                height: targetInner,
                fit: 'inside',
                kernel: 'lanczos3'
            })
            .toBuffer();

        const resizedMeta = await sharp(resizedLogo).metadata();
        const left = Math.round((size - resizedMeta.width) / 2);
        const top = Math.round((size - resizedMeta.height) / 2);

        return sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: bgColor
            }
        })
        .composite([{ input: resizedLogo, left, top }])
        .png();
    }

    // Helper to create legacy round icon
    async function makeRoundIcon(size, fillPercent = 0.72, bgColor = '#FFFFFF') {
        const maskable = await makeMaskable(size, fillPercent, bgColor);
        const maskBuffer = await maskable.toBuffer();

        // Create circle mask
        const circleSvg = Buffer.from(
            `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#fff" /></svg>`
        );

        return sharp(maskBuffer)
            .composite([{ input: circleSvg, blend: 'dest-in' }])
            .png();
    }

    // Helper to create legacy squircle icon
    async function makeSquircleIcon(size, fillPercent = 0.76, bgColor = '#FFFFFF') {
        const maskable = await makeMaskable(size, fillPercent, bgColor);
        const maskBuffer = await maskable.toBuffer();
        const radius = Math.round(size * 0.22);

        const squircleSvg = Buffer.from(
            `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff" /></svg>`
        );

        return sharp(maskBuffer)
            .composite([{ input: squircleSvg, blend: 'dest-in' }])
            .png();
    }

    // 1. Generate PWA and Public icons
    console.log('Generating PWA icons in public/ ...');
    const publicDir = path.join(ROOT_DIR, 'public');
    
    // Transparent sticker icons (for splash and standard use)
    await (await makeSticker(192, 0.88)).toFile(path.join(publicDir, 'logo192.png'));
    await (await makeSticker(512, 0.88)).toFile(path.join(publicDir, 'logo512.png'));
    await (await makeSticker(512, 0.88)).toFile(path.join(publicDir, 'logo.png'));

    // Solid maskable icons (for home screen launcher squircle)
    await (await makeMaskable(192, 0.54)).toFile(path.join(publicDir, 'maskable-icon-192.png'));
    await (await makeMaskable(512, 0.54)).toFile(path.join(publicDir, 'maskable-icon-512.png'));

    // Generate frontend/icons/
    const iconsDir = path.join(ROOT_DIR, 'icons');
    if (fs.existsSync(iconsDir)) {
        for (const size of [48, 72, 96, 128, 192, 256, 512]) {
            await (await makeSticker(size, 0.85)).webp().toFile(path.join(iconsDir, `icon-${size}.webp`));
        }
    }

    // 2. Generate Android Splash Icon (for Android 12+ SplashScreen API)
    const androidRes = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'res');
    if (fs.existsSync(androidRes)) {
        console.log('Generating Android resources...');
        const drawableDir = path.join(androidRes, 'drawable');
        if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });

        // Android 12+ windowSplashScreenAnimatedIcon requires transparent sticker icon
        // 512x512 transparent sticker
        await (await makeSticker(512, 0.85)).toFile(path.join(drawableDir, 'splash_icon.png'));

        // 3. Generate Android Adaptive Icons & Legacy Icons
        const densities = [
            { name: 'mdpi', iconSize: 48, adaptiveSize: 108 },
            { name: 'hdpi', iconSize: 72, adaptiveSize: 162 },
            { name: 'xhdpi', iconSize: 96, adaptiveSize: 216 },
            { name: 'xxhdpi', iconSize: 144, adaptiveSize: 324 },
            { name: 'xxxhdpi', iconSize: 192, adaptiveSize: 432 }
        ];

        for (const d of densities) {
            const mipmapDir = path.join(androidRes, `mipmap-${d.name}`);
            if (!fs.existsSync(mipmapDir)) fs.mkdirSync(mipmapDir, { recursive: true });

            // ic_launcher_foreground: transparent background with logo safely filling 54% of canvas (fits circular and squircle masks with zero clipping)
            await (await makeSticker(d.adaptiveSize, 0.54)).toFile(path.join(mipmapDir, 'ic_launcher_foreground.png'));

            // ic_launcher_background: solid white
            await sharp({
                create: {
                    width: d.adaptiveSize,
                    height: d.adaptiveSize,
                    channels: 4,
                    background: '#FFFFFF'
                }
            }).png().toFile(path.join(mipmapDir, 'ic_launcher_background.png'));

            // Legacy ic_launcher: squircle
            await (await makeSquircleIcon(d.iconSize, 0.65)).toFile(path.join(mipmapDir, 'ic_launcher.png'));

            // Legacy ic_launcher_round: circle
            await (await makeRoundIcon(d.iconSize, 0.54)).toFile(path.join(mipmapDir, 'ic_launcher_round.png'));
            console.log(`Generated mipmap-${d.name}`);
        }

        // 4. Generate all splash.png files in drawable-* directories
        // Helper for splash screen: centered sticker logo on #FFFFFF background
        async function makeSplashImage(w, h) {
            const logoTargetSize = Math.round(Math.min(w, h) * 0.45);
            const resizedLogo = await sharp(trimmedBuffer)
                .resize({
                    width: logoTargetSize,
                    height: logoTargetSize,
                    fit: 'inside',
                    kernel: 'lanczos3'
                })
                .toBuffer();

            const meta = await sharp(resizedLogo).metadata();
            const left = Math.round((w - meta.width) / 2);
            const top = Math.round((h - meta.height) / 2);

            return sharp({
                create: {
                    width: w,
                    height: h,
                    channels: 4,
                    background: '#FFFFFF'
                }
            })
            .composite([{ input: resizedLogo, left, top }])
            .png();
        }

        const splashSizes = {
            'drawable': { w: 320, h: 480 },
            'drawable-night': { w: 320, h: 240 },
            'drawable-port-ldpi': { w: 240, h: 320 },
            'drawable-port-mdpi': { w: 320, h: 480 },
            'drawable-port-hdpi': { w: 480, h: 800 },
            'drawable-port-xhdpi': { w: 720, h: 1280 },
            'drawable-port-xxhdpi': { w: 960, h: 1600 },
            'drawable-port-xxxhdpi': { w: 1280, h: 1920 },
            'drawable-port-night-ldpi': { w: 240, h: 320 },
            'drawable-port-night-mdpi': { w: 320, h: 480 },
            'drawable-port-night-hdpi': { w: 480, h: 800 },
            'drawable-port-night-xhdpi': { w: 720, h: 1280 },
            'drawable-port-night-xxhdpi': { w: 960, h: 1600 },
            'drawable-port-night-xxxhdpi': { w: 1280, h: 1920 },
            'drawable-land-ldpi': { w: 320, h: 240 },
            'drawable-land-mdpi': { w: 480, h: 320 },
            'drawable-land-hdpi': { w: 800, h: 480 },
            'drawable-land-xhdpi': { w: 1280, h: 720 },
            'drawable-land-xxhdpi': { w: 1600, h: 960 },
            'drawable-land-xxxhdpi': { w: 1920, h: 1280 },
            'drawable-land-night-ldpi': { w: 320, h: 240 },
            'drawable-land-night-mdpi': { w: 480, h: 320 },
            'drawable-land-night-hdpi': { w: 800, h: 480 },
            'drawable-land-night-xhdpi': { w: 1280, h: 720 },
            'drawable-land-night-xxhdpi': { w: 1600, h: 960 },
            'drawable-land-night-xxxhdpi': { w: 1920, h: 1280 }
        };

        for (const [folder, dims] of Object.entries(splashSizes)) {
            const dir = path.join(androidRes, folder);
            if (fs.existsSync(dir)) {
                await (await makeSplashImage(dims.w, dims.h)).toFile(path.join(dir, 'splash.png'));
                console.log(`Generated splash for ${folder}`);
            }
        }
    }

    console.log('All icons and splash screens successfully generated!');
}

generate().catch(err => {
    console.error('Error generating icons:', err);
    process.exit(1);
});

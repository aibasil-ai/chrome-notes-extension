const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = 'C:\\Users\\joshlin.DESKTOP-UPQ841Q\\.gemini\\antigravity\\brain\\8f7b797f-942a-4997-a449-2a7cc6bbb659\\logo_option_1_1772597356870.png';
const outputDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function resizeIcons() {
    try {
        const sizes = [16, 48, 128];
        for (const size of sizes) {
            const outputPath = path.join(outputDir, `icon${size}.png`);
            await sharp(inputPath)
                .resize(size, size)
                .toFile(outputPath);
            console.log(`Created ${outputPath}`);
        }
    } catch (error) {
        console.error('Error resizing icons:', error);
    }
}

resizeIcons();

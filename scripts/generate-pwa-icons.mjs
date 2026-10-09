import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const source = path.join(
  root,
  "public",
  "logo-katiany-silvia.png"
);

const outputDir = path.join(
  root,
  "public",
  "icons"
);

await fs.mkdir(outputDir, {
  recursive: true,
});

async function createIcon(
  filename,
  size,
  options = {}
) {
  const {
    background = {
      r: 255,
      g: 250,
      b: 252,
      alpha: 1,
    },
    padding = 0.12,
  } = options;

  const contentSize = Math.round(
    size * (1 - padding * 2)
  );

  const logo = await sharp(source)
    .resize(contentSize, contentSize, {
      fit: "contain",
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([
      {
        input: logo,
        gravity: "center",
      },
    ])
    .png()
    .toFile(path.join(outputDir, filename));

  console.log(`Criado: ${filename}`);
}

await createIcon(
  "icon-192.png",
  192
);

await createIcon(
  "icon-512.png",
  512
);

await createIcon(
  "icon-512-maskable.png",
  512,
  {
    padding: 0.2,
  }
);

await createIcon(
  "apple-touch-icon.png",
  180
);

console.log("Ícones PWA gerados com sucesso.");
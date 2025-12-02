#!/usr/bin/env node
import { main } from './fetch-capacities.js';
import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function build() {
  try {
    console.log('Fetching links from Capacities...\n');
    const links = await main();

    const outputPath = join(__dirname, 'links.json');
    await writeFile(
      outputPath,
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        count: links.length,
        links: links
      }, null, 2)
    );

    console.log(`\n✓ Successfully saved ${links.length} links to links.json`);
    console.log(`✓ Generated at: ${new Date().toLocaleString()}`);
    console.log('\nYou can now commit and push links.json to update your GitHub Pages site.');

  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

build();

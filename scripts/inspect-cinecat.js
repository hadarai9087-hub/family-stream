const fs = require('fs');

async function inspectProviders() {
  const code = await fetch('https://beta.cinecat.eu/_app/immutable/chunks/BP1hKzvG.js').then(r => r.text());
  
  // Search for provider definitions or ids
  const matches = [...code.matchAll(/id:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"]/g)];
  console.log('Providers defined:', matches.map(m => `${m[1]} (${m[2]})`));

  // Search for embeds
  const embeds = [...code.matchAll(/embedId:\s*['"]([^'"]+)['"]/g)];
  console.log('Embeds defined:', [...new Set(embeds.map(m => m[1]))]);

  // Search for rank or disabled
  const ranks = [...code.matchAll(/rank:\s*([0-9]+)/g)];
  console.log('Found ranks count:', ranks.length);
}

inspectProviders();

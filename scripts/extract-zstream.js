const fs = require('fs');

async function extractProvidersFromExe() {
  const filePath = 'D:\\חרא מהאינטרט\\zstream-app.exe';
  const data = fs.readFileSync(filePath);

  // Search around 18,725,000
  const chunk = data.slice(18720000, 18750000).toString('utf8');
  console.log('Chunk length:', chunk.length);
  
  // Find stream sources or provider names
  const providers = chunk.match(/name:\s*["']([^"']+)["']/g) || [];
  console.log('Provider names around 18.7M:', providers.slice(0, 20));

  // Find urls
  const urls = chunk.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^"'\s`]*/g) || [];
  console.log('URLs around 18.7M:', [...new Set(urls)].slice(0, 15));
}

extractProvidersFromExe();

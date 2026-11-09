const fs = require('fs');

async function scanExe() {
  const filePath = 'D:\\חרא מהאינטרט\\zstream-app.exe';
  const data = fs.readFileSync(filePath);
  console.log('File size:', data.length);

  // Search for UTF-8 strings matching URLs
  const str = data.toString('latin1');
  const urls = [...str.matchAll(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[a-zA-Z0-9\/._?&=-]*/g)].map(m => m[0]);
  const uniqueUrls = [...new Set(urls.filter(u => 
    !u.includes('microsoft.com') && 
    !u.includes('w3.org') && 
    !u.includes('github.com/rust') &&
    !u.includes('schema.org')
  ))];
  console.log('\n--- Relevant URLs found in zstream-app.exe ---');
  console.log(uniqueUrls.slice(0, 30));

  // Search for package.json or mentions of providers
  const providers = [...str.matchAll(/(?:provider|stream|embed|zcdn)[a-zA-Z0-9_-]{3,25}/gi)].map(m => m[0]);
  console.log('\n--- Keywords found ---');
  console.log([...new Set(providers)].slice(0, 30));
}

scanExe();

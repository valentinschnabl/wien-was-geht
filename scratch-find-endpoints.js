const axios = require('axios');

async function findEndpoints() {
  const url = 'https://www.kultursommer.wien/jart/prj3/festival/resources/dbcon-def/reports/apps/kalender_2026/kalender_2026.jartc?cmd=getJS';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  
  const content = res.data;
  
  // Find all occurrences of cmd=
  const cmdMatches = content.match(/cmd=[a-zA-Z0-9_]+/g);
  console.log('Cmds found:', Array.from(new Set(cmdMatches)));

  // Find all ajax requests
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('ajax') || line.includes('getJSON') || line.includes('fetch(') || line.includes('url:') || line.includes('.jartc')) {
      console.log(`Line ${i + 1}: ${line.trim()}`);
    }
  });
}

findEndpoints();

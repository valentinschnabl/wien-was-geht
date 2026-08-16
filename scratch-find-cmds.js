const axios = require('axios');

async function findCmds() {
  const url = 'https://www.kultursommer.wien/jart/prj3/festival/resources/dbcon-def/reports/apps/kalender_2026/kalender_2026.jartc?cmd=getJS';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  
  const content = res.data;
  const regex = /this\.req\(\s*["']([^"']+)["']\s*,\s*([^,]+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    console.log(`Command: "${match[1]}" with data arg: ${match[2]}`);
  }
}

findCmds();

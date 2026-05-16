const fs = require('fs');
let src = fs.readFileSync('src/main.js', 'utf8');

src = src.replace("});\n\n \n});", "");
src = src.replace("});\r\n\r\n \r\n});", "");

fs.writeFileSync('src/main.js', src, 'utf8');

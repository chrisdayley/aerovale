import {cpSync,mkdirSync,rmSync} from 'node:fs';
rmSync('docs',{recursive:true,force:true});
mkdirSync('docs',{recursive:true});
cpSync('dist','docs',{recursive:true});
console.log('GitHub Pages release copied from dist/ to docs/.');

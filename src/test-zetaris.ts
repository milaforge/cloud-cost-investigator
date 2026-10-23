import { queryZetaris } from './tools/zetaris.js';

console.log(await queryZetaris('SELECT 1'));
console.log(await queryZetaris('SHOW LIGHTNING DATABASES'));

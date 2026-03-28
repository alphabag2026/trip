import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('admin123', 12);
console.log(hash);

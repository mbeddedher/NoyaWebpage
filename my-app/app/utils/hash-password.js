const bcrypt = require('bcryptjs');

async function hashPassword() {
  const password = "T1R2N3T4L5t6r7n8t9l77622024";
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('Hashed password:', hashedPassword);
}

hashPassword(); 
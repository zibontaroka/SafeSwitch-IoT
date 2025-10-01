const bcrypt = require('bcrypt');

const hashedPassword = '$2b$10$Z9WyfQaSzI0n3xXTYZ3NY.5zh0Q8NdNDg7jG3c6gG1MQBAFQ0LMnK'; 
const plainPassword = '123456'; 

bcrypt.compare(plainPassword, hashedPassword, (err, res) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  if (res) {
    // console.log('Password matched');
  } else {
   //  console.log('Password did NOT match');
  }
});

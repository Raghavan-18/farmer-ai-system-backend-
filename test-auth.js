fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: "Raghavan Dashboard Test", email: "test4@gmail.com", password: "password123" })
}).then(res => res.json()).then(console.log).catch(console.error);

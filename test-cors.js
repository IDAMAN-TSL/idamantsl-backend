const http = require("http");

const options = {
  hostname: "127.0.0.1",
  port: 5001,
  path: "/api/users",
  method: "OPTIONS",
  headers: {
    "Origin": "http://localhost:3000",
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "authorization"
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
});

req.on("error", (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();

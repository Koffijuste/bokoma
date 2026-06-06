const dns = require("dns");

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

console.log("Servers:", dns.getServers());

dns.resolveSrv(
  "_mongodb._tcp.app-js-fullstack.digqdpt.mongodb.net",
  console.log
);
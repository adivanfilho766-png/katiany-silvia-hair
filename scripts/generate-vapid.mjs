import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=");
console.log(keys.publicKey);
console.log("");
console.log("VAPID_PRIVATE_KEY=");
console.log(keys.privateKey);
console.log("");
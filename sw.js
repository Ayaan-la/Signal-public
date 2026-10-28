// ছোট সার্ভিস ওয়ার্কার: অ্যাপ হিসেবে ইনস্টল করার জন্য দরকার
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () {});

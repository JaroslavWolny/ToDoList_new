importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBorLSWHq3K4EA3inO74cnFjiSOoybUGEU",
    authDomain: "todolist-app-63415.firebaseapp.com",
    projectId: "todolist-app-63415",
    storageBucket: "todolist-app-63415.firebasestorage.app",
    messagingSenderId: "170107298960",
    appId: "1:170107298960:web:29f5d266ff58543afce415",
    measurementId: "G-37DDPQH4QY"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = (payload.data && payload.data.title) || (payload.notification && payload.notification.title);
    const notificationOptions = {
        body: (payload.data && payload.data.body) || (payload.notification && payload.notification.body),
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});

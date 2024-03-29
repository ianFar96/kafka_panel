import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import Messages from '../pages/Messages.vue';
import Settings from '../pages/Settings.vue';
import Topics from '../pages/Topics.vue';
import Groups from '../pages/Groups.vue';
import MessagesStorage from '../pages/MessagesStorage.vue';
import Autosend from '../pages/Autosend.vue';

const routes: RouteRecordRaw[] = [
	{ path: '/', redirect: '/topics' },
	{ path: '/topics', component: Topics, meta: { title: ' Topics' } },
	{ path: '/topics/:topicName/messages', component: Messages, meta: { title: 'Messages' } },
	{ path: '/topics/:topicName/groups', component: Groups, meta: { title: ' Consumer Groups' } },
	{ path: '/messages-storage', component: MessagesStorage, meta: { title: ' Messages Storage' } },
	{ path: '/autosend', component: Autosend, meta: { title: ' Autosend' } },
	{ path: '/settings', component: Settings, meta: { title: 'Settings' } }
];

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

window.addEventListener('keydown', (event: KeyboardEvent) => {
	if (event.altKey && event.key === 'ArrowLeft') {
		router.back();
	} else if(event.altKey && event.key === 'ArrowRight') {
		router.forward();
	}
});

export default router;
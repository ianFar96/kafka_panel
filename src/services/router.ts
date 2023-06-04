import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import Messages from '../pages/Messages.vue';
import Settings from '../pages/Settings.vue';
import Topics from '../pages/Topics.vue';
import Groups from '../pages/Groups.vue';

const routes: RouteRecordRaw[] = [
	{ path: '/', redirect: '/topics' },
	{ path: '/topics', component: Topics, meta: { title: ' Topics' } },
	{ path: '/topics/:topicName/messages', component: Messages, meta: { title: 'Messages' } },
	{ path: '/topics/:topicName/groups', component: Groups, meta: { title: ' Consumer Groups' } },
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
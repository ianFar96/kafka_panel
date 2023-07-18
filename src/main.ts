import hljsVuePlugin from '@highlightjs/vue-plugin';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/vs2015.css';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import { createApp } from 'vue';
import App from './App.vue';
import router from './services/router';
import './style.css';
import { createPinia } from 'pinia';

hljs.registerLanguage('json', json);

(self as any).MonacoEnvironment = {
	getWorker(_: unknown, label: string) {
		if (label === 'json') {
			return new jsonWorker();
		}
		return new editorWorker();
	},
};

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(hljsVuePlugin);
app.mount('#app');

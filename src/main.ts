import hljsVuePlugin from '@highlightjs/vue-plugin';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/vs2015.css';
import { createApp } from 'vue';
import App from './App.vue';
import router from './services/router';
import './style.css';
import { createPinia } from 'pinia';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

hljs.registerLanguage('json', json);

self.MonacoEnvironment = {
	getWorker: function (workerId, label) {
		switch (label) {
		case 'json':
			return new jsonWorker();
			// case 'css':
			// case 'scss':
			// case 'less':
			// 	return getWorkerModule('/monaco-editor/esm/vs/language/css/css.worker?worker', label);
			// case 'html':
			// case 'handlebars':
			// case 'razor':
			// 	return getWorkerModule('/monaco-editor/esm/vs/language/html/html.worker?worker', label);
			// case 'typescript':
			// case 'javascript':
			// 	return getWorkerModule('/monaco-editor/esm/vs/language/typescript/ts.worker?worker', label);
		default:
			return new editorWorker();
		}
	}
};

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(hljsVuePlugin);
app.mount('#app');

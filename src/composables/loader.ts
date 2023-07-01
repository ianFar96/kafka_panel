import { Ref, inject } from 'vue';
import Loader from '../components/Loader.vue';

export function useLoader() {
	const loader = inject<Ref<InstanceType<typeof Loader> | null>>('loader');
	return loader;
}
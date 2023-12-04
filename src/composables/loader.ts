import { Ref, inject } from 'vue';
import Loader from '../components/Loader.vue';

export function useLoader() {
	return inject<Ref<InstanceType<typeof Loader> | null>>('loader');
}
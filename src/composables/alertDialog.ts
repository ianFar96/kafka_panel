import { Ref, inject } from 'vue';
import AlertDialogVue from '../components/AlertDialog.vue';

export function useAlertDialog() {
	return inject<Ref<InstanceType<typeof AlertDialogVue> | null>>('alertDialog');
}
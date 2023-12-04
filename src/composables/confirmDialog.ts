import { Ref, inject } from 'vue';
import ConfirmDialogVue from '../components/ConfirmDialog.vue';

export function useConfirmDialog() {
	return inject<Ref<InstanceType<typeof ConfirmDialogVue> | null>>('confirmDialog');
}
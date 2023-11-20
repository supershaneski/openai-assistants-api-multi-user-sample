<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    }
})

const emit = defineEmits(['submit'])

const name = ref('')

const isDisabled = computed(() => name.value.length < 3)

</script>

<template>
    <Transition name="nested">
        <div v-if="props.show" class="modal-mask">
            <div class="center">
                <div class="contents">
                    <div class="input-item">
                        <label class="label">Nickname* <span class="sublabel">must be at least 3 characters long</span></label>
                        <input :disabled="props.disabled" @keyup.enter="emit('submit', name)" class="input-text" placeholder="Choose a nickname to join" type="text" v-model="name" />
                    </div>
                </div>
                <div class="action">
                    <button :disabled="props.disabled || isDisabled" class="button" @click="emit('submit', name)">Join Discussion</button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.contents {
    position: relative;
    width: 100vw;
    max-width: 300px;
}
.input-item {
    position: relative;
    margin-bottom: 1rem;
}
.input-item:last-child {
    margin-bottom: 0;
}
.label {
    display: block;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 1rem;
}
.sublabel {
    font-size: .8rem;
    color: #999;
}
.input-text {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 1rem;
    background-color: #f5f5f5;
    width: 100%;
    appearance: none;
    border-width: 0;
    border-radius: 5px;
    padding: 8px;
    box-sizing: border-box;
}
.button {
    background-color: #00DC82;
    appearance: none;
    border-width: 0;
    border-radius: 16px;
    padding: 8px 24px;
    font-size: 1rem;
    color: #fff;
    cursor: pointer;
}
.button + .button {
    margin-left: 10px;
}
.button:hover {
    background-color: #00DC8299;
}
.button:active {
    transform: translateY(1px);
}

.button:disabled {
    background-color: #999;
    color: #CCC;
}
.button:disabled:active {
    transform: translateY(0px);
}
.action {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
}
.modal-mask {
    background-color: rgba(0, 0, 0, 0.5);
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9998;
}
.center {
    box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
    background-color: #fff;
    border-radius: 6px;
    padding: 1.5rem 1.5rem 1rem 1.5rem;
}
</style>
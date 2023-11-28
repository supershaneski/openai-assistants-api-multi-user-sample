<script setup>
import { computed, toRefs } from 'vue'

const props = defineProps({
    checked: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits(['change'])

const { checked } = toRefs(props)

const isChecked = computed({
      get: () => checked.value,
      set: value => emit('change', value)
    })

const caption = computed(() => checked.value ? 'stream' : 'socket')

</script>

<template>
    <label class="switch">
        <input type="checkbox" v-model="isChecked">
        <div class="slider round"><span :class="caption">{{ caption }}</span></div>
    </label>
</template>

<style scoped>
.switch {
  position: relative;
  display: inline-block;
  width: 70px;
  height: 22px;
}
.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
  display: flex;
  justify-content: center;
  align-items: center;
}
.slider span.socket {
    font-size: .7rem;
    padding-left: 16px;
}
.slider span.stream {
    font-size: .7rem;
    padding-right: 16px;
    color: #fff;
}
.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}
input:checked + .slider {
  background-color: #00DC82;
}
input:focus + .slider {
  box-shadow: 0 0 1px #00DC82;
}
input:checked + .slider:before {
  -webkit-transform: translateX(48px);
  -ms-transform: translateX(48px);
  transform: translateX(48px);
}
.slider.round {
  border-radius: 22px;
}
.slider.round:before {
  border-radius: 50%;
}
</style>
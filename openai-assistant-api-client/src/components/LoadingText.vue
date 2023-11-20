<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const data = ref(new Array(7).fill(0))
const startTimer = ref(false)
const timer = ref(null)

watch(startTimer, (newval) => {
    if(newval) {

        let cnt = 0

        timer.value = setInterval(() => {

            data.value = data.value.map((n, i) => 2 * Math.sin(cnt + (2 * Math.PI * ((i + 1)/ 8))))

            cnt++

        }, 100)
    } else {
        clearInterval(timer.value)
    }
})

onMounted(() => {
    startTimer.value = true
})

onBeforeUnmount(() => {
    startTimer.value = false
})
</script>

<template>
    <div class="load-texture-container">
        <div class="inner">
            <div v-for="(n, index) in data" :key="index" class="item" :style="{
                transform: `translateY(${n}px)`
            }"></div>
        </div>
    </div>
</template>

<style scoped>
.load-texture-container {
    position: relative;
    height: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.inner {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
}

.item {
    background-color: #999;
    position: relative;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 3px;
}
.item:last-child {
    margin-right: 0;
}
</style>
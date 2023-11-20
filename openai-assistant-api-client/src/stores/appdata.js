import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAppDataStore = defineStore('appData', () => {
    
    const store_key = 'openai-assistant-appdata'

    let def_name = ''
    let def_id = ''

    const raw = localStorage.getItem(store_key)
    if(raw) {
        const obj = JSON.parse(raw)
        def_name = obj.name
        def_id = obj.id
    }

    const name = ref(def_name)
    const id = ref(def_id)

    function setName(sname) {
        name.value = sname
        localStorage.setItem(store_key, JSON.stringify({ name: sname, id: id.value }))
    }

    function setId(sid) {
        id.value = sid
        localStorage.setItem(store_key, JSON.stringify({ name: name.value, id: sid }))
    }

    return { name, id, setName, setId }
})

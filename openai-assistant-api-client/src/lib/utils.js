export function getSimpleId() {
    return Date.now().toString() + Math.random().toString(26).slice(2)
}
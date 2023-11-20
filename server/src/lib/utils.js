exports.wait = (delay) => {
    return new Promise((resolve) => setTimeout(resolve, delay))
}
exports.getSimpleId = () => {
    return Math.random().toString(26).slice(2);
}

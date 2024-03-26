exports.wait = (delay) => {
    return new Promise((resolve) => setTimeout(resolve, delay))
}
exports.getSimpleId = () => {
    return Math.random().toString(26).slice(2);
}
exports.mockAPI = (name, arguments) => {
    if(name === 'get_daily_cat_trivia') {
        return { status: "success", trivia: "The world's oldest known pet cat was discovered in a 9,500-year-old grave on the Mediterranean island of Cyprus", ...arguments }
    } else if(name === 'get_cat_picture_of_the_day') {
        return { status: "success", image: { src: "https://i.postimg.cc/cH55BkC6/5592e301-0407-473a-ada0-e413f0791076.jpg", alt: "Today's picture" }, ...arguments }
    } else {
        return { status: 'error', message: 'function not found', name }
    }
}
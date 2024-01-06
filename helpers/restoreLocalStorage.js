(() => {
    window._localStorage = window.localStorage;
    const lsDump = ###LOCAL_STORAGE###;

    for(let key in lsDump) {
        window._localStorage.setItem(key, lsDump[key]);
    }
})();